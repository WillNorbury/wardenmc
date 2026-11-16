import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SiteContextMenu } from "@/components/site/SiteContextMenu";
import { getContextLink, usesNativeContextMenu } from "@/lib/site-context-menu";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const { writeText, success, error } = vi.hoisted(() => ({ writeText: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success, error } }));

function Fixture() {
  const location = useLocation();
  return <SiteContextMenu><div data-testid="page"><a href="/forums">Forum link</a><p data-testid="text">Selected words</p><input aria-label="Email" /><output data-testid="location">{location.pathname}</output></div></SiteContextMenu>;
}

describe("site right-click actions", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
    vi.stubGlobal("DOMRect", class { static fromRect(rect: object) { return rect; } });
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaQueryList);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    writeText.mockReset().mockResolvedValue(undefined);
    success.mockReset();
    error.mockReset();
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("copies the current page URL to the clipboard", async () => {
    render(<MemoryRouter><Fixture /></MemoryRouter>);
    fireEvent.contextMenu(screen.getByTestId("page"), { clientX: 300, clientY: 200 });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Copy page link" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(window.location.href));
  });

  it("copies the clicked link rather than the current page", async () => {
    render(<MemoryRouter><Fixture /></MemoryRouter>);
    fireEvent.contextMenu(screen.getByText("Forum link"));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Copy link address" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(new URL("/forums", document.baseURI).href));
  });

  it("retains the selection captured before the menu opens", async () => {
    render(<MemoryRouter><Fixture /></MemoryRouter>);
    vi.spyOn(window, "getSelection").mockReturnValue({ toString: () => "Selected words" } as Selection);
    fireEvent.contextMenu(screen.getByTestId("text"));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Copy selected text" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("Selected words"));
  });

  it("reports a rejected clipboard operation without reporting success", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    render(<MemoryRouter><Fixture /></MemoryRouter>);
    fireEvent.contextMenu(screen.getByTestId("page"));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Copy page link" }));
    await waitFor(() => expect(error).toHaveBeenCalledTimes(1));
    expect(success).not.toHaveBeenCalled();
  });

  it("navigates to the selected site destination", async () => {
    render(<MemoryRouter><Fixture /></MemoryRouter>);
    fireEvent.contextMenu(screen.getByTestId("page"));
    fireEvent.keyDown(await screen.findByRole("menuitem", { name: "Go to" }), { key: "ArrowRight" });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Forums" }));
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/forums"));
  });

  it("does not cancel the native editing menu", () => {
    render(<MemoryRouter><Fixture /></MemoryRouter>);
    expect(fireEvent.contextMenu(screen.getByRole("textbox", { name: "Email" }))).toBe(true);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("copies inside a modal without dismissing that modal", async () => {
    const dismiss = vi.fn();
    render(<MemoryRouter><SiteContextMenu><Dialog defaultOpen onOpenChange={dismiss}><DialogContent><DialogTitle>Modal content</DialogTitle><DialogDescription>Modal details</DialogDescription></DialogContent></Dialog></SiteContextMenu></MemoryRouter>);
    fireEvent.contextMenu(screen.getByRole("heading", { name: "Modal content" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Copy page link" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(window.location.href));
    expect(dismiss).not.toHaveBeenCalled();
  });

  it("handles an independently rendered confirmation without triggering its backdrop", async () => {
    render(<MemoryRouter><Fixture /></MemoryRouter>);
    const backdrop = vi.fn();
    const external = render(<div role="alertdialog" onClick={backdrop}><h2>Separate confirmation</h2></div>);
    fireEvent.contextMenu(screen.getByRole("heading", { name: "Separate confirmation" }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Copy page link" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(window.location.href));
    expect(backdrop).not.toHaveBeenCalled();
    external.unmount();
  });

  it("leaves custom selectors' own menus untouched", () => {
    render(<MemoryRouter><SiteContextMenu><div role="listbox"><span>Choice</span></div></SiteContextMenu></MemoryRouter>);
    expect(fireEvent.contextMenu(screen.getByText("Choice"))).toBe(true);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});

describe("context target handling", () => {
  it.each(["input", "textarea", "select", "video", "audio", "iframe"])("preserves the native menu for %s", tag => {
    expect(usesNativeContextMenu(document.createElement(tag))).toBe(true);
  });
  it("preserves editable descendants and Shift-right-click", () => {
    const editor = document.createElement("div");
    editor.setAttribute("contenteditable", "");
    const child = editor.appendChild(document.createElement("span"));
    expect(usesNativeContextMenu(child)).toBe(true);
    expect(usesNativeContextMenu(document.createElement("p"), true)).toBe(true);
    expect(usesNativeContextMenu(document.createElement("p"))).toBe(false);
  });
  it.each(["javascript:alert(1)", "data:text/html,example", "https://name:password@example.com"])("rejects unsafe link %s", href => {
    const anchor = document.createElement("a");
    anchor.href = href;
    expect(getContextLink(anchor)).toBeNull();
  });
});