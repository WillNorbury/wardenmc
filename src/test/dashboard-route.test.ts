import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

// /dashboard is a signed-in member screen: the route must exist, be reachable
// from the sidebar, and stay out of the public sitemap.
const APP = readFileSync("src/App.tsx", "utf8");
const SIDEBAR = readFileSync("src/components/site/AppSidebar.tsx", "utf8");
const SITEMAP = readFileSync("scripts/generate-sitemap.ts", "utf8");

describe("dashboard route", () => {
  it("serves the Dashboard page at /dashboard", () => {
    expect(APP).toContain('<Route path="/dashboard" element={<Dashboard />} />');
  });

  it("links /dashboard from the sidebar account group", () => {
    expect(SIDEBAR).toContain('{ to: "/dashboard", label: "Dashboard"');
  });

  it("keeps the signed-in dashboard out of the public sitemap", () => {
    expect(SITEMAP).not.toContain('path: "/dashboard"');
  });
});
