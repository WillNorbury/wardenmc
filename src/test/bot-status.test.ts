import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

type Incident = { id: string; incident_number: number; service_key: string; opened_at: string; closed_at: null; last_error: string };

function createHandler(incidents: Incident[], error: { message: string } | null = null) {
  const rpc = vi.fn(async () => ({ data: error ? null : incidents, error }));
  const admin = {
    rpc,
    from: (table: string) => {
      if (table !== "site_content") throw new Error(`Unexpected table: ${table}`);
      return {
        select: () => ({ eq: (_column: string, key: string) => ({
          maybeSingle: async () => ({ data: { value: key === "server" ? { ip: "play.warden.rip" } : { at: new Date().toISOString() } } }),
        }) }),
      };
    },
  };
  let handler: ((req: Request) => Promise<Response>) | undefined;
  const source = readFileSync("supabase/functions/bot-status/index.ts", "utf8")
    .replace(/^import .*createClient.*;\s*/m, "");
  runInNewContext(ts.transpile(source, { target: ts.ScriptTarget.ES2022 }), {
    createClient: () => admin,
    Deno: { env: { get: () => "test" }, serve: (fn: typeof handler) => { handler = fn; } },
    Response, AbortSignal, console: { error: vi.fn() },
    fetch: async () => Response.json({ online: true, players: { online: 3, max: 100 } }),
  });
  if (!handler) throw new Error("Status handler was not registered");
  return { handler, rpc };
}

describe("WardenBot ongoing issues", () => {
  it("returns active outages from the existing public uptime incident lookup", async () => {
    const incident: Incident = { id: "outage-1", incident_number: 42, service_key: "api", opened_at: "2026-10-20T00:00:00Z", closed_at: null, last_error: "Service unavailable" };
    const { handler, rpc } = createHandler([incident]);
    const response = await handler(new Request("https://example.test/bot-status"));
    expect(rpc).toHaveBeenCalledWith("get_public_active_uptime_incidents", { _limit: 10 });
    expect(response.status).toBe(200);
    expect((await response.json()).incidents).toEqual([incident]);
  });

  it("does not report an empty healthy result when the incident lookup fails", async () => {
    const { handler } = createHandler([], { message: "Lookup unavailable" });
    const response = await handler(new Request("https://example.test/bot-status"));
    const data = await response.json();
    expect(response.status).toBe(503);
    expect(data.ok).toBe(false);
    expect(data.incidents).toBeUndefined();
  });

  it("returns no issues when the active incident lookup succeeds with no outages", async () => {
    const { handler } = createHandler([]);
    const response = await handler(new Request("https://example.test/bot-status"));
    expect(response.status).toBe(200);
    expect((await response.json()).incidents).toEqual([]);
  });
});