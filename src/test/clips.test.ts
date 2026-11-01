import { describe, expect, it } from "vitest";
import { CLIP_MAX_BYTES, clipStoragePath, validateClip } from "@/lib/clips";

describe("clip uploads", () => {
  it("accepts MP4, WebM and MOV videos", () => {
    for (const name of ["clip.mp4", "clip.webm", "clip.MOV"]) expect(validateClip({ name, size: 1024 }, "My clip")).toBeNull();
  });
  it("rejects non-video files", () => {
    expect(validateClip({ name: "clip.html", size: 1024 }, "My clip")).toBeTruthy();
  });
  it("enforces the 50 MB upload limit", () => {
    expect(CLIP_MAX_BYTES).toBe(52428800);
    expect(validateClip({ name: "clip.mp4", size: CLIP_MAX_BYTES }, "Clip")).toBeNull();
    expect(validateClip({ name: "clip.mp4", size: CLIP_MAX_BYTES + 1 }, "Clip")).toBeTruthy();
  });
  it("requires a non-empty title of at most 120 characters", () => {
    expect(validateClip({ name: "clip.mp4", size: 100 }, " ")).toBeTruthy();
    expect(validateClip({ name: "clip.mp4", size: 100 }, "a".repeat(121))).toBeTruthy();
  });
  it("keeps uploads inside the owner's folder", () => {
    expect(clipStoragePath("owner-id", "clip-id", "video.MP4")).toBe("owner-id/clip-id.mp4");
    expect(() => clipStoragePath("owner-id", "clip-id", "page.html")).toThrow();
  });
});