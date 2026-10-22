import { describe, expect, it } from "vitest";
import {
  addCommandInput,
  addCommandRegistration,
  canManageCustomCommands,
  listCommandsRegistration,
  MAX_CUSTOM_COMMANDS_PER_GUILD,
  MAX_CUSTOM_RESPONSE_LEN,
  normalizeCustomCommandName,
  removeCommandInput,
  removeCommandRegistration,
  RESERVED_CUSTOM_COMMAND_NAMES,
  validateCustomResponse,
} from "../../supabase/functions/_shared/discord-custom-commands-model.ts";

const MANAGE_SERVER = "32";
const ADMIN = "8";
const NONE = "0";
const RESERVED = new Set([...RESERVED_CUSTOM_COMMAND_NAMES, "ban", "help"]);

describe("normalizeCustomCommandName", () => {
  it("accepts lowercase letters, digits, dash and underscore", () => {
    expect(normalizeCustomCommandName("store")).toBe("store");
    expect(normalizeCustomCommandName("vote-2_win")).toBe("vote-2_win");
  });
  it("lowercases and trims", () => {
    expect(normalizeCustomCommandName("  Store ")).toBe("store");
  });
  it("rejects spaces, symbols and overlong names", () => {
    expect(normalizeCustomCommandName("my command")).toBeNull();
    expect(normalizeCustomCommandName("store!")).toBeNull();
    expect(normalizeCustomCommandName("a".repeat(33))).toBeNull();
    expect(normalizeCustomCommandName("")).toBeNull();
  });
});

describe("validateCustomResponse", () => {
  it("accepts a normal reply", () => {
    expect(validateCustomResponse("Join at play.warden.rip")).toBe("Join at play.warden.rip");
  });
  it("rejects empty and overlong replies", () => {
    expect(validateCustomResponse("   ")).toBeNull();
    expect(validateCustomResponse("x".repeat(MAX_CUSTOM_RESPONSE_LEN + 1))).toBeNull();
  });
});

describe("canManageCustomCommands", () => {
  it("allows Manage Server and Administrator", () => {
    expect(canManageCustomCommands(MANAGE_SERVER)).toBe(true);
    expect(canManageCustomCommands(ADMIN)).toBe(true);
  });
  it("denies regular members and malformed input", () => {
    expect(canManageCustomCommands(NONE)).toBe(false);
    expect(canManageCustomCommands(undefined)).toBe(false);
    expect(canManageCustomCommands("abc")).toBe(false);
  });
});

const addBody = (name: unknown, response: unknown) => ({
  guild_id: "123456789012345678",
  member: { user: { id: "234567890123456789" } },
  data: {
    name: "addcommand",
    options: [
      { name: "name", type: 3, value: name },
      { name: "response", type: 3, value: response },
    ],
  },
});

describe("addCommandInput", () => {
  it("parses a valid interaction", () => {
    expect(addCommandInput(addBody("store", "Visit the store"), RESERVED)).toEqual({
      ok: true,
      guildId: "123456789012345678",
      userId: "234567890123456789",
      name: "store",
      response: "Visit the store",
    });
  });
  it("rejects names that clash with built-in commands", () => {
    const result = addCommandInput(addBody("ban", "no"), RESERVED);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("built-in");
    expect(addCommandInput(addBody("status", "no"), RESERVED).ok).toBe(false);
  });
  it("rejects invalid names and responses", () => {
    expect(addCommandInput(addBody("my command", "hi"), RESERVED).ok).toBe(false);
    expect(addCommandInput(addBody("store", ""), RESERVED).ok).toBe(false);
  });
  it("rejects DMs and non-snowflake guilds", () => {
    expect(addCommandInput({ ...addBody("store", "hi"), guild_id: undefined }, RESERVED).ok).toBe(false);
    expect(addCommandInput({ ...addBody("store", "hi"), guild_id: "abc" }, RESERVED).ok).toBe(false);
  });
});

describe("removeCommandInput", () => {
  const body = (name: unknown) => ({
    guild_id: "123456789012345678",
    member: { user: { id: "234567890123456789" } },
    data: { name: "removecommand", options: [{ name: "name", type: 3, value: name }] },
  });
  it("parses a valid interaction", () => {
    expect(removeCommandInput(body("store"))).toMatchObject({ ok: true, name: "store" });
  });
  it("rejects invalid names", () => {
    expect(removeCommandInput(body("not a command")).ok).toBe(false);
  });
});

describe("registrations", () => {
  it("addcommand requires Manage Server by default with name and response options", () => {
    expect(addCommandRegistration.name).toBe("addcommand");
    expect(addCommandRegistration.default_member_permissions).toBe("32");
    expect(addCommandRegistration.options).toHaveLength(2);
    expect(addCommandRegistration.options[1]).toMatchObject({ name: "response", required: true, max_length: MAX_CUSTOM_RESPONSE_LEN });
  });
  it("removecommand requires Manage Server; commands is usable by everyone", () => {
    expect(removeCommandRegistration.default_member_permissions).toBe("32");
    expect(listCommandsRegistration.default_member_permissions).toBeUndefined();
    expect(listCommandsRegistration.dm_permission).toBe(false);
  });
  it("caps custom commands per server", () => {
    expect(MAX_CUSTOM_COMMANDS_PER_GUILD).toBe(25);
  });
});
