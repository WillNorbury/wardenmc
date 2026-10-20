import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("scheduled Discord panel maintenance", () => {
  it("cannot start Discord gateway sessions during minute-by-minute refreshes", () => {
    const source = readFileSync("supabase/functions/discord-presence/index.ts", "utf8");
    expect(source).not.toMatch(/new\s+WebSocket|gateway\.discord|op:\s*2\b|holdPresence\s*\(/);
    expect(source).toContain("await syncStatusPanels(admin)");
    expect(source).toContain("online: false");
  });
});