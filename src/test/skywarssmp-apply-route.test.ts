import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const APP = readFileSync("src/App.tsx", "utf8");
const APPLY = readFileSync("src/pages/Apply.tsx", "utf8");
const SITEMAP = readFileSync("scripts/generate-sitemap.ts", "utf8");

describe("SkywarsSMP application route", () => {
  it("serves the SkywarsSMP application at /skywarssmp/apply", () => {
    expect(APP).toContain(
      '<Route path="/skywarssmp/apply" element={<Apply fixedSlug="skywarssmp" applicationPath="/skywarssmp/apply" />} />',
    );
  });

  it("uses the custom address for the canonical link and post-sign-in return", () => {
    expect(APPLY).toContain("const formPath = applicationPath ?? `/apply/${slug}`;");
    expect(APPLY).toContain("path={formPath}");
    expect(APPLY).toContain("encodeURIComponent(formPath)");
  });

  it("links the SkywarsSMP application card to the custom address", () => {
    expect(APPLY).toContain('t.slug === "skywarssmp" ? "/skywarssmp/apply" : `/apply/${t.slug}`');
  });

  it("includes the public application page in the sitemap", () => {
    expect(SITEMAP).toContain('{ path: "/skywarssmp/apply", changefreq: "monthly", priority: "0.6" }');
  });
});
