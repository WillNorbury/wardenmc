import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LiveAnnouncementDraftSection } from "@/components/admin/LiveAnnouncementDraftSection";
import { draftStorageKey } from "@/lib/live-announcement";

vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: { id: "draft-editor-test" } }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const writeText = vi.fn().mockResolvedValue(undefined);

describe("Admin live draft workflow", () => {
  beforeEach(() => {
    localStorage.clear();
    writeText.mockClear();
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  });
  afterEach(cleanup);

  it("saves only on request, reloads edits, and copies the edited email", async () => {
    const view = render(<LiveAnnouncementDraftSection />);
    fireEvent.change(screen.getByLabelText("Subject"), { target: { value: "Survival stream tonight" } });
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Come build with us!" } });
    expect(localStorage.getItem(draftStorageKey("draft-editor-test"))).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    expect(JSON.parse(localStorage.getItem(draftStorageKey("draft-editor-test")) ?? "{}").message).toBe("Come build with us!");
    view.unmount();
    render(<LiveAnnouncementDraftSection />);
    expect(screen.getByLabelText("Subject")).toHaveValue("Survival stream tonight");
    fireEvent.click(screen.getByRole("button", { name: "Copy email text" }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Come build with us!"));
    fireEvent.click(screen.getByRole("button", { name: "Copy HTML" }));
    expect(writeText).toHaveBeenLastCalledWith(expect.stringContaining("<!doctype html>"));
  });
});