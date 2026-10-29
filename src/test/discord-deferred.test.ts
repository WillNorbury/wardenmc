import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { completeDeferredReply, deferredReply } from "../../supabase/functions/_shared/discord-deferred";

// jsdom lacks Deno's AbortSignal.timeout; no network requests occur in these tests.
beforeAll(() => vi.stubGlobal("AbortSignal", { timeout: () => new AbortController().signal }));
afterAll(() => vi.unstubAllGlobals());

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
    expect(request).toHaveBeenCalledOnce();
  });

  it.each([
    ["rules", { embeds: [{ title: "Rules", description: "Be respectful" }] }],
    ["8ball", { content: "Yes" }],
    ["coinflip", { content: "Heads" }],
    ["ban", { content: "Member banned" }],
    ["configured text", { content: "Hello", flags: 0 }],
    ["custom command", { content: "Custom reply" }],
    ["setapply", { content: "✅ Application URL saved" }],
    ["addcommand", { content: "✅ Command added" }],
  ])("publishes %s after resolving the private acknowledgement", async (_name, data) => {
    const request = vi.fn().mockImplementation(async () => new Response("{}"));
    await completeDeferredReply({ application_id: "123", token: "test-token" }, async () => Response.json({ type: 4, data }), request);
    expect(request.mock.calls.map(([url, init]) => [url, init.method])).toEqual([
      ["https://discord.com/api/v10/webhooks/123/test-token/messages/@original", "PATCH"],
      ["https://discord.com/api/v10/webhooks/123/test-token?wait=true", "POST"],
      ["https://discord.com/api/v10/webhooks/123/test-token/messages/@original", "DELETE"],
    ]);
    expect(JSON.parse(request.mock.calls[1][1].body)).toEqual({ ...data, allowed_mentions: { parse: [] } });
  });

  it.each(["help", "apply", "commands", "subscribe", "permission refusal"])("keeps %s private", async (content) => {
    const request = vi.fn().mockResolvedValue(new Response("{}"));
    await completeDeferredReply({ application_id: "123", token: "test-token" }, async () => Response.json({ type: 4, data: { content, flags: 64 } }), request);
    expect(request).toHaveBeenCalledOnce();
    expect(request.mock.calls[0][1].method).toBe("PATCH");
  });

  it("does not post if resolving the defer fails", async () => {
    const request = vi.fn().mockResolvedValue(new Response("{}", { status: 500 }));
    await completeDeferredReply({ application_id: "123", token: "test-token" }, async () => Response.json({ type: 4, data: { content: "Public" } }), request);
    expect(request).toHaveBeenCalledOnce();
  });

  it("retains the private result when public posting fails", async () => {
    const request = vi.fn().mockResolvedValueOnce(new Response("{}"))
      .mockResolvedValueOnce(new Response("{}", { status: 429 }));
    await completeDeferredReply({ application_id: "123", token: "test-token" }, async () => Response.json({ type: 4, data: { content: "Public" } }), request);
    expect(request.mock.calls.map(([, init]) => init.method)).toEqual(["PATCH", "POST"]);
  });

  it("keeps missing handler data private", async () => {
    const request = vi.fn().mockResolvedValue(new Response("{}"));
    await completeDeferredReply({ application_id: "123", token: "test-token" }, async () => Response.json({ type: 4 }), request);
    expect(request).toHaveBeenCalledOnce();
  });
});