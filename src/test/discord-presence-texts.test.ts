import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRESENCE_TEXTS,
  MAX_PRESENCE_TEXTS,
  normalizePresenceTexts,
  pickPresenceText,
} from "../../supabase/functions/_shared/discord-presence-texts";

describe("discord presence texts", () => {
  it("falls back to the default line when nothing is saved", () => {
    expect(pickPresenceText([], 0)).toBe(DEFAULT_PRESENCE_TEXTS[0]);
  });

  it("rotates one line per minute through the saved list", () => {
    const texts = ["one", "two", "three"];
    expect(pickPresenceText(texts, 0)).toBe("one");
    expect(pickPresenceText(texts, 60_000)).toBe("two");
    expect(pickPresenceText(texts, 120_000)).toBe("three");
    expect(pickPresenceText(texts, 180_000)).toBe("one");
  });

  it("trims, drops empty and overlong lines, and caps the list", () => {
    const raw = {
      texts: ["  ok  ", "", "   ", "x".repeat(200), ...Array(20).fill("fine")],
    };
    const clean = normalizePresenceTexts(raw);
    expect(clean[0]).toBe("ok");
    expect(clean.every((t) => t.length <= 128)).toBe(true);
    expect(clean.length).toBeLessThanOrEqual(MAX_PRESENCE_TEXTS);
  });
});
