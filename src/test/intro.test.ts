import { describe, expect, it } from "vitest";
import { INTRO_SEEN_KEY, hasSeenIntro, withIntroSeen } from "@/lib/intro";

describe("welcome intro flag", () => {
  it("treats a member with no saved preferences as unseen", () => {
    expect(hasSeenIntro(undefined)).toBe(false);
    expect(hasSeenIntro(null)).toBe(false);
    expect(hasSeenIntro({})).toBe(false);
    expect(hasSeenIntro([])).toBe(false);
  });

  it("only counts an exact true as watched", () => {
    expect(hasSeenIntro({ [INTRO_SEEN_KEY]: true })).toBe(true);
    expect(hasSeenIntro({ [INTRO_SEEN_KEY]: "yes" })).toBe(false);
    expect(hasSeenIntro({ [INTRO_SEEN_KEY]: 1 })).toBe(false);
    expect(hasSeenIntro({ [INTRO_SEEN_KEY]: false })).toBe(false);
  });

  it("keeps every other saved preference when marking the intro watched", () => {
    const saved = { theme: "light", palette: "ocean", notify_tickets: false };
    expect(withIntroSeen(saved)).toEqual({
      theme: "light",
      palette: "ocean",
      notify_tickets: false,
      [INTRO_SEEN_KEY]: true,
    });
  });

  it("does not mutate the object it was given", () => {
    const saved = { theme: "dark" };
    withIntroSeen(saved);
    expect(saved).toEqual({ theme: "dark" });
  });

  it("still marks the intro watched when nothing else is saved", () => {
    expect(withIntroSeen(null)).toEqual({ [INTRO_SEEN_KEY]: true });
  });
});
