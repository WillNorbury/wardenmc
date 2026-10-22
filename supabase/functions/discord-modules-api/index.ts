import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { getDiscordBotToken } from "../_shared/discord-token.ts";
import { isValidGuildId } from "../_shared/discord-reply-texts.ts";
import {
  MODULE_IDS,
  buildNativeAutoModRules,
  canManageGuildWithRoles,
  defaultModuleSettings,
  isValidDiscordId,
  sanitizeModuleSettings,
  type ModuleId,
} from "../_shared/discord-modules-model.ts";

// Secure per-server module-settings API for the external WardenBot dashboard
// website. Every request must carry the shared secret in the x-dashboard-secret
// header, plus the guild (server) ID and the Discord user ID making the change.
// We verify with Discord itself — using the bot token — that the user owns the
// server or has Administrator / Manage Server there before any read or write.
// Nothing client-supplied is trusted beyond identity claims we can verify.

const DISCORD_API = "https://discord.com/api/v10";
const SECRET_HEADER = "x-dashboard-secret";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifyManager(
  botToken: string,
  guildId: string,
  userId: string,
): Promise<{ ok: true } | { error: string; status: number }> {
  const headers = { Authorization: `Bot ${botToken}` };
  const guildRes = await fetch(`${DISCORD_API}/guilds/${guildId}`, { headers });
  if (guildRes.status === 404 || guildRes.status === 403) {
    return { error: "WardenBot is not in that server.", status: 404 };
  }
  if (!guildRes.ok) return { error: "Discord could not verify that server. Try again shortly.", status: 502 };
  const guild = await guildRes.json();

  const memberRes = await fetch(`${DISCORD_API}/guilds/${guildId}/members/${userId}`, { headers });
  if (memberRes.status === 404) return { error: "That user is not a member of that server.", status: 403 };
  if (!memberRes.ok) return { error: "Discord could not verify that user. Try again shortly.", status: 502 };
  const member = await memberRes.json();

  const rolesRes = await fetch(`${DISCORD_API}/guilds/${guildId}/roles`, { headers });
  if (!rolesRes.ok) return { error: "Discord could not verify permissions. Try again shortly.", status: 502 };
  const roles = await rolesRes.json();

  if (!canManageGuildWithRoles(guild, Array.isArray(member?.roles) ? member.roles : [], Array.isArray(roles) ? roles : [], userId)) {
    return { error: "That user needs to own the server or have Manage Server permission.", status: 403 };
  }
  return { ok: true };
}

// Push the saved AutoMod settings into Discord's native Auto Moderation so the
// rules are enforced by Discord itself, without the bot needing a connection.
async function syncNativeAutoMod(botToken: string, guildId: string, settings: unknown) {
  const desired = buildNativeAutoModRules(settings as never);
  const headers = { Authorization: `Bot ${botToken}`, "Content-Type": "application/json" };
  const listRes = await fetch(`${DISCORD_API}/guilds/${guildId}/auto-moderation/rules`, { headers });
  if (!listRes.ok) return { synced: false, detail: `list failed (${listRes.status})` };
  const existing = (await listRes.json()) as { id: string; name: string }[];
  const ours = Array.isArray(existing) ? existing.filter((r) => r.name.startsWith("WardenBot: ")) : [];
  const desiredNames = new Set(desired.map((r) => r.name));
  for (const rule of ours) {
    if (!desiredNames.has(rule.name)) {
      await fetch(`${DISCORD_API}/guilds/${guildId}/auto-moderation/rules/${rule.id}`, { method: "DELETE", headers });
    }
  }
  let failed: string | null = null;
  for (const rule of desired) {
    const current = ours.find((r) => r.name === rule.name);
    const res = await fetch(
      current
        ? `${DISCORD_API}/guilds/${guildId}/auto-moderation/rules/${current.id}`
        : `${DISCORD_API}/guilds/${guildId}/auto-moderation/rules`,
      { method: current ? "PATCH" : "POST", headers, body: JSON.stringify(rule) },
    );
    if (!res.ok) failed = `${rule.name} (${res.status})`;
  }
  return failed ? { synced: false, detail: failed } : { synced: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const expected = Deno.env.get("DASHBOARD_API_SECRET") ?? "";
  const provided = req.headers.get(SECRET_HEADER) ?? "";
  if (!expected || !timingSafeEqual(provided, expected)) {
    return json({ error: "Invalid or missing dashboard secret." }, 401);
  }

  const url = new URL(req.url);
  let guildId = url.searchParams.get("guild_id") ?? "";
  let userId = url.searchParams.get("user_id") ?? "";
  let moduleParam = url.searchParams.get("module") ?? "";
  let settingsInput: unknown;

  if (req.method === "PUT") {
    let body: any;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }
    guildId = body?.guild_id ?? guildId;
    userId = body?.user_id ?? userId;
    moduleParam = body?.module ?? moduleParam;
    settingsInput = body?.settings;
  }

  if (!isValidGuildId(guildId)) return json({ error: "A valid guild_id is required." }, 400);
  if (!isValidDiscordId(userId)) return json({ error: "A valid user_id is required." }, 400);
  if (!MODULE_IDS.includes(moduleParam as ModuleId)) {
    return json({ error: "module must be one of: welcome, reactionroles, automod." }, 400);
  }
  const module = moduleParam as ModuleId;

  const botToken = await getDiscordBotToken();
  if (!botToken) return json({ error: "Bot token is not configured." }, 503);

  const check = await verifyManager(botToken, guildId, userId);
  if ("error" in check) return json({ error: check.error }, check.status);

  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (req.method === "GET") {
    const { data: row } = await client
      .from("discord_guild_module_settings")
      .select("settings, updated_at, updated_by")
      .eq("guild_id", guildId)
      .eq("module", module)
      .maybeSingle();
    return json({
      guild_id: guildId,
      module,
      settings: row?.settings ?? defaultModuleSettings(module),
      updated_at: row?.updated_at ?? null,
      updated_by: row?.updated_by ?? null,
    });
  }

  if (req.method === "PUT") {
    const settings = sanitizeModuleSettings(module, settingsInput);
    const { error } = await client
      .from("discord_guild_module_settings")
      .upsert({ guild_id: guildId, module, settings, updated_by: userId, updated_at: new Date().toISOString() });
    if (error) return json({ error: "Could not save the settings. Try again shortly." }, 500);

    let automod: { synced: boolean; detail?: string } | undefined;
    if (module === "automod") {
      automod = await syncNativeAutoMod(botToken, guildId, settings);
    }
    return json({ ok: true, guild_id: guildId, module, settings, ...(automod ? { automod } : {}) });
  }

  return json({ error: "Method not allowed" }, 405);
});
