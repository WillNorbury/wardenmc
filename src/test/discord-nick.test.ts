import { describe, expect, it } from "vitest";
import { nickRefusalKey } from "../../supabase/functions/_shared/discord-nick-model.ts";
import { DEFAULT_REPLY_TEXTS } from "../../supabase/functions/_shared/discord-reply-texts.ts";

const OWNER = "111111111111111111", MEMBER = "222222222222222222";

describe("/nick refusal reasons", () => {
  it("explains that the server owner can never be renamed by a bot", () => {
    expect(nickRefusalKey(OWNER, OWNER)).toBe("nick_owner");
    expect(DEFAULT_REPLY_TEXTS.nick_owner).toContain("server owner");
  });
  it("explains the missing permission or role order for other members", () => {
    expect(nickRefusalKey(MEMBER, OWNER)).toBe("nick_forbidden");
    expect(DEFAULT_REPLY_TEXTS.nick_forbidden).toContain("Manage Nicknames");
  });
  it("falls back to the permission explanation when the owner is unknown", () => {
    expect(nickRefusalKey(MEMBER, null)).toBe("nick_forbidden");
  });
});
