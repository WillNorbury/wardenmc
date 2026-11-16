import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SiteContextMenu } from "@/components/site/SiteContextMenu";
import { getContextLink, getContextMenuContainer, getContextUser, usesNativeContextMenu } from "@/lib/site-context-menu";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import Lightbox from "@/components/site/Lightbox";

const { writeText, success, error } = vi.hoisted(() => ({ writeText: vi.fn(), success: vi.fn(), error: vi.fn() }));
const { auth, insert, from } = vi.hoisted(() => ({ auth: { user: null as { id: string } | null }, insert: vi.fn(), from: vi.fn() }));
vi.mock("@/lib/auth", () => ({ useAuth: () => auth }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from } }));
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
    auth.user = null;
    insert.mockReset().mockResolvedValue({ error: null });
    from.mockReset().mockReturnValue({ insert });
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it("copies the current page URL to the clipboard", async () => {
    render(<MemoryRouter><Fixture /></MemoryRouter>);
    fireEvent.contextMenu(screen.getByTestId("page"), { clientX: 300, clientY: 200 });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Copy page link" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(window.location.href));
  });

  const memberId = "dac096a4-e8ab-4cb2-9b60-8aa4de76dd07";
  const viewerId = "00000000-0000-4000-8000-000000000001";
  function MemberFixture() {
    const location = useLocation();
    return <SiteContextMenu><div data-context-user-id={memberId}><a href="https://twitch.tv/kaicenat">Live member</a></div><output data-testid="location">{location.pathname}</output></SiteContextMenu>;
  }

  it("follows the exact member behind a Twitch avatar without navigating", async () => {
    auth.user = { id: viewerId };
    render(<MemoryRouter initialEntries={["/users"]}><MemberFixture /></MemoryRouter>);
    fireEvent.contextMenu(screen.getByText("Live member"));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Follow user" }));
    await waitFor(() => expect(insert).toHaveBeenCalledWith({ follower_id: viewerId, followee_id: memberId }));
    expect(from).toHaveBeenCalledWith("user_follows");
    expect(screen.getByTestId("location")).toHaveTextContent("/users");
  });

  it("requires sign-in before following", async () => {
    render(<MemoryRouter><MemberFixture /></MemoryRouter>);
    fireEvent.contextMenu(screen.getByText("Live member"));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Follow user" }));
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/auth"));
    expect(insert).not.toHaveBeenCalled();
  });

  it("does not follow the signed-in user's own profile", async () => {
    auth.user = { id: memberId };
    render(<MemoryRouter><MemberFixture /></MemoryRouter>);
    fireEvent.contextMenu(screen.getByText("Live member"));
    await screen.findByRole("menu");
    expect(screen.queryByRole("menuitem", { name: "Follow user" })).not.toBeInTheDocument();
    expect(insert).not.toHaveBeenCalled();
  });

  it("keeps an existing follow rather than toggling it off", async () => {
    auth.user = { id: viewerId };
    insert.mockResolvedValue({ error: { code: "23505" } });
    render(<MemoryRouter><MemberFixture /></MemoryRouter>);
    fireEvent.contextMenu(screen.getByText("Live member"));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Follow user" }));
    await waitFor(() => expect(success).toHaveBeenCalledWith("Already following this user"));
    expect(error).not.toHaveBeenCalled();
  });

  it("does not report a failed follow as successful", async () => {
    auth.user = { id: viewerId };
    insert.mockResolvedValue({ error: { code: "42501" } });
    render(<MemoryRouter><MemberFixture /></MemoryRouter>);
    fireEvent.contextMenu(screen.getByText("Live member"));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Follow user" }));
    await waitFor(() => expect(error).toHaveBeenCalledTimes(1));
    expect(success).not.toHaveBeenCalled();
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

  it("dismisses only the context menu when Escape is pressed over an image preview", async () => {
    const onClose = vi.fn();
    render(<MemoryRouter><SiteContextMenu><Lightbox src="/image.png" alt="Preview image" onClose={onClose} /></SiteContextMenu></MemoryRouter>);
    fireEvent.contextMenu(screen.getByRole("img", { name: "Preview image" }));
    const menu = await screen.findByRole("menu", { name: "WardenMC right-click menu" });
    fireEvent.keyDown(menu, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("context target handling", () => {
  it("rejects invalid account markers and unrelated targets", () => {
    const card = document.createElement("div");
    card.dataset.contextUserId = "not-an-account";
    expect(getContextUser(card.appendChild(document.createElement("span")))).toBeNull();
    expect(getContextUser(document.createElement("a"))).toBeNull();
  });
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
  it("puts the menu in the fullscreen element rather than its containing dialog", () => {
    const dialog = document.createElement("div");
    dialog.setAttribute("role", "dialog");
    const fullscreen = dialog.appendChild(document.createElement("div"));
    const target = fullscreen.appendChild(document.createElement("button"));
    const previous = Object.getOwnPropertyDescriptor(document, "fullscreenElement");
    Object.defineProperty(document, "fullscreenElement", { configurable: true, value: fullscreen });
    try {
      expect(getContextMenuContainer(target)).toBe(fullscreen);
    } finally {
      if (previous) Object.defineProperty(document, "fullscreenElement", previous);
      else Reflect.deleteProperty(document, "fullscreenElement");
    }
  });
});