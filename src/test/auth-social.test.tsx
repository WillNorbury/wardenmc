import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Auth from "@/pages/Auth";

const { signIn, toastError } = vi.hoisted(() => ({ signIn: vi.fn(), toastError: vi.fn() }));
vi.mock("@/integrations/lovable/index", () => ({ lovable: { auth: { signInWithOAuth: signIn } } }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: {} } }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/lib/funnel", () => ({ trackFunnelEvent: vi.fn() }));
vi.mock("@/components/site/SEO", () => ({ SEO: () => null }));
vi.mock("sonner", () => ({ toast: { error: toastError } }));

describe("managed social sign-in", () => {
  beforeEach(() => { signIn.mockReset(); toastError.mockReset(); signIn.mockResolvedValue({ redirected: false }); });
  afterEach(cleanup);
  for (const [name, provider] of [["Google", "google"]]) {
    it(`starts ${name} sign-in without email or password`, async () => {
      render(<MemoryRouter initialEntries={["/auth?next=%2Fdashboard"]}><Auth /></MemoryRouter>);
      fireEvent.click(screen.getByRole("button", { name: `Continue with ${name}` }));
      await waitFor(() => expect(signIn).toHaveBeenCalledWith(provider, { redirect_uri: `${window.location.origin}/auth?next=%2Fdashboard` }));
    });
  }
  it("rejects an external return destination", async () => {
    render(<MemoryRouter initialEntries={["/auth?next=https%3A%2F%2Fexample.com"]}><Auth /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    await waitFor(() => expect(signIn).toHaveBeenCalledWith("google", { redirect_uri: `${window.location.origin}/auth?next=%2F` }));
  });
  it("shows provider errors and allows a retry", async () => {
    signIn.mockResolvedValue({ error: new Error("Sign-in cancelled") });
    render(<MemoryRouter><Auth /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Sign-in cancelled"));
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
  });
});