import { ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import logo from "@/assets/warden-network-icon.png";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { LiveClock } from "@/components/admin/LiveClock";
import {
  LayoutDashboard,
  Users,
  Newspaper,
  FileText,
  Server,
  ScrollText,
  Activity,
  PanelLeft,
  LogOut,
  Shield,
  Bot,
  Code,
  Ticket,
  KeyRound,
  Puzzle,
  ClipboardList,
  Zap,
  Sparkles,
  Gavel,
  HelpCircle,
  Calendar,
  Wrench,
  Menu,
  Boxes,
  Package,
  Inbox,
  Database,
  Sun,
  Layers,
  Globe,
  Mail,
  Brain,
  Flag,
  Send,
  ShieldCheck,
  ExternalLink,
  Terminal,
  Trophy,
  UserX,
  Crown,
} from "lucide-react";

export type AdminSection =
  | "dashboard"
  | "users"
  | "roles"
  | "permissions"
  | "news"
  | "content"
  | "status"
  | "logs"
  | "tickets"
  | "plugins"
  | "changelog"
  | "applications"
  | "apply"
  | "features"
  | "rules"
  | "alerts"
  | "maintenance"
  | "faqs"
  | "events"
  | "ban-appeals"
  | "wiki"
  | "gallery"
  | "contact"
  | "email-test"
  | "send-email"
  | "email-diagnostics"
  | "quizzes"
  | "reports"
  | "bot-dashboard"
  | "bot-management"
  | "bot-config"
  | "punishments"
  | "console"
  | "mysql"
  | "servers-status"
  | "store"
  | "orders"
  | "vote-links"
  | "partners"
  | "tiers"
  | "memberships"
  | "account-removals"
  | "seasons"
  | "tab-animations"
  | "server-panel"
  | "skripts"
  | "game-modes"
  | "site-pages"
  | "mod-skripts"
  | "mod-servers"
  | "mod-mods"
  | "mod-reviews";

// Every valid section id, used to validate the ?tab= query param.
export const ADMIN_SECTIONS: AdminSection[] = [
  "dashboard", "users", "roles", "permissions", "news", "content", "status",
  "logs", "tickets", "plugins", "changelog", "applications", "apply",
  "features", "rules", "alerts", "maintenance", "faqs", "events",
  "ban-appeals", "wiki", "gallery", "contact", "email-test", "send-email",
  "email-diagnostics", "quizzes", "reports", "bot-dashboard", "bot-management",
  "bot-config", "punishments", "console", "mysql", "servers-status", "store", "orders",
  "vote-links", "partners", "tiers", "memberships", "account-removals", "seasons", "tab-animations", "server-panel", "skripts", "game-modes", "site-pages",
  "mod-skripts", "mod-servers", "mod-mods", "mod-reviews",
];

// Friendly/legacy ?tab= values mapped onto their real section id.
export const ADMIN_SECTION_ALIASES: Record<string, AdminSection> = {
  pages: "site-pages",
  "site-page": "site-pages",
  page: "site-pages",
  removals: "account-removals",
  "deleted-accounts": "account-removals",
  gamemodes: "game-modes",
  "game-mode": "game-modes",
  tab: "tab-animations",
  "tab-animation": "tab-animations",
  animations: "tab-animations",
  "server-settings": "server-panel",
  motd: "server-panel",
  "membership-tiers": "memberships",
  membership: "memberships",
  ranks: "memberships",
  order: "orders",
  "order-inbox": "orders",
  purchases: "orders",
  votes: "vote-links",
  vote: "vote-links",
  servers: "servers-status",
  user: "users",
  ticket: "tickets",
  application: "applications",
  appeals: "ban-appeals",
  bot: "bot-dashboard",
  emails: "send-email",
  mods: "mod-mods",
  reviews: "mod-reviews",
};

export function resolveAdminSection(raw: string | null | undefined): AdminSection {
  if (!raw) return "dashboard";
  const key = raw.trim().toLowerCase();
  if ((ADMIN_SECTIONS as string[]).includes(key)) return key as AdminSection;
  return ADMIN_SECTION_ALIASES[key] ?? "dashboard";
}

/**
 * Returns true when the given ?tab= value is non-empty but does NOT map to any
 * known section or alias (i.e. resolveAdminSection() would fall back to the
 * dashboard). Used to surface a redirect notice to the user.
 */
export function isUnknownAdminTab(raw: string | null | undefined): boolean {
  if (!raw) return false; // no tab param is a normal dashboard visit, not a redirect
  const key = raw.trim().toLowerCase();
  if (!key) return false;
  if ((ADMIN_SECTIONS as string[]).includes(key)) return false;
  if (ADMIN_SECTION_ALIASES[key]) return false;
  return true;
}




type NavItem =
  | { kind: "link"; id: AdminSection; icon: any; label: string }
  | { kind: "route"; to: string; icon: any; label: string }
  | { kind: "section"; title: string; icon: any };

// Maps each admin section to the permission key required to see/access it.
// Sections without a specific permission default to "admin.access".
export const SECTION_PERMISSIONS: Partial<Record<AdminSection, string>> = {
  dashboard: "admin.dashboard.view",
  users: "users.view",
  roles: "roles.view",
  permissions: "permissions.edit",
  news: "news.view",
  content: "content.edit",
  status: "status.view",
  logs: "admin.logs.view",
  tickets: "tickets.view_all",
  "bot-dashboard": "bot.view",
  "bot-management": "bot.configure",
  "bot-config": "bot.configure",
};


const items: NavItem[] = [
  { kind: "link", id: "dashboard", icon: LayoutDashboard, label: "Network Overview" },
  { kind: "link", id: "users", icon: Users, label: "Network Members" },
  { kind: "link", id: "roles", icon: Shield, label: "Roles" },
  { kind: "link", id: "permissions", icon: KeyRound, label: "Permissions" },
  { kind: "link", id: "news", icon: Newspaper, label: "News" },
  { kind: "link", id: "content", icon: FileText, label: "Site Content" },
  { kind: "link", id: "status", icon: Server, label: "Server Status" },
  { kind: "link", id: "servers-status", icon: Server, label: "Servers (Public Status)" },
  { kind: "link", id: "alerts", icon: Activity, label: "Alert Settings" },
  { kind: "link", id: "tickets", icon: Ticket, label: "Support Tickets" },
  { kind: "link", id: "logs", icon: ScrollText, label: "Admin Logs" },
  { kind: "link", id: "plugins", icon: Puzzle, label: "Plugins" },
  { kind: "link", id: "changelog", icon: Zap, label: "Changelog" },
  { kind: "link", id: "store", icon: Package, label: "Store" },
  { kind: "link", id: "orders", icon: Inbox, label: "Order Inbox" },
  { kind: "link", id: "vote-links", icon: ExternalLink, label: "Vote Links" },
  { kind: "link", id: "partners", icon: Users, label: "Partners" },
  { kind: "link", id: "tiers", icon: Trophy, label: "Player Tiers" },
  { kind: "link", id: "memberships", icon: Crown, label: "Membership Tiers" },
  { kind: "link", id: "seasons", icon: Trophy, label: "Seasons" },
  { kind: "link", id: "tab-animations", icon: Terminal, label: "Tab Animations" },
  { kind: "link", id: "server-panel", icon: Server, label: "Server Panel" },
  { kind: "link", id: "skripts", icon: FileText, label: "Skripts" },
  { kind: "link", id: "applications", icon: ClipboardList, label: "Applications" },
  { kind: "link", id: "apply", icon: ClipboardList, label: "Apply (types)" },
  { kind: "link", id: "features", icon: Sparkles, label: "Features" },
  { kind: "link", id: "rules", icon: Gavel, label: "Rules" },
  { kind: "link", id: "game-modes", icon: Sparkles, label: "Game Modes" },
  { kind: "link", id: "site-pages", icon: FileText, label: "Site Pages" },


  { kind: "link", id: "faqs", icon: HelpCircle, label: "FAQs" },
  { kind: "link", id: "events", icon: Calendar, label: "Events" },
  
  { kind: "link", id: "maintenance", icon: Wrench, label: "Maintenance" },
  { kind: "link", id: "ban-appeals", icon: Gavel, label: "Ban Appeals" },
  { kind: "link", id: "punishments", icon: ShieldCheck, label: "Punishments" },
  { kind: "link", id: "account-removals", icon: UserX, label: "Deleted / Banned Accounts" },
  { kind: "link", id: "mysql", icon: Database, label: "LiteBans MySQL" },
  { kind: "link", id: "wiki", icon: FileText, label: "Wiki" },
  { kind: "link", id: "gallery", icon: Package, label: "Gallery" },
  { kind: "link", id: "contact", icon: HelpCircle, label: "Contact" },
  { kind: "link", id: "email-test", icon: Mail, label: "Email Test" },
  { kind: "link", id: "send-email", icon: Send, label: "Send Email" },
  { kind: "link", id: "email-diagnostics", icon: ShieldCheck, label: "Email Diagnostics" },
  { kind: "link", id: "quizzes", icon: Brain, label: "Quizzes" },
  { kind: "link", id: "reports", icon: Flag, label: "Reports" },
  { kind: "link", id: "console", icon: Code, label: "Console" },
  { kind: "section", title: "Moderation Tools", icon: ShieldCheck },
  { kind: "link", id: "mod-skripts", icon: FileText, label: "Community Skripts" },
  { kind: "link", id: "mod-servers", icon: Server, label: "Community Servers" },
  { kind: "link", id: "mod-mods", icon: Boxes, label: "Mods" },
  { kind: "link", id: "mod-reviews", icon: Sparkles, label: "Reviews" },
  { kind: "section", title: "Discord Bot", icon: Bot },
  { kind: "link", id: "bot-dashboard", icon: LayoutDashboard, label: "Bot Dashboard" },
  { kind: "link", id: "bot-management", icon: Code, label: "Management" },
  { kind: "link", id: "bot-config", icon: Terminal, label: "Commands & Templates" },
];

export const AdminLayout = ({
  current,
  onNavigate,
  title,
  description,
  actions,
  children,
  isOwner,
  canSee,
}: {
  current: AdminSection;
  onNavigate: (s: AdminSection) => void;
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  isOwner?: boolean;
  canSee?: (id: AdminSection) => boolean;
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();
  const { signOut, user } = useAuth();

  const visibleItems = items.filter((it) => {
    if (it.kind === "section" && it.title === "Discord Bot") {
      // Hide the section header when the user cannot see any bot links.
      if (isOwner) return true;
      if (!canSee) return false;
      return canSee("bot-dashboard") || canSee("bot-management") || canSee("bot-config");
    }
    if (it.kind === "link") {
      if (it.id === "permissions" || it.id === "bot-dashboard" || it.id === "bot-management" || it.id === "bot-config" || it.id === "console" || it.id === "mysql") {
        // Owner-only sections (also gated by their permission key).
        if (!isOwner) return false;
      }
      if (canSee) return canSee(it.id);
    }
    return true;
  });


  const handleNavigate = (s: AdminSection) => {
    onNavigate(s);
    setMobileOpen(false);
  };

  const navContent = (forceExpanded = false) => {
    const isCollapsed = forceExpanded ? false : collapsed;
    return (
      <>
        <div
          className={cn(
            "flex h-[60px] items-center border-b px-4 shrink-0",
            isCollapsed ? "justify-center" : "justify-between",
          )}
        >
          {!isCollapsed && (
            <Link to="/" className="flex items-center gap-2 font-semibold" onClick={() => setMobileOpen(false)}>
              <img src={logo} alt="Warden Network" className="h-7 w-7" />
              <span className="text-lg">
                WARDEN<span className="text-gradient"> NETWORK</span>
              </span>
            </Link>
          )}
          {!forceExpanded && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hidden md:inline-flex"
              onClick={() => setCollapsed(!collapsed)}
            >
              <PanelLeft className="h-5 w-5" />
            </Button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
          {visibleItems.map((it, idx) => {
            if (it.kind === "section") {
              const SIcon = it.icon;
              if (isCollapsed) return <div key={`s-${idx}`} className="my-2 border-t border-border/60" />;
              return (
                <div
                  key={`s-${idx}`}
                  className="px-3 pt-4 pb-1 flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground/80"
                >
                  <SIcon className="h-3 w-3" />
                  {it.title}
                </div>
              );
            }
            const Icon = it.icon;
            if (it.kind === "route") {
              const routeBtn = (
                <Link
                  to={it.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "relative flex items-center gap-3 rounded-lg w-full transition-all hover:bg-accent hover:text-foreground text-muted-foreground",
                    isCollapsed ? "h-9 w-9 justify-center mx-auto" : "px-3 py-2",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {!isCollapsed && <span className="text-sm">{it.label}</span>}
                </Link>
              );
              return isCollapsed ? (
                <Tooltip key={it.to}>
                  <TooltipTrigger asChild>{routeBtn}</TooltipTrigger>
                  <TooltipContent side="right">{it.label}</TooltipContent>
                </Tooltip>
              ) : (
                <div key={it.to}>{routeBtn}</div>
              );
            }
            const active = it.id === current;
            const btn = (
              <button
                onClick={() => handleNavigate(it.id)}
                className={cn(
                  "relative flex items-center gap-3 rounded-lg w-full transition-all hover:bg-accent hover:text-foreground text-muted-foreground",
                  isCollapsed ? "h-9 w-9 justify-center mx-auto" : "px-3 py-2",
                  active && "bg-accent text-foreground",
                )}
              >
                {active && <span className="absolute left-0 h-6 w-1 rounded-r-full bg-primary" />}
                <Icon className="h-4 w-4" />
                {!isCollapsed && <span className="text-sm">{it.label}</span>}
              </button>
            );
            return isCollapsed ? (
              <Tooltip key={it.id}>
                <TooltipTrigger asChild>{btn}</TooltipTrigger>
                <TooltipContent side="right">{it.label}</TooltipContent>
              </Tooltip>
            ) : (
              <div key={it.id}>{btn}</div>
            );
          })}
        </nav>

        <div className="mt-auto border-t p-2 shrink-0">
          {!isCollapsed && user && <div className="px-3 py-2 text-xs text-muted-foreground truncate">{user.email}</div>}
          <Button
            variant="ghost"
            className={cn(
              "w-full text-muted-foreground",
              isCollapsed ? "h-9 w-9 justify-center p-0" : "justify-start gap-3 px-3",
            )}
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && "Logout"}
          </Button>
        </div>
      </>
    );
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex min-h-screen bg-background text-foreground">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            "relative hidden md:flex flex-col h-screen sticky top-0 border-r bg-card transition-all duration-300 ease-in-out",
            collapsed ? "w-20" : "w-64",
          )}
        >
          {navContent()}
        </aside>

        {/* Mobile drawer */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0 w-72 flex flex-col bg-card">
            {navContent(true)}
          </SheetContent>
        </Sheet>

        <ScrollArea className="h-screen flex-1 w-full">
          <main className="p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8">
            {/* Mobile top bar */}
            <div className="flex md:hidden items-center justify-between -mx-4 px-4 py-2 border-b -mt-2 sticky top-2 z-30 bg-background/95 backdrop-blur rounded-b-lg mx-0 mt-2 mb-2 shadow-sm">
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
              <LiveClock />
              <ThemeToggle />
            </div>

            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight truncate">{title}</h1>
                {description && <p className="mt-1.5 text-sm md:text-base text-muted-foreground">{description}</p>}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <LiveClock className="hidden md:inline-flex" />
                {actions}
                <ThemeToggle className="hidden md:inline-flex" />
              </div>
            </div>
            <div className="min-w-0 overflow-x-auto">{children}</div>
          </main>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
};
