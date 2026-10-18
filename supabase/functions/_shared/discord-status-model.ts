export const STATUS_SERVICES = [
  ["website", "Website"], ["minecraft", "Minecraft Server"],
  ["api", "API"], ["panel", "Panel"], ["discord", "Discord"],
] as const;

export const statusRegistration = {
  name: "status", description: "Set up a live Minecraft server status panel",
  type: 1, dm_permission: false, default_member_permissions: "32",
  options: [{ type: 1, name: "setup", description: "Post or refresh a live server status panel in this channel", options: [
    { type: 3, name: "ip", description: "Minecraft server IP or hostname (optional :port)", required: true, max_length: 253 },
  ] }],
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
  const options = body.data.options[0].options;
  if (!Array.isArray(options) || options.length !== 1 || options[0]?.name !== "ip" || options[0]?.type !== 3) return null;
  const address = normalizeServerAddress(options[0].value);
  if (!address) return null;
  return { guildId: body.guild_id as string, channelId: body.channel_id as string, userId: body.member.user.id as string, address };
}

export function normalizeServerAddress(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const address = value.trim().toLowerCase();
  if (address.length > 253) return null;
  const parts = address.split(":");
  if (parts.length > 2) return null;
  const [host, port] = parts;
  if (!host || !host.includes(".") || !host.split(".").every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) return null;
  if (/^[0-9.]+$/.test(host) && (host.split(".").length !== 4 || host.split(".").some((n) => Number(n) > 255))) return null;
  if (port !== undefined && (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535)) return null;
  return address;
}

export function buildMinecraftEmbed(address: string, data: any | null, now = Date.now()) {
  const known = typeof data?.online === "boolean";
  const online = known && data.online;
  const count = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
  const fields = [{ name: "Server address", value: `\`${address}\``, inline: false },
    { name: "Status", value: !known ? "⚪ Status unavailable" : online ? "🟢 Online" : "🔴 Offline", inline: true }];
  if (online) {
    fields.push({ name: "Players", value: `${count(data.players?.online)} / ${count(data.players?.max)}`, inline: true });
    if (typeof data.version === "string") fields.push({ name: "Version", value: data.version.slice(0, 100) || "Unknown", inline: true });
    const motd = Array.isArray(data.motd?.clean) ? data.motd.clean.filter((line: unknown) => typeof line === "string").join("\n").slice(0, 1024) : "";
    if (motd.trim()) fields.push({ name: "MOTD", value: motd, inline: false });
  }
  return { title: "Minecraft · Live server status", color: !known ? 0x94a3b8 : online ? 0x0082a2 : 0xef4444,
    fields, timestamp: new Date(now).toISOString(), footer: { text: "WardenBot • Checks about every minute • Server data may be cached" } };
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