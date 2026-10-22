// Per-server module settings for WardenBot: welcome/goodbye, reaction roles
// and AutoMod. Each Discord server (guild) stores its own settings row in
// discord_guild_module_settings, keyed by (guild_id, module). This file holds
// the defaults, the sanitizers every write goes through, and pure helpers so
// the behaviour is testable without Discord or a database.

export const MODULE_IDS = ["welcome", "reactionroles", "automod"] as const;
export type ModuleId = (typeof MODULE_IDS)[number];

export const MAX_MODULE_MESSAGE_LEN = 1000;
export const MAX_REACTION_ROLE_ENTRIES = 20;
export const MAX_BANNED_WORDS = 100;
export const MAX_IGNORED_IDS = 50;

export type WelcomeModuleSettings = {
  enabled: boolean;
  channel_id: string | null;
  welcome_message: string;
  goodbye_enabled: boolean;
  goodbye_message: string;
  use_embed: boolean;
};

export type ReactionRoleEntry = {
  channel_id: string;
  message_id: string;
  emoji: string;
  role_id: string;
};
export type ReactionRolesModuleSettings = {
  enabled: boolean;
  entries: ReactionRoleEntry[];
};

export type AutoModAction = "delete" | "warn" | "timeout";
export type AutoModRuleSettings = { enabled: boolean; action: AutoModAction };
export type AutoModModuleSettings = {
  rules: {
    spam: AutoModRuleSettings;
    caps: AutoModRuleSettings;
    links: AutoModRuleSettings;
    invites: AutoModRuleSettings;
    banned_words: AutoModRuleSettings & { words: string[] };
  };
  alert_channel_id: string | null;
  timeout_seconds: number;
  ignored_channel_ids: string[];
  ignored_role_ids: string[];
};

export const DEFAULT_WELCOME_SETTINGS: WelcomeModuleSettings = {
  enabled: false,
  channel_id: null,
  welcome_message: "Welcome {user} to {server}! You are member #{membercount}.",
  goodbye_enabled: false,
  goodbye_message: "{user} has left {server}.",
  use_embed: false,
};

const DEFAULT_RULE: AutoModRuleSettings = { enabled: false, action: "delete" };

export const DEFAULT_REACTION_ROLES_SETTINGS: ReactionRolesModuleSettings = {
  enabled: false,
  entries: [],
};

export const DEFAULT_AUTOMOD_SETTINGS: AutoModModuleSettings = {
  rules: {
    spam: { ...DEFAULT_RULE },
    caps: { ...DEFAULT_RULE },
    links: { ...DEFAULT_RULE },
    invites: { ...DEFAULT_RULE },
    banned_words: { ...DEFAULT_RULE, words: [] },
  },
  alert_channel_id: null,
  timeout_seconds: 300,
  ignored_channel_ids: [],
  ignored_role_ids: [],
};

/** Discord snowflake IDs are 17-20 digit numbers; accept a little slack. */
export function isValidDiscordId(id: unknown): id is string {
  return typeof id === "string" && /^\d{5,25}$/.test(id);
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asId(value: unknown): string | null {
  return isValidDiscordId(value) ? value : null;
}

function asMessage(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const text = value.trim();
  if (!text || text.length > MAX_MODULE_MESSAGE_LEN) return fallback;
  return text;
}

function asIdList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    if (isValidDiscordId(item) && !out.includes(item)) out.push(item);
    if (out.length >= max) break;
  }
  return out;
}

const ACTIONS: AutoModAction[] = ["delete", "warn", "timeout"];

function asAction(value: unknown): AutoModAction {
  return ACTIONS.includes(value as AutoModAction) ? (value as AutoModAction) : "delete";
}

function asRule(value: unknown, fallback: AutoModRuleSettings): AutoModRuleSettings {
  const raw = (value ?? {}) as Record<string, unknown>;
  return {
    enabled: asBool(raw.enabled, fallback.enabled),
    action: typeof raw.action === "string" ? asAction(raw.action) : fallback.action,
  };
}

/** Pick the valid welcome/goodbye settings out of raw input; invalid values fall back to defaults. */
export function sanitizeWelcomeSettings(input: unknown): WelcomeModuleSettings {
  const raw = (input ?? {}) as Record<string, unknown>;
  return {
    enabled: asBool(raw.enabled, DEFAULT_WELCOME_SETTINGS.enabled),
    channel_id: asId(raw.channel_id),
    welcome_message: asMessage(raw.welcome_message, DEFAULT_WELCOME_SETTINGS.welcome_message),
    goodbye_enabled: asBool(raw.goodbye_enabled, DEFAULT_WELCOME_SETTINGS.goodbye_enabled),
    goodbye_message: asMessage(raw.goodbye_message, DEFAULT_WELCOME_SETTINGS.goodbye_message),
    use_embed: asBool(raw.use_embed, DEFAULT_WELCOME_SETTINGS.use_embed),
  };
}

