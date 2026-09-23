import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Accepts either a raw storage path or a legacy absolute public URL and
// normalises it to the object path inside the given bucket.
function normalisePath(bucket: string, input: string): string | null {
  if (!input) return null;
  let value = input.trim();
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = value.indexOf(marker);
  if (idx >= 0) value = value.slice(idx + marker.length);
  value = value.split("?")[0];
  if (!value || value.includes("..")) return null;
  try {
    value = decodeURIComponent(value);
  } catch {
    /* keep as-is */
  }
  return value;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const bucket = "plugin-jars";
    const versionId = typeof body?.version_id === "string" ? body.version_id : null;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    let path: string | null = null;
    let pluginId: string | null = null;
    let externalUrl: string | null = null;

    if (versionId) {
      // Preferred flow: look the jar up server-side so internal storage paths
      // are never exposed to anonymous clients.
      const { data: ver } = await admin
        .from("plugin_versions")
        .select("plugin_id, jar_path, download_url")
        .eq("id", versionId)
        .maybeSingle();
      if (!ver) return json({ error: "File not found" }, 404);
      pluginId = ver.plugin_id;
      if (ver.jar_path) {
        path = ver.jar_path;
      } else if (ver.download_url && /^https?:\/\//i.test(ver.download_url)) {
        // Authorization is checked below before this URL is returned.
        externalUrl = ver.download_url;
      } else {
        return json({ error: "File not found" }, 404);
      }
    } else {
      // Legacy flow: caller supplies the storage path directly.
      path = normalisePath(bucket, String(body?.path ?? ""));
      if (!path) return json({ error: "Missing file path" }, 400);

      // Find the plugin this file belongs to
      const { data: direct } = await admin
        .from("plugins")
        .select("id")
        .eq("jar_path", path)
        .maybeSingle();
      if (direct) pluginId = direct.id;

      if (!pluginId) {
        const { data: ver } = await admin
          .from("plugin_versions")
          .select("plugin_id")
          .eq("jar_path", path)
          .maybeSingle();
        if (ver) pluginId = ver.plugin_id;
      }

      if (!pluginId) return json({ error: "File not found" }, 404);
    }

    // Who is asking (optional)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const { data } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = data.user?.id ?? null;
    }

    const { data: plugin } = await admin
      .from("plugins")
      .select("id, published, user_id, org_id")
      .eq("id", pluginId)
      .maybeSingle();
    if (!plugin) return json({ error: "File not found" }, 404);

    let allowed = plugin.published === true;

    if (!allowed && userId) {
      if (plugin.user_id === userId) {
        allowed = true;
      } else {
        const [{ data: adminRole }, { data: member }] = await Promise.all([
          admin
            .from("user_roles")
            .select("role")
            .eq("user_id", userId)
            .in("role", ["admin", "owner"])
            .maybeSingle(),
          plugin.org_id
            ? admin
                .from("organization_members")
                .select("user_id")
                .eq("org_id", plugin.org_id)
                .eq("user_id", userId)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);
        allowed = !!adminRole || !!member;
      }
    }

    if (!allowed) return json({ error: "Not authorised to download this file" }, 403);

    if (externalUrl) return json({ url: externalUrl });
    if (!path) return json({ error: "File not found" }, 404);

    const { data: signed, error } = await admin.storage
      .from(bucket)
      .createSignedUrl(path, 300, { download: true });

    if (error || !signed?.signedUrl) {
      return json({ error: error?.message ?? "Could not create download link" }, 500);
    }

    return json({ url: signed.signedUrl });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
