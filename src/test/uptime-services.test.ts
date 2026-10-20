import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

type Check = { service_key: string; is_up: boolean; latency_ms: number | null; status_code: number | null; error: string | null };

// Loads the uptime checker without its network imports so checkBot can be called directly.
function loadChecker(fetchImpl: () => Promise<Response>) {
  const source =
    readFileSync("supabase/functions/uptime-check/index.ts", "utf8").replace(/^import[^\n]*\n/gm, "") +
    "\n;globalThis.__checkBot = checkBot; globalThis.__names = SERVICE_NAMES;";

  runInNewContext(ts.transpile(source, { target: ts.ScriptTarget.ES2022 }), {
    createClient: () => ({}),
    STATUS_URL: "https://warden.rip/status",
    getDiscordBotToken: async () => null,
    Deno: { env: { get: () => "test" }, serve: () => {} },
    Response,
    AbortSignal,
    setTimeout,
    clearTimeout,
    fetch: fetchImpl,
    console: { log: vi.fn(), error: vi.fn() },
  });

  const scope = globalThis as unknown as { __checkBot?: (k: string, t: string) => Promise<Check>; __names?: Record<string, string> };
  if (!scope.__checkBot || !scope.__names) throw new Error("uptime-check internals were not exposed");
  const { __checkBot: checkBot, __names: names } = scope;
  delete scope.__checkBot;
  delete scope.__names;
  return { checkBot, names };
}

const statusPage = readFileSync("src/pages/Status.tsx", "utf8");
const adminPage = readFileSync("src/pages/Admin.tsx", "utf8");

describe("WardenBot on the status page", () => {
  it("is listed as a tracked service on the public status page", () => {
    expect(statusPage).toMatch(/\{\s*key:\s*"bot",\s*name:\s*"WardenBot"/);
    expect(adminPage).toMatch(/\{\s*key:\s*"bot",\s*name:\s*"WardenBot"/);
  });

  it("names the service WardenBot in outage alerts", () => {
    const { names } = loadChecker(async () => Response.json({}));
    expect(names.bot).toBe("WardenBot");
  });

  it("counts the bot as up only while Discord accepts its credentials", async () => {
    const accepted = loadChecker(async () => new Response("{}", { status: 200 }));
    const up = await accepted.checkBot("bot", "token");
    expect(up).toMatchObject({ service_key: "bot", is_up: true, status_code: 200, error: null });

    const rejected = loadChecker(async () => new Response("{}", { status: 401 }));
    const down = await rejected.checkBot("bot", "token");
    expect(down).toMatchObject({ service_key: "bot", is_up: false, status_code: 401 });
    expect(down.error).toContain("401");
  });
});
