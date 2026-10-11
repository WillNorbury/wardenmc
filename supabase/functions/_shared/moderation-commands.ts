// Discord moderation slash commands: definitions (for registration) and handler.
import { getDiscordBotToken } from "./discord-token.ts";

const P = { KICK: 1n << 1n, BAN: 1n << 2n, MANAGE_CHANNELS: 1n << 4n, MANAGE_MESSAGES: 1n << 13n, MODERATE: 1n << 40n };
const USER = 6, STR = 3, INT = 4, CHANNEL = 7;
const opt = (type: number, name: string, description: string, required = false, extra: Record<string, unknown> = {}) =>
  ({ type, name, description, required, ...extra });
const reason = opt(STR, "reason", "Reason", false, { max_length: 400 });

export const MODERATION_COMMANDS = [
  { name: "ban", description: "Ban a member", perm: P.BAN, options: [opt(USER, "user", "Member to ban", true), reason, opt(INT, "delete_days", "Delete messages from the last N days (0-7)", false, { min_value: 0, max_value: 7 })] },
  { name: "unban", description: "Unban a user by ID", perm: P.BAN, options: [opt(STR, "user_id", "User ID to unban", true), reason] },
  { name: "kick", description: "Kick a member", perm: P.KICK, options: [opt(USER, "user", "Member to kick", true), reason] },
  { name: "timeout", description: "Time out (mute) a member", perm: P.MODERATE, options: [opt(USER, "user", "Member", true), opt(INT, "minutes", "Duration in minutes (max 40320)", true, { min_value: 1, max_value: 40320 }), reason] },
  { name: "untimeout", description: "Remove a member's timeout", perm: P.MODERATE, options: [opt(USER, "user", "Member", true), reason] },
  { name: "warn", description: "Warn a member (sent by DM)", perm: P.MODERATE, options: [opt(USER, "user", "Member", true), opt(STR, "reason", "Reason", true, { max_length: 400 })] },
  { name: "purge", description: "Delete recent messages in this channel", perm: P.MANAGE_MESSAGES, options: [opt(INT, "amount", "How many (1-100)", true, { min_value: 1, max_value: 100 }), opt(USER, "user", "Only messages from this member")] },
  { name: "slowmode", description: "Set slowmode for this channel", perm: P.MANAGE_CHANNELS, options: [opt(INT, "seconds", "Seconds (0 to turn off, max 21600)", true, { min_value: 0, max_value: 21600 })] },
  { name: "lock", description: "Stop @everyone sending messages in a channel", perm: P.MANAGE_CHANNELS, options: [opt(CHANNEL, "channel", "Channel (default: this one)"), reason] },
  { name: "unlock", description: "Let @everyone send messages in a channel again", perm: P.MANAGE_CHANNELS, options: [opt(CHANNEL, "channel", "Channel (default: this one)")] },
];

export const moderationRegistrations = () => MODERATION_COMMANDS.map((c) => ({
  name: c.name, description: c.description, type: 1, dm_permission: false,
  default_member_permissions: c.perm.toString(), options: c.options,
}));

const SEND = 1n << 11n;