/** Pick the valid reaction-role entries out of raw input; malformed entries are dropped. */
export function sanitizeReactionRolesSettings(input: unknown): ReactionRolesModuleSettings {
  const raw = (input ?? {}) as Record<string, unknown>;
  const entries: ReactionRoleEntry[] = [];
  if (Array.isArray(raw.entries)) {
    for (const item of raw.entries) {
      const e = (item ?? {}) as Record<string, unknown>;
      if (!isValidDiscordId(e.channel_id) || !isValidDiscordId(e.message_id) || !isValidDiscordId(e.role_id)) continue;
      if (typeof e.emoji !== "string" || !e.emoji.trim() || e.emoji.length > 64) continue;
      entries.push({ channel_id: e.channel_id, message_id: e.message_id, emoji: e.emoji.trim(), role_id: e.role_id });
      if (entries.length >= MAX_REACTION_ROLE_ENTRIES) break;
    }
  }
  return { enabled: asBool(raw.enabled, false), entries };
}

/** Pick the valid AutoMod settings out of raw input; invalid values fall back to defaults. */
export function sanitizeAutoModSettings(input: unknown): AutoModModuleSettings {
  const raw = (input ?? {}) as Record<string, unknown>;
  const rules = (raw.rules ?? {}) as Record<string, unknown>;
  const d = DEFAULT_AUTOMOD_SETTINGS;
  const bw = (rules.banned_words ?? {}) as Record<string, unknown>;
  const words: string[] = [];
  if (Array.isArray(bw.words)) {
    for (const w of bw.words) {
      if (typeof w !== "string") continue;
      const word = w.trim();
      if (word && word.length <= 60 && !words.includes(word)) words.push(word);
      if (words.length >= MAX_BANNED_WORDS) break;
    }
  }
  const timeoutSeconds = Number(raw.timeout_seconds);
  return {
    rules: {
      spam: asRule(rules.spam, d.rules.spam),
      caps: asRule(rules.caps, d.rules.caps),
      links: asRule(rules.links, d.rules.links),
      invites: asRule(rules.invites, d.rules.invites),
      banned_words: { ...asRule(rules.banned_words, d.rules.banned_words), words },
    },
    alert_channel_id: asId(raw.alert_channel_id),
    timeout_seconds:
      Number.isFinite(timeoutSeconds) && timeoutSeconds >= 5 && timeoutSeconds <= 2419200
        ? Math.floor(timeoutSeconds)
        : d.timeout_seconds,
    ignored_channel_ids: asIdList(raw.ignored_channel_ids, MAX_IGNORED_IDS),
    ignored_role_ids: asIdList(raw.ignored_role_ids, MAX_IGNORED_IDS),
  };
}

export function sanitizeModuleSettings(module: ModuleId, input: unknown): unknown {
  if (module === "welcome") return sanitizeWelcomeSettings(input);
  if (module === "reactionroles") return sanitizeReactionRolesSettings(input);
  return sanitizeAutoModSettings(input);
}

export function defaultModuleSettings(module: ModuleId): unknown {
  if (module === "welcome") return { ...DEFAULT_WELCOME_SETTINGS };
  if (module === "reactionroles") return { ...DEFAULT_REACTION_ROLES_SETTINGS, entries: [] };
  return JSON.parse(JSON.stringify(DEFAULT_AUTOMOD_SETTINGS));
}

/** Fill {user}, {server} and {membercount} placeholders in a welcome/goodbye message. */
export function renderModuleMessage(
  template: string,
  vars: { user: string; server: string; membercount: string },
): string {
  return template
    .split("{user}").join(vars.user)
    .split("{server}").join(vars.server)
    .split("{membercount}").join(vars.membercount);
}

/** Look up which role (if any) a reaction should grant. */
export function matchReactionRole(
  settings: ReactionRolesModuleSettings,
  channelId: string,
  messageId: string,
  emoji: string,
): string | null {
  if (!settings.enabled) return null;
  const entry = settings.entries.find(
    (e) => e.channel_id === channelId && e.message_id === messageId && e.emoji === emoji,
  );
  return entry ? entry.role_id : null;
}

