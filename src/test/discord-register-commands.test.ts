import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

// Execute the real edge entrypoint with only its external services replaced.
const source = readFileSync("supabase/functions/discord-register-commands/index.ts", "utf8");
const code = ts.transpileModule(source.replace(/^import .*;\r?\n/gm, ""), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
}).outputText;

function fixture(guildStatus = 201, listStatus = 200, globalStatus = 200) {
  let handler: ((request: Request) => Promise<Response>) | undefined;
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "in", "limit"]) chain[method] = () => chain;
  chain.maybeSingle = async () => ({ data: { role: "owner", value: {} } });
  const client = { auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) }, from: () => chain };
  const fetch = vi.fn(async (url: string, options?: RequestInit) => {
    if (url.includes("/users/@me/guilds")) return Response.json([{ id: "111111" }], { status: listStatus });
    if (url.includes("/guilds/")) return Response.json({ id: "about" }, { status: guildStatus });
    if (options?.method === "PUT") return Response.json([{ name: "rules" }], { status: globalStatus });
    throw new Error("Unexpected Discord request");
  });
  const registration = { name: "builtin" };
  new Function("Deno", "createClient", "getDiscordBotToken", "fetch", "corsHeaders", "moderationRegistrations", "statusRegistration", "applyRegistration", "setApplyRegistration", "addCommandRegistration", "listCommandsRegistration", "removeCommandRegistration", "aboutRegistration", "AbortSignal", code)(
    { env: { get: () => "test-config" }, serve: (fn: typeof handler) => { handler = fn; } },
    () => client, async () => "test-bot-token", fetch, {}, () => [],
    registration, registration, registration, registration, registration, registration, { name: "about" }, { timeout: () => new AbortController().signal },
  );
  return { fetch, run: async (body: unknown) => {
    if (!handler) throw new Error("Handler not installed");
    return handler(new Request("https://example.test", { method: "POST", headers: { Authorization: "Bearer test" }, body: JSON.stringify(body) }));
  } };
}

describe("Discord admin command registration isolation", () => {
  it.each([403, 429])("global sync succeeds without contacting a guild that would return %s", async (status) => {
    const f = fixture(status);
    const response = await f.run({});
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, registered: [{ name: "rules" }] });
    expect(f.fetch).toHaveBeenCalledTimes(1);
    expect(f.fetch).toHaveBeenCalledWith(expect.stringMatching(/\/applications\/[^/]+\/commands$/), expect.objectContaining({ method: "PUT" }));
  });
  it("global sync does not depend on a successful guild listing", async () => {
    const f = fixture(201, 502);
    expect((await f.run({})).status).toBe(200);
    expect(f.fetch.mock.calls.some(([url]) => url.includes("/users/@me/guilds"))).toBe(false);
  });
  it("global Discord rejection is still reported as a failure", async () => {
    const f = fixture(201, 200, 403);
    const response = await f.run({});
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ ok: false, status: 403 });
  });
  it("explicit about-only setup still lists and upserts guild commands without a global overwrite", async () => {
    const f = fixture();
    expect((await f.run({ about_only: true })).status).toBe(200);
    expect(f.fetch).toHaveBeenCalledTimes(2);
    expect(f.fetch).toHaveBeenLastCalledWith(expect.stringContaining("/guilds/111111/commands"), expect.objectContaining({ method: "POST", body: JSON.stringify({ name: "about" }) }));
  });
  it("explicit guild registration still reports guild errors", async () => {
    const f = fixture(403);
    const response = await f.run({ guild_id: "111111", about_only: true });
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ ok: false, guild_commands: [{ guild_id: "111111", ok: false, status: 403 }] });
    expect(f.fetch).toHaveBeenCalledTimes(1);
  });
  it("explicit about-only setup still reports listing errors", async () => {
    const f = fixture(201, 429);
    const response = await f.run({ about_only: true });
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ ok: false, status: 429 });
  });
  it.each([403, 429])("combined guild/global sync still registers global commands after guild rejection %s", async (status) => {
    const f = fixture(status);
    const response = await f.run({ guild_id: "111111" });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, registered: [{ name: "rules" }], guild_commands: [{ guild_id: "111111", ok: false, status }] });
    expect(f.fetch).toHaveBeenLastCalledWith(expect.stringMatching(/\/applications\/[^/]+\/commands$/), expect.objectContaining({ method: "PUT" }));
  });
  it("a timed-out guild does not skip the next server in explicit About setup", async () => {
    const f = fixture();
    f.fetch.mockImplementation(async (url) => {
      if (url.includes("/users/@me/guilds")) return Response.json([{ id: "111111" }, { id: "222222" }]);
      if (url.includes("/guilds/111111/")) throw new Error("Request timed out");
      return Response.json({ id: "about" }, { status: 201 });
    });
    const response = await f.run({ about_only: true });
    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({ ok: false, guild_commands: [{ guild_id: "111111", ok: false, status: 0 }, { guild_id: "222222", ok: true, status: 201 }] });
    expect(f.fetch).toHaveBeenCalledTimes(3);
  });
  it("a guild network failure cannot block a combined global sync", async () => {
    const f = fixture();
    f.fetch.mockImplementationOnce(async () => { throw new Error("Network unavailable"); });
    const response = await f.run({ guild_id: "111111" });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, registered: [{ name: "rules" }], guild_commands: [{ guild_id: "111111", ok: false, status: 0 }] });
  });
});