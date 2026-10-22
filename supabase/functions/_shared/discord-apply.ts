// /setapply + /apply: per-server application website link (database side).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { canSetApply, DEFAULT_APPLY_URL, normalizeApplyUrl, setApplyInput } from "./discord-apply-model.ts";
import { loadReplyTexts, renderReply, type ReplyTexts } from "./discord-reply-texts.ts";

const client = () => {
  const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Apply service is not configured");
  return createClient(url, key);
};

export async function setApplyUrl(body: any, texts?: ReplyTexts): Promise<string> {
  const t = texts ?? await loadReplyTexts(client());
  const input = setApplyInput(body);
  if (!input) return renderReply(t, "setapply_usage");
  if (!canSetApply(body?.member?.permissions)) return renderReply(t, "setapply_permission");
  const { error } = await client().from("discord_apply_settings").upsert(
    { guild_id: input.guildId, apply_url: input.url, configured_by: input.userId, updated_at: new Date().toISOString() },
    { onConflict: "guild_id" },
  );
  if (error) return renderReply(t, "setapply_failed");
  return renderReply(t, "setapply_done", { url: input.url });
}

export async function getApplyUrl(body: any, texts?: ReplyTexts): Promise<string> {
  const t = texts ?? await loadReplyTexts(client());
  const guildId = body?.guild_id;
  if (typeof guildId !== "string" || !/^\d{17,20}$/.test(guildId)) return renderReply(t, "apply_server_only");
  const { data, error } = await client().from("discord_apply_settings").select("apply_url").eq("guild_id", guildId).maybeSingle();
  if (error) return renderReply(t, "apply_failed");
  const url = normalizeApplyUrl(data?.apply_url) ?? DEFAULT_APPLY_URL;
  return renderReply(t, "apply_done", { url });
}
