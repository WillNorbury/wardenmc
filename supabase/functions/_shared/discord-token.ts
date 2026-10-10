import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Resolves the Discord bot token. Admins can set it in the dashboard
// (stored in site_content under the "discord_bot" key); the
// DISCORD_BOT_TOKEN environment secret is the fallback.
export async function getDiscordBotToken(): Promise<string | null> {
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data } = await admin
      .from("site_content")
      .select("value")
      .eq("key", "discord_bot")
      .maybeSingle();
    const t = (data?.value as Record<string, unknown> | null)?.botToken;
    if (typeof t === "string" && t.trim()) return t.trim();
  } catch (_) {
    // fall through to the env secret
  }
  return Deno.env.get("DISCORD_BOT_TOKEN") ?? null;
}
