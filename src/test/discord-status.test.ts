import { describe, it, expect } from "vitest";
import { canSetupStatus, statusSetupInput, statusRegistration, buildStatusEmbed, STATUS_SERVICES } from "../../supabase/functions/_shared/discord-status-model";

const interaction = { guild_id: "123456789012345678", channel_id: "123456789012345679", member: { user: { id: "123456789012345680" } }, data: { name: "status", options: [{ type: 1, name: "setup" }] } };
describe("Discord status setup", () => {
  it("registers /status setup as a guild-only Manage Server command", () => {
    expect(statusRegistration.name).toBe("status");
    expect(statusRegistration.options[0]).toMatchObject({ type: 1, name: "setup" });
    expect(statusRegistration.dm_permission).toBe(false);
    expect(statusRegistration.default_member_permissions).toBe("32");
  });
  it("allows Manage Server and Administrator but rejects ordinary members", () => {
    expect(canSetupStatus("32")).toBe(true); expect(canSetupStatus("8")).toBe(true);
    expect(canSetupStatus("2048")).toBe(false); expect(canSetupStatus("invalid")).toBe(false);
  });
  it("accepts a server setup invocation and rejects DMs or a different subcommand", () => {
    expect(statusSetupInput(interaction)?.channelId).toBe("123456789012345679");
    expect(statusSetupInput({ ...interaction, guild_id: undefined })).toBeNull();
    expect(statusSetupInput({ ...interaction, data: { name: "status", options: [{ type: 1, name: "other" }] } })).toBeNull();
  });
  it("uses exactly the five website services and exposes no private error details", () => {
    expect(STATUS_SERVICES.map(([key]) => key)).toEqual(["website", "minecraft", "api", "panel", "discord"]);
    expect(buildStatusEmbed([], "https://warden.rip/status").fields).toHaveLength(5);
  });
  it("does not show stale or missing checks as operational", () => {
    const now = Date.parse("2026-10-18T20:42:00Z");
    const stale = buildStatusEmbed([{ service_key: "website", is_up: true, checked_at: new Date(now - 16 * 60000).toISOString() }], "https://warden.rip/status", now);
    const fresh = buildStatusEmbed([{ service_key: "website", is_up: false, checked_at: new Date(now).toISOString() }], "https://warden.rip/status", now);
    expect(stale.fields[0].value).toBe("⚪ Awaiting fresh check");
    expect(fresh.fields[0].value).toBe("🔴 Outage");
  });
});