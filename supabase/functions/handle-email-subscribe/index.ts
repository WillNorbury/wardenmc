import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

function json(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }
  const token = authHeader.slice("Bearer ".length);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user?.email) {
    return json({ error: "Unauthorized" }, 401);
  }

  const email = userData.user.email.toLowerCase();

  // Remove suppression so emails will send again
  const { error: delErr } = await admin
    .from("suppressed_emails")
    .delete()
    .eq("email", email);

  if (delErr) {
    console.error("Failed to remove suppression", delErr);
    return json({ error: "Failed to subscribe" }, 500);
  }

  // Reset any used unsubscribe token so future sends aren't blocked
  await admin
    .from("email_unsubscribe_tokens")
    .update({ used_at: null })
    .eq("email", email);

  // Re-enable notification preferences on the private profile
  const { data: profile } = await admin
    .from("profiles_private")
    .select("preferences")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  const prefs = {
    ...(profile?.preferences as Record<string, unknown> | null ?? {}),
    notify_news: true,
    notify_updates: true,
    notify_tickets: true,
    notify_applications: true,
  };
  const { error: prefErr } = await admin
    .from("profiles_private")
    .upsert({ user_id: userData.user.id, preferences: prefs }, { onConflict: "user_id" });
  if (prefErr) {
    console.error("Failed to update preferences", prefErr);
    return json({ error: "Failed to subscribe" }, 500);
  }

  return json({ success: true, email });
});
