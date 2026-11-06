import { afterEach, describe, expect, it, vi } from "vitest";
import { isAllowedOrigin, twitchProjection } from "../../supabase/functions/twitch-account/model";
import { waitForTwitch } from "@/lib/twitch-account";
import { TWITCH_SCOPES } from "../../supabase/functions/_shared/appUserScopes";
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: vi.fn() } } }));
afterEach(() => vi.useRealTimers());
describe("member Twitch linking", () => {
  it("accepts the website origin but rejects an external callback", () => {
    expect(isAllowedOrigin("https://warden.rip")).toBe(true);
    expect(isAllowedOrigin("https://warden.rip.attacker.example")).toBe(false);
    expect(isAllowedOrigin("https://warden.rip/untrusted")).toBe(false);
  });
  it("returns only channel display fields, not credentials or email", () => {
    expect(twitchProjection({ login: "member", display_name: "Member", profile_image_url: "https://example.com/avatar.png", email: "private@example.com", access_token: "private-token" })).toEqual({ login: "member", displayName: "Member", avatarUrl: "https://example.com/avatar.png" });
  });
  it("requests only the member profile scope", () => { expect(TWITCH_SCOPES).toEqual(["user:read:email"]); });
  it("accepts success only from the expected popup and origin", async () => {
    const popup = { closed: false, close: vi.fn() } as unknown as Window;
    let completed = false;
    const completion = waitForTwitch(popup).then(() => { completed = true; });
    const data = { type: "appUserConnectorOAuthComplete", connectorId: "twitch" };
    window.dispatchEvent(new MessageEvent("message", { origin: "https://attacker.example", source: popup, data }));
    window.dispatchEvent(new MessageEvent("message", { origin: window.location.origin, source: window, data }));
    await Promise.resolve(); expect(completed).toBe(false);
    window.dispatchEvent(new MessageEvent("message", { origin: window.location.origin, source: popup, data }));
    await completion; expect(completed).toBe(true);
  });
  it("does not count a closed popup as a successful connection", async () => {
    vi.useFakeTimers();
    const popup = { closed: true, close: vi.fn() } as unknown as Window;
    const result = expect(waitForTwitch(popup)).rejects.toThrow("closed before linking completed");
    await vi.advanceTimersByTimeAsync(500); await result;
  });
});
