// /setapply + /apply: per-server application website link (database side).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { canSetApply, DEFAULT_APPLY_URL, normalizeApplyUrl, setApplyInput } from "./discord-apply-model.ts";

const client = () => {
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Apply service is not configured");
  return createClient(url, key);
};

export async function setApplyUrl(body: any): Promise<string> {
  const input = setApplyInput(body);
  if (!input) return "⚠️ Use /setapply url:https://example.com/apply in a server. The link must start with https://";
  if (!canSetApply(body?.member?.permissions)) return "⛔ You need Manage Server permission to set the application link.";
  const { error } = await client().from("discord_apply_settings").upsert(
    { guild_id: input.guildId, apply_url: input.url, configured_by: input.userId, updated_at: new Date().toISOString() },
    { onConflict: "guild_id" },
  );
  if (error) return "❌ The application link could not be saved. Please try again shortly.";
  return `✅ Application link set to <${input.url}>. Members can get it with /apply.`;
}

export async function getApplyUrl(body: any): Promise<string> {
  const guildId = body?.guild_id;
  if (typeof guildId !== "string" || !/^\d{17,20}$/.test(guildId)) return "⚠️ Run this command in a server.";
  const { data, error } = await client().from("discord_apply_settings").select("apply_url").eq("guild_id", guildId).maybeSingle();
  if (error) return "❌ The application link could not be loaded. Please try again shortly.";
  const url = normalizeApplyUrl(data?.apply_url) ?? DEFAULT_APPLY_URL;
  return `📋 Apply for the team here: <${url}>`;
}
