import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getDiscordBotToken } from "../_shared/discord-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function discordPut(guildId: string, userId: string, roleId: string, token: string) {
  const r = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${roleId}`,
    { method: "PUT", headers: { Authorization: `Bot ${token}` } },
  );
  return { ok: r.ok, status: r.status, body: r.ok ? null : await r.text() };
}
async function discordDelete(guildId: string, userId: string, roleId: string, token: string) {
  const r = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${roleId}`,
    { method: "DELETE", headers: { Authorization: `Bot ${token}` } },
  );
  return { ok: r.ok || r.status === 404, status: r.status, body: r.ok ? null : await r.text() };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const accessToken = authHeader.replace(/^Bearer\s+/i, "");
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    if (!accessToken) return json({ ok: false, error: "Unauthorized" }, 401);
    const { data: userData, error: userErr } = await admin.auth.getUser(accessToken);
    const callerId = userData?.user?.id;
    if (userErr || !callerId) return json({ ok: false, error: "Unauthorized" }, 401);
    const { data: roleRows } = await admin
      .from("user_roles").select("role").eq("user_id", callerId).in("role", ["admin", "owner"]).limit(1);
    if (!roleRows || roleRows.length === 0) return json({ ok: false, error: "Forbidden — admin only" }, 403);


    const discordBotToken = await getDiscordBotToken();
    if (!discordBotToken) return json({ ok: false, error: "DISCORD_BOT_TOKEN not configured" }, 500);

    const { user_id } = await req.json().catch(() => ({}));
    if (!user_id || typeof user_id !== "string") return json({ ok: false, error: "user_id required" }, 400);

    // Load mapping + guild
    const [{ data: botCfg }, { data: mapCfg }, { data: profile }, { data: builtin }, { data: custom }] =
      await Promise.all([
        admin.from("site_content").select("value").eq("key", "discord_bot").maybeSingle(),
        admin.from("site_content").select("value").eq("key", "discord_role_map").maybeSingle(),
        admin.from("profiles_private").select("discord_id").eq("user_id", user_id).maybeSingle(),
        admin.from("user_roles").select("role").eq("user_id", user_id),
        admin.from("user_custom_roles").select("role_key").eq("user_id", user_id),
      ]);

    const guildId = (botCfg?.value as any)?.guildId;
    const mapping = ((mapCfg?.value as any)?.map ?? {}) as Record<string, string>;
    if (!guildId) return json({ ok: false, error: "guildId not configured in Discord settings" }, 400);
    if (!profile?.discord_id) {
      return json({ ok: true, skipped: true, reason: "User has no linked Discord account" });
    }

    const userRoleKeys = new Set<string>([
      ...((builtin ?? []) as { role: string }[]).map((r) => r.role),
      ...((custom ?? []) as { role_key: string }[]).map((r) => r.role_key),
    ]);

    const added: string[] = [];
    const removed: string[] = [];
    const errors: { role: string; status: number; body: string | null }[] = [];

    for (const [siteRole, discordRoleId] of Object.entries(mapping)) {
      if (!discordRoleId) continue;
      if (userRoleKeys.has(siteRole)) {
        const r = await discordPut(guildId, profile.discord_id, discordRoleId, discordBotToken);
        if (r.ok) added.push(siteRole);
        else errors.push({ role: siteRole, status: r.status, body: r.body });
      } else {
        const r = await discordDelete(guildId, profile.discord_id, discordRoleId, discordBotToken);
        if (r.ok) removed.push(siteRole);
        else errors.push({ role: siteRole, status: r.status, body: r.body });
      }
    }

    return json({
      ok: errors.length === 0,
      discord_id: profile.discord_id,
      added,
      removed,
      errors,
    });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
