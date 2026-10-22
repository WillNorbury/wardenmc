import { describe, expect, it } from "vitest";
import {
  DEFAULT_AUTOMOD_SETTINGS,
  DEFAULT_WELCOME_SETTINGS,
  buildNativeAutoModRules,
  canManageGuildWithRoles,
  checkAutoModMessage,
  matchReactionRole,
  renderModuleMessage,
  sanitizeAutoModSettings,
  sanitizeModuleSettings,
  sanitizeReactionRolesSettings,
  sanitizeWelcomeSettings,
} from "../../supabase/functions/_shared/discord-modules-model";

describe("sanitizeWelcomeSettings", () => {
  it("falls back to defaults for junk input", () => {
    expect(sanitizeWelcomeSettings(null)).toEqual(DEFAULT_WELCOME_SETTINGS);
    expect(sanitizeWelcomeSettings("nope")).toEqual(DEFAULT_WELCOME_SETTINGS);
  });

  it("keeps valid values and drops bad channel ids and over-long messages", () => {
    const out = sanitizeWelcomeSettings({
      enabled: true,
      channel_id: "123456789012345678",
      welcome_message: "Hi {user}!",
      goodbye_enabled: true,
      use_embed: true,
    });
    expect(out).toEqual({
      ...DEFAULT_WELCOME_SETTINGS,
      enabled: true,
      channel_id: "123456789012345678",
      welcome_message: "Hi {user}!",
      goodbye_enabled: true,
      use_embed: true,
    });
    expect(sanitizeWelcomeSettings({ channel_id: "not-an-id" }).channel_id).toBeNull();
    expect(sanitizeWelcomeSettings({ welcome_message: "x".repeat(2000) }).welcome_message).toBe(
      DEFAULT_WELCOME_SETTINGS.welcome_message,
    );
  });
});

describe("renderModuleMessage", () => {
  it("fills user, server and membercount placeholders", () => {
    expect(
      renderModuleMessage("Welcome {user} to {server}! #{membercount}", {
        user: "@will",
        server: "WardenMC",
        membercount: "42",
      }),
    ).toBe("Welcome @will to WardenMC! #42");
  });
});

describe("sanitizeReactionRolesSettings", () => {
  it("drops malformed entries and keeps valid ones", () => {
    const out = sanitizeReactionRolesSettings({
      enabled: true,
      entries: [
        { channel_id: "111111111111111111", message_id: "222222222222222222", emoji: "✅", role_id: "333333333333333333" },
        { channel_id: "bad", message_id: "222222222222222222", emoji: "✅", role_id: "333333333333333333" },
        { channel_id: "111111111111111111", message_id: "222222222222222222", emoji: "", role_id: "333333333333333333" },
      ],
    });
    expect(out.enabled).toBe(true);
    expect(out.entries).toHaveLength(1);
    expect(out.entries[0].role_id).toBe("333333333333333333");
  });
});

describe("matchReactionRole", () => {
  const settings = sanitizeReactionRolesSettings({
    enabled: true,
    entries: [
      { channel_id: "111111111111111111", message_id: "222222222222222222", emoji: "✅", role_id: "333333333333333333" },
    ],
  });

  it("returns the role for a matching reaction and null otherwise", () => {
    expect(matchReactionRole(settings, "111111111111111111", "222222222222222222", "✅")).toBe("333333333333333333");
    expect(matchReactionRole(settings, "111111111111111111", "222222222222222222", "❌")).toBeNull();
    expect(matchReactionRole({ ...settings, enabled: false }, "111111111111111111", "222222222222222222", "✅")).toBeNull();
  });
});

describe("sanitizeAutoModSettings", () => {
  it("falls back to defaults and clamps timeout", () => {
    const out = sanitizeAutoModSettings(undefined);
    expect(out).toEqual(DEFAULT_AUTOMOD_SETTINGS);
    expect(sanitizeAutoModSettings({ timeout_seconds: 1 }).timeout_seconds).toBe(300);
    expect(sanitizeAutoModSettings({ timeout_seconds: 600 }).timeout_seconds).toBe(600);
  });

  it("keeps valid rule actions and banned words, rejects invalid actions", () => {
    const out = sanitizeAutoModSettings({
      rules: {
        links: { enabled: true, action: "timeout" },
        invites: { enabled: true, action: "warn" },
        banned_words: { enabled: true, action: "explode", words: ["badword", "", "badword"] },
      },
      ignored_channel_ids: ["111111111111111111", "junk"],
    });
    expect(out.rules.links).toEqual({ enabled: true, action: "timeout" });
    expect(out.rules.invites).toEqual({ enabled: true, action: "warn" });
    expect(out.rules.banned_words).toEqual({ enabled: true, action: "delete", words: ["badword"] });
    expect(out.ignored_channel_ids).toEqual(["111111111111111111"]);
  });
});

