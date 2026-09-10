import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/lib/auth";
import logo from "@/assets/warden-network-icon.png";
import {
  Home,
  Newspaper,
  ClipboardList,
  Users as UsersIcon,
  ShieldCheck,
  Vote as VoteIcon,
  ScrollText,
  Terminal,
  Puzzle,
  FileText,
  LifeBuoy,
  LayoutDashboard,
  User as UserIcon,
  Shield,
  LogIn,
  LogOut,
  Ticket,
  Trophy,
  HelpCircle,
  Calendar,
  Boxes,
  Star,
  Sparkles,
  Activity,
  Download,
  Package,
  Database,
  Sun,
  Layers,
  Server as ServerIcon,
  Link2,
  BookOpen,
  Image as ImageIcon,
  Mail,
  Gavel,
  ChevronDown,
  Clock,
  Compass,
  Globe,
  Info,
  Brain,
  ShieldQuestion,
  MailPlus,
  Tornado,
  FileCode,
  Server as ServerIconSidebar,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type NavItem = { to: string; label: string; icon: typeof Home; soon?: boolean; copyValue?: string };
type NavGroup = { id: string; label: string; icon: typeof Home; items: NavItem[]; defaultOpen?: boolean };

const websiteGroup: NavGroup = {
  id: "websites",
  label: "Websites",
  icon: Globe,
  items: [
    { to: "https://portfolio.warden.rip", label: "Portfolio", icon: Link2 },
    { to: "https://dash.nightly.host", label: "Panel", icon: Link2 },
    { to: "/fire-market", label: "Fire Market", icon: Link2 },
    { to: "https://appeals.warden.rip", label: "Appeals", icon: Link2 },
  ],
};

const clientGroup: NavGroup = {
  id: "client",
  label: "Client",
  icon: Link2,
  items: [{ to: "https://spectorclient.com", label: "SpectorClient", icon: Link2 }],
};

const mainGroup: NavGroup = {
  id: "main",
  label: "Main",
  icon: Home,
  defaultOpen: true,
  items: [
    { to: "/", label: "Home", icon: Home },
    { to: "/news", label: "News", icon: Newspaper },
    { to: "/store", label: "Store", icon: VoteIcon },
    { to: "/events", label: "Events", icon: Calendar },
    { to: "/changelog", label: "Changelog", icon: ClipboardList },
    { to: "/features", label: "Features", icon: Sparkles },
    { to: "/status", label: "Status", icon: Activity },
    { to: "/tab", label: "TAB Animations", icon: Download },
  ],
};

const communityGroup: NavGroup = {
  id: "community",
  label: "Community",
  icon: UsersIcon,
  items: [
    { to: "/users", label: "Users", icon: UsersIcon },
    { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { to: "/community", label: "Community", icon: UsersIcon },
    { to: "/posts", label: "Posts", icon: MessageSquare },
    { to: "/staff", label: "Staff", icon: ShieldCheck },
    { to: "/mod-tiers", label: "Mod Tiers", icon: Star },
    { to: "/tiers", label: "Player Tiers", icon: Trophy },
    { to: "/gallery", label: "Gallery", icon: ImageIcon },
    { to: "/quiz", label: "Quizzes", icon: Brain },
  ],
};

const defaultPartnersGroup: NavGroup = {
  id: "partners",
  label: "Partners",
  icon: UsersIcon,
  items: [],
};

const helpGroup: NavGroup = {
  id: "help",
  label: "Help & Info",
  icon: Info,
  items: [
    { to: "/rules", label: "Rules", icon: ScrollText },
    { to: "/faq", label: "FAQ", icon: HelpCircle },
    { to: "/commands", label: "Commands", icon: Terminal },
    { to: "/wiki", label: "Wiki", icon: BookOpen },
    { to: "/join", label: "How to Join", icon: Download },
    { to: "/map", label: "Live Map", icon: Compass },
    { to: "/install", label: "How to Install", icon: Download },
    { to: "/support", label: "Support", icon: LifeBuoy },
    { to: "/contact", label: "Contact", icon: Mail },
    { to: "/trust", label: "Trust & Safety", icon: ShieldQuestion },
    { to: "/subscribe", label: "Subscribe", icon: MailPlus },
    { to: "/guides", label: "Player Guides", icon: BookOpen },
    { to: "/achievements", label: "Achievements", icon: Trophy },
    { to: "/pvp-guide", label: "PvP Guide", icon: Sparkles },
    { to: "/economy-guide", label: "Economy Guide", icon: Package },
    { to: "/building-guide", label: "Building Guide", icon: Boxes },
    { to: "/seasons", label: "Seasons", icon: Clock },
    { to: "/safety", label: "Player Safety", icon: ShieldCheck },
    { to: "/anti-cheat", label: "Anti-Cheat", icon: Shield },
  ],
};

const aboutGroup: NavGroup = {
  id: "about",
  label: "About",
  icon: Info,
  items: [
    { to: "/about", label: "About Us", icon: Info },
    { to: "/roadmap", label: "Roadmap", icon: Compass },
    { to: "/press-kit", label: "Press Kit", icon: ImageIcon },
    { to: "/sitemap", label: "Site Index", icon: ScrollText },
    { to: "/community-standards", label: "Community Standards", icon: UsersIcon },
    { to: "/staff-handbook", label: "Staff Handbook", icon: FileText },
  ],
};

const actionsGroup: NavGroup = {
  id: "actions",
  label: "Actions",
  icon: FileText,
  items: [
    { to: "/apply", label: "Apply", icon: FileText },
    { to: "/ban-appeals", label: "Ban Appeals", icon: Gavel },
  ],
};

const discoverGroup: NavGroup = {
  id: "discover",
  label: "Discover",
  icon: Compass,
  items: [
    { to: "/skripts", label: "Skripts", icon: ScrollText },
    { to: "/plugins", label: "Plugins", icon: Puzzle },
    { to: "/servers", label: "Servers", icon: ServerIconSidebar },
  ],
};

const weatherGroup: NavGroup = {
  id: "weather",
  label: "Weather",
  icon: Tornado,
  items: [{ to: "/weather/tornado-deaths", label: "Tornado Deaths", icon: Tornado }],
};

const soonGroup: NavGroup = {
  id: "soon",
  label: "Coming Soon",
  icon: Clock,
  items: [{ to: "/vote", label: "Vote", icon: VoteIcon, soon: true }],
};

const accountGroup: NavGroup = {
  id: "account",
  label: "Account",
  icon: UserIcon,
  items: [
    { to: "/me", label: "My Account", icon: UserIcon },
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/profile", label: "Profile", icon: UserIcon },
    { to: "/tickets", label: "Tickets", icon: Ticket },
    { to: "/link-account", label: "Link Account", icon: Link2 },
  ],
};

const staticPublicGroupsBefore: NavGroup[] = [websiteGroup, clientGroup, mainGroup, communityGroup];
const staticPublicGroupsAfter: NavGroup[] = [
  helpGroup,
  actionsGroup,
  discoverGroup,
  aboutGroup,
  weatherGroup,
  soonGroup,
];

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { user, isAdmin, signOut } = useAuth();
  const nav = useNavigate();

  const [partnersItems, setPartnersItems] = useState<NavItem[]>([]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("partners")
        .select("label,url,sort_order,is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (!mounted) return;
      setPartnersItems(
        (data ?? []).map((p: any) => ({
          to: `/partners#partner-${encodeURIComponent(p.label)}`,
          label: p.label as string,
          icon: Link2,
        })),
      );
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const partnersGroup: NavGroup = { ...defaultPartnersGroup, items: partnersItems };
  const publicGroups: NavGroup[] = [
    ...staticPublicGroupsBefore,
    ...(partnersItems.length > 0 ? [partnersGroup] : []),
    ...staticPublicGroupsAfter,
  ];

  const closeMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  const isActive = (path: string) => pathname === path;
  const isExternal = (path: string) => /^https?:\/\//.test(path);

  const renderItem = (l: NavItem) => (
    <SidebarMenuItem key={l.to}>
      <SidebarMenuButton
        asChild={!l.soon}
        isActive={!isExternal(l.to) && isActive(l.to)}
        tooltip={l.soon ? `${l.label} (Soon)` : l.label}
        disabled={l.soon}
        aria-disabled={l.soon}
        className={l.soon ? "opacity-60 cursor-not-allowed" : ""}
      >
        {l.soon ? (
          <div className="flex items-center gap-2">
            <l.icon className="h-4 w-4 shrink-0" />
            {!collapsed && (
              <span className="uppercase tracking-wider text-xs flex items-center gap-1">
                {l.label}
                <span className="text-[10px] text-muted-foreground normal-case tracking-normal">(Soon)</span>
              </span>
            )}
          </div>
        ) : l.copyValue ? (
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(l.copyValue!);
                toast.success(`Copied IP: ${l.copyValue}`);
              } catch {
                toast.error("Failed to copy");
              }
              closeMobile();
            }}
            className="flex items-center gap-2 w-full text-left"
          >
            <l.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="uppercase tracking-wider text-xs truncate">{l.label}</span>}
          </button>
        ) : isExternal(l.to) ? (
          <a href={l.to} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
            <l.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="uppercase tracking-wider text-xs">{l.label}</span>}
          </a>
        ) : (
          <Link to={l.to} onClick={closeMobile} className="flex items-center gap-2">
            <l.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="uppercase tracking-wider text-xs">{l.label}</span>}
          </Link>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  const renderGroup = (g: NavGroup) => {
    const hasActive = g.items.some((i) => !isExternal(i.to) && isActive(i.to));
    const defaultOpen = g.defaultOpen || hasActive;

    if (collapsed) {
      // When collapsed, just render items flat with tooltips (no dropdown UI).
      return (
        <SidebarGroup key={g.id}>
          <SidebarGroupContent>
            <SidebarMenu>{g.items.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      );
    }

    return (
      <Collapsible key={g.id} defaultOpen={defaultOpen} className="group/collapsible">
        <SidebarGroup>
          <SidebarGroupLabel asChild>
            <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 hover:text-foreground transition-colors">
              <span className="flex items-center gap-2">
                <g.icon className="h-3.5 w-3.5" />
                {g.label}
              </span>
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=closed]/collapsible:-rotate-90" />
            </CollapsibleTrigger>
          </SidebarGroupLabel>
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenu>{g.items.map(renderItem)}</SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/" className="flex items-center gap-2 px-2 py-1 group">
          <img src={logo} alt="Warden Network" className="h-8 w-8 transition-transform group-hover:scale-110" />
          {!collapsed && (
            <span className="font-display font-bold text-base tracking-wider">
              WARDEN<span className="text-gradient"> NETWORK</span>
            </span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {publicGroups.map(renderGroup)}

        {user && renderGroup(accountGroup)}

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{renderItem({ to: "/admin", label: "Admin", icon: Shield })}</SidebarMenu>
            </SidebarGroupContent>
            <SidebarGroupContent>
              <SidebarMenu>{renderItem({ to: "/staffchat", label: "StaffChat", icon: Link2 })}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="shrink-0 border-t border-sidebar-border bg-sidebar p-2 shadow-[0_-8px_16px_-12px_hsl(var(--background))]">
        {user ? (
          <Button variant="outline" size="sm" onClick={() => nav("/profile")} className="w-full justify-start">
            <UserIcon className="h-4 w-4" />
            {!collapsed && <span className="ml-1">Profile</span>}
          </Button>
        ) : (
          <Button size="sm" onClick={() => nav("/auth")} className="w-full justify-start glow">
            <LogIn className="h-4 w-4" />
            {!collapsed && <span className="ml-1">Sign in</span>}
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
