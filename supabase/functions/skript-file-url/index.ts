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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const skriptId = typeof body?.skript_id === "string" ? body.skript_id : null;
    if (!skriptId) return json({ error: "Missing skript id" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data: sk } = await admin
      .from("user_skripts")
      .select("id, user_id, published, storage_path, filename")
      .eq("id", skriptId)
      .maybeSingle();
    if (!sk?.storage_path) return json({ error: "File not found" }, 404);

    let allowed = sk.published === true;

    if (!allowed) {
      const authHeader = req.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const { data } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
        const userId = data.user?.id ?? null;
        if (userId) {
          if (userId === sk.user_id) {
            allowed = true;
          } else {
            const { data: role } = await admin
              .from("user_roles")
              .select("role")
              .eq("user_id", userId)
              .in("role", ["admin", "owner"])
              .maybeSingle();
            allowed = !!role;
          }
        }
      }
    }

    if (!allowed) return json({ error: "Not authorised to download this file" }, 403);

    const { data: signed, error } = await admin.storage
      .from("user-skripts")
      .createSignedUrl(sk.storage_path, 300, { download: sk.filename ?? true });

    if (error || !signed?.signedUrl) {
      return json({ error: error?.message ?? "Could not create download link" }, 500);
    }

    return json({ url: signed.signedUrl });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
