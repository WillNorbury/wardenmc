import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// Routes that were deliberately deleted from src/App.tsx. Nothing may still
// navigate or link to them — people would land on the 404 screen.
const REMOVED_ROUTES = ["/link-account", "/tickets", "/vote", "/news"];

const SEARCH_DIRS = ["src/pages", "src/components", "scripts"];

function filesIn(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return filesIn(full);
    return /\.(tsx|ts)$/.test(full) ? [full] : [];
  });
}

describe("removed routes", () => {
  for (const route of REMOVED_ROUTES) {
    it(`no code links to the deleted ${route} route`, () => {
      const offenders: string[] = [];
      for (const dir of SEARCH_DIRS) {
        for (const file of filesIn(dir)) {
          const src = readFileSync(file, "utf8");
          // Match a route string literal, not a folder path like "@/components/dashboard/…".
          if (src.includes(`"${route}"`) || src.includes(`\`${route}\``)) {
            offenders.push(file);
          }
        }
      }
      expect(offenders).toEqual([]);
    });
  }
});
