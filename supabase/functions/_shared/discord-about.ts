import { createClient } from "npm:@supabase/supabase-js@2";
import { getDiscordBotToken } from "./discord-token.ts";
import { runAboutCommand } from "./discord-about-model.ts";

export async function aboutCommand(body: Parameters<typeof runAboutCommand>[0]): Promise<Response> {
  const token = await getDiscordBotToken();
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!token || !url || !key) throw new Error("About service is not configured");
  const db = createClient(url, key);
  const content = await runAboutCommand(body, {
    discord: (method, path, payload) => fetch(`https://discord.com/api/v10${path}`, {
      method, headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
      ...(payload ? { body: JSON.stringify(payload) } : {}), signal: AbortSignal.timeout(10000),
    }),
    load: async (guildId) => {
      const { data, error } = await db.from("discord_guild_module_settings").select("settings").eq("guild_id", guildId).eq("module", "about").maybeSingle();
      if (error) throw new Error("Could not read About settings");
      return data?.settings;
    },
    save: async (guildId, userId, settings) => {
      const { error } = await db.from("discord_guild_module_settings").upsert({ guild_id: guildId, module: "about", settings, updated_by: userId, updated_at: new Date().toISOString() });
      if (error) throw new Error("Could not save About settings");
    },
  });
  return new Response(JSON.stringify({ type: 4, data: { content, flags: 64, allowed_mentions: { parse: [] } } }), { headers: { "Content-Type": "application/json" } });
}