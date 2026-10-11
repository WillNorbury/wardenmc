// One-shot helper to register the /rules slash command globally.
// Invoke from the admin tab; admin-only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getDiscordBotToken } from "../_shared/discord-token.ts";
import { moderationRegistrations } from "../_shared/moderation-commands.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ ok: false, error: "Unauthorized" }, 401);
    const { data: role } = await userClient
      .from("user_roles").select("role").eq("user_id", u.user.id).in("role", ["admin", "owner", "founder", "*"]).limit(1).maybeSingle();
    if (!role) return json({ ok: false, error: "Admin only" }, 403);

    const appId = Deno.env.get("DISCORD_APPLICATION_ID");
    const token = await getDiscordBotToken();
    if (!appId || !token) return json({ ok: false, error: "Missing DISCORD_APPLICATION_ID or DISCORD_BOT_TOKEN" }, 400);

    // Commands are configured in the admin panel (site_content -> discord_commands).
    const { data: cfgRow } = await userClient
      .from("site_content").select("value").eq("key", "discord_commands").maybeSingle();
    const configured = Array.isArray((cfgRow?.value as any)?.commands)
      ? ((cfgRow!.value as any).commands as any[])
      : [];
    const fromConfig = configured
      .filter((c) => c && c.enabled !== false && typeof c.name === "string" && c.name.trim())
      .map((c) => ({
        name: String(c.name).toLowerCase().slice(0, 32),
        description: String(c.description ?? "").slice(0, 100) || "Warden Network command",
        type: 1,
      }));
    const cmds = fromConfig.length > 0 ? fromConfig : [
      { name: "rules", description: "Show the Warden Network server rules", type: 1 },
      { name: "subscribe", description: "Subscribe to email notifications from Warden Network", type: 1 },
      { name: "unsubscribe", description: "Unsubscribe from email notifications from Warden Network", type: 1 },
    ];
    const modNames = new Set(moderationRegistrations().map((m) => m.name));
    const allCmds = [...cmds.filter((c) => !modNames.has(c.name)), ...moderationRegistrations()];
    const r = await fetch(`https://discord.com/api/v10/applications/${appId}/commands`, {
      method: "PUT",
      headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(allCmds),
    });
    const data = await r.json().catch(() => ({}));
    return json(r.ok ? { ok: true, registered: data } : { ok: false, status: r.status, details: data }, r.ok ? 200 : 500);
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
