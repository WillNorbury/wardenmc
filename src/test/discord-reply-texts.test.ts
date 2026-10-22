import { describe, expect, it } from "vitest";
import {
  DEFAULT_REPLY_TEXTS,
  MAX_REPLY_TEXT_LEN,
  REPLY_TEXTS_KEY,
  mergeReplyTexts,
  pickReplyLine,
  renderReply,
} from "../../supabase/functions/_shared/discord-reply-texts";

describe("mergeReplyTexts", () => {
  it("falls back to every default when nothing is saved", () => {
    expect(mergeReplyTexts(undefined)).toEqual({ ...DEFAULT_REPLY_TEXTS });
    expect(mergeReplyTexts(null)).toEqual({ ...DEFAULT_REPLY_TEXTS });
    expect(mergeReplyTexts({ replies: "nope" })).toEqual({ ...DEFAULT_REPLY_TEXTS });
  });

  it("applies valid overrides and keeps other defaults", () => {
    const merged = mergeReplyTexts({ replies: { unknown_command: "Hmm, try /help" } });
    expect(merged.unknown_command).toBe("Hmm, try /help");
    expect(merged.subscribe_done).toBe(DEFAULT_REPLY_TEXTS.subscribe_done);
  });

  it("drops unknown keys, empty, non-string and over-long values", () => {
    const merged = mergeReplyTexts({
      replies: {
        bogus_key: "x",
        unknown_command: "",
        coinflip_heads: 42,
        joke: "y".repeat(MAX_REPLY_TEXT_LEN + 1),
      },
    });
    expect((merged as Record<string, string>).bogus_key).toBeUndefined();
    expect(merged.unknown_command).toBe(DEFAULT_REPLY_TEXTS.unknown_command);
    expect(merged.coinflip_heads).toBe(DEFAULT_REPLY_TEXTS.coinflip_heads);
    expect(merged.joke).toBe(DEFAULT_REPLY_TEXTS.joke);
  });
});

describe("renderReply", () => {
  it("replaces placeholders with values", () => {
    const texts = mergeReplyTexts(undefined);
    expect(renderReply(texts, "apply_done", { url: "https://x.test/apply" }))
      .toBe("📋 Apply for the team here: <https://x.test/apply>");
  });

  it("replaces every occurrence and leaves unknown placeholders", () => {
    const texts = mergeReplyTexts({ replies: { hug: "{from} hugs {to}, again {to}" } });
    expect(renderReply(texts, "hug", { from: "A", to: "B" })).toBe("A hugs B, again B");
  });

  it("uses edited text for multi-line lists", () => {
    const texts = mergeReplyTexts({ replies: { eightball_answers: "Yes.\nNo." } });
    expect(["Yes.", "No."]).toContain(pickReplyLine(texts, "eightball_answers"));
  });
});

describe("reply text keys", () => {
  it("storage key stays stable", () => {
    expect(REPLY_TEXTS_KEY).toBe("discord_command_replies");
  });

  it("every default is non-empty and within the length cap", () => {
    for (const [key, value] of Object.entries(DEFAULT_REPLY_TEXTS)) {
      expect(value.trim().length, key).toBeGreaterThan(0);
      expect(value.length, key).toBeLessThanOrEqual(MAX_REPLY_TEXT_LEN);
    }
  });
});
