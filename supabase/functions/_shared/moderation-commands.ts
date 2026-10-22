// Discord moderation slash commands: definitions (for registration) and handler.
import { getDiscordBotToken } from "./discord-token.ts";
import { DEFAULT_REPLY_TEXTS, pickReplyLine, renderReply, type ReplyTexts } from "./discord-reply-texts.ts";

const P = { KICK: 1n << 1n, BAN: 1n << 2n, MANAGE_CHANNELS: 1n << 4n, MANAGE_MESSAGES: 1n << 13n, MODERATE: 1n << 40n, NICK: 1n << 27n, ROLES: 1n << 28n, MUTE: 1n << 22n, DEAFEN: 1n << 23n, MOVE: 1n << 24n, NONE: 0n };
const ROLE = 8;
const vc = (name: string, d: string) => opt(CHANNEL, name, d, true, { channel_types: [2, 13] });
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
  { name: "softban", description: "Ban and instantly unban to wipe a member's recent messages", perm: P.BAN, options: [opt(USER, "user", "Member", true), reason] },
  { name: "nick", description: "Change a member's nickname (empty to reset)", perm: P.NICK, options: [opt(USER, "user", "Member", true), opt(STR, "nickname", "New nickname", false, { max_length: 32 })] },
  { name: "addrole", description: "Give a member a role", perm: P.ROLES, options: [opt(USER, "user", "Member", true), opt(ROLE, "role", "Role", true), reason] },
  { name: "removerole", description: "Take a role from a member", perm: P.ROLES, options: [opt(USER, "user", "Member", true), opt(ROLE, "role", "Role", true), reason] },
  // Voice
  { name: "vcmute", description: "Server-mute a member in voice", perm: P.MUTE, category: "voice", options: [opt(USER, "user", "Member", true), reason] },
  { name: "vcunmute", description: "Remove a member's server mute", perm: P.MUTE, category: "voice", options: [opt(USER, "user", "Member", true)] },
  { name: "deafen", description: "Server-deafen a member in voice", perm: P.DEAFEN, category: "voice", options: [opt(USER, "user", "Member", true), reason] },
  { name: "undeafen", description: "Remove a member's server deafen", perm: P.DEAFEN, category: "voice", options: [opt(USER, "user", "Member", true)] },
  { name: "vcmove", description: "Move a member to another voice channel", perm: P.MOVE, category: "voice", options: [opt(USER, "user", "Member", true), vc("channel", "Voice channel to move them to")] },
  { name: "vcdisconnect", description: "Disconnect a member from voice", perm: P.MOVE, category: "voice", options: [opt(USER, "user", "Member", true), reason] },
  { name: "vclimit", description: "Set the user limit of a voice channel (0 = no limit)", perm: P.MANAGE_CHANNELS, category: "voice", options: [vc("channel", "Voice channel"), opt(INT, "limit", "Max users (0-99)", true, { min_value: 0, max_value: 99 })] },
  // Fun (everyone)
  { name: "8ball", description: "Ask the magic 8-ball a question", perm: P.NONE, category: "fun", options: [opt(STR, "question", "Your question", true, { max_length: 200 })] },
  { name: "coinflip", description: "Flip a coin", perm: P.NONE, category: "fun", options: [] },
  { name: "roll", description: "Roll dice", perm: P.NONE, category: "fun", options: [opt(INT, "sides", "Sides per die (default 6)", false, { min_value: 2, max_value: 1000 }), opt(INT, "count", "How many dice (default 1)", false, { min_value: 1, max_value: 20 })] },
  { name: "rps", description: "Rock, paper, scissors against the bot", perm: P.NONE, category: "fun", options: [opt(STR, "choice", "Your pick", true, { choices: ["rock", "paper", "scissors"].map((v) => ({ name: v, value: v })) })] },
  { name: "choose", description: "Let the bot pick between options (separate with commas)", perm: P.NONE, category: "fun", options: [opt(STR, "options", "e.g. pizza, tacos, sushi", true, { max_length: 300 })] },
  { name: "avatar", description: "Show someone's avatar", perm: P.NONE, category: "fun", options: [opt(USER, "user", "Member (default: you)")] },
  { name: "hug", description: "Give someone a hug", perm: P.NONE, category: "fun", options: [opt(USER, "user", "Who to hug", true)] },
  { name: "joke", description: "Hear a Minecraft joke", perm: P.NONE, category: "fun", options: [] },
  { name: "help", description: "See all the commands you can use", perm: P.NONE, category: "help", options: [] },
] as { name: string; description: string; perm: bigint; category?: string; options: any[] }[];

