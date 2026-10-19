import { describe, expect, it } from "vitest";
import {
  applyRegistration,
  canSetApply,
  DEFAULT_APPLY_URL,
  normalizeApplyUrl,
  setApplyInput,
  setApplyRegistration,
} from "../../supabase/functions/_shared/discord-apply.ts";

const MANAGE_SERVER = "32";
const NONE = "0";

describe("normalizeApplyUrl", () => {
  it("accepts a valid https URL", () => {
    expect(normalizeApplyUrl("https://warden.rip/apply")).toBe("https://warden.rip/apply");
  });
  it("trims whitespace", () => {
    expect(normalizeApplyUrl("  https://example.com/join  ")).toBe("https://example.com/join");
  });
  it("rejects http URLs", () => {
    expect(normalizeApplyUrl("http://example.com/apply")).toBeNull();
  });
  it("rejects non-URLs", () => {
    expect(normalizeApplyUrl("warden.rip/apply")).toBeNull();
    expect(normalizeApplyUrl("not a url")).toBeNull();
  });
  it("rejects URLs with credentials", () => {
    expect(normalizeApplyUrl("https://user:pass@example.com/apply")).toBeNull();
  });
  it("rejects overlong URLs", () => {
    expect(normalizeApplyUrl(`https://example.com/${"a".repeat(300)}`)).toBeNull();
  });
});

describe("canSetApply", () => {
  it("allows Manage Server and Administrator", () => {
    expect(canSetApply(MANAGE_SERVER)).toBe(true);
    expect(canSetApply("8")).toBe(true);
  });
  it("denies members without permission", () => {
    expect(canSetApply(NONE)).toBe(false);
    expect(canSetApply(undefined)).toBe(false);
  });
});

describe("setApplyInput", () => {
  const body = (url: unknown) => ({
    guild_id: "123456789012345678",
    member: { user: { id: "234567890123456789" } },
    data: { name: "setapply", options: [{ name: "url", type: 3, value: url }] },
  });
  it("parses a valid interaction", () => {
    expect(setApplyInput(body("https://warden.rip/apply"))).toEqual({
      guildId: "123456789012345678",
      userId: "234567890123456789",
      url: "https://warden.rip/apply",
    });
  });
  it("rejects invalid URLs and missing guild", () => {
    expect(setApplyInput(body("http://x.example"))).toBeNull();
    expect(setApplyInput({ ...body("https://warden.rip/apply"), guild_id: "abc" })).toBeNull();
  });
});

describe("registrations", () => {
  it("setapply requires a url option and Manage Server by default", () => {
    expect(setApplyRegistration.name).toBe("setapply");
    expect(setApplyRegistration.default_member_permissions).toBe("32");
    expect(setApplyRegistration.options[0]).toMatchObject({ name: "url", required: true, type: 3 });
  });
  it("apply is usable by everyone, not in DMs", () => {
    expect(applyRegistration.name).toBe("apply");
    expect(applyRegistration.dm_permission).toBe(false);
  });
  it("default apply URL is the Warden apply page", () => {
    expect(DEFAULT_APPLY_URL).toBe("https://warden.rip/apply");
  });
});