export async function handleModeration(body: any): Promise<string | null> {
  const def = MODERATION_COMMANDS.find((c) => c.name === body.data?.name);
  if (!def) return null;
  const guild = body.guild_id;
  if (!guild) return "⚠️ Use this command in a server.";
  const perms = BigInt(body.member?.permissions ?? "0");
  if ((perms & 8n) === 0n && (perms & def.perm) === 0n) return "⛔ You don't have permission to use this command.";

  const token = await getDiscordBotToken();
  if (!token) return "❌ Bot token is not configured.";
  const o: Record<string, any> = Object.fromEntries((body.data.options ?? []).map((x: any) => [x.name, x.value]));
  const mod = body.member?.user?.username ?? "a moderator";
  const why = String(o.reason ?? "No reason given");
  const api = (method: string, path: string, json?: unknown, auditReason?: string) =>
    fetch(`https://discord.com/api/v10${path}`, {
      method,
      headers: {
        Authorization: `Bot ${token}`, "Content-Type": "application/json",
        ...(auditReason ? { "X-Audit-Log-Reason": encodeURIComponent(`${mod}: ${auditReason}`.slice(0, 500)) } : {}),
      },
      body: json === undefined ? undefined : JSON.stringify(json),
    });
  const fail = async (r: Response, what: string) =>
    `❌ Couldn't ${what} (${r.status}). ${r.status === 403 ? "The bot needs the right permission and a higher role than the target." : (await r.text()).slice(0, 200)}`;
  const id = (v: unknown) => String(v ?? "").replace(/\D/g, "");
  const dm = async (userId: string, content: string) => {
    const ch = await api("POST", "/users/@me/channels", { recipient_id: userId });
    if (!ch.ok) return false;
    const { id: cid } = await ch.json();
    return (await api("POST", `/channels/${cid}/messages`, { content })).ok;
  };

  switch (def.name) {
    case "ban": {
      const u = id(o.user);
      await dm(u, `🔨 You were banned from the WardenMC server. Reason: ${why}`);
      const r = await api("PUT", `/guilds/${guild}/bans/${u}`, { delete_message_seconds: Math.min(7, Number(o.delete_days ?? 0)) * 86400 }, why);
      return r.ok ? `🔨 Banned <@${u}> — ${why}` : fail(r, "ban that member");
    }
    case "unban": {
      const u = id(o.user_id);
      if (!u) return "⚠️ Enter a valid user ID.";
      const r = await api("DELETE", `/guilds/${guild}/bans/${u}`, undefined, why);
      return r.ok ? `✅ Unbanned <@${u}>` : fail(r, "unban that user");
    }
    case "kick": {
      const u = id(o.user);
      await dm(u, `👢 You were kicked from the WardenMC server. Reason: ${why}`);
      const r = await api("DELETE", `/guilds/${guild}/members/${u}`, undefined, why);
      return r.ok ? `👢 Kicked <@${u}> — ${why}` : fail(r, "kick that member");
    }
    case "timeout": {
      const u = id(o.user);
      const mins = Math.max(1, Math.min(40320, Number(o.minutes)));
      const until = new Date(Date.now() + mins * 60000).toISOString();
      const r = await api("PATCH", `/guilds/${guild}/members/${u}`, { communication_disabled_until: until }, why);
      return r.ok ? `🔇 Timed out <@${u}> for ${mins} min — ${why}` : fail(r, "time out that member");
    }
    case "untimeout": {
      const u = id(o.user);
      const r = await api("PATCH", `/guilds/${guild}/members/${u}`, { communication_disabled_until: null }, why);
      return r.ok ? `🔊 Removed timeout for <@${u}>` : fail(r, "remove the timeout");
    }
    case "warn": {
      const u = id(o.user);
      const sent = await dm(u, `⚠️ You received a warning on the WardenMC server. Reason: ${why}`);
      return `⚠️ Warned <@${u}> — ${why}${sent ? "" : " (couldn't DM them; their DMs may be closed)"}`;
    }
    case "purge": {
      const ch = body.channel_id ?? body.channel?.id;
      const amount = Math.max(1, Math.min(100, Number(o.amount)));
      const lr = await api("GET", `/channels/${ch}/messages?limit=100`);
      if (!lr.ok) return fail(lr, "read messages");
      const cutoff = Date.now() - 13.9 * 86400000;
      let msgs: any[] = (await lr.json()).filter((m: any) => Date.parse(m.timestamp) > cutoff);
      if (o.user) msgs = msgs.filter((m) => m.author?.id === id(o.user));
      const ids = msgs.slice(0, amount).map((m) => m.id);
      if (ids.length === 0) return "Nothing to delete (messages older than 14 days can't be bulk-deleted).";
      const r = ids.length === 1
        ? await api("DELETE", `/channels/${ch}/messages/${ids[0]}`, undefined, "purge")
        : await api("POST", `/channels/${ch}/messages/bulk-delete`, { messages: ids }, "purge");
      return r.ok ? `🧹 Deleted ${ids.length} message${ids.length === 1 ? "" : "s"}.` : fail(r, "delete messages");
    }
    case "slowmode": {
      const ch = body.channel_id ?? body.channel?.id;
      const s = Math.max(0, Math.min(21600, Number(o.seconds)));
      const r = await api("PATCH", `/channels/${ch}`, { rate_limit_per_user: s }, "slowmode");
      return r.ok ? (s ? `🐢 Slowmode set to ${s}s.` : "Slowmode turned off.") : fail(r, "change slowmode");
    }
    case "lock":
    case "unlock": {
      const ch = id(o.channel) || (body.channel_id ?? body.channel?.id);
      const cur = await api("GET", `/channels/${ch}`);
      if (!cur.ok) return fail(cur, "read that channel");
      const ow = ((await cur.json()).permission_overwrites ?? []).find((x: any) => x.id === guild);
      let allow = BigInt(ow?.allow ?? "0"), deny = BigInt(ow?.deny ?? "0");
      if (def.name === "lock") { deny |= SEND; allow &= ~SEND; } else { deny &= ~SEND; }
      const r = await api("PUT", `/channels/${ch}/permissions/${guild}`, { type: 0, allow: allow.toString(), deny: deny.toString() }, def.name === "lock" ? why : "unlock");
      return r.ok ? (def.name === "lock" ? `🔒 Locked <#${ch}> — ${why}` : `🔓 Unlocked <#${ch}>`) : fail(r, `${def.name} that channel`);
    }
  }
  return null;
}
