// Pure per-server custom reply command logic (no remote imports, unit-testable).
export const MAX_CUSTOM_COMMANDS_PER_GUILD = 25;
export const MAX_CUSTOM_RESPONSE_LEN = 1500;
export const CUSTOM_COMMAND_DESCRIPTION = "Custom server reply (set with /addcommand)";

export const addCommandRegistration = {
  name: "addcommand",
  description: "Add a custom reply command to this server",
  type: 1,
  dm_permission: false,
  default_member_permissions: "32", // Manage Server
  options: [
    { type: 3, name: "name", description: "Command name, e.g. store", required: true, max_length: 32 },
    { type: 3, name: "response", description: "What the bot replies with", required: true, max_length: MAX_CUSTOM_RESPONSE_LEN },
  ],
};

export const removeCommandRegistration = {
  name: "removecommand",
  description: "Remove one of this server's custom commands",
  type: 1,
  dm_permission: false,
  default_member_permissions: "32", // Manage Server
  options: [
    { type: 3, name: "name", description: "Custom command name to remove", required: true, max_length: 32 },
  ],
};

export const listCommandsRegistration = {
  name: "commands",
  description: "List this server's custom commands",
  type: 1,
  dm_permission: false,
};

// Names server owners may not override: WardenBot's own commands plus the
// three management commands above. Moderation/fun/voice names are added by
// the caller (they live in moderation-commands.ts).
export const RESERVED_CUSTOM_COMMAND_NAMES = new Set([
  "status", "setapply", "apply", "rules", "subscribe", "unsubscribe",
  "addcommand", "removecommand", "commands",
]);

export function canManageCustomCommands(permissions: unknown): boolean {
  if (typeof permissions !== "string" || !/^\d{1,24}$/.test(permissions)) return false;
  const bits = BigInt(permissions);
  return (bits & 8n) !== 0n || (bits & 32n) !== 0n; // Administrator or Manage Server
}

// Discord slash command names: lowercase letters, digits, - and _, 1-32 chars.
export function normalizeCustomCommandName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().toLowerCase();
  if (!/^[a-z0-9_-]{1,32}$/.test(name)) return null;
  return name;
}

export function validateCustomResponse(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const response = value.trim();
  if (response.length < 1 || response.length > MAX_CUSTOM_RESPONSE_LEN) return null;
  return response;
}

const snowflake = (v: unknown): v is string => typeof v === "string" && /^\d{17,20}$/.test(v);

export type CustomCommandInput =
  | { ok: true; guildId: string; userId: string; name: string; response?: string }
  | { ok: false; error: string };

function baseInput(body: any, commandName: string): { guildId: string; userId: string; options: any[] } | { ok: false; error: string } {
  if (!snowflake(body?.guild_id) || !snowflake(body?.member?.user?.id)) {
    return { ok: false, error: "⚠️ Use this command in a server." };
  }
  if (body.data?.name !== commandName) return { ok: false, error: "⚠️ Unexpected command." };
  const options = body.data?.options;
  if (!Array.isArray(options)) return { ok: false, error: "⚠️ Missing options." };
  return { guildId: body.guild_id, userId: body.member.user.id, options };
}

export function addCommandInput(body: any, reserved: Set<string>): CustomCommandInput {
  const base = baseInput(body, "addcommand");
  if ("ok" in base) return base;
  const [nameOpt, responseOpt] = base.options;
  if (base.options.length !== 2 || nameOpt?.name !== "name" || nameOpt?.type !== 3
    || responseOpt?.name !== "response" || responseOpt?.type !== 3) {
    return { ok: false, error: "⚠️ Use /addcommand name:<name> response:<what the bot replies>." };
  }
  const name = normalizeCustomCommandName(nameOpt.value);
  if (!name) return { ok: false, error: "⚠️ Command names can only use lowercase letters, numbers, - and _ (max 32 characters)." };
  if (reserved.has(name)) return { ok: false, error: `⛔ /${name} is already a built-in command. Pick another name.` };
  const response = validateCustomResponse(responseOpt.value);
  if (!response) return { ok: false, error: `⚠️ The reply must be 1-${MAX_CUSTOM_RESPONSE_LEN} characters.` };
  return { ok: true, guildId: base.guildId, userId: base.userId, name, response };
}

export function removeCommandInput(body: any): CustomCommandInput {
  const base = baseInput(body, "removecommand");
  if ("ok" in base) return base;
  const [nameOpt] = base.options;
  if (base.options.length !== 1 || nameOpt?.name !== "name" || nameOpt?.type !== 3) {
    return { ok: false, error: "⚠️ Use /removecommand name:<name>." };
  }
  const name = normalizeCustomCommandName(nameOpt.value);
  if (!name) return { ok: false, error: "⚠️ Give the custom command name, e.g. store." };
  return { ok: true, guildId: base.guildId, userId: base.userId, name };
}
