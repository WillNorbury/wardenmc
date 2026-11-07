import { describe, expect, it, vi } from "vitest";
import { requestDeviceVerification } from "../lib/device-verification-request";

describe("device verification session recovery", () => {
  const session = (token: string, id = "member") => ({ access_token: token, user: { id } });
  it("retries a 401 once using the refreshed token and preserves verification", async () => {
    const invoke = vi.fn().mockResolvedValueOnce({ data: null, error: { context: { status: 401 } } }).mockResolvedValueOnce({ data: { required: true }, error: null });
    const result = await requestDeviceVerification({ action: "check" }, "member", {
      getSession: async () => ({ data: { session: session("old") } }),
      refreshSession: async () => ({ data: { session: session("new") }, error: null }), invoke,
    });
    expect(invoke.mock.calls.map(call => call[1])).toEqual(["old", "new"]);
    expect(result.data).toEqual({ required: true });
  });
  it("does not use a different account's refreshed session", async () => {
    const invoke = vi.fn().mockResolvedValue({ data: null, error: { context: { status: 401 } } });
    await expect(requestDeviceVerification({}, "member", {
      getSession: async () => ({ data: { session: session("old") } }),
      refreshSession: async () => ({ data: { session: session("new", "other") }, error: null }), invoke,
    })).rejects.toThrow("Please sign in again.");
    expect(invoke).toHaveBeenCalledTimes(1);
  });
});