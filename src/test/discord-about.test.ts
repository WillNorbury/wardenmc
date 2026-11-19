import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { aboutRegistration, DEFAULT_ABOUT_MESSAGE, DEFAULT_ABOUT_SETTINGS, runAboutCommand, type AboutSettings } from "../../supabase/functions/_shared/discord-about-model";
import { defaultModuleSettings, sanitizeModuleSettings } from "../../supabase/functions/_shared/discord-modules-model";
import { RESERVED_CUSTOM_COMMAND_NAMES } from "../../supabase/functions/_shared/discord-custom-commands-model";
import { completeDeferredReply } from "../../supabase/functions/_shared/discord-deferred";

const guildId = "111111111111111111", owner = "222222222222222222", channelId = "333333333333333333", otherChannel = "444444444444444444";
beforeAll(() => vi.stubGlobal("AbortSignal", { timeout: () => new AbortController().signal }));
afterAll(() => vi.unstubAllGlobals());
function fixture(saved: unknown = null, selected?: string, userId = owner) {
  const body = { guild_id: guildId, channel_id: otherChannel, member: { user: { id: userId }, permissions: "8" }, data: { options: selected ? [{ name: "channel", type: 7, value: selected }] : [] } };
  const discord = vi.fn(async (method: string, path: string, _payload?: unknown) => {
    if (path === `/guilds/${guildId}`) return Response.json({ owner_id: owner });
    if (method === "GET") return Response.json({ guild_id: guildId, type: 0 });
    return Response.json({ id: "555555555555555555" });
  });
  const load = vi.fn(async () => saved);
  const save = vi.fn(async (_guild: string, _user: string, _settings: AboutSettings) => {});
  return { body, deps: { discord, load, save } };
}
describe("owner-only About command", () => {
  it("rejects a non-owner even with Administrator and never reads or writes settings", async () => {
    const { body, deps } = fixture(null, channelId, "666666666666666666");
    await runAboutCommand(body, deps);
    expect(deps.discord).toHaveBeenCalledTimes(1);
    expect(deps.load).not.toHaveBeenCalled();
    expect(deps.save).not.toHaveBeenCalled();
  });
  it("requires explicit channel selection on first use rather than using the invocation channel", async () => {
    const { body, deps } = fixture();
    await runAboutCommand(body, deps);
    expect(deps.save).not.toHaveBeenCalled();
    expect(deps.discord.mock.calls.filter(([method]) => method === "POST")).toHaveLength(0);
  });
  it("saves a first selected text channel and posts the specified default message there", async () => {
    const { body, deps } = fixture(null, channelId);
    await runAboutCommand(body, deps);
    expect(deps.save).toHaveBeenCalledWith(guildId, owner, { ...DEFAULT_ABOUT_SETTINGS, channel_id: channelId });
    expect(deps.discord).toHaveBeenCalledWith("POST", `/channels/${channelId}/messages`, expect.objectContaining({ content: DEFAULT_ABOUT_MESSAGE }));
  });
  it("reuses the saved channel even when invoked elsewhere", async () => {
    const { body, deps } = fixture({ ...DEFAULT_ABOUT_SETTINGS, channel_id: channelId });
    await runAboutCommand(body, deps);
    expect(deps.discord).toHaveBeenCalledWith("POST", `/channels/${channelId}/messages`, expect.anything());
    expect(deps.discord).not.toHaveBeenCalledWith("POST", `/channels/${otherChannel}/messages`, expect.anything());
  });
  it("updates the channel when the owner selects another", async () => {
    const { body, deps } = fixture({ ...DEFAULT_ABOUT_SETTINGS, channel_id: channelId }, otherChannel);
    await runAboutCommand(body, deps);
    expect(deps.save).toHaveBeenCalledWith(guildId, owner, { ...DEFAULT_ABOUT_SETTINGS, channel_id: otherChannel });
    expect(deps.discord).toHaveBeenCalledWith("POST", `/channels/${otherChannel}/messages`, expect.anything());
  });
  it("rejects wrong-server channels without saving or posting", async () => {
    const { body, deps } = fixture(null, channelId);
    deps.discord.mockImplementation(async (_method, path) => Response.json(path.startsWith("/guilds/") ? { owner_id: owner } : { guild_id: "999999999999999999", type: 0 }));
    await runAboutCommand(body, deps);
    expect(deps.save).not.toHaveBeenCalled();
    expect(deps.discord.mock.calls.filter(([method]) => method === "POST")).toHaveLength(0);
  });
  it("disables user, role, everyone and reply mentions, including in custom messages", async () => {
    const { body, deps } = fixture({ channel_id: channelId, message: "@everyone <@222222222222222222> <@&444444444444444444>", enabled: true });
    await runAboutCommand(body, deps);
    expect(deps.discord).toHaveBeenCalledWith("POST", `/channels/${channelId}/messages`, { content: "@everyone <@222222222222222222> <@&444444444444444444>", allowed_mentions: { parse: [], users: [], roles: [], replied_user: false } });
  });
  it("accepts announcement channels but rejects voice channels", async () => {
    for (const type of [5, 2]) {
      const { body, deps } = fixture(null, channelId);
      deps.discord.mockImplementation(async (_method, path) => Response.json(path.startsWith("/guilds/") ? { owner_id: owner } : { guild_id: guildId, type }));
      await runAboutCommand(body, deps);
      expect(deps.save.mock.calls.length).toBe(type === 5 ? 1 : 0);
    }
  });
  it("does not post when the dashboard disables the module", async () => {
    const { body, deps } = fixture({ channel_id: channelId, enabled: false });
    await runAboutCommand(body, deps);
    expect(deps.save).not.toHaveBeenCalled();
    expect(deps.discord.mock.calls.filter(([method]) => method === "POST")).toHaveLength(0);
  });
  it("does not post when saving fails", async () => {
    const { body, deps } = fixture(null, channelId);
    deps.save.mockRejectedValue(new Error("unavailable"));
    await expect(runAboutCommand(body, deps)).rejects.toThrow();
    expect(deps.discord.mock.calls.filter(([method]) => method === "POST")).toHaveLength(0);
  });
  it("keeps command success and rejection private through the deferred transport", async () => {
    for (const user of [owner, "666666666666666666"]) {
      const { body, deps } = fixture(null, channelId, user);
      const request = vi.fn(async () => new Response("{}"));
      await completeDeferredReply({ application_id: "app", token: "test" }, async () => Response.json({ data: { content: await runAboutCommand(body, deps), flags: 64 } }), request);
      expect(request).toHaveBeenCalledTimes(1);
      expect(request.mock.calls[0]).toEqual(["https://discord.com/api/v10/webhooks/app/test/messages/@original", expect.objectContaining({ method: "PATCH" })]);
    }
  });
  it("supports about defaults and dashboard settings without falling into AutoMod", () => {
    expect(defaultModuleSettings("about")).toEqual(DEFAULT_ABOUT_SETTINGS);
    expect(sanitizeModuleSettings("about", { channel_id: channelId, message: "Custom intro", enabled: false })).toEqual({ channel_id: channelId, message: "Custom intro", enabled: false });
    expect(RESERVED_CUSTOM_COMMAND_NAMES.has("about")).toBe(true);
    expect(aboutRegistration.options[0]).toMatchObject({ type: 7, required: false, channel_types: [0, 5] });
  });
});