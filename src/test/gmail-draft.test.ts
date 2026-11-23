import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import { buildGmailDraftUrl } from "@/lib/gmail-draft";

describe("Gmail draft", () => {
  it("prefills the subject and message without mangling line breaks or Unicode", () => {
    const url = new URL(buildGmailDraftUrl("Warden update & news", "Hello 💎\nSecond line + details", ["member@example.test"]));
    expect(url.origin).toBe("https://mail.google.com");
    expect(url.searchParams.get("su")).toBe("Warden update & news");
    expect(url.searchParams.get("body")).toBe("Hello 💎\nSecond line + details");
  });
  it("hides all website recipients in BCC and removes duplicates", () => {
    const url = new URL(buildGmailDraftUrl("Subject", "Message", ["A@example.test", "a@example.test", "b@example.test"]));
    expect(url.searchParams.get("bcc")).toBe("a@example.test,b@example.test");
    expect(url.searchParams.has("to")).toBe(false);
    expect(url.searchParams.has("cc")).toBe(false);
  });
  it("rejects empty recipient lists", () => {
    expect(() => buildGmailDraftUrl("Subject", "Message", [])).toThrow("No eligible website recipients");
  });
  it("does not silently truncate oversized messages", () => {
    expect(() => buildGmailDraftUrl("Subject", "💎".repeat(10000), ["a@example.test"])).toThrow("too large");
  });
});

function fixture(ownerAllowed = true, suppressedError = false) {
  let handler: ((req: Request) => Promise<Response>) | undefined;
  const invoke = vi.fn(), insert = vi.fn();
  const rpc = vi.fn(async () => ({ error: ownerAllowed ? null : { message: "Forbidden" } }));
  const from = vi.fn((table: string) => {
    const result = table === "user_roles" ? { data: [{ role: "owner" }] }
      : table === "suppressed_emails" ? { data: [{ email: "suppressed@example.test" }], error: suppressedError ? { message: "Unavailable" } : null }
      : { data: [] };
    const chain: Record<string, unknown> = { then: (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve), insert };
    for (const method of ["select", "eq", "in"]) chain[method] = () => chain;
    return chain;
  });
  const client = { from, rpc, functions: { invoke }, auth: {
    getUser: async () => ({ data: { user: { id: "owner", email: "owner@example.test" } } }),
    admin: { listUsers: async () => ({ data: { users: [
      { email: "member@example.test", email_confirmed_at: "2026-11-23" },
      { email: "suppressed@example.test", email_confirmed_at: "2026-11-23" },
      { email: "unconfirmed@example.test", email_confirmed_at: null },
    ] } }) },
  } };
  const source = readFileSync("supabase/functions/admin-send-broadcast/index.ts", "utf8").replace(/^import[^\n]*\n/gm, "");
  runInNewContext(ts.transpile(source, { target: ts.ScriptTarget.ES2022 }), {
    Deno: { env: { get: () => "test" }, serve: (fn: typeof handler) => { handler = fn; } },
    createClient: () => client, Request, Response, Set, Date,
  });
  return { invoke, insert, rpc, run: async (category = "all") => {
    if (!handler) throw new Error("Missing handler");
    return handler(new Request("https://example.test", { method: "POST", body: JSON.stringify({ category, mode: "gmail-draft", subject: "Subject", message: "Message" }) }));
  } };
}

describe("Gmail recipient authorization", () => {
  it("returns confirmed, unsuppressed members without sending or logging delivery", async () => {
    const f = fixture();
    const response = await f.run();
    expect(response.status).toBe(200);
    expect((await response.json()).recipients).toEqual(["member@example.test"]);
    expect(f.invoke).not.toHaveBeenCalled();
    expect(f.insert).not.toHaveBeenCalled();
  });
  it("requires the existing exact-owner email authorization", async () => {
    const f = fixture(false);
    expect((await f.run()).status).toBe(403);
    expect(f.rpc).toHaveBeenCalledWith("owner_list_user_emails");
    expect(f.invoke).not.toHaveBeenCalled();
  });
  it("fails closed if suppression cannot be checked", async () => {
    expect((await fixture(true, true).run()).status).toBe(500);
  });
  it("does not add Gmail export to other categories", async () => {
    expect((await fixture().run("admins")).status).toBe(400);
  });
});