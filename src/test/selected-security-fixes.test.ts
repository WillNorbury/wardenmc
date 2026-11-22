import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

function load(name: string, createClient: (...args: unknown[]) => unknown, extras: Record<string, unknown> = {}) {
  let handler: (req: Request) => Promise<Response>;
  const source = readFileSync(`supabase/functions/${name}/index.ts`, "utf8").replace(/^import[^\n]*\n/gm, "");
  runInNewContext(ts.transpile(source, { target: ts.ScriptTarget.ES2022 }), {
    Deno: { env: { get: () => "test-config" }, serve: (fn: typeof handler) => { handler = fn; } },
    createClient, Response, Request, URL, Date, Set, Map, crypto, atob,
    corsHeaders: {}, console: { log: vi.fn(), error: vi.fn() },
    authenticateCronRequest: () => new Response("Unauthorized", { status: 401 }),
    ...extras,
  });
  return (body: unknown = {}, authorization = "Bearer user") => handler(new Request("https://example.test", { method: "POST", headers: { Authorization: authorization }, body: JSON.stringify(body) }));
}

function query(result: unknown) {
  const calls: Record<string, unknown[]> = {};
  const q: Record<string, unknown> = {};
  for (const method of ["select", "eq", "in", "limit", "gte", "order"]) q[method] = (...args: unknown[]) => { (calls[method] ??= []).push(args); return q; };
  q.maybeSingle = async () => result;
  q.then = (resolve: (result: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return { q, calls };
}

describe("selected security fixes", () => {
  it("rejects anonymous uptime checks before reading private settings", async () => {
    const from = vi.fn();
    const run = load("uptime-check", () => ({ from, auth: { getUser: async () => ({ data: { user: null } }) } }));
    expect((await run({}, "")).status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });
  it("rejects member-triggered uptime checks before reading alert settings", async () => {
    const { q } = query({ data: [] });
    const from = vi.fn(() => q);
    const run = load("uptime-check", () => ({ from, auth: { getUser: async () => ({ data: { user: { id: "member" } } }) } }));
    expect((await run()).status).toBe(403);
    expect(from).toHaveBeenCalledWith("user_roles");
    expect(from).not.toHaveBeenCalledWith("alert_settings");
  });
  it("rejects a member's forged staff alert without sending a webhook", async () => {
    const { q } = query({ data: [] });
    const from = vi.fn(() => q), fetch = vi.fn();
    const run = load("website-log-event", () => ({ from, auth: { getUser: async () => ({ data: { user: { id: "member" } } }) } }), { fetch });
    expect((await run({ kind: "contact_reply_sent", title: "Fake staff action" })).status).toBe(403);
    expect(from).not.toHaveBeenCalledWith("alert_settings");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("retains staff alert access for authorized staff", async () => {
    const role = query({ data: [{ role: "owner" }] }), alerts = query({ data: { webhook_urls: [] } });
    const from = vi.fn((table: string) => table === "user_roles" ? role.q : alerts.q);
    const run = load("website-log-event", () => ({ from, auth: { getUser: async () => ({ data: { user: { id: "owner" } } }) } }));
    expect((await run({ kind: "apply_type", title: "Updated application" })).status).toBe(200);
    expect(from).toHaveBeenCalledWith("alert_settings");
  });
  it("appeal lookup requires the matched record to belong to the caller", async () => {
    const appeal = query({ data: null }), send = vi.fn();
    const run = load("send-app-email", () => ({
      from: () => appeal.q,
      auth: { getUser: async () => ({ data: { user: { id: "member", email: "member@example.test" } } }) },
      rpc: async () => ({ data: false }),
    }), { sendTemplateEmail: send });
    expect((await run({ templateName: "ban-appeal-received", templateData: { minecraftUsername: "SomeoneElse" } })).status).toBe(403);
    expect(appeal.calls.eq).toContainEqual(["user_id", "member"]);
    expect(send).not.toHaveBeenCalled();
  });
  it("anonymous callers cannot look up private appeal addresses", async () => {
    const from = vi.fn(), send = vi.fn();
    const run = load("send-app-email", () => ({ from, auth: { getUser: async () => ({ data: { user: null } }) } }), { sendTemplateEmail: send });
    expect((await run({ templateName: "ban-appeal-received" })).status).toBe(403);
    expect(from).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
  function pluginFixture(matches: boolean) {
    const plugin = query({ data: { id: "plugin", published: true, user_id: "owner", jar_path: "victim/file.jar" } });
    const rpc = vi.fn(async () => ({ data: matches }));
    const sign = vi.fn(async () => ({ data: { signedUrl: "https://example.test/download" } }));
    const run = load("plugin-file-url", () => ({ from: () => plugin.q, rpc, auth: { getUser: async () => ({ data: { user: null } }) }, storage: { from: () => ({ createSignedUrl: sign }) } }));
    return { run, rpc, sign };
  }
  it("an editable main-jar path cannot authorize another user's file", async () => {
    const f = pluginFixture(false);
    expect((await f.run({ path: "victim/file.jar" })).status).toBe(404);
    expect(f.rpc).toHaveBeenCalledWith("plugin_file_uploader_matches", { _plugin_id: "plugin", _path: "victim/file.jar" });
    expect(f.sign).not.toHaveBeenCalled();
  });
  it("verified uploader files still receive download links", async () => {
    const f = pluginFixture(true);
    expect((await f.run({ path: "owner/file.jar" })).status).toBe(200);
    expect(f.sign).toHaveBeenCalledWith("owner/file.jar", 300, { download: true });
  });
  it.each(["owner/%2e%2e/victim.jar", "owner/../victim.jar", "%2fother/file.jar"])("rejects unsafe decoded storage path %s", async (path) => {
    const f = pluginFixture(true);
    expect((await f.run({ path })).status).toBe(400);
    expect(f.sign).not.toHaveBeenCalled();
  });
});