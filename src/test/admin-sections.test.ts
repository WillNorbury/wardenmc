import { describe, expect, it } from "vitest";
import { ADMIN_SECTIONS, isUnknownAdminTab, resolveAdminSection } from "@/components/admin/AdminLayout";

describe("Admin section cleanup", () => {
  for (const retired of ["wiki", "gallery", "quizzes"]) {
    it(`retires ${retired} and sends its old tab to the dashboard`, () => {
      expect(ADMIN_SECTIONS).not.toContain(retired);
      expect(resolveAdminSection(retired)).toBe("dashboard");
      expect(isUnknownAdminTab(retired)).toBe(true);
    });
  }

  for (const active of ["applications", "tickets", "plugins", "store", "orders", "punishments", "bot-config", "live-announcement"]) {
    it(`keeps ${active} available`, () => {
      expect(ADMIN_SECTIONS).toContain(active);
      expect(resolveAdminSection(active)).toBe(active);
      expect(isUnknownAdminTab(active)).toBe(false);
    });
  }
});