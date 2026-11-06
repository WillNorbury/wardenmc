import { describe, expect, it } from "vitest";
import { isAllowedTwitchLogin } from "../../supabase/functions/twitch-status/channels";

describe("website Twitch channels", () => {
  for (const login of ["kaicenat", "ibai", "ninja", "will_norbury", "spectordev", "KidGamerProTTV"]) {
    it(`permits status and clips for ${login}`, () => {
      expect(isAllowedTwitchLogin(login)).toBe(true);
    });
  }
  it("retains the restriction on unrelated channels", () => {
    expect(isAllowedTwitchLogin("unlisted_channel")).toBe(false);
  });
});