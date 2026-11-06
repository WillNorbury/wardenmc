import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { isAllowedTwitchLogin } from "../../supabase/functions/twitch-status/channels";

describe("website Twitch channels", () => {
  for (const login of ["kaicenat", "ibai", "ninja", "Auronplay", "Rubius", "will_norbury", "spectordev", "KidGamerProTTV"]) {
    it(`permits status and clips for ${login}`, () => {
      expect(isAllowedTwitchLogin(login)).toBe(true);
    });
  }
  it("retains the restriction on unrelated channels", () => {
    expect(isAllowedTwitchLogin("unlisted_channel")).toBe(false);
  });
  it("allows every channel configured on both streaming pages", () => {
    for (const page of ["Live", "FamousStreamers"]) {
      const source = readFileSync(new URL(`../pages/${page}.tsx`, import.meta.url), "utf8");
      const logins = [...source.matchAll(/login:\s*"([^"]+)"/g)].map((match) => match[1]);
      expect(logins.length).toBeGreaterThan(0);
      for (const login of logins) expect(isAllowedTwitchLogin(login), `${page}: ${login}`).toBe(true);
    }
  });
});