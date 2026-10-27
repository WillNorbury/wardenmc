// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { completeDeferredReply, deferredReply } from "../../supabase/functions/_shared/discord-deferred";

describe("Discord interaction acknowledgement", () => {
  it("acknowledges privately before a slow command finishes", async () => {
    let finish: ((r: Response) => void) | undefined;
    const work = new Promise<Response>((resolve) => { finish = resolve; });
    const request = vi.fn().mockResolvedValue(new Response("{}"));
    const pending = completeDeferredReply({ application_id: "123", token: "test-token" }, () => work, request);
    expect(await deferredReply().json()).toEqual({ type: 5, data: { flags: 64 } });
    expect(request).not.toHaveBeenCalled();
    finish?.(Response.json({ type: 4, data: { content: "Nickname changed", flags: 64 } }));
    await pending;
    expect(request).toHaveBeenCalledOnce();
    const payload = JSON.parse(request.mock.calls[0][1].body);
    expect(payload).toEqual({ content: "Nickname changed", allowed_mentions: { parse: [] } });
  });
  it("completes the acknowledged reply even when command execution throws", async () => {
    const request = vi.fn().mockResolvedValue(new Response("{}"));
    await completeDeferredReply({ application_id: "123", token: "test-token" }, async () => { throw new Error("Unavailable"); }, request);
    expect(JSON.parse(request.mock.calls[0][1].body).content).toContain("could not finish");
  });
});