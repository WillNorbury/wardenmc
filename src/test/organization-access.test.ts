import { describe, expect, it } from "vitest";
import { canManageOrganization } from "@/lib/organization-access";
describe("organization owner controls", () => {
  it("allows the existing organization owner", () => expect(canManageOrganization("owner-id", "owner-id")).toBe(true));
  it("denies a different signed-in member", () => expect(canManageOrganization("owner-id", "member-id")).toBe(false));
  it("denies signed-out visitors", () => expect(canManageOrganization("owner-id")).toBe(false));
});