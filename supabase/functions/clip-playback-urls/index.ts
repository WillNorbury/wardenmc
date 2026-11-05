import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Issues short-lived playback links only for clips listed in community_clips,
// whose file sits in the uploader's own folder.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body?.clip_ids) ? body.clip_ids.filter((v: unknown) => typeof v === "string" && UUID.test(v)) : [];
    if (!ids.length || ids.length > 100) return json({ error: "Provide 1 to 100 clip ids" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const { data: clips, error } = await admin.from("community_clips").select("id, user_id, storage_path").in("id", ids);
    if (error) return json({ error: "Clips could not be loaded" }, 500);

    const valid = (clips ?? []).filter((c) => c.storage_path && c.storage_path.split("/")[0] === c.user_id);
    if (!valid.length) return json({ urls: {} });

    const { data: signed, error: signError } = await admin.storage
      .from("community-clips")
      .createSignedUrls(valid.map((c) => c.storage_path), 3600);
    if (signError) return json({ error: "Playback links could not be created" }, 500);

    const urls: Record<string, string> = {};
    for (const c of valid) {
      const s = signed?.find((x) => x.path === c.storage_path);
      if (s?.signedUrl) urls[c.id] = s.signedUrl;
    }
    return json({ urls });
  } catch {
    return json({ error: "Unexpected error" }, 500);
  }
});
