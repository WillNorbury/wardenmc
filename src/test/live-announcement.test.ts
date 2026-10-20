import { describe, expect, it } from "vitest";
import { buildAnnouncementHtml, buildAnnouncementText, DEFAULT_LIVE_ANNOUNCEMENT, draftStorageKey, liveAnnouncementSchema, readAnnouncementDraft, LIVE_ANNOUNCEMENT_FROM } from "@/lib/live-announcement";

describe("live announcement drafts", () => {
  it("uses the requested intended sender", () => {
    expect(LIVE_ANNOUNCEMENT_FROM).toBe("streams@warden.rip");
  });
  it("keeps browser drafts separate for different accounts", () => {
    expect(draftStorageKey("account-one")).not.toBe(draftStorageKey("account-two"));
  });
  it("reads a saved edited draft and recovers from malformed storage", () => {
    const draft = { ...DEFAULT_LIVE_ANNOUNCEMENT, streamTitle: "Survival tonight" };
    expect(readAnnouncementDraft(JSON.stringify(draft))).toEqual(draft);
    expect(readAnnouncementDraft("broken")).toEqual(DEFAULT_LIVE_ANNOUNCEMENT);
  });
  it("rejects unsafe links while allowing an HTTPS stream", () => {
    for (const streamUrl of ["javascript:alert(1)", "http://www.twitch.tv/will_norbury", "https://user:password@twitch.tv"]) {
      expect(liveAnnouncementSchema.safeParse({ ...DEFAULT_LIVE_ANNOUNCEMENT, streamUrl }).success).toBe(false);
    }
    expect(liveAnnouncementSchema.safeParse(DEFAULT_LIVE_ANNOUNCEMENT).success).toBe(true);
  });
  it("exports the actual edited stream link and message without executing user HTML", () => {
    const draft = { ...DEFAULT_LIVE_ANNOUNCEMENT, message: '<script>alert("bad")</script>', streamUrl: "https://warden.rip/live" };
    const html = buildAnnouncementHtml(draft, { background: "canvas", panel: "canvas", text: "canvastext", muted: "graytext", primary: "highlight", onPrimary: "highlighttext", border: "graytext" });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(buildAnnouncementText(draft)).toContain("Watch live: https://warden.rip/live");
  });
});