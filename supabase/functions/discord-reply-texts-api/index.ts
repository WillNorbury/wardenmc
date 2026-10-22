import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  canManageGuild,
  isValidGuildId,
  loadReplyTexts,
  sanitizeReplyOverrides,
} from "../_shared/discord-reply-texts.ts";

// Secure per-server reply-text API for the WardenBot dashboard website.
// The caller authenticates with their own Discord OAuth access token
// (Authorization: Bearer <token>). We verify it with Discord and only allow
// reading/saving a guild's overrides when that user owns the server or has
// Administrator / Manage Server there. Nothing client-supplied is trusted.

const DISCORD_API = "https://discord.com/api/v10";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function verifyManager(token: string, guildId: string) {
  const headers = { Authorization: `Bearer ${token}` };
  const [meRes, guildsRes] = await Promise.all([
    fetch(`${DISCORD_API}/users/@me`, { headers }),
    fetch(`${DISCORD_API}/users/@me/guilds`, { headers }),
  ]);
  if (meRes.status === 401 || guildsRes.status === 401) return { error: "Invalid or expired Discord token.", status: 401 };
  if (!meRes.ok || !guildsRes.ok) return { error: "Discord could not verify your account. Try again shortly.", status: 502 };
  const me = await meRes.json();
  const guilds = await guildsRes.json();
  if (!Array.isArray(guilds)) return { error: "Discord returned an unexpected server list.", status: 502 };
  const guild = guilds.find((g: any) => g?.id === guildId);
  if (!guild) return { error: "You are not a member of that server.", status: 403 };
  if (!canManageGuild(guild)) return { error: "You need Manage Server permission in that server.", status: 403 };
  return { userId: String(me?.id ?? "") };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return json({ error: "Sign in with Discord first." }, 401);

  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (req.method === "GET") {
    const guildId = new URL(req.url).searchParams.get("guild_id") ?? "";
    if (!isValidGuildId(guildId)) return json({ error: "A valid guild_id is required." }, 400);
    const check = await verifyManager(token, guildId);
    if ("error" in check) return json({ error: check.error }, check.status);
    const { data: row } = await client
      .from("discord_guild_reply_texts")
      .select("replies, updated_at")
      .eq("guild_id", guildId)
      .maybeSingle();
    const texts = await loadReplyTexts(client, guildId);
    return json({ guild_id: guildId, overrides: sanitizeReplyOverrides(row?.replies), texts, updated_at: row?.updated_at ?? null });
  }

  if (req.method === "PUT") {
    let body: any;
    try { body = await req.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }
    const guildId = body?.guild_id;
    if (!isValidGuildId(guildId)) return json({ error: "A valid guild_id is required." }, 400);
    const check = await verifyManager(token, guildId);
    if ("error" in check) return json({ error: check.error }, check.status);
    const overrides = sanitizeReplyOverrides(body?.replies);
    const { error } = await client
      .from("discord_guild_reply_texts")
      .upsert({ guild_id: guildId, replies: overrides, updated_by: check.userId, updated_at: new Date().toISOString() });
    if (error) return json({ error: "Could not save the reply texts. Try again shortly." }, 500);
    return json({ ok: true, guild_id: guildId, overrides });
  }

  if (req.method === "DELETE") {
    const guildId = new URL(req.url).searchParams.get("guild_id") ?? "";
    if (!isValidGuildId(guildId)) return json({ error: "A valid guild_id is required." }, 400);
    const check = await verifyManager(token, guildId);
    if ("error" in check) return json({ error: check.error }, check.status);
    const { error } = await client.from("discord_guild_reply_texts").delete().eq("guild_id", guildId);
    if (error) return json({ error: "Could not reset the reply texts. Try again shortly." }, 500);
    return json({ ok: true, guild_id: guildId });
  }

  return json({ error: "Method not allowed" }, 405);
});
