export const STATUS_SERVICES = [
  ["website", "Website"], ["minecraft", "Minecraft Server"],
  ["api", "API"], ["panel", "Panel"], ["discord", "Discord"],
] as const;

export const statusRegistration = {
  name: "status", description: "Set up a live Warden Network status panel",
  type: 1, dm_permission: false, default_member_permissions: "32",
  options: [{ type: 1, name: "setup", description: "Post or refresh a live status panel in this channel" }],
};

export function canSetupStatus(permissions: unknown): boolean {
  if (typeof permissions !== "string" || !/^\d{1,24}$/.test(permissions)) return false;
  const bits = BigInt(permissions);
  return (bits & 8n) !== 0n || (bits & 32n) !== 0n;
}

export function statusSetupInput(body: any) {
  const snowflake = (v: unknown): v is string => typeof v === "string" && /^\d{17,20}$/.test(v);
  if (!snowflake(body?.guild_id) || !snowflake(body?.channel_id) || !snowflake(body?.member?.user?.id)) return null;
  if (body.data?.name !== "status" || body.data?.options?.length !== 1 || body.data.options[0]?.name !== "setup" || body.data.options[0]?.type !== 1) return null;
  return { guildId: body.guild_id as string, channelId: body.channel_id as string, userId: body.member.user.id as string };
}

export type ServiceCheck = { service_key: string; is_up: boolean; checked_at: string };
export function buildStatusEmbed(checks: ServiceCheck[], statusUrl: string, now = Date.now()) {
  const fields = STATUS_SERVICES.map(([key, name]) => {
    const check = checks.find((c) => c.service_key === key);
    const age = check ? now - Date.parse(check.checked_at) : Infinity;
    const known = Number.isFinite(age) && age >= -60000 && age <= 15 * 60000;
    return { name, value: !known ? "⚪ Awaiting fresh check" : check?.is_up ? "🟢 Operational" : "🔴 Outage", inline: true };
  });
  const outage = fields.some((f) => f.value.startsWith("🔴"));
  const unknown = fields.some((f) => f.value.startsWith("⚪"));
  return {
    title: "Warden Network · Live status", url: statusUrl,
    description: outage ? "Some services are experiencing an outage." : unknown ? "Waiting for fresh service checks." : "All services operational.",
    color: outage ? 0xef4444 : unknown ? 0x94a3b8 : 0x0082a2,
    fields, timestamp: new Date(now).toISOString(),
    footer: { text: "WardenBot • Updated after each website status check (about 5 minutes)" },
  };
}