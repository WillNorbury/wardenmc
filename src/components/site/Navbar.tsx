import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import logo from "@/assets/warden-network-icon.png";
import DiscordMark from "./DiscordMark";
import { LogIn, LogOut, Shield, User as UserIcon, type LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const NAV_LINKS: { to: string; label: string; icon?: LucideIcon }[] = [
  { to: "/plugins", label: "Plugins" },
  { to: "/posts", label: "Posts" },
  { to: "/staff", label: "Staff" },
  { to: "/rules", label: "Rules" },
  { to: "/faq", label: "FAQ" },
  { to: "/discord", label: "Discord", icon: DiscordMark },
  { to: "/partners", label: "Partners" },
  { to: "/apply", label: "Apply" },
];

const Navbar = () => {
  const { user, isAdmin, signOut } = useAuth();
  const nav = useNavigate();
  const { state, isMobile } = useSidebar();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed right-0 top-0 z-40 transition-all duration-300",
        isMobile ? "left-0" : state === "expanded" ? "left-64" : "left-12",
        scrolled ? "glass-strong border-b border-border/60" : "bg-transparent",
      )}
    >
      <div className="container flex h-16 max-w-[1400px] items-center gap-4">
        <SidebarTrigger
          aria-label="Toggle sidebar"
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
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
                  "rounded-full px-4 py-1.5 text-sm font-semibold uppercase tracking-wide transition-colors",
                  isActive ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              {l.icon && <l.icon className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]" />}
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full">
                  <UserIcon className="mr-1.5 h-4 w-4" /> Account
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