const helpReply = (t: ReplyTexts) => {
  const fun = MODERATION_COMMANDS.filter((c) => c.perm === 0n && c.name !== "help")
    .map((c) => `\`/${c.name}\` — ${c.description}`);
  return [
    renderReply(t, "help_heading"),
    "",
    ...fun,
    renderReply(t, "help_rules"),
    renderReply(t, "help_subscribe"),
    renderReply(t, "help_unsubscribe"),
    "",
    renderReply(t, "help_footer"),
  ].join("\n");
};

export const isFunCommand = (name?: string) => MODERATION_COMMANDS.some((c) => c.name === name && c.category === "fun");
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export const moderationRegistrations = () => MODERATION_COMMANDS.map((c) => ({
  name: c.name, description: c.description, type: 1, dm_permission: false,
  ...(c.perm === 0n ? {} : { default_member_permissions: c.perm.toString() }), options: c.options,
}));

const SEND = 1n << 11n;

export async function handleModeration(body: any, texts: ReplyTexts = { ...DEFAULT_REPLY_TEXTS }): Promise<string | null> {
  const t = (key: Parameters<typeof renderReply>[1], vars: Record<string, string> = {}) => renderReply(texts, key, vars);
  const def = MODERATION_COMMANDS.find((c) => c.name === body.data?.name);
  if (!def) return null;
  const guild = body.guild_id;
  if (!guild) return t("mod_server_only");
  const perms = BigInt(body.member?.permissions ?? "0");
  if (def.perm !== 0n && (perms & 8n) === 0n && (perms & def.perm) === 0n) return t("mod_no_permission");

  const o: Record<string, any> = Object.fromEntries((body.data.options ?? []).map((x: any) => [x.name, x.value]));
  const mod = body.member?.user?.username ?? "a moderator";
  const why = String(o.reason ?? "No reason given");
  let token: string | null = null;
  const api = (method: string, path: string, json?: unknown, auditReason?: string) =>
    fetch(`https://discord.com/api/v10${path}`, {
      method,
      headers: {
        Authorization: `Bot ${token}`,
        // Only declare a JSON body when one is actually sent — Discord
        // rejects empty bodies with a JSON content type (error 50109).
        ...(json === undefined ? {} : { "Content-Type": "application/json" }),
        ...(auditReason ? { "X-Audit-Log-Reason": encodeURIComponent(`${mod}: ${auditReason}`.slice(0, 500)) } : {}),
      },
      body: json === undefined ? undefined : JSON.stringify(json),
    });
  const fail = async (r: Response, what: string) =>
    t("mod_api_fail", { what, status: String(r.status), detail: r.status === 403 ? t("mod_api_fail_403") : (await r.text()).slice(0, 200) });
  const id = (v: unknown) => String(v ?? "").replace(/\D/g, "");
  const dm = async (userId: string, content: string) => {
    const ch = await api("POST", "/users/@me/channels", { recipient_id: userId });
    if (!ch.ok) return false;
    const { id: cid } = await ch.json();
    return (await api("POST", `/channels/${cid}/messages`, { content })).ok;
  };

  const me = body.member?.user?.id;
  switch (def.name) {
    case "8ball": return `🎱 **${String(o.question).slice(0, 200)}**\n${pick(BALL)}`;
    case "coinflip": return `🪙 ${Math.random() < 0.5 ? "Heads" : "Tails"}!`;
    case "roll": {
      const sides = Math.max(2, Math.min(1000, Number(o.sides ?? 6))), n = Math.max(1, Math.min(20, Number(o.count ?? 1)));
      const r = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * sides));
      return `🎲 Rolled ${n}d${sides}: ${r.join(", ")}${n > 1 ? ` (total ${r.reduce((a, b) => a + b, 0)})` : ""}`;
    }
    case "rps": {
      const bot = pick(["rock", "paper", "scissors"]), you = String(o.choice);
      const beats: Record<string, string> = { rock: "scissors", paper: "rock", scissors: "paper" };
      return `✊ You: **${you}** · Bot: **${bot}** — ${you === bot ? "It's a tie!" : beats[you] === bot ? "You win! 🎉" : "I win! 😎"}`;
    }
    case "choose": {
      const list = String(o.options).split(",").map((x) => x.trim()).filter(Boolean);
      return list.length < 2 ? "⚠️ Give at least two options, separated by commas." : `🤔 I choose: **${pick(list)}**`;
    }
    case "avatar": {
      const u = id(o.user) || me;
      const user = body.data?.resolved?.users?.[u] ?? body.member?.user;
      const url = user?.avatar ? `https://cdn.discordapp.com/avatars/${u}/${user.avatar}.png?size=1024` : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(u) >> 22n) % 6n)}.png`;
      return `🖼️ <@${u}>'s avatar: ${url}`;
    }
    case "hug": return id(o.user) === me ? `🤗 <@${me}> hugs themselves. It's okay, we all need one sometimes.` : `🤗 <@${me}> gives <@${id(o.user)}> a big hug!`;
    case "joke": return `😂 ${pick(JOKES)}`;
    case "help": return helpReply();
  }

  token = await getDiscordBotToken();
  if (!token) return "❌ Bot token is not configured.";
  switch (def.name) {
    case "softban": {
      const u = id(o.user);
      const r = await api("PUT", `/guilds/${guild}/bans/${u}`, { delete_message_seconds: 7 * 86400 }, `softban: ${why}`);
      if (!r.ok) return fail(r, "softban that member");
      await api("DELETE", `/guilds/${guild}/bans/${u}`, undefined, "softban");
      return `🧽 Softbanned <@${u}> (messages wiped, they can rejoin) — ${why}`;
    }
    case "nick": {
      const u = id(o.user), nick = String(o.nickname ?? "").trim();
      const r = await api("PATCH", `/guilds/${guild}/members/${u}`, { nick: nick || null }, "nickname");
      return r.ok ? (nick ? `✏️ Renamed <@${u}> to **${nick}**` : `✏️ Reset <@${u}>'s nickname`) : fail(r, "change that nickname");
    }
    case "addrole":
    case "removerole": {
      const u = id(o.user), role = id(o.role), add = def.name === "addrole";
      const r = await api(add ? "PUT" : "DELETE", `/guilds/${guild}/members/${u}/roles/${role}`, undefined, why);
      return r.ok ? (add ? `➕ Gave <@&${role}> to <@${u}>` : `➖ Removed <@&${role}> from <@${u}>`) : fail(r, add ? "add that role" : "remove that role");
    }
    case "vcmute": case "vcunmute": case "deafen": case "undeafen": {
      const u = id(o.user), field = def.name.includes("mute") ? "mute" : "deaf", on = !def.name.startsWith("vcun") && !def.name.startsWith("un");
      const r = await api("PATCH", `/guilds/${guild}/members/${u}`, { [field]: on }, why);
      const label = { vcmute: "🔇 Voice-muted", vcunmute: "🔊 Voice-unmuted", deafen: "🙉 Deafened", undeafen: "👂 Undeafened" }[def.name];
      return r.ok ? `${label} <@${u}>` : fail(r, `${def.name} that member (they must be in voice)`);
    }
    case "vcmove": {
      const u = id(o.user), ch = id(o.channel);
      const r = await api("PATCH", `/guilds/${guild}/members/${u}`, { channel_id: ch }, "vcmove");
      return r.ok ? `➡️ Moved <@${u}> to <#${ch}>` : fail(r, "move that member (they must be in voice)");
    }
    case "vcdisconnect": {
      const u = id(o.user);
      const r = await api("PATCH", `/guilds/${guild}/members/${u}`, { channel_id: null }, why);
      return r.ok ? `📴 Disconnected <@${u}> from voice` : fail(r, "disconnect that member");
    }
    case "vclimit": {
      const ch = id(o.channel), n = Math.max(0, Math.min(99, Number(o.limit)));
      const r = await api("PATCH", `/channels/${ch}`, { user_limit: n }, "vclimit");
      return r.ok ? (n ? `👥 <#${ch}> limited to ${n} users` : `👥 Removed the user limit on <#${ch}>`) : fail(r, "change that limit");
    }
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
