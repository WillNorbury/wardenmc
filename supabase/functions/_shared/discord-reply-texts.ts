// Shared, website-editable reply texts for WardenBot's built-in slash commands.
// Overrides live in site_content under REPLY_TEXTS_KEY as { replies: { key: text } };
// anything not overridden falls back to DEFAULT_REPLY_TEXTS. Admin edits the same
// list from the website (src/lib/discord-reply-texts.ts mirrors these defaults).

export const REPLY_TEXTS_KEY = "discord_command_replies";
export const MAX_REPLY_TEXT_LEN = 1500;

export const DEFAULT_REPLY_TEXTS = {
  // /subscribe + /unsubscribe
  subscribe_no_account: "Could not determine your Discord account.",
  subscribe_not_linked: "⚠️ Your Discord account isn't linked to a Warden Network account yet. Sign in on the website and link Discord first.",
  subscribe_failed: "❌ Failed to update: {error}",
  subscribe_done: "✅ You're subscribed to email notifications from Warden Network.",
  unsubscribe_done: "✅ You've been unsubscribed from email notifications.",
  // /setapply + /apply
  setapply_usage: "⚠️ Use /setapply url:https://example.com/apply in a server. The link must start with https://",
  setapply_permission: "⛔ You need Manage Server permission to set the application link.",
  setapply_failed: "❌ The application link could not be saved. Please try again shortly.",
  setapply_done: "✅ Application link set to <{url}>. Members can get it with /apply.",
  apply_server_only: "⚠️ Run this command in a server.",
  apply_failed: "❌ The application link could not be loaded. Please try again shortly.",
  apply_done: "📋 Apply for the team here: <{url}>",
  // /status setup
  status_setup_usage: "⚠️ Use /status setup ip:play.example.com in a server text channel (optional :port).",
  status_setup_permission: "⛔ You need Manage Server permission to set up a status panel.",
  // Generic
  command_disabled: "⚠️ This command is currently disabled.",
  unknown_command: "Unknown command",
  // Shared moderation/voice errors
  mod_server_only: "⚠️ Use this command in a server.",
  mod_no_permission: "⛔ You don't have permission to use this command.",
  mod_no_token: "❌ Bot token is not configured.",
  mod_api_fail: "❌ Couldn't {what} ({status}). {detail}",
  mod_api_fail_403: "The bot needs the right permission and a higher role than the target.",
  // Fun commands
  eightball: "🎱 **{question}**\n{answer}",
  eightball_answers: "It is certain.\nWithout a doubt.\nYes — definitely.\nMost likely.\nSigns point to yes.\nAsk again later.\nCannot predict now.\nDon't count on it.\nMy sources say no.\nVery doubtful.\nOutlook not so good.\nCreepers say yes. 💥",
  coinflip_heads: "🪙 Heads!",
  coinflip_tails: "🪙 Tails!",
  roll_single: "🎲 Rolled {n}d{sides}: {rolls}",
  roll_multi: "🎲 Rolled {n}d{sides}: {rolls} (total {total})",
  rps: "✊ You: **{you}** · Bot: **{bot}** — {result}",
  rps_tie: "It's a tie!",
  rps_win: "You win! 🎉",
  rps_lose: "I win! 😎",
  choose_too_few: "⚠️ Give at least two options, separated by commas.",
  choose: "🤔 I choose: **{choice}**",
  avatar: "🖼️ <@{user}>'s avatar: {url}",
  hug_self: "🤗 <@{user}> hugs themselves. It's okay, we all need one sometimes.",
  hug: "🤗 <@{from}> gives <@{to}> a big hug!",
  joke: "😂 {joke}",
  jokes: "Why did the creeper break up with his girlfriend? Because she was too explosive.\nWhat do you call a sleepy Enderman? An Ender-yawn.\nWhy are Minecraft players bad at keeping secrets? They always spill the beans... and the lava.\nWhy did Steve go to therapy? He had too many blocks.\nHow does Steve stay fit? He runs around the block.\nWhat's a skeleton's favourite instrument? The trom-bone.",
  help_heading: "🛡️ **WardenBot — commands everyone can use**",
  help_rules: "`/rules` — Show the Warden Network server rules",
  help_subscribe: "`/subscribe` — Get website email updates",
  help_unsubscribe: "`/unsubscribe` — Stop website email updates",
  help_footer: "_Moderation and voice commands are for staff only._ Questions? DM **will_norbury** or visit https://warden.rip/bot",
  // Moderation actions
  softban: "🧽 Softbanned <@{user}> (messages wiped, they can rejoin) — {reason}",
  nick_set: "✏️ Renamed <@{user}> to **{nick}**",
  nick_reset: "✏️ Reset <@{user}>'s nickname",
  role_add: "➕ Gave <@&{role}> to <@{user}>",
  role_remove: "➖ Removed <@&{role}> from <@{user}>",
  vcmute: "🔇 Voice-muted <@{user}>",
  vcunmute: "🔊 Voice-unmuted <@{user}>",
  deafen: "🙉 Deafened <@{user}>",
  undeafen: "👂 Undeafened <@{user}>",
  vcmove: "➡️ Moved <@{user}> to <#{channel}>",
  vcdisconnect: "📴 Disconnected <@{user}> from voice",
  vclimit_set: "👥 <#{channel}> limited to {limit} users",
  vclimit_off: "👥 Removed the user limit on <#{channel}>",
  ban_dm: "🔨 You were banned from the WardenMC server. Reason: {reason}",
  ban: "🔨 Banned <@{user}> — {reason}",
  unban_invalid: "⚠️ Enter a valid user ID.",
  unban: "✅ Unbanned <@{user}>",
  kick_dm: "👢 You were kicked from the WardenMC server. Reason: {reason}",
  kick: "👢 Kicked <@{user}> — {reason}",
  timeout: "🔇 Timed out <@{user}> for {minutes} min — {reason}",
  untimeout: "🔊 Removed timeout for <@{user}>",
  warn_dm: "⚠️ You received a warning on the WardenMC server. Reason: {reason}",
  warn: "⚠️ Warned <@{user}> — {reason}",
  warn_no_dm: "⚠️ Warned <@{user}> — {reason} (couldn't DM them; their DMs may be closed)",
  purge_none: "Nothing to delete (messages older than 14 days can't be bulk-deleted).",
  purge_one: "🧹 Deleted 1 message.",
  purge_many: "🧹 Deleted {count} messages.",
  slowmode_set: "🐢 Slowmode set to {seconds}s.",
  slowmode_off: "Slowmode turned off.",
  lock: "🔒 Locked <#{channel}> — {reason}",
  unlock: "🔓 Unlocked <#{channel}>",
} as const;

