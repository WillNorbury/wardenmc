import { afterEach, describe, expect, it, vi } from "vitest";
import { handleModeration } from "../../supabase/functions/_shared/moderation-commands.ts";

vi.mock("../../supabase/functions/_shared/discord-token.ts", () => ({ getDiscordBotToken: async () => "test-token" }));

const OWNER = "111111111111111111", MEMBER = "222222222222222222";
const body = (target: string) => ({
  guild_id: "999999999999999999",
  member: { permissions: "8", user: { id: OWNER, username: "owner" } },
  data: { name: "nick", options: [{ name: "user", value: target }, { name: "nickname", value: "Steve" }] },
});
const mockDiscord = (patchStatus: number) =>
  vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) =>
    init?.method === "GET"
      ? new Response(JSON.stringify({ owner_id: OWNER }), { status: 200 })
      : new Response("{}", { status: patchStatus })));

afterEach(() => vi.unstubAllGlobals());

describe("/nick", () => {
  it("renames when Discord allows it", async () => {
    mockDiscord(200);
    expect(await handleModeration(body(MEMBER))).toContain("Renamed");
  });
  it("explains that the server owner can never be renamed by a bot", async () => {
    mockDiscord(403);
    expect(await handleModeration(body(OWNER))).toContain("server owner");
  });
  it("explains the missing permission or role order for other members", async () => {
    mockDiscord(403);
    expect(await handleModeration(body(MEMBER))).toContain("Manage Nicknames");
  });
});
