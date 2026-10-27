// Browser-safe built-in definitions shared by registration and the public directory.
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

