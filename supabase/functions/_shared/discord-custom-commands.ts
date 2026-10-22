// Per-server custom reply commands (database + Discord guild-command registration).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getDiscordBotToken } from "./discord-token.ts";
import { moderationRegistrations } from "./moderation-commands.ts";
import {
  addCommandInput,
  canManageCustomCommands,
  CUSTOM_COMMAND_DESCRIPTION,
  MAX_CUSTOM_COMMANDS_PER_GUILD,
  removeCommandInput,
  RESERVED_CUSTOM_COMMAND_NAMES,
} from "./discord-custom-commands-model.ts";

const client = () => {
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Custom commands service is not configured");
  return createClient(url, key);
};

const reservedNames = () =>
  new Set([
    ...RESERVED_CUSTOM_COMMAND_NAMES,
    ...moderationRegistrations().map((r: { name: string }) => r.name),
  ]);

const DISCORD_API = "https://discord.com/api/v10";

async function registerGuildCommand(guildId: string, name: string): Promise<{ ok: boolean; error?: string }> {
  const appId = Deno.env.get("DISCORD_APPLICATION_ID");
  const token = await getDiscordBotToken();
  if (!appId || !token) return { ok: false, error: "bot credentials are not configured" };
  const r = await fetch(`${DISCORD_API}/applications/${appId}/guilds/${guildId}/commands`, {
    method: "POST",
    headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name, description: CUSTOM_COMMAND_DESCRIPTION, type: 1 }),
  });
  if (!r.ok) {
    const details = await r.text().catch(() => "");
    return { ok: false, error: `Discord rejected it (${r.status}): ${details.slice(0, 150)}` };
  }
  return { ok: true };
}

async function deleteGuildCommand(guildId: string, name: string): Promise<void> {
  const appId = Deno.env.get("DISCORD_APPLICATION_ID");
  const token = await getDiscordBotToken();
  if (!appId || !token) return;
  const headers = { Authorization: `Bot ${token}` };
  const list = await fetch(`${DISCORD_API}/applications/${appId}/guilds/${guildId}/commands`, { headers });
  if (!list.ok) return;
  const commands = await list.json().catch(() => []);
  const match = Array.isArray(commands) ? commands.find((c: any) => c?.name === name) : null;
  if (!match?.id) return;
  await fetch(`${DISCORD_API}/applications/${appId}/guilds/${guildId}/commands/${match.id}`, {
    method: "DELETE",
    headers,
  }).catch(() => {});
}

export async function addCustomCommand(body: any): Promise<string> {
  const input = addCommandInput(body, reservedNames());
  if (!input.ok) return input.error;
  if (!canManageCustomCommands(body?.member?.permissions)) {
    return "⛔ You need Manage Server permission to manage custom commands.";
  }
  const supabase = client();
  const { count, error: countError } = await supabase
    .from("discord_custom_commands")
    .select("id", { count: "exact", head: true })
    .eq("guild_id", input.guildId);
  if (countError) return "❌ The custom command could not be saved. Please try again shortly.";

  const { data: existing } = await supabase
    .from("discord_custom_commands")
    .select("id")
    .eq("guild_id", input.guildId)
    .eq("name", input.name)
    .maybeSingle();
  if (!existing && (count ?? 0) >= MAX_CUSTOM_COMMANDS_PER_GUILD) {
    return `⚠️ This server already has ${MAX_CUSTOM_COMMANDS_PER_GUILD} custom commands. Remove one with /removecommand first.`;
  }

  const { error } = await supabase.from("discord_custom_commands").upsert(
    {
      guild_id: input.guildId,
      name: input.name,
      response: input.response,
      created_by: input.userId,
    },
    { onConflict: "guild_id,name" },
  );
  if (error) return "❌ The custom command could not be saved. Please try again shortly.";

  const reg = await registerGuildCommand(input.guildId, input.name);
  if (!reg.ok) return `⚠️ /${input.name} was saved, but Discord would not register it (${reg.error}). Try again shortly.`;
  return `✅ /${input.name} added — members can run it now. Change it anytime with /addcommand, remove it with /removecommand.`;
}

export async function removeCustomCommand(body: any): Promise<string> {
  const input = removeCommandInput(body);
  if (!input.ok) return input.error;
  if (!canManageCustomCommands(body?.member?.permissions)) {
    return "⛔ You need Manage Server permission to manage custom commands.";
  }
  const { data: existing, error: lookupError } = await client()
    .from("discord_custom_commands")
    .select("id")
    .eq("guild_id", input.guildId)
    .eq("name", input.name)
    .maybeSingle();
  if (lookupError) return "❌ The custom command could not be removed. Please try again shortly.";
  if (!existing) return `⚠️ This server has no custom command called /${input.name}.`;
  const { error } = await client()
    .from("discord_custom_commands")
    .delete()
    .eq("guild_id", input.guildId)
    .eq("name", input.name);
  if (error) return "❌ The custom command could not be removed. Please try again shortly.";
  await deleteGuildCommand(input.guildId, input.name);
  return `✅ /${input.name} removed.`;
}

export async function listCustomCommands(body: any): Promise<string> {
  const guildId = body?.guild_id;
  if (typeof guildId !== "string" || !/^\d{17,20}$/.test(guildId)) return "⚠️ Use this command in a server.";
  const { data, error } = await client()
    .from("discord_custom_commands")
    .select("name")
    .eq("guild_id", guildId)
    .order("name", { ascending: true });
  if (error) return "❌ The custom commands could not be loaded. Please try again shortly.";
  if (!data?.length) return "This server has no custom commands yet. Server managers can add one with /addcommand.";
  return `**Custom commands in this server (${data.length}/${MAX_CUSTOM_COMMANDS_PER_GUILD}):**\n` +
    data.map((c: { name: string }) => `• /${c.name}`).join("\n");
}

// Fallback reply for a guild-registered command that isn't a built-in.
export async function getCustomCommandResponse(body: any): Promise<string | null> {
  const guildId = body?.guild_id;
  const name = body?.data?.name;
  if (typeof guildId !== "string" || !/^\d{17,20}$/.test(guildId)) return null;
  if (typeof name !== "string" || !/^[a-z0-9_-]{1,32}$/.test(name)) return null;
  const { data, error } = await client()
    .from("discord_custom_commands")
    .select("response")
    .eq("guild_id", guildId)
    .eq("name", name)
    .maybeSingle();
  if (error || !data) return null;
  const who = body.member?.user?.username ?? body.user?.username ?? "there";
  return String(data.response).replace(/\{user\}/g, who);
}
