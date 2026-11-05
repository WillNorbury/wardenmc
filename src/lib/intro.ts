/**
 * The welcome intro shown to members who have not watched it yet.
 * The watched flag lives in the member's private preferences, so it is
 * remembered per account rather than per device.
 */

export const INTRO_SEEN_KEY = "intro_seen";

/** Reads the saved flag, treating anything that is not exactly `true` as unseen. */
export function hasSeenIntro(prefs: unknown): boolean {
  if (!prefs || typeof prefs !== "object" || Array.isArray(prefs)) return false;
  return (prefs as Record<string, unknown>)[INTRO_SEEN_KEY] === true;
}

/** Returns a full preferences object with the flag set, keeping every other saved preference. */
export function withIntroSeen(prefs: unknown) {
  const base =
    prefs && typeof prefs === "object" && !Array.isArray(prefs)
      ? (prefs as Record<string, unknown>)
      : {};
  // The key is written literally so the saved object keeps the same shape the
  // other preference writers use.
  return { ...base, intro_seen: true };
}