const CAPS_PATTERN = /\b[A-Z][A-Z0-9\s!?.,'"()-]{9,}\b/;
const LINK_PATTERN = /https?:\/\/|www\./i;
const INVITE_PATTERN = /(discord\.gg\/|discord(?:app)?\.com\/invite\/)/i;

export type AutoModVerdict = { rule: keyof AutoModModuleSettings["rules"]; action: AutoModAction } | null;

/**
 * Decide whether one message breaks an enabled AutoMod rule.
 * Pure client-side mirror of the native rule intents — used by tests and by
 * any future gateway event handler. Ignored channels/roles always pass.
 */
export function checkAutoModMessage(
  settings: AutoModModuleSettings,
  content: string,
  context: { channelId?: string; roleIds?: string[] } = {},
): AutoModVerdict {
  if (context.channelId && settings.ignored_channel_ids.includes(context.channelId)) return null;
  if ((context.roleIds ?? []).some((r) => settings.ignored_role_ids.includes(r))) return null;
  const { rules } = settings;
  if (rules.invites.enabled && INVITE_PATTERN.test(content)) return { rule: "invites", action: rules.invites.action };
  if (rules.links.enabled && LINK_PATTERN.test(content)) return { rule: "links", action: rules.links.action };
  if (
    rules.banned_words.enabled &&
    rules.banned_words.words.some((w) => content.toLowerCase().includes(w.toLowerCase()))
  ) {
    return { rule: "banned_words", action: rules.banned_words.action };
  }
  if (rules.caps.enabled && CAPS_PATTERN.test(content)) return { rule: "caps", action: rules.caps.action };
  if (rules.spam.enabled && /(.)\1{7,}/s.test(content)) return { rule: "spam", action: rules.spam.action };
  return null;
}

// ---------------------------------------------------------------------------
// Discord native Auto Moderation sync. Discord enforces these rules itself,
// so AutoMod keeps working even though WardenBot has no gateway connection.
// ---------------------------------------------------------------------------

const DISCORD_ACTION_BLOCK = 1;
const DISCORD_ACTION_ALERT = 2;
const DISCORD_ACTION_TIMEOUT = 3;

function nativeActions(rule: AutoModRuleSettings, settings: AutoModModuleSettings) {
  if (rule.action === "timeout") {
    return [
      { type: DISCORD_ACTION_BLOCK },
      { type: DISCORD_ACTION_TIMEOUT, metadata: { duration_seconds: settings.timeout_seconds } },
    ];
  }
  if (rule.action === "warn" && settings.alert_channel_id) {
    return [
      { type: DISCORD_ACTION_BLOCK },
      { type: DISCORD_ACTION_ALERT, metadata: { channel_id: settings.alert_channel_id } },
    ];
  }
  return [{ type: DISCORD_ACTION_BLOCK }];
}

export type NativeAutoModRule = {
  name: string;
  event_type: 1;
  trigger_type: number;
  trigger_metadata?: Record<string, unknown>;
  actions: { type: number; metadata?: Record<string, unknown> }[];
  enabled: boolean;
  exempt_roles: string[];
  exempt_channels: string[];
};

/** Build the Discord native AutoMod rule payloads for a server's settings (enabled rules only). */
export function buildNativeAutoModRules(settings: AutoModModuleSettings): NativeAutoModRule[] {
  const base = {
    event_type: 1 as const,
    enabled: true,
    exempt_roles: settings.ignored_role_ids,
    exempt_channels: settings.ignored_channel_ids,
  };
  const out: NativeAutoModRule[] = [];
  const { rules } = settings;
  if (rules.banned_words.enabled && rules.banned_words.words.length > 0) {
    out.push({
      ...base,
      name: "WardenBot: banned words",
      trigger_type: 1,
      trigger_metadata: { keyword_filter: rules.banned_words.words },
      actions: nativeActions(rules.banned_words, settings),
    });
  }
  if (rules.invites.enabled) {
    out.push({
      ...base,
      name: "WardenBot: invite links",
      trigger_type: 1,
      trigger_metadata: { regex_patterns: ["discord\\.gg\\/|discord(app)?\\.com\\/invite\\/"] },
      actions: nativeActions(rules.invites, settings),
    });
  }
  if (rules.links.enabled) {
    out.push({
      ...base,
      name: "WardenBot: links",
      trigger_type: 1,
      trigger_metadata: { regex_patterns: ["https?:\\/\\/|www\\."] },
      actions: nativeActions(rules.links, settings),
    });
  }
  if (rules.caps.enabled) {
    out.push({
      ...base,
      name: "WardenBot: all caps",
      trigger_type: 1,
      trigger_metadata: { regex_patterns: ["\\b[A-Z][A-Z0-9\\s!?.,'\"()-]{9,}\\b"] },
      actions: nativeActions(rules.caps, settings),
    });
  }
  if (rules.spam.enabled) {
    out.push({
      ...base,
      name: "WardenBot: mention spam",
      trigger_type: 5,
      trigger_metadata: { mention_total_limit: 5 },
      actions: nativeActions(rules.spam, settings),
    });
  }
  return out;
}

/** True when the Discord user owns the guild or has Administrator / Manage Server via roles. */
export function canManageGuildWithRoles(
  guild: { owner_id?: unknown } | null,
  memberRoleIds: string[],
  guildRoles: { id: string; permissions: string }[],
  userId: string,
): boolean {
  if (guild?.owner_id != null && String(guild.owner_id) === userId) return true;
  try {
    const ADMINISTRATOR = 0x8n, MANAGE_GUILD = 0x20n;
    for (const role of guildRoles) {
      if (!memberRoleIds.includes(role.id)) continue;
      const perms = BigInt(String(role.permissions ?? "0"));
      if ((perms & ADMINISTRATOR) !== 0n || (perms & MANAGE_GUILD) !== 0n) return true;
    }
  } catch {
    return false;
  }
  return false;
}
