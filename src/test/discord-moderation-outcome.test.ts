import { describe, expect, it } from "vitest";
import { moderationReplyState } from "../../supabase/functions/_shared/discord-moderation-outcome";

describe("warning action outcomes", () => {
  it("records the reported successful warning as success and public", () => {
    expect(moderationReplyState("warn", "⚠️ Warned <@971798931417747476> — Spamming", { warningIssued: true }))
      .toEqual({ failed: false, public: true });
  });
  it("keeps warn permission refusals private and failed", () => {
    expect(moderationReplyState("warn", "⛔ You don't have permission", {})).toEqual({ failed: true, public: false });
  });
  it("keeps server-only usage refusals private and failed", () => {
    expect(moderationReplyState("warn", "⚠️ Use this command in a server.", {})).toEqual({ failed: true, public: false });
  });
  it("keeps missing-token failures private and failed", () => {
    expect(moderationReplyState("warn", "❌ Bot token is not configured.", {})).toEqual({ failed: true, public: false });
  });
  it("does not override failures for other commands", () => {
    expect(moderationReplyState("ban", "❌ Couldn't ban", { warningIssued: true })).toEqual({ failed: true, public: false });
  });
});