export type ReplyTextKey = keyof typeof DEFAULT_REPLY_TEXTS;
export type ReplyTexts = Record<ReplyTextKey, string>;

/** Pick the valid overrides out of a raw { key: text } map; everything invalid is dropped. */
export function sanitizeReplyOverrides(replies: unknown): Partial<ReplyTexts> {
  const clean: Partial<ReplyTexts> = {};
  if (!replies || typeof replies !== "object" || Array.isArray(replies)) return clean;
  for (const key of Object.keys(DEFAULT_REPLY_TEXTS) as ReplyTextKey[]) {
    const value = (replies as Record<string, unknown>)[key];
    if (typeof value !== "string") continue;
    const text = value.trim();
    if (!text || text.length > MAX_REPLY_TEXT_LEN) continue;
    clean[key] = text;
  }
  return clean;
}

/** Merge saved overrides over the defaults. Unknown keys and invalid values are dropped. */
export function mergeReplyTexts(saved: unknown): ReplyTexts {
  return { ...DEFAULT_REPLY_TEXTS, ...sanitizeReplyOverrides((saved as any)?.replies) };
}

/** Merge one server's own overrides over texts that already include the global overrides. */
export function mergeGuildReplyTexts(base: ReplyTexts, replies: unknown): ReplyTexts {
  return { ...base, ...sanitizeReplyOverrides(replies) };
}

/** Discord guild (server) IDs are snowflakes: 17-20 digit numbers; accept a little slack. */
export function isValidGuildId(id: unknown): id is string {
  return typeof id === "string" && /^\d{5,25}$/.test(id);
}

/** True when a /users/@me/guilds entry grants owner, Administrator or Manage Server. */
export function canManageGuild(guild: unknown): boolean {
  const g = guild as { owner?: unknown; permissions?: unknown } | null;
  if (!g || typeof g !== "object") return false;
  if (g.owner === true) return true;
  try {
    const perms = BigInt(String(g.permissions ?? "0"));
    const ADMINISTRATOR = 0x8n, MANAGE_GUILD = 0x20n;
    return (perms & ADMINISTRATOR) !== 0n || (perms & MANAGE_GUILD) !== 0n;
  } catch {
    return false;
  }
}

/** Render one reply, replacing {placeholders} with the given values. */
export function renderReply(texts: ReplyTexts, key: ReplyTextKey, vars: Record<string, string> = {}): string {
  let text = texts[key] ?? DEFAULT_REPLY_TEXTS[key];
  for (const [name, value] of Object.entries(vars)) {
    text = text.split(`{${name}}`).join(value);
  }
  return text;
}

/** Random line from a newline-separated reply (e.g. 8-ball answers, jokes). */
export function pickReplyLine(texts: ReplyTexts, key: ReplyTextKey): string {
  const lines = (texts[key] ?? DEFAULT_REPLY_TEXTS[key]).split("\n").map((l) => l.trim()).filter(Boolean);
  return lines[Math.floor(Math.random() * lines.length)] ?? "";
}

/**
 * Load reply texts: defaults <- global site_content overrides <- per-server overrides
 * (discord_guild_reply_texts) when a guild id is given.
 */
export async function loadReplyTexts(client: any, guildId?: string | null): Promise<ReplyTexts> {
  const { data } = await client
    .from("site_content")
    .select("value")
    .eq("key", REPLY_TEXTS_KEY)
    .maybeSingle();
  const base = mergeReplyTexts(data?.value);
  if (!guildId) return base;
  const { data: row } = await client
    .from("discord_guild_reply_texts")
    .select("replies")
    .eq("guild_id", guildId)
    .maybeSingle();
  return mergeGuildReplyTexts(base, row?.replies);
}
