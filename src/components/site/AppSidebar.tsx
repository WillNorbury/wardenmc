import { Link, useLocation, useNavigate } from "react-router-dom";
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
import { useAuth } from "@/lib/auth";
import logo from "@/assets/warden-network-icon.png";
import {
  Home,
  Puzzle,
  Layers,
  Users,
  MessageSquare,
  ShieldCheck,
  ScrollText,
  HelpCircle,
  Hash,
  FileText,
  Link2,
  User as UserIcon,
  Shield,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type NavItem = { to: string; label: string; icon: typeof Home; external?: boolean };
type NavGroup = { id: string; label: string; items: NavItem[]; defaultOpen?: boolean };

const linksGroup: NavGroup = {
  id: "links",
  label: "Links",
  items: [{ to: "https://spectorclient.com", label: "SpectorClient", icon: Link2, external: true }],
};

const mainGroup: NavGroup = {
  id: "main",
  label: "Main",
  defaultOpen: true,
  items: [
    { to: "/", label: "Home", icon: Home },
    { to: "/plugins", label: "Plugins", icon: Puzzle },
    { to: "/plugins/categories", label: "Categories", icon: Layers },
    { to: "/plugins/developers", label: "Developers", icon: Users },
    { to: "/posts", label: "Posts", icon: MessageSquare },
  ],
};

const communityGroup: NavGroup = {
  id: "community",
  label: "Community",
  items: [
    { to: "/staff", label: "Staff", icon: ShieldCheck },
    { to: "/discord", label: "Discord", icon: Hash },
    { to: "/partners", label: "Partners", icon: Users },
    { to: "/rules", label: "Rules", icon: ScrollText },
    { to: "/faq", label: "FAQ", icon: HelpCircle },
  ],
};

const applyGroup: NavGroup = {
  id: "apply",
  label: "Apply",
  items: [{ to: "/apply", label: "Apply", icon: FileText }],
};

const accountGroup: NavGroup = {
  id: "account",
  label: "Account",
  items: [{ to: "/profile", label: "Profile", icon: UserIcon }],
};

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const { pathname } = useLocation();
  const { user, isAdmin } = useAuth();
  const nav = useNavigate();

  const isActive = (path: string) => pathname === path;
  const isExternal = (path: string) => /^https?:\/\//.test(path);

  const renderItem = (l: NavItem) => (
    <SidebarMenuItem key={l.to}>
      <SidebarMenuButton asChild isActive={!isExternal(l.to) && isActive(l.to)} tooltip={l.label}>
        {l.external || isExternal(l.to) ? (
          <a href={l.to} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
            <l.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="uppercase tracking-wider text-xs">{l.label}</span>}
          </a>
        ) : (
          <Link to={l.to} onClick={() => isMobile && setOpenMobile(false)} className="flex items-center gap-2">
            <l.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="uppercase tracking-wider text-xs">{l.label}</span>}
          </Link>
        )}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  const renderGroup = (g: NavGroup) => {
    const hasActive = g.items.some((i) => !isExternal(i.to) && isActive(i.to));

    if (collapsed) {
      return (
        <SidebarGroup key={g.id} className={hasActive ? "data-active-group" : undefined}>
          <SidebarGroupContent>
            <SidebarMenu>{g.items.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      );
    }

    return (
      <SidebarGroup key={g.id}>
        <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>{g.items.map(renderItem)}</SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  const groups: NavGroup[] = [
    linksGroup,
    mainGroup,
    communityGroup,
    ...(user ? [accountGroup] : []),
    ...(isAdmin
      ? [
          applyGroup,
          { id: "admin", label: "Admin", items: [{ to: "/admin", label: "Admin", icon: Shield }] } as NavGroup,
        ]
      : []),
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/" className="flex items-center gap-2 px-2 py-1 group">
          <img src={logo} alt="WardenMC" className="h-8 w-8 transition-transform group-hover:scale-110" />
          {!collapsed && (
            <span className="font-display font-bold text-base tracking-wider">
              WARDEN<span className="text-gradient">MC</span>
            </span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {groups.map(renderGroup)}
      </SidebarContent>

      <SidebarFooter className="shrink-0 border-t border-sidebar-border bg-sidebar p-2">
        {user ? (
          <Button variant="outline" size="sm" onClick={() => nav("/profile")} className="w-full justify-start">
            <UserIcon className="h-4 w-4" />
            {!collapsed && <span className="ml-1">Profile</span>}
          </Button>
        ) : (
          <Button size="sm" onClick={() => nav("/auth")} className="w-full justify-start">
            <LogIn className="h-4 w-4" />
            {!collapsed && <span className="ml-1">Sign in</span>}
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
