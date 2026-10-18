import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getDiscordBotToken } from "./discord-token.ts";
import { STATUS_URL } from "./site-urls.ts";
import { buildMinecraftEmbed, normalizeServerAddress, buildStatusEmbed, canSetupStatus, statusSetupInput, STATUS_SERVICES } from "./discord-status-model.ts";

const client = () => {
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Status service is not configured");
  return createClient(url, key);
};

async function payload(db: ReturnType<typeof client>, address?: string | null) {
  if (address) {
    const validated = normalizeServerAddress(address);
    let data = null;
    if (validated) try {
      // Never fetch a user URL directly: only the fixed Minecraft status provider.
      const response = await fetch(`https://api.mcsrvstat.us/3/${encodeURIComponent(validated)}`, { signal: AbortSignal.timeout(8000) });
      const result = await response.json();
      if (response.ok) data = result;
    } catch { /* Unknown is not the same as offline. */ }
    return { embeds: [buildMinecraftEmbed(validated ?? "Invalid address", data)], allowed_mentions: { parse: [] } };
  }
  const checks = await Promise.all(STATUS_SERVICES.map(async ([key]) => {
    const { data, error } = await db.from("uptime_checks").select("service_key,is_up,checked_at")
      .eq("service_key", key).order("checked_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error("Could not read service checks");
    return data;
  }));
  return { embeds: [buildStatusEmbed(checks.filter((c) => c !== null), STATUS_URL)], allowed_mentions: { parse: [] } };
}

const api = (token: string, method: string, path: string, body?: unknown) => fetch(`https://discord.com/api/v10${path}`, {
  method, headers: { Authorization: `Bot ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
  body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(10000),
});

export async function setupStatusPanel(body: unknown): Promise<string> {
  const input = statusSetupInput(body);
  if (!input) return "⚠️ Use /status setup ip:play.example.com in a server text channel. A port such as :25565 is optional.";
  if (!canSetupStatus((body as any).member?.permissions)) return "⛔ You need Manage Server permission to set up a status panel.";
  const db = client(), token = await getDiscordBotToken();
  if (!token) return "❌ WardenBot is not configured.";
  const channelResponse = await api(token, "GET", `/channels/${input.channelId}`);
  if (!channelResponse.ok) { await channelResponse.text(); return "❌ WardenBot needs View Channel permission here."; }
  const channel = await channelResponse.json();
  if (channel.guild_id !== input.guildId || ![0, 5].includes(channel.type)) return "⚠️ Run this command in a server text or announcement channel.";

  // A single per-channel row prevents duplicate panels from simultaneous setup requests.
  const { error: insertError } = await db.from("discord_status_panels").insert({ channel_id: input.channelId, guild_id: input.guildId, configured_by: input.userId, server_address: input.address });
  if (insertError && insertError.code !== "23505") throw new Error("Could not save status setup");
  const { data: panel, error: readError } = await db.from("discord_status_panels").select("message_id,guild_id,updated_at").eq("channel_id", input.channelId).single();
  if (readError || !panel || panel.guild_id !== input.guildId) throw new Error("Could not read status setup");
  if (insertError && !panel.message_id && Date.now() - Date.parse(panel.updated_at) < 30000) return "⚠️ Setup is already in progress. Please wait a moment.";
  const message = await payload(db, input.address);
  let response = panel.message_id ? await api(token, "PATCH", `/channels/${input.channelId}/messages/${panel.message_id}`, message) : null;
  if (response?.status === 404) { await response.text(); response = null; }
  if (!response) response = await api(token, "POST", `/channels/${input.channelId}/messages`, message);
  if (!response.ok) {
    const status = response.status; await response.text();
    if (!panel.message_id) await db.from("discord_status_panels").delete().eq("channel_id", input.channelId).is("message_id", null);
    return status === 429 ? "⚠️ Discord is busy. Please try again shortly." : "❌ WardenBot needs View Channel, Send Messages and Embed Links permissions here.";
  }
  const posted = await response.json();
  const { error } = await db.from("discord_status_panels").update({ message_id: posted.id, server_address: input.address, configured_by: input.userId, updated_at: new Date().toISOString() }).eq("channel_id", input.channelId).eq("guild_id", input.guildId);
  if (error) {
    if (!panel.message_id) { const cleanup = await api(token, "DELETE", `/channels/${input.channelId}/messages/${posted.id}`); await cleanup.text(); }
    throw new Error("Could not save the status message");
  }
  return `✅ Live Minecraft status for \`${input.address}\` is ready in <#${input.channelId}>. Checks run about every minute; server data may be cached.`;
}

// Called only by the authenticated presence keepalive; never exposed as a public writer.
export async function syncStatusPanels(db: ReturnType<typeof client>) {
  const { data: panels, error } = await db.from("discord_status_panels").select("channel_id,message_id,server_address").not("message_id", "is", null);
  if (error) throw new Error("Could not load Discord status panels");
  if (!panels?.length) return;
  const token = await getDiscordBotToken();
  if (!token) return;
  const messages = new Map<string, Awaited<ReturnType<typeof payload>>>();
  for (const panel of panels) {
    const key = panel.server_address ?? "";
    let message = messages.get(key);
    if (!message) { message = await payload(db, panel.server_address); messages.set(key, message); }
    const r = await api(token, "PATCH", `/channels/${panel.channel_id}/messages/${panel.message_id}`, message);
    const status = r.status; await r.text();
    if (status === 404) await db.from("discord_status_panels").delete().eq("channel_id", panel.channel_id).eq("message_id", panel.message_id);
    if (r.ok) await db.from("discord_status_panels").update({ updated_at: new Date().toISOString() }).eq("channel_id", panel.channel_id);
    if (status === 429) break; // Retry on the next existing check, never flood Discord.
  }
}

export async function completeStatusInteraction(body: any) {
  let content: string;
  try { content = await setupStatusPanel(body); }
  catch { content = "❌ Status setup could not finish. Please try again shortly."; }
  // The signed Discord interaction's token is used only for its own deferred reply.
  const r = await fetch(`https://discord.com/api/v10/webhooks/${body.application_id}/${body.token}/messages/@original`, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, allowed_mentions: { parse: [] } }), signal: AbortSignal.timeout(10000),
  });
  await r.text();
  if (!r.ok) console.warn("Status interaction reply failed", r.status);
}