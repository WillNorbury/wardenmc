import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
const mocks = vi.hoisted(() => ({ validate: vi.fn(), getUser: vi.fn(), activate: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth: { setSession: mocks.validate, getUser: mocks.getUser } }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { setSession: mocks.activate } } }));
import { forgetAccountSession, hasAccountSession, restoreAccountSession, saveAccountSession } from "@/lib/account-sessions";

const session = (id: string, email: string): Session => ({ access_token: `test-access-${id}`, refresh_token: `test-refresh-${id}`,
  expires_in: 3600, token_type: "bearer", user: { id, email, app_metadata: {}, user_metadata: {}, aud: "authenticated", created_at: "" } });

describe("instant account switching", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.resetAllMocks(); mocks.activate.mockResolvedValue({ error: null }); });

  it("switches to a previously signed-in account without signing out or requesting a password", async () => {
    const target = session("second", "second@example.com");
    saveAccountSession(session("first", "first@example.com"));
    saveAccountSession(target);
    mocks.validate.mockResolvedValue({ data: { session: target }, error: null });
    mocks.getUser.mockResolvedValue({ data: { user: target.user }, error: null });
    await restoreAccountSession("second@example.com");
    expect(mocks.activate).toHaveBeenCalledWith({ access_token: "test-access-second", refresh_token: "test-refresh-second" });
    expect(hasAccountSession("first@example.com")).toBe(true);
  });

  it("never replaces the active account when the saved session belongs to another user", async () => {
    saveAccountSession(session("second", "second@example.com"));
    mocks.validate.mockResolvedValue({ data: { session: session("third", "third@example.com") }, error: null });
    mocks.getUser.mockResolvedValue({ data: { user: { id: "third" } }, error: null });
    await expect(restoreAccountSession("second@example.com")).rejects.toThrow("sign in");
    expect(mocks.activate).not.toHaveBeenCalled();
    expect(hasAccountSession("second@example.com")).toBe(false);
  });

  it("requires sign-in again for expired or revoked sessions", async () => {
    saveAccountSession(session("second", "second@example.com"));
    mocks.validate.mockResolvedValue({ data: { session: null }, error: new Error("revoked") });
    await expect(restoreAccountSession("second@example.com")).rejects.toThrow("expired");
    expect(mocks.activate).not.toHaveBeenCalled();
  });

  it("sign-out removes only that account's saved session", () => {
    saveAccountSession(session("first", "first@example.com"));
    saveAccountSession(session("second", "second@example.com"));
    forgetAccountSession("first@example.com");
    expect(hasAccountSession("first@example.com")).toBe(false);
    expect(hasAccountSession("second@example.com")).toBe(true);
  });
});