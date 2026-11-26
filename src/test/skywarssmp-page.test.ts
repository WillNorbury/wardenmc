import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { ADMIN_SECTIONS, SECTION_PERMISSIONS, resolveAdminSection } from "@/components/admin/AdminLayout";
import {
  DEFAULT_SKYWARSSMP_CONTENT,
  parseSkywarsSMPContent,
  skywarsSMPContentSchema,
} from "@/lib/skywarssmp";

const APP = readFileSync("src/App.tsx", "utf8");
const ADMIN = readFileSync("src/pages/Admin.tsx", "utf8");
const SITEMAP = readFileSync("scripts/generate-sitemap.ts", "utf8");
const PUBLIC_CONTENT_MIGRATION = readFileSync("drizzle/migrations/0028_public_skywarssmp_content.sql", "utf8");

describe("SkywarsSMP joining page", () => {
  it("uses the confirmed Warden Network address and SkywarsSMP queue command", () => {
    expect(DEFAULT_SKYWARSSMP_CONTENT.server_ip).toBe("play.warden.rip");
    expect(DEFAULT_SKYWARSSMP_CONTENT.join_command).toBe("/joinqueue SkywarsSMP");
  });

  it("serves the public guide at /skywarssmp", () => {
    expect(APP).toContain('<Route path="/skywarssmp" element={<SkywarsSMP />} />');
    expect(SITEMAP).toContain('{ path: "/skywarssmp", changefreq: "monthly", priority: "0.7" }');
  });

  it("loads editable saved joining information", () => {
    const saved = parseSkywarsSMPContent({
      ...DEFAULT_SKYWARSSMP_CONTENT,
      description: "A custom introduction for SkywarsSMP players.",
      join_steps: ["Join the network.", "Enter the SkywarsSMP queue."],
    });
    expect(saved.description).toBe("A custom introduction for SkywarsSMP players.");
    expect(saved.join_steps).toEqual(["Join the network.", "Enter the SkywarsSMP queue."]);
  });

  it("rejects website URLs in the server-address field", () => {
    expect(skywarsSMPContentSchema.safeParse({
      ...DEFAULT_SKYWARSSMP_CONTENT,
      server_ip: "https://play.warden.rip",
    }).success).toBe(false);
  });

  it("makes only the SkywarsSMP content key publicly readable", () => {
    expect(PUBLIC_CONTENT_MIGRATION).toContain("ON public.site_content FOR SELECT TO public");
    expect(PUBLIC_CONTENT_MIGRATION).toContain("USING (key = 'skywarssmp_page')");
  });

  it("makes /admin?tab=skywarssmp a content-editing section", () => {
    expect(ADMIN_SECTIONS).toContain("skywarssmp");
    expect(resolveAdminSection("skywarssmp")).toBe("skywarssmp");
    expect(SECTION_PERMISSIONS.skywarssmp).toBe("content.edit");
    expect(ADMIN).toContain('{section === "skywarssmp" && <SkywarsSMPAdminSection />}');
  });
});
