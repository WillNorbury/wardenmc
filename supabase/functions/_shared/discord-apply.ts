// /setapply + /apply: per-server application website link.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const DEFAULT_APPLY_URL = "https://warden.rip/apply";
export const MAX_APPLY_URL_LEN = 200;

export const setApplyRegistration = {
  name: "setapply", description: "Set the application website link for this server",
  type: 1, dm_permission: false, default_member_permissions: "32",
  options: [{ type: 3, name: "url", description: "Application website, e.g. https://warden.rip/apply", required: true, max_length: MAX_APPLY_URL_LEN }],
};

export const applyRegistration = {
  name: "apply", description: "Get the link to apply for this server's team",
  type: 1, dm_permission: false,
};

export function canSetApply(permissions: unknown): boolean {
  if (typeof permissions !== "string" || !/^\d{1,24}$/.test(permissions)) return false;
  const bits = BigInt(permissions);
  return (bits & 8n) !== 0n || (bits & 32n) !== 0n; // Administrator or Manage Server
}

export function normalizeApplyUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (raw.length < 10 || raw.length > MAX_APPLY_URL_LEN) return null;
  let url: URL;
  try { url = new URL(raw); } catch { return null; }
  if (url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  return url.toString();
}

const snowflake = (v: unknown): v is string => typeof v === "string" && /^\d{17,20}$/.test(v);

export function setApplyInput(body: any): { guildId: string; userId: string; url: string } | null {
  if (!snowflake(body?.guild_id) || !snowflake(body?.member?.user?.id)) return null;
  if (body.data?.name !== "setapply") return null;
  const options = body.data?.options;
  if (!Array.isArray(options) || options.length !== 1 || options[0]?.name !== "url" || options[0]?.type !== 3) return null;
  const url = normalizeApplyUrl(options[0].value);
  if (!url) return null;
  return { guildId: body.guild_id, userId: body.member.user.id, url };
}

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
  if (!snowflake(body?.guild_id)) return "⚠️ Run this command in a server.";
  const { data, error } = await client().from("discord_apply_settings").select("apply_url").eq("guild_id", body.guild_id).maybeSingle();
  if (error) return "❌ The application link could not be loaded. Please try again shortly.";
  const url = normalizeApplyUrl(data?.apply_url) ?? DEFAULT_APPLY_URL;
  return `📋 Apply for the team here: <${url}>`;
}
