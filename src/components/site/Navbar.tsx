import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import logo from "@/assets/warden-network-icon.png";
import DiscordMark from "./DiscordMark";
import { Check, Loader2, LogIn, LogOut, Plus, Repeat, Shield, User as UserIcon, type LucideIcon } from "lucide-react";
import { listSavedAccounts, type SavedAccount } from "@/lib/saved-accounts";
import { ADD_ACCOUNT_KEY, hasAccountSession, restoreAccountSession, saveAccountSession } from "@/lib/account-sessions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";

export const NAV_LINKS: { to: string; label: string; icon?: LucideIcon }[] = [
  { to: "/plugins", label: "Plugins" },
  { to: "/posts", label: "Posts" },
  { to: "/staff", label: "Staff" },
  { to: "/rules", label: "Rules" },
  { to: "/faq", label: "FAQ" },
  { to: "/discord", label: "", icon: DiscordMark },
  { to: "/partners", label: "Partners" },
  { to: "/apply", label: "Apply" },
];

const Navbar = () => {
  const { user, session, isAdmin, signOut } = useAuth();
  const nav = useNavigate();
  const { state, isMobile } = useSidebar();
  const [scrolled, setScrolled] = useState(false);
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [switching, setSwitching] = useState(false);

  const addAccount = (email?: string) => {
    if (!session) return;
    try {
      saveAccountSession(session);
      sessionStorage.setItem(ADD_ACCOUNT_KEY, session.user.id);
      nav(`/auth?add=1${email ? `&email=${encodeURIComponent(email)}` : ""}`);
    } catch { toast.error("Allow browser storage to add another account."); }
  };

  const switchAccount = async (email: string) => {
    if (switching || email === user?.email?.toLowerCase()) return;
    if (!hasAccountSession(email)) { addAccount(email); return; }
    setSwitching(true);
    try {
      if (session) saveAccountSession(session);
      await restoreAccountSession(email);
      window.location.assign("/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not switch account.");
      addAccount(email);
    } finally { setSwitching(false); }
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed right-0 top-0 z-40 transition-all duration-300 pt-[env(safe-area-inset-top)]",
        isMobile ? "left-0" : state === "expanded" ? "left-64" : "left-12",
        scrolled ? "glass-strong border-b border-border/60" : "bg-transparent",
      )}
    >
      <div className="container flex h-[76px] sm:h-16 max-w-[1400px] items-center gap-4 pt-3 sm:pt-0">
        <SidebarTrigger
          aria-label="Toggle sidebar"
          className="relative z-10 h-11 w-11 shrink-0 touch-manipulation text-muted-foreground hover:text-foreground sm:h-8 sm:w-8"
        />

        <Link to="/" className="flex items-center gap-2" aria-label="WardenMC home">
          <img src={logo} alt="" aria-hidden className="h-8 w-8" />
          <span className="font-display text-2xl tracking-wider">
            WARDEN<span className="text-gradient">MC</span>
          </span>
        </Link>

        <nav className="hidden flex-1 items-center gap-1 lg:flex">
          {NAV_LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                cn(
                  "inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold uppercase tracking-wide transition-colors",
                  isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              {l.icon && <l.icon className="h-3.5 w-3.5 shrink-0" />}
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <DropdownMenu onOpenChange={(open) => { if (open) setAccounts(listSavedAccounts()); }}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full">
                  {switching ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <UserIcon className="mr-1.5 h-4 w-4" />} Account
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onSelect={() => nav("/profile")}>
                  <UserIcon className="mr-2 h-4 w-4" /> Profile
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onSelect={() => nav("/admin")}>
                    <Shield className="mr-2 h-4 w-4" /> Admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger><Repeat className="mr-2 h-4 w-4" /> Switch account</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-64 max-w-[calc(100vw-2rem)]">
                    {accounts.map(account => (
                      <DropdownMenuItem key={account.email} disabled={switching} className="gap-3 py-3" onSelect={() => void switchAccount(account.email)}>
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={account.avatarUrl} alt="" />
                          <AvatarFallback>{(account.displayName ?? account.email).charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{account.displayName ?? account.email}</span>
                          <span className="block truncate text-xs text-muted-foreground">{account.displayName ? account.email : hasAccountSession(account.email) ? "Signed in" : "Sign-in required"}</span>
                        </span>
                        {account.email === user.email?.toLowerCase() && <Check className="h-4 w-4 shrink-0 text-primary" aria-label="Current account" />}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => addAccount()}><Plus className="mr-2 h-4 w-4" /> Add account</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem onSelect={() => addAccount()}><Plus className="mr-2 h-4 w-4" /> Add account</DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={async () => {
                    await signOut();
                    nav("/");
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" className="rounded-full">
              <Link to="/auth">
                <LogIn className="mr-1.5 h-4 w-4" /> Sign in
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