describe("checkAutoModMessage", () => {
  const base = sanitizeAutoModSettings({
    rules: {
      links: { enabled: true, action: "delete" },
      invites: { enabled: true, action: "timeout" },
      banned_words: { enabled: true, action: "warn", words: ["badword"] },
      caps: { enabled: true, action: "delete" },
      spam: { enabled: true, action: "delete" },
    },
    ignored_channel_ids: ["999999999999999999"],
    ignored_role_ids: ["888888888888888888"],
  });

  it("flags invites, links, banned words, caps and spam", () => {
    expect(checkAutoModMessage(base, "join discord.gg/abc")?.rule).toBe("invites");
    expect(checkAutoModMessage(base, "see https://example.com")?.rule).toBe("links");
    expect(checkAutoModMessage(base, "you BADWORD person")?.rule).toBe("banned_words");
    expect(checkAutoModMessage(base, "THIS IS SHOUTING VERY LOUDLY")?.rule).toBe("caps");
    expect(checkAutoModMessage(base, "aaaaaaaaaaaaaaaa")?.rule).toBe("spam");
  });

  it("passes clean messages and ignored channels/roles", () => {
    expect(checkAutoModMessage(base, "hello everyone")).toBeNull();
    expect(checkAutoModMessage(base, "see https://example.com", { channelId: "999999999999999999" })).toBeNull();
    expect(checkAutoModMessage(base, "see https://example.com", { roleIds: ["888888888888888888"] })).toBeNull();
  });
});

describe("buildNativeAutoModRules", () => {
  it("builds only enabled rules with mapped actions and exemptions", () => {
    const settings = sanitizeAutoModSettings({
      rules: {
        links: { enabled: true, action: "timeout" },
        invites: { enabled: true, action: "delete" },
        banned_words: { enabled: true, action: "warn", words: ["badword"] },
      },
      alert_channel_id: "444444444444444444",
      timeout_seconds: 600,
      ignored_channel_ids: ["999999999999999999"],
      ignored_role_ids: ["888888888888888888"],
    });
    const rules = buildNativeAutoModRules(settings);
    expect(rules.map((r) => r.name).sort()).toEqual([
      "WardenBot: banned words",
      "WardenBot: invite links",
      "WardenBot: links",
    ]);
    const links = rules.find((r) => r.name === "WardenBot: links")!;
    expect(links.actions[1]).toEqual({ type: 3, metadata: { duration_seconds: 600 } });
    expect(links.exempt_channels).toEqual(["999999999999999999"]);
    expect(links.exempt_roles).toEqual(["888888888888888888"]);
    const words = rules.find((r) => r.name === "WardenBot: banned words")!;
    expect(words.actions[1]).toEqual({ type: 2, metadata: { channel_id: "444444444444444444" } });
    const invites = rules.find((r) => r.name === "WardenBot: invite links")!;
    expect(invites.actions).toEqual([{ type: 1 }]);
  });

  it("builds nothing when every rule is disabled", () => {
    expect(buildNativeAutoModRules(sanitizeAutoModSettings(null))).toEqual([]);
  });
});

describe("canManageGuildWithRoles", () => {
  const roles = [
    { id: "100000000000000000", permissions: "8" }, // Administrator
    { id: "200000000000000000", permissions: "32" }, // Manage Guild
    { id: "300000000000000000", permissions: "0" },
  ];

  it("allows the owner", () => {
    expect(canManageGuildWithRoles({ owner_id: "555" }, [], roles, "555")).toBe(true);
  });

  it("allows Administrator or Manage Server roles and rejects others", () => {
    expect(canManageGuildWithRoles({ owner_id: "1" }, ["100000000000000000"], roles, "555")).toBe(true);
    expect(canManageGuildWithRoles({ owner_id: "1" }, ["200000000000000000"], roles, "555")).toBe(true);
    expect(canManageGuildWithRoles({ owner_id: "1" }, ["300000000000000000"], roles, "555")).toBe(false);
    expect(canManageGuildWithRoles({ owner_id: "1" }, [], roles, "555")).toBe(false);
  });
});

describe("sanitizeModuleSettings", () => {
  it("routes each module to its own sanitizer", () => {
    expect(sanitizeModuleSettings("welcome", null)).toEqual(DEFAULT_WELCOME_SETTINGS);
    expect(sanitizeModuleSettings("reactionroles", { entries: "nope" })).toEqual({ enabled: false, entries: [] });
    expect(sanitizeModuleSettings("automod", null)).toEqual(DEFAULT_AUTOMOD_SETTINGS);
  });
});
