import { confirm } from "@/lib/confirm";
import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Trash2,
  Plus,
  ShieldCheck,
  ShieldOff,
  Users as UsersIcon,
  Newspaper,
  Activity,
  Server as ServerIcon,
  X,
  Ticket as TicketIcon,
  MessageSquare,
  Send,
  Check,
  ChevronDown,
  Puzzle,
  Pencil,
  Sparkles,
  Bell,
  Code,
  Eye,
  Play,
  AlertTriangle,
  RefreshCw,
  Loader2,
  Mail,
  Star,
  Search,
  Lock,


} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AdminLayout, type AdminSection, SECTION_PERMISSIONS, resolveAdminSection, isUnknownAdminTab } from "@/components/admin/AdminLayout";
import { BanAppealsAdminSection } from "@/components/admin/BanAppealsAdminSection";
import { WikiAdminSection } from "@/components/admin/WikiAdminSection";
import { GalleryAdminSection } from "@/components/admin/GalleryAdminSection";
import { ContactAdminSection } from "@/components/admin/ContactAdminSection";
import { EmailTestSection } from "@/components/admin/EmailTestSection";
import { ApplyTypesAdminSection } from "@/components/admin/ApplyTypesAdminSection";

import { StatCard } from "@/components/admin/StatCard";
import { CustomRolesManager, type CustomRole } from "@/components/admin/CustomRolesManager";
import { ALL_ROLES, roleLabel, isStaffRole, type AppRole } from "@/lib/roles";
import { usePermissions } from "@/lib/usePermissions";
import { FeaturesTab } from "@/components/admin/FeaturesTab";
import { RulesTab } from "@/components/admin/RulesTab";
import { NewsAnnouncementsTab } from "@/pages/AdminNews";
import { PermissionsTab } from "@/components/admin/PermissionsTab";
import { MaintenanceTab } from "@/pages/AdminMaintenance";
import AdminFaqsPage from "@/pages/AdminFaqs";
import AdminEventsPage from "@/pages/AdminEvents";

import QuizAdminSection from "@/components/admin/QuizAdminSection";
import { ReportsAdminSection } from "@/components/admin/ReportsAdminSection";
import { PunishmentsAdminSection } from "@/components/admin/PunishmentsAdminSection";
import { ConsoleAdminSection } from "@/components/admin/ConsoleAdminSection";
import { SendEmailAdminSection } from "@/components/admin/SendEmailAdminSection";
import { EmailDiagnosticsSection } from "@/components/admin/EmailDiagnosticsSection";
import { ApplicationStatusEmailEditor } from "@/components/admin/ApplicationStatusEmailEditor";
import { MySqlAdminSection } from "@/components/admin/MySqlAdminSection";
import ServersStatusAdminSection from "@/components/admin/ServersStatusAdminSection";
import { StoreAdminSection } from "@/components/admin/StoreAdminSection";
import { OrdersAdminSection } from "@/components/admin/OrdersAdminSection";
import SignupFunnelAdminSection from "@/components/admin/SignupFunnelAdminSection";
import { CreatorCodesAdminSection } from "@/components/admin/CreatorCodesAdminSection";
import { VoteLinksAdminSection } from "@/components/admin/VoteLinksAdminSection";
import { GameModesAdminSection } from "@/components/admin/GameModesAdminSection";
import { PartnersAdminSection } from "@/components/admin/PartnersAdminSection";
import { PlayerTiersAdminSection } from "@/components/admin/PlayerTiersAdminSection";
import { MembershipTiersAdminSection } from "@/components/admin/MembershipTiersAdminSection";
import { AccountRemovalsAdminSection } from "@/components/admin/AccountRemovalsAdminSection";
import { SeasonsAdminSection } from "@/components/admin/SeasonsAdminSection";
import { TabAnimationsAdminSection } from "@/components/admin/TabAnimationsAdminSection";
import { ServerPanelAdminSection } from "@/components/admin/ServerPanelAdminSection";
import { ServerDashboardAdminSection } from "@/components/admin/ServerDashboardAdminSection";
import { SitePagesAdminSection } from "@/components/admin/SitePagesAdminSection";
import {
  SkriptsModerationSection,
  ServersModerationSection,
  ModsModerationSection,
  ReviewsModerationSection,
} from "@/components/admin/tools/ModerationTools";
import { AdminSkriptsSection } from "@/components/admin/AdminSkriptsSection";
import { DiscordConfigSection } from "@/components/admin/DiscordConfigSection";


type Profile = { id: string; display_name: string | null; mc_username: string | null; created_at: string };
type RoleRow = { id: string; user_id: string; role: AppRole };
type News = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  published: boolean;
  created_at: string;
};

const sectionMeta: Record<AdminSection, { title: string; description: string }> = {
  dashboard: { title: "Warden Network Dashboard", description: "Live control center for Warden Network operations and activity." },
  users: { title: "Users", description: "Promote or demote admin access." },
  roles: { title: "Roles", description: "Assign and manage roles for members." },
  permissions: { title: "Permissions", description: "Define what each role can do." },
  news: { title: "News", description: "Create and publish announcements." },
  content: { title: "Site Content", description: "Edit hero copy, server info, and alerts." },
  status: { title: "Server Status", description: "Manually override the live status display." },
  tickets: { title: "Support Tickets", description: "Triage and reply to user tickets." },
  logs: { title: "Admin Logs", description: "Audit trail of admin role checks." },
  plugins: { title: "Plugins", description: "Add, edit, and remove server plugins." },
  changelog: { title: "Changelog", description: "Publish server updates by date and category." },
  applications: { title: "Applications", description: "Review staff, builder, and content creator applications." },
  apply: { title: "Apply — Types", description: "Add, edit, or remove the categories shown on /apply." },
  features: { title: "Features", description: "Add, edit, reorder, and remove features shown on the website." },
  rules: { title: "Rules", description: "Edit the sections shown on the public Rules page." },
  alerts: { title: "Alert Settings", description: "Configure webhook payload templates and alert recipients." },
  maintenance: { title: "Maintenance", description: "Update the maintenance page content, branding, and allowlist." },
  faqs: { title: "FAQs", description: "Manage frequently asked questions." },
  events: { title: "Events", description: "Schedule and manage server events." },
  "bot-dashboard": {
    title: "Discord Bot — Dashboard",
    description: "Status and overview of the Warden Network Discord bot.",
  },
  "bot-management": { title: "Discord Bot — Management", description: "Configure commands and bot integration." },
  "bot-config": { title: "Discord Bot — Commands & Templates", description: "Configure slash commands, channel routing, and message templates." },
  "ban-appeals": { title: "Ban Appeals", description: "Review and respond to user ban appeals." },
  wiki: { title: "Wiki", description: "Manage wiki articles." },
  gallery: { title: "Gallery", description: "Manage gallery images." },
  contact: { title: "Contact", description: "Manage contact methods and inbox." },
  "email-test": { title: "Email Test", description: "Trigger signup or password reset test emails and watch delivery status." },
  quizzes: { title: "Quizzes", description: "Create, edit, and publish scored quizzes." },
  reports: { title: "Reports", description: "Review reports submitted by users about accounts, plugins, or other content." },
  "send-email": { title: "Send Email", description: "Broadcast emails to all users, admins, or owners only." },
  "email-diagnostics": { title: "Email Diagnostics", description: "Verify the notify.warden.rip sender domain and From-address allowlist." },
  punishments: { title: "Punishments", description: "Browse bans, mutes, kicks, and warnings from the network database. Unban or unmute players from the web (silent by default)." },
  console: { title: "Owner Console", description: "Terminal-style admin console. Type `help` for available commands." },
  mysql: { title: "LiteBans MySQL", description: "Connect and edit the LiteBans database directly. Use with caution." },
  "servers-status": { title: "Servers (Public Status)", description: "Edit the per-server cards on /servers-status: players, TPS, uptime, IP, and MOTD." },
  store: { title: "Store", description: "Manage the categories and items shown on /store." },
  orders: { title: "Order Inbox", description: "Track every store order and its payment status in one place." },
  "signup-funnel": { title: "Sign-up Funnel", description: "See how many visitors reach the sign-up form and how many finish." },
  "vote-links": { title: "Vote Links", description: "Manage the vote sites shown on /vote." },
  partners: { title: "Partners", description: "Manage the partners shown in the sidebar Partners dropdown." },
  "account-removals": { title: "Deleted / Banned Accounts", description: "Historical log of removed and suspended accounts." },
  tiers: { title: "Player Tiers", description: "Add players to the public tier list at /tiers." },
  seasons: { title: "Seasons", description: "Manage seasons, dates, highlights and winners shown on /seasons." },
  "tab-animations": { title: "Tab Animations", description: "Manage animated TAB list lines shown on /tab." },
  memberships: { title: "Membership Tiers", description: "Create paid membership tiers and perks sold on the store and dashboard." },
  "server-panel": { title: "Server Panel", description: "Monitor the live server, manage maps, and send player moderation commands." },
  skripts: { title: "Skripts", description: "Upload and download Skript (.sk) files staff can add to the server." },
  "site-pages": { title: "Site Pages", description: "Create and edit standalone content pages such as /guides, /about, /roadmap and /credits." },
  "mod-skripts": { title: "Community Skripts", description: "Moderate member-uploaded Skripts." },
  "mod-servers": { title: "Community Servers", description: "Moderate member-submitted servers." },
  "mod-mods": { title: "Mods", description: "Publish, feature or remove mods." },
  "mod-reviews": { title: "Reviews", description: "Moderate player reviews." },
  "game-modes": { title: "Game Modes", description: "Manage the game modes shown on /gamemodes and their detail pages." },

};

const Admin = () => {
  const { user, isAdmin, loading } = useAuth();
  const { roles: userRoles, can, loading: permsLoading } = usePermissions();
  const isOwner = userRoles.includes("owner");
  const location = useLocation();
  const navigate = useNavigate();
  const search = new URLSearchParams(location.search);
  const tabParam = search.get("tab");
  const initial: AdminSection = resolveAdminSection(tabParam);
  const [section, setSection] = useState<AdminSection>(initial);

  // Keep tab in sync with URL query (back/forward navigation)
  useEffect(() => {
    if (location.pathname !== "/admin") return;
    const rawTab = new URLSearchParams(location.search).get("tab");
    setSection(resolveAdminSection(rawTab));
  }, [location.pathname, location.search]);

  // Surface a notice when an unknown ?tab= value redirected to the dashboard.
  const unknownTab = isUnknownAdminTab(tabParam);
  useEffect(() => {
    if (location.pathname !== "/admin") return;
    if (unknownTab) {
      toast(`Unknown tab "${tabParam}" — redirected to the dashboard.`, {
        description: "That admin section doesn't exist or isn't available.",
      });
    }
  }, [location.pathname, location.search, unknownTab]);

  useEffect(() => {
    document.title = `Warden Network Admin — ${sectionMeta[section]?.title ?? "Dashboard"}`;
  }, [section]);

  const onNavigate = (s: AdminSection) => {
    setSection(s);
    if (s === "dashboard") {
      if (location.pathname !== "/admin" || location.search) navigate("/admin");
      return;
    }
    navigate(`/admin?tab=${s}`);
  };

  // Permission-based access: owner sees everything, otherwise check the section's
  // permission key. Sections without a mapped key require generic "admin.access".
  const canSeeSection = (id: AdminSection) => {
    if (isOwner) return true;
    const key = SECTION_PERMISSIONS[id] ?? "admin.access";
    return can(key);
  };

  const hasAdminAccess = isOwner || isAdmin || can("admin.access");

  if (loading || permsLoading)
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading Warden Network admin...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!hasAdminAccess)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <ShieldOff className="h-12 w-12 text-destructive" />
        <h1 className="text-2xl font-bold">Warden Network admin access required</h1>
        <p className="text-muted-foreground">You don't have permission to manage the network.</p>
      </div>
    );

  const meta = sectionMeta[section] ?? sectionMeta.dashboard;
  const allowed = canSeeSection(section);

  const denied = (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <ShieldOff className="h-12 w-12 text-destructive" />
      <h2 className="text-xl font-bold">Access denied</h2>
      <p className="text-muted-foreground">You don't have permission to view this section.</p>
    </div>
  );

  return (
    <AdminLayout
      current={section}
      onNavigate={onNavigate}
      title={meta.title}
      description={meta.description}
      isOwner={isOwner}
      canSee={canSeeSection}
    >
      {!allowed ? denied : (
        <>
          {unknownTab && (
            <div className="mb-6 flex flex-col gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-amber-200">
                    Unknown tab &ldquo;{tabParam}&rdquo; — redirected to the dashboard.
                  </p>
                  <p className="text-sm text-amber-200/70">
                    That admin section doesn&rsquo;t exist or isn&rsquo;t available.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-amber-500/50 bg-transparent text-amber-200 hover:bg-amber-500/20 hover:text-amber-100"
                onClick={() => onNavigate("dashboard")}
              >
                Go to dashboard
              </Button>
            </div>
          )}
          {section === "dashboard" && <DashboardSection onNavigate={onNavigate} />}
          {section === "users" && <UsersTab />}
          {section === "roles" && <RolesSection />}
          {section === "news" && <NewsAnnouncementsTab />}
          {section === "content" && <ContentTab />}
          {section === "status" && <StatusTab />}
          {section === "tickets" && <TicketsAdminSection />}
          {section === "logs" && <LogsTab />}
          {section === "plugins" && <PluginsTab />}
          {section === "changelog" && <ChangelogTab />}
          {section === "applications" && <ApplicationsTab />}
          {section === "apply" && (
            <div className="space-y-10">
              <ApplyTypesAdminSection />
            </div>
          )}

          {section === "features" && <FeaturesTab />}
          {section === "rules" && <RulesTab />}
          {section === "alerts" && <AlertsTab />}
          {section === "maintenance" && <MaintenanceTab />}
          {section === "faqs" && <AdminFaqsPage />}
          {section === "events" && <AdminEventsPage />}
          {section === "ban-appeals" && <BanAppealsAdminSection />}
          {section === "wiki" && <WikiAdminSection />}
          {section === "gallery" && <GalleryAdminSection />}
          {section === "contact" && <ContactAdminSection />}
          {section === "email-test" && <EmailTestSection />}
          {section === "quizzes" && <QuizAdminSection />}
          {section === "reports" && <ReportsAdminSection />}
          {section === "punishments" && <PunishmentsAdminSection />}
          {section === "send-email" && <SendEmailAdminSection isOwner={isOwner} />}
          {section === "email-diagnostics" && <EmailDiagnosticsSection />}
          {section === "permissions" && (isOwner ? <PermissionsTab /> : denied)}
          {section === "bot-dashboard" && (isOwner ? <BotDashboardSection /> : denied)}
          {section === "bot-management" && (isOwner ? <BotManagementSection /> : denied)}
          {section === "bot-config" && (isOwner ? <DiscordConfigSection /> : denied)}
          {section === "console" && (isOwner ? <ConsoleAdminSection /> : denied)}
          {section === "mysql" && (isOwner ? <MySqlAdminSection /> : denied)}
          {section === "servers-status" && <ServersStatusAdminSection />}
          {section === "orders" && <OrdersAdminSection />}
          {section === "signup-funnel" && <SignupFunnelAdminSection />}
          {section === "store" && (
            <div className="space-y-10">
              <StoreAdminSection />
              <CreatorCodesAdminSection />
            </div>
          )}
          {section === "vote-links" && <VoteLinksAdminSection />}
          {section === "partners" && <PartnersAdminSection />}
          {section === "tiers" && <PlayerTiersAdminSection />}
          {section === "memberships" && <MembershipTiersAdminSection />}
          {section === "account-removals" && <AccountRemovalsAdminSection />}
           {section === "seasons" && <SeasonsAdminSection />}
           {section === "tab-animations" && <TabAnimationsAdminSection />}
           {section === "server-panel" && (
             <div className="space-y-8">
               <ServerDashboardAdminSection />
               <ServerPanelAdminSection />
             </div>
           )}
           {section === "skripts" && <AdminSkriptsSection />}
          {section === "game-modes" && <GameModesAdminSection />}
          {section === "site-pages" && <SitePagesAdminSection />}
          {section === "mod-skripts" && <SkriptsModerationSection />}
          {section === "mod-servers" && <ServersModerationSection />}
          {section === "mod-mods" && <ModsModerationSection />}
          {section === "mod-reviews" && <ReviewsModerationSection />}
        </>
      )}
    </AdminLayout>
  );
};


const ComingSoonAdminSection = ({ label }: { label: string }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
    <Sparkles className="h-10 w-10 text-primary" />
    <h2 className="text-xl font-bold">{label} admin coming soon</h2>
    <p className="text-muted-foreground max-w-md">
      Management tools for {label.toLowerCase()} aren't built yet. The public
      discover page is live as a placeholder.
    </p>
  </div>
);

const DashboardSection = ({ onNavigate }: { onNavigate: (s: AdminSection) => void }) => {
  const [stats, setStats] = useState({ users: 0, news: 0, admins: 0, online: false, players: 0, max: 0 });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [{ count: users }, { count: news }, { data: roles }, { data: status }, { data: logs }] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("news").select("*", { count: "exact", head: true }),
        supabase.from("user_roles").select("user_id, role").eq("role", "admin"),
        supabase.from("server_status").select("*").eq("id", 1).maybeSingle(),
        supabase.from("admin_check_logs").select("*").order("created_at", { ascending: false }).limit(5),
      ]);
      setStats({
        users: users ?? 0,
        news: news ?? 0,
        admins: roles?.length ?? 0,
        online: status?.online ?? false,
        players: status?.players_online ?? 0,
        max: status?.players_max ?? 0,
      });
      setRecent(logs ?? []);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Network Members" value={stats.users} icon={UsersIcon} color="bg-primary" />
        <StatCard title="Staff Members" value={stats.admins} icon={ShieldCheck} color="bg-accent" />
        <StatCard title="News Updates" value={stats.news} icon={Newspaper} color="bg-primary" />
        <StatCard
          title="Server"
          value={stats.online ? "Online" : "Offline"}
          icon={ServerIcon}
          color={stats.online ? "bg-emerald-500" : "bg-destructive"}
          description={stats.online ? `${stats.players} / ${stats.max} players` : "currently down"}
        />
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold flex items-center gap-2">
              <Activity className="h-4 w-4" /> Recent admin checks
            </h2>
            <p className="text-xs text-muted-foreground">Latest 5 entries</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => onNavigate("logs")}>
            View all
          </Button>
        </div>
        <div className="space-y-2">
          {recent.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
          {recent.map((l) => (
            <div key={l.id} className="flex items-center justify-between text-sm p-2 rounded bg-secondary/30">
              <div className="flex items-center gap-2">
                <Badge variant={l.is_admin ? "default" : "destructive"}>{l.is_admin ? "ALLOWED" : "DENIED"}</Badge>
                <span>{l.email ?? l.user_id?.slice(0, 8) ?? "anon"}</span>
                <span className="text-xs text-muted-foreground">{l.context}</span>
              </div>
              <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

const UsersTab = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [newRoles, setNewRoles] = useState<Set<AppRole>>(new Set());
  const [roleSearch, setRoleSearch] = useState("");
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    display_name: "",
    mc_username: "",
  });
  const [search, setSearch] = useState("");
  const [staffOnly, setStaffOnly] = useState(false);
  const [editing, setEditing] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({ display_name: "", mc_username: "", email: "" });
  const [originalEmail, setOriginalEmail] = useState("");
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const openEdit = async (p: Profile) => {
    setEditing(p);
    setEditForm({ display_name: p.display_name ?? "", mc_username: p.mc_username ?? "", email: "" });
    setOriginalEmail("");
    setLoadingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-update-user-email", {
        body: { user_id: p.id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const em = (data as any)?.email ?? "";
      setOriginalEmail(em);
      setEditForm((f) => ({ ...f, email: em }));
    } catch (e: any) {
      toast.error(e.message ?? "Failed to load email");
    } finally {
      setLoadingEmail(false);
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSavingEdit(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: editForm.display_name.trim() || null,
        mc_username: editForm.mc_username.trim() || null,
      })
      .eq("id", editing.id);
    if (error) {
      setSavingEdit(false);
      toast.error(error.message);
      return;
    }
    const newEmail = editForm.email.trim().toLowerCase();
    if (newEmail && newEmail !== originalEmail.toLowerCase()) {
      try {
        const { data, error: emailErr } = await supabase.functions.invoke("admin-update-user-email", {
          body: { user_id: editing.id, email: newEmail },
        });
        if (emailErr) throw emailErr;
        if ((data as any)?.error) throw new Error((data as any).error);
      } catch (e: any) {
        setSavingEdit(false);
        toast.error(e.message ?? "Failed to update email");
        return;
      }
    }
    setSavingEdit(false);
    toast.success("Profile updated");
    setEditing(null);
    load();
  };

  const load = async () => {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("id, display_name, mc_username, created_at").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("id, user_id, role"),
    ]);
    setProfiles((p ?? []) as Profile[]);
    setRoles((r ?? []) as RoleRow[]);
  };
  useEffect(() => {
    load();
  }, []);

  const isAdminFor = (uid: string) => roles.some((r) => r.user_id === uid && r.role === "admin");

  const toggleAdmin = async (uid: string) => {
    if (isAdminFor(uid)) {
      await supabase.from("user_roles").delete().eq("user_id", uid).eq("role", "admin");
      toast.success("Admin role removed");
    } else {
      await supabase.from("user_roles").insert({ user_id: uid, role: "admin" });
      toast.success("Promoted to admin");
    }
    supabase.functions.invoke("discord-sync-user-roles", { body: { user_id: uid } }).catch(() => {});
    load();
  };


  const deleteUser = async (p: Profile) => {
    const ok = await confirm({
      title: "Delete this user?",
      description: `This will permanently delete ${p.display_name ?? p.mc_username ?? "this user"}'s account, profile, and roles. This cannot be undone.`,
      confirmText: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.refreshSession();
      if (sessionError || !sessionData.session?.access_token) throw new Error("Please sign in again before deleting users.");
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { user_id: p.id },
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("User deleted");
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to delete user");
    }
  };

  const createUser = async () => {
    if (!newUser.email || !newUser.password) {
      toast.error("Email and password required");
      return;
    }
    if (newUser.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: { ...newUser, roles: [...newRoles] },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("User created");
      setNewUser({ email: "", password: "", display_name: "", mc_username: "" });
      setNewRoles(new Set());
      load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const toggleNewRole = (r: AppRole) => {
    setNewRoles((s) => {
      const n = new Set(s);
      if (n.has(r)) n.delete(r);
      else n.add(r);
      return n;
    });
  };

  const filteredProfiles = profiles.filter((p) => {
    const userRoles = roles.filter((r) => r.user_id === p.id);
    if (staffOnly && !userRoles.some((r) => isStaffRole(r.role))) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (p.display_name ?? "").toLowerCase().includes(q) ||
      (p.mc_username ?? "").toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
    );
  });

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4">
        {/* User List Card */}
        <Card className="bg-[#1a1410] border-[#2a2018] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-5 py-4 flex-wrap">
            <h2 className="text-lg font-bold text-foreground">
              Users ({filteredProfiles.length})
            </h2>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, MC username, ID..."
                  className="h-9 w-64 pl-9 bg-[#241c16] border-[#3a2e24] text-foreground placeholder:text-muted-foreground/60"
                />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none text-muted-foreground">
                <span className={`h-3 w-3 rounded-full border ${staffOnly ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`} />
                Staff only
                <input
                  type="checkbox"
                  checked={staffOnly}
                  onChange={(e) => setStaffOnly(e.target.checked)}
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          {/* User rows */}
          <div className="px-5 pb-5 space-y-2">
            {filteredProfiles.map((p) => {
              const userRoles = roles.filter((r) => r.user_id === p.id);
              const hasStaff = userRoles.some((r) => isStaffRole(r.role));
              const admin = isAdminFor(p.id);
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-[#241c16] border border-[#2a2018] hover:border-[#3a2e24] transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground truncate">
                      {p.display_name ?? p.mc_username ?? p.id.slice(0, 8)}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {p.id.slice(0, 8)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {hasStaff && (
                      <Badge
                        variant="outline"
                        className="border-primary/50 text-primary bg-primary/10 text-xs px-2 py-0.5 rounded-full"
                      >
                        Staff
                      </Badge>
                    )}
                    {admin && (
                      <Badge className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full border-0">
                        Admin
                      </Badge>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 text-xs bg-[#1a1410] border-[#3a2e24] text-foreground hover:bg-[#2a2018] hover:text-foreground"
                      onClick={() => openEdit(p)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 text-xs bg-[#1a1410] border-[#3a2e24] text-foreground hover:bg-[#2a2018] hover:text-foreground"
                      onClick={() => toggleAdmin(p.id)}
                    >
                      {admin ? (
                        <>
                          <ShieldOff className="h-3.5 w-3.5" />
                          Demote
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Promote
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1.5 text-xs bg-[#1a1410] border-[#3a2e24] text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => deleteUser(p)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
            {filteredProfiles.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">No users found.</div>
            )}
          </div>
        </Card>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit member</DialogTitle>
            <DialogDescription>Update profile details or the account email.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Display Name</Label>
              <Input
                value={editForm.display_name}
                onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                maxLength={100}
              />
            </div>
            <div>
              <Label>Minecraft Username</Label>
              <Input
                value={editForm.mc_username}
                onChange={(e) => setEditForm({ ...editForm, mc_username: e.target.value })}
                maxLength={32}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                maxLength={255}
                placeholder={loadingEmail ? "Loading…" : "user@example.com"}
                disabled={loadingEmail}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Changing the email will mark it as confirmed and update the login address.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={savingEdit || loadingEmail}>{savingEdit ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};

const RolesSection = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [customAssignments, setCustomAssignments] = useState<
    { user_id: string; role_key: string }[]
  >([]);
  const [search, setSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Set<string>>>({});
  const [savingUid, setSavingUid] = useState<string | null>(null);

  // Bulk-across-users state
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [bulkAdd, setBulkAdd] = useState<Set<string>>(new Set());
  const [bulkRemove, setBulkRemove] = useState<Set<string>>(new Set());
  const [bulkSaving, setBulkSaving] = useState(false);

  const builtinKeys = useMemo(() => new Set(ALL_ROLES.map((r) => r.value as string)), []);
  const customKeySet = useMemo(() => new Set(customRoles.map((r) => r.key)), [customRoles]);

  const allRoleOptions = useMemo(
    () => [
      ...ALL_ROLES.map((r) => ({ value: r.value as string, label: r.label, custom: false })),
      ...customRoles.map((r) => ({
        value: r.key,
        label: `${r.emoji} ${r.label}`,
        custom: true,
      })),
    ],
    [customRoles],
  );

  const labelFor = (key: string) => {
    if (builtinKeys.has(key)) return roleLabel(key);
    const c = customRoles.find((r) => r.key === key);
    return c ? `${c.emoji} ${c.label}` : key;
  };

  const load = async () => {
    const [{ data: p }, { data: r }, { data: cr }, { data: uc }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, display_name, mc_username, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("user_roles").select("id, user_id, role"),
      supabase
        .from("custom_roles")
        .select("key,label,emoji,color,rank")
        .order("rank", { ascending: true }),
      supabase.from("user_custom_roles").select("user_id, role_key"),
    ]);
    setProfiles((p ?? []) as Profile[]);
    setRoles((r ?? []) as RoleRow[]);
    setCustomRoles((cr ?? []) as CustomRole[]);
    setCustomAssignments((uc ?? []) as { user_id: string; role_key: string }[]);
    setDrafts({});
  };
  useEffect(() => {
    load();
  }, []);

  const rolesFor = (uid: string): string[] => [
    ...roles.filter((r) => r.user_id === uid).map((r) => r.role as string),
    ...customAssignments.filter((c) => c.user_id === uid).map((c) => c.role_key),
  ];
  const currentSetFor = (uid: string) => new Set(rolesFor(uid));
  const draftFor = (uid: string) => drafts[uid] ?? currentSetFor(uid);

  const toggleDraftRole = (uid: string, role: string) => {
    setDrafts((d) => {
      const base = new Set(d[uid] ?? currentSetFor(uid));
      if (base.has(role)) base.delete(role);
      else base.add(role);
      return { ...d, [uid]: base };
    });
  };

  const resetDraft = (uid: string) => {
    setDrafts((d) => {
      const next = { ...d };
      delete next[uid];
      return next;
    });
  };

  const isDirty = (uid: string) => {
    const draft = drafts[uid];
    if (!draft) return false;
    const cur = currentSetFor(uid);
    if (draft.size !== cur.size) return true;
    for (const r of draft) if (!cur.has(r)) return true;
    return false;
  };

  const applyDiffForUser = async (uid: string, toAdd: string[], toRemove: string[]) => {
    const addBuiltin = toAdd.filter((k) => builtinKeys.has(k)) as AppRole[];
    const addCustom = toAdd.filter((k) => customKeySet.has(k));
    const removeBuiltin = toRemove.filter((k) => builtinKeys.has(k)) as AppRole[];
    const removeCustom = toRemove.filter((k) => customKeySet.has(k));

    if (addBuiltin.length) {
      const { error } = await supabase
        .from("user_roles")
        .insert(addBuiltin.map((role) => ({ user_id: uid, role })));
      if (error) throw error;
    }
    if (addCustom.length) {
      const { error } = await supabase
        .from("user_custom_roles")
        .insert(addCustom.map((role_key) => ({ user_id: uid, role_key })));
      if (error) throw error;
    }
    if (removeBuiltin.length) {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", uid)
        .in("role", removeBuiltin);
      if (error) throw error;
    }
    if (removeCustom.length) {
      const { error } = await supabase
        .from("user_custom_roles")
        .delete()
        .eq("user_id", uid)
        .in("role_key", removeCustom);
      if (error) throw error;
    }
  };

  const saveUser = async (uid: string) => {
    const draft = drafts[uid];
    if (!draft) return;
    const cur = currentSetFor(uid);
    const toAdd = [...draft].filter((r) => !cur.has(r));
    const toRemove = [...cur].filter((r) => !draft.has(r));
    if (toAdd.length === 0 && toRemove.length === 0) return;

    setSavingUid(uid);
    try {
      await applyDiffForUser(uid, toAdd, toRemove);
      toast.success(
        `Updated ${toAdd.length + toRemove.length} role${toAdd.length + toRemove.length === 1 ? "" : "s"}`,
      );
      // Fire-and-forget Discord role sync
      supabase.functions
        .invoke("discord-sync-user-roles", { body: { user_id: uid } })
        .then(({ data }) => {
          if (data?.skipped) return;
          if (data?.ok) {
            const a = (data.added ?? []).length;
            const r = (data.removed ?? []).length;
            if (a || r) toast.message(`Discord synced: +${a} / -${r}`);
          } else if (data?.error) {
            toast.error(`Discord sync: ${data.error}`);
          }
        })
        .catch(() => {});
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to update roles");
    } finally {
      setSavingUid(null);
    }
  };


  const filtered = useMemo(
    () =>
      profiles.filter(
        (p) => !search || (p.display_name ?? "").toLowerCase().includes(search.toLowerCase()) || p.id.includes(search),
      ),
    [profiles, search],
  );

  const toggleSelectUser = (uid: string) => {
    setSelectedUsers((s) => {
      const next = new Set(s);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };
  const selectAllVisible = () => setSelectedUsers(new Set(filtered.map((p) => p.id)));
  const clearSelection = () => setSelectedUsers(new Set());

  const toggleBulk = (set: Set<string>, setFn: (s: Set<string>) => void, role: string) => {
    const next = new Set(set);
    if (next.has(role)) next.delete(role);
    else next.add(role);
    setFn(next);
  };

  const applyBulk = async () => {
    if (selectedUsers.size === 0) return toast.error("No users selected");
    if (bulkAdd.size === 0 && bulkRemove.size === 0) return toast.error("Pick roles to add or remove");
    setBulkSaving(true);
    try {
      let added = 0,
        removed = 0;
      for (const uid of selectedUsers) {
        const cur = currentSetFor(uid);
        const toAdd = [...bulkAdd].filter((r) => !cur.has(r));
        const toRemove = [...bulkRemove].filter((r) => cur.has(r));
        await applyDiffForUser(uid, toAdd, toRemove);
        added += toAdd.length;
        removed += toRemove.length;
      }
      toast.success(
        `Bulk update: +${added} / −${removed} across ${selectedUsers.size} user${selectedUsers.size === 1 ? "" : "s"}`,
      );
      setBulkAdd(new Set());
      setBulkRemove(new Set());
      setSelectedUsers(new Set());
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Bulk update failed");
    } finally {
      setBulkSaving(false);
    }
  };

  const RolePicker = ({
    label,
    selected,
    onToggle,
    exclude,
  }: {
    label: string;
    selected: Set<string>;
    onToggle: (r: string) => void;
    exclude?: Set<string>;
  }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {label}
          {selected.size > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5">
              {selected.size}
            </Badge>
          )}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="max-h-64 overflow-y-auto space-y-0.5">
          {allRoleOptions.map((r) => {
            const disabled = exclude?.has(r.value);
            const checked = selected.has(r.value);
            return (
              <button
                key={r.value}
                disabled={disabled}
                onClick={() => onToggle(r.value)}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent ${checked ? "bg-accent/50" : ""} ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                <span className="flex h-4 w-4 items-center justify-center rounded border border-border bg-background">
                  {checked && <Check className="h-3 w-3 text-primary" />}
                </span>
                <span className="text-sm">{r.label}</span>
                {r.custom && (
                  <Badge variant="outline" className="ml-auto text-[10px]">
                    custom
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="space-y-4">
      <CustomRolesManager onChanged={load} />

      <Card className="p-4">
        <div className="text-sm text-muted-foreground mb-2">Available roles</div>
        <div className="flex flex-wrap gap-2">
          {allRoleOptions.map((r) => (
            <Badge key={r.value} variant="secondary">
              {r.label}
            </Badge>
          ))}
        </div>
      </Card>

      {/* Bulk-across-users bar */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="font-semibold">Bulk edit</div>
            <div className="text-xs text-muted-foreground">
              {selectedUsers.size} selected · pick roles to add or remove for all of them.
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="ghost" size="sm" onClick={selectAllVisible}>
              Select visible
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection} disabled={selectedUsers.size === 0}>
              Clear
            </Button>
            <RolePicker
              label="Add roles"
              selected={bulkAdd}
              onToggle={(r) => toggleBulk(bulkAdd, setBulkAdd, r)}
              exclude={bulkRemove}
            />
            <RolePicker
              label="Remove roles"
              selected={bulkRemove}
              onToggle={(r) => toggleBulk(bulkRemove, setBulkRemove, r)}
              exclude={bulkAdd}
            />
            <Button
              size="sm"
              onClick={applyBulk}
              disabled={bulkSaving || selectedUsers.size === 0 || (bulkAdd.size === 0 && bulkRemove.size === 0)}
            >
              {bulkSaving ? "Applying..." : `Apply to ${selectedUsers.size}`}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4 gap-4">
          <h2 className="font-bold">Members ({profiles.length})</h2>
          <Input
            placeholder="Search by name or ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="text-sm text-muted-foreground p-6 text-center">No members match your search.</div>
          )}
          {filtered.map((p) => {
            const draft = draftFor(p.id);
            const dirty = isDirty(p.id);
            const cur = currentSetFor(p.id);
            const selected = selectedUsers.has(p.id);
            return (
              <div
                key={p.id}
                className={`p-4 rounded-lg bg-secondary/40 space-y-3 border ${selected ? "border-primary/60" : "border-transparent"}`}
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    <Checkbox checked={selected} onCheckedChange={() => toggleSelectUser(p.id)} />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{p.display_name ?? "Unnamed"}</div>
                      <div className="text-xs text-muted-foreground font-mono">{p.id.slice(0, 8)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                          Edit roles
                          <Badge variant="secondary" className="h-5 px-1.5">
                            {draft.size}
                          </Badge>
                          <ChevronDown className="h-3 w-3 opacity-60" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-2" align="end">
                        <div className="max-h-72 overflow-y-auto space-y-0.5">
                          {allRoleOptions.map((r) => {
                            const checked = draft.has(r.value);
                            return (
                              <button
                                key={r.value}
                                onClick={() => toggleDraftRole(p.id, r.value)}
                                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent ${checked ? "bg-accent/50" : ""}`}
                              >
                                <span className="flex h-4 w-4 items-center justify-center rounded border border-border bg-background">
                                  {checked && <Check className="h-3 w-3 text-primary" />}
                                </span>
                                <span className="text-sm">{r.label}</span>
                                {r.custom && (
                                  <Badge variant="outline" className="ml-auto text-[10px]">
                                    custom
                                  </Badge>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                    {dirty && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => resetDraft(p.id)}>
                          Reset
                        </Button>
                        <Button size="sm" onClick={() => saveUser(p.id)} disabled={savingUid === p.id}>
                          {savingUid === p.id ? "Saving..." : "Save"}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {draft.size === 0 && <span className="text-xs text-muted-foreground">No roles assigned</span>}
                  {[...draft].map((role) => {
                    const isNew = !cur.has(role);
                    return (
                      <Badge
                        key={role}
                        variant="outline"
                        className={`gap-1 ${isNew ? "border-primary/60 text-primary" : ""}`}
                      >
                        {labelFor(role)}
                        {isNew && <span className="text-[10px] opacity-70">new</span>}
                        <button
                          onClick={() => toggleDraftRole(p.id, role)}
                          className="ml-1 hover:text-destructive"
                          aria-label={`Remove ${labelFor(role)}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                  {[...cur]
                    .filter((r) => !draft.has(r))
                    .map((role) => (
                      <Badge
                        key={`removed-${role}`}
                        variant="outline"
                        className="gap-1 border-destructive/40 text-destructive line-through opacity-70"
                      >
                        {labelFor(role)}
                        <button
                          onClick={() => toggleDraftRole(p.id, role)}
                          className="ml-1 no-underline"
                          aria-label={`Restore ${labelFor(role)}`}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

const NewsTab = () => {
  const [items, setItems] = useState<News[]>([]);
  const [editing, setEditing] = useState<Partial<News> | null>(null);

  const load = async () => {
    const { data } = await supabase.from("news").select("*").order("created_at", { ascending: false });
    setItems((data ?? []) as News[]);
  };
  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!editing?.title || !editing?.content) return toast.error("Title and content required");
    const slug = (editing.slug || editing.title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 60);
    const payload = {
      title: editing.title,
      slug,
      excerpt: editing.excerpt ?? null,
      content: editing.content,
      published: editing.published ?? false,
    };
    const { error } = editing.id
      ? await supabase.from("news").update(payload).eq("id", editing.id)
      : await supabase.from("news").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("news").delete().eq("id", id);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">Posts ({items.length})</h2>
          <Button size="sm" onClick={() => setEditing({ title: "", content: "", excerpt: "", published: false })}>
            <Plus className="h-4 w-4 mr-1" /> New
          </Button>
        </div>
        <div className="space-y-2">
          {items.map((n) => (
            <div key={n.id} className="p-3 rounded-lg bg-secondary/40 flex justify-between items-center">
              <div>
                <div className="font-medium">{n.title}</div>
                <div className="text-xs text-muted-foreground">
                  {n.published ? "Published" : "Draft"} · {new Date(n.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(n)}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(n.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {editing && (
        <Card className="p-6 space-y-4">
          <h2 className="font-bold">{editing.id ? "Edit" : "New"} post</h2>
          <div>
            <Label>Title</Label>
            <Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
          </div>
          <div>
            <Label>Excerpt</Label>
            <Input
              value={editing.excerpt ?? ""}
              onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })}
            />
          </div>
          <div>
            <Label>Content</Label>
            <Textarea
              rows={8}
              value={editing.content ?? ""}
              onChange={(e) => setEditing({ ...editing, content: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={!!editing.published} onCheckedChange={(c) => setEditing({ ...editing, published: c })} />
            <Label>Published</Label>
          </div>
          <div className="flex gap-2">
            <Button onClick={save}>Save</Button>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

const toLocalInput = (ms?: number) => {
  if (!ms) return "";
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const ContentTab = () => {
  const [hero, setHero] = useState({ title: "", subtitle: "", badge: "", enabled: true });
  const [server, setServer] = useState({ ip: "", bedrockIp: "", bedrockPort: "", discord: "", version: "", tagline: "" });
  const [alerts, setAlerts] = useState({
    onlineEnabled: true,
    onlineMessage: "🟢 Server is back online — jump in!",
    offlineEnabled: true,
    offlineMessage: "🔴 Server is currently offline. We're working on it.",
  });
  const [event, setEvent] = useState<{ label: string; targetMs: number | null }>({
    label: "Next Event Reset",
    targetMs: null,
  });
  const [popup, setPopup] = useState({
    enabled: true,
    title: "Season 3 Launch — LIVE",
    description:
      "New map, fresh economy, and exclusive launch crates for early players. Join now and claim your founder's reward.",
    primaryLabel: "Copy IP",
    primaryUrl: "",
    secondaryLabel: "Later",
  });

  useEffect(() => {
    supabase
      .from("site_content")
      .select("*")
      .then(({ data }) => {
        const map: any = {};
        (data ?? []).forEach((r: any) => (map[r.key] = r.value));
        if (map.hero) setHero((h) => ({ ...h, ...map.hero, enabled: map.hero.enabled !== false }));
        if (map.server) setServer(map.server);
        if (map.alerts) setAlerts((a) => ({ ...a, ...map.alerts }));
        if (map.event) setEvent({ label: map.event.label ?? "Next Event Reset", targetMs: map.event.targetMs ?? null });
        if (map.popup) setPopup((p) => ({ ...p, ...map.popup }));
      });
  }, []);

  const save = async () => {
    if (event.targetMs && event.targetMs < Date.now()) {
      toast.error("Event date must be in the future");
      return;
    }
    if (!event.label.trim()) {
      toast.error("Event label cannot be empty");
      return;
    }
    const { error } = await supabase.from("site_content").upsert([
      { key: "hero", value: hero as any },
      { key: "server", value: server as any },
      { key: "alerts", value: alerts as any },
      { key: "event", value: event as any },
      { key: "popup", value: popup as any },
    ]);
    if (error) return toast.error(error.message);
    toast.success("Site content saved");
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Hero</h2>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={hero.enabled} onCheckedChange={(v) => setHero({ ...hero, enabled: v })} />
            {hero.enabled ? "Enabled" : "Disabled"}
          </label>
        </div>
        <div>
          <Label>Title</Label>
          <Input value={hero.title} onChange={(e) => setHero({ ...hero, title: e.target.value })} />
        </div>
        <div>
          <Label>Subtitle</Label>
          <Textarea value={hero.subtitle} onChange={(e) => setHero({ ...hero, subtitle: e.target.value })} />
        </div>
        <div>
          <Label>Badge</Label>
          <Input value={hero.badge} onChange={(e) => setHero({ ...hero, badge: e.target.value })} />
        </div>
      </Card>
      <Card className="p-6 space-y-4">
        <h2 className="font-bold">Server</h2>
        <div>
          <Label>Java IP</Label>
          <Input value={server.ip} onChange={(e) => setServer({ ...server, ip: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Bedrock IP</Label>
            <Input value={server.bedrockIp} onChange={(e) => setServer({ ...server, bedrockIp: e.target.value })} placeholder="Soon" />
          </div>
          <div>
            <Label>Bedrock Port</Label>
            <Input value={server.bedrockPort} onChange={(e) => setServer({ ...server, bedrockPort: e.target.value })} placeholder="Soon" />
          </div>
        </div>
        <div>
          <Label>Discord URL</Label>
          <Input value={server.discord} onChange={(e) => setServer({ ...server, discord: e.target.value })} />
        </div>
        <div>
          <Label>Version</Label>
          <Input value={server.version} onChange={(e) => setServer({ ...server, version: e.target.value })} />
        </div>
        <div>
          <Label>Tagline</Label>
          <Input value={server.tagline} onChange={(e) => setServer({ ...server, tagline: e.target.value })} />
        </div>
      </Card>
      <Card className="p-6 space-y-4 md:col-span-2">
        <h2 className="font-bold">Status alerts</h2>
        <p className="text-sm text-muted-foreground">
          Banners shown on the homepage when the live Minecraft server status changes.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3 p-4 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <Switch
                checked={alerts.onlineEnabled}
                onCheckedChange={(c) => setAlerts({ ...alerts, onlineEnabled: c })}
              />
              <Label>Notify when server goes ONLINE</Label>
            </div>
            <Textarea
              rows={2}
              value={alerts.onlineMessage}
              onChange={(e) => setAlerts({ ...alerts, onlineMessage: e.target.value })}
            />
          </div>
          <div className="space-y-3 p-4 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <Switch
                checked={alerts.offlineEnabled}
                onCheckedChange={(c) => setAlerts({ ...alerts, offlineEnabled: c })}
              />
              <Label>Notify when server goes OFFLINE</Label>
            </div>
            <Textarea
              rows={2}
              value={alerts.offlineMessage}
              onChange={(e) => setAlerts({ ...alerts, offlineMessage: e.target.value })}
            />
          </div>
        </div>
      </Card>
      <Card className="p-6 space-y-4 md:col-span-2">
        <h2 className="font-bold">Next event countdown</h2>
        <p className="text-sm text-muted-foreground">
          Powers the homepage countdown timer. Leave blank to use the default (next Saturday 8pm).
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Event label</Label>
            <Input
              value={event.label}
              maxLength={60}
              onChange={(e) => setEvent({ ...event, label: e.target.value })}
              placeholder="Next Event Reset"
            />
          </div>
          <div>
            <Label>Date & time (your local timezone)</Label>
            <div className="flex gap-2">
              <Input
                type="datetime-local"
                value={toLocalInput(event.targetMs ?? undefined)}
                onChange={(e) => {
                  const v = e.target.value;
                  setEvent({ ...event, targetMs: v ? new Date(v).getTime() : null });
                }}
              />
              {event.targetMs && (
                <Button variant="outline" type="button" onClick={() => setEvent({ ...event, targetMs: null })}>
                  Clear
                </Button>
              )}
            </div>
            {event.targetMs && (
              <p className="text-xs text-muted-foreground mt-1">
                Counts down to: {new Date(event.targetMs).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      </Card>
      <Card className="p-6 space-y-4 md:col-span-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold">Homepage popup</h2>
            <p className="text-sm text-muted-foreground">The announcement modal shown to first-time visitors.</p>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={popup.enabled} onCheckedChange={(c) => setPopup({ ...popup, enabled: c })} />
            <Label>Enabled</Label>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Title</Label>
            <Input value={popup.title} onChange={(e) => setPopup({ ...popup, title: e.target.value })} />
          </div>
          <div>
            <Label>Primary button label</Label>
            <Input value={popup.primaryLabel} onChange={(e) => setPopup({ ...popup, primaryLabel: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={popup.description}
              onChange={(e) => setPopup({ ...popup, description: e.target.value })}
            />
          </div>
          <div>
            <Label>Primary button URL (optional)</Label>
            <Input
              value={popup.primaryUrl}
              onChange={(e) => setPopup({ ...popup, primaryUrl: e.target.value })}
              placeholder="Leave blank to copy server IP"
            />
          </div>
          <div>
            <Label>Secondary (dismiss) button label</Label>
            <Input
              value={popup.secondaryLabel}
              onChange={(e) => setPopup({ ...popup, secondaryLabel: e.target.value })}
            />
          </div>
        </div>
      </Card>
      <div className="md:col-span-2">
        <Button onClick={save}>Save all</Button>
      </div>
    </div>
  );
};

const StatusTab = () => {
  const [s, setS] = useState({ online: true, players_online: 0, players_max: 500, motd: "" });
  const [page, setPage] = useState<{
    title: string;
    subtitle: string;
     footnote: string;
     website_webhook_url: string;
     services: { key: string; name: string; desc: string; url: string }[];
   }>({
     title: "Warden Network Status",
     subtitle: "Live uptime — automated checks every 5 minutes.",
     footnote: "",
     website_webhook_url: "",
     services: [],
   });
  const [savingPage, setSavingPage] = useState(false);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);
  const [testing, setTesting] = useState<"up" | "down" | null>(null);

  const loadDeliveries = async () => {
    setLoadingDeliveries(true);
    const { data } = await supabase
      .from("website_webhook_deliveries")
      .select("*")
      .order("attempted_at", { ascending: false })
      .limit(20);
    setDeliveries(data ?? []);
    setLoadingDeliveries(false);
  };

  useEffect(() => { loadDeliveries(); }, []);

  const sendTest = async (kind: "up" | "down") => {
    setTesting(kind);
    try {
      const { data, error } = await supabase.functions.invoke("website-webhook-test", { body: { kind } });
      if (error) throw error;
      if ((data as any)?.ok) toast.success(`Test ${kind} payload delivered (HTTP ${(data as any).status})`);
      else toast.error(`Test failed: ${(data as any)?.error ?? "unknown error"}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Test failed");
    } finally {
      setTesting(null);
      loadDeliveries();
    }
  };

  useEffect(() => {
    supabase
      .from("server_status")
      .select("*")
      .eq("id", 1)
      .maybeSingle()
      .then(
        ({ data }) =>
          data &&
          setS({
            online: data.online,
            players_online: data.players_online,
            players_max: data.players_max,
            motd: data.motd ?? "",
          }),
      );
    supabase
      .from("site_content")
      .select("value")
      .eq("key", "status_page")
      .maybeSingle()
      .then(({ data }) => {
        const v = (data?.value as any) ?? {};
         setPage((p) => ({
           title: v.title ?? p.title,
           subtitle: v.subtitle ?? p.subtitle,
           footnote: v.footnote ?? "",
           website_webhook_url: v.website_webhook_url ?? "",
          services: Array.isArray(v.services) && v.services.length ? v.services : [
            { key: "website", name: "Website", desc: "Main site & dashboard", url: "" },
            { key: "minecraft", name: "Minecraft Server", desc: "warden.rip", url: "" },
            { key: "api", name: "API & Database", desc: "Backend services", url: "" },
            { key: "panel", name: "Panel", desc: "dash.nightly.host", url: "" },
            { key: "discord", name: "Discord Server", desc: "https://discord.gg/wD6K3nr2MG", url: "" },
          ],
        }));
      });
  }, []);

  const save = async () => {
    const { error } = await supabase.from("server_status").update(s).eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("Status updated");
  };

  const savePage = async () => {
    setSavingPage(true);
    const cleanedServices = page.services
      .map((svc) => ({
        key: svc.key.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-"),
        name: svc.name.trim(),
        desc: svc.desc.trim(),
        url: svc.url.trim(),
      }))
      .filter((svc) => svc.key && svc.name);
    const { error } = await supabase
      .from("site_content")
      .upsert({ key: "status_page", value: { ...page, services: cleanedServices } as any }, { onConflict: "key" });
    setSavingPage(false);
    if (error) return toast.error(error.message);
    toast.success("Status page updated");
    setPage((p) => ({ ...p, services: cleanedServices }));
  };

  const updateService = (idx: number, patch: Partial<{ key: string; name: string; desc: string; url: string }>) => {
    setPage((p) => ({
      ...p,
      services: p.services.map((svc, i) => (i === idx ? { ...svc, ...patch } : svc)),
    }));
  };

  const addService = () => {
    setPage((p) => ({ ...p, services: [...p.services, { key: "", name: "", desc: "", url: "" }] }));
  };

  const removeService = (idx: number) => {
    setPage((p) => ({ ...p, services: p.services.filter((_, i) => i !== idx) }));
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4 max-w-2xl">
        <div>
          <h2 className="font-bold text-lg">Status page content</h2>
          <p className="text-xs text-muted-foreground">Edit the public /status page heading and tracked services.</p>
        </div>
        <div>
          <Label>Page title</Label>
          <Input value={page.title} onChange={(e) => setPage({ ...page, title: e.target.value })} />
        </div>
        <div>
          <Label>Subtitle</Label>
          <Input value={page.subtitle} onChange={(e) => setPage({ ...page, subtitle: e.target.value })} />
        </div>
        <div>
          <Label>Footnote (optional)</Label>
          <Textarea
            value={page.footnote}
            onChange={(e) => setPage({ ...page, footnote: e.target.value })}
            placeholder="Optional message shown below the services list."
          />
         </div>
         <div>
           <Label>Website status webhook URL</Label>
           <Input
             value={page.website_webhook_url}
             onChange={(e) => setPage({ ...page, website_webhook_url: e.target.value })}
             placeholder="https://discord.com/api/webhooks/..."
           />
           <p className="text-[11px] text-muted-foreground mt-1">
             Receives down/up alerts specifically for the Website service, in addition to the global Alert webhooks.
           </p>
           <div className="flex flex-wrap gap-2 mt-3">
             <Button size="sm" variant="outline" onClick={() => sendTest("down")} disabled={testing !== null || !page.website_webhook_url}>
               {testing === "down" ? "Sending…" : "Test website webhook (down)"}
             </Button>
             <Button size="sm" variant="outline" onClick={() => sendTest("up")} disabled={testing !== null || !page.website_webhook_url}>
               {testing === "up" ? "Sending…" : "Test website webhook (up)"}
             </Button>
           </div>
         </div>

         <div className="space-y-2">
           <div className="flex items-center justify-between">
             <Label>Recent website webhook deliveries</Label>
             <Button size="sm" variant="ghost" onClick={loadDeliveries} disabled={loadingDeliveries}>
               <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loadingDeliveries ? "animate-spin" : ""}`} /> Refresh
             </Button>
           </div>
           <div className="rounded-md border border-border overflow-hidden">
             <table className="w-full text-xs">
               <thead className="bg-secondary/40 text-muted-foreground">
                 <tr>
                   <th className="text-left px-3 py-2 font-medium">Time</th>
                   <th className="text-left px-3 py-2 font-medium">Kind</th>
                   <th className="text-left px-3 py-2 font-medium">HTTP</th>
                   <th className="text-left px-3 py-2 font-medium">Latency</th>
                   <th className="text-left px-3 py-2 font-medium">Error</th>
                 </tr>
               </thead>
               <tbody>
                 {deliveries.length === 0 && (
                   <tr><td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">
                     {loadingDeliveries ? "Loading…" : "No deliveries logged yet."}
                   </td></tr>
                 )}
                 {deliveries.map((d) => (
                   <tr key={d.id} className="border-t border-border">
                     <td className="px-3 py-2 whitespace-nowrap">{new Date(d.attempted_at).toLocaleString()}</td>
                     <td className="px-3 py-2"><Badge variant="secondary" className="capitalize">{d.kind?.replace("_", " ")}</Badge></td>
                     <td className={`px-3 py-2 font-mono ${d.ok ? "text-primary" : "text-destructive"}`}>{d.status_code ?? "—"}</td>
                     <td className="px-3 py-2 font-mono">{d.latency_ms != null ? `${d.latency_ms}ms` : "—"}</td>
                     <td className="px-3 py-2 text-destructive max-w-[280px] truncate" title={d.error ?? ""}>{d.error ?? "—"}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         </div>


        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Tracked services</Label>
            <Button size="sm" variant="outline" onClick={addService}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add service
            </Button>
          </div>
          {page.services.length === 0 && (
            <p className="text-xs text-muted-foreground">No services yet. Add one to display it on /status.</p>
          )}
          {page.services.map((svc, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start p-3 rounded-md border border-border bg-secondary/30">
              <div className="col-span-6 sm:col-span-2">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Key</Label>
                <Input
                  value={svc.key}
                  onChange={(e) => updateService(i, { key: e.target.value })}
                  placeholder="website"
                />
              </div>
              <div className="col-span-6 sm:col-span-2">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Name</Label>
                <Input
                  value={svc.name}
                  onChange={(e) => updateService(i, { name: e.target.value })}
                  placeholder="Website"
                />
              </div>
              <div className="col-span-10 sm:col-span-4">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Description</Label>
                <Input
                  value={svc.desc}
                  onChange={(e) => updateService(i, { desc: e.target.value })}
                  placeholder="Main site & dashboard"
                />
              </div>
              <div className="col-span-10 sm:col-span-3">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Link URL</Label>
                <Input
                  value={svc.url}
                  onChange={(e) => updateService(i, { url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="col-span-2 sm:col-span-1 flex justify-end pt-5">
                <Button size="icon" variant="ghost" onClick={() => removeService(i)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <Button onClick={savePage} disabled={savingPage}>
          {savingPage ? "Saving…" : "Save page content"}
        </Button>
      </Card>

      <Card className="p-6 space-y-4 max-w-xl">
        <div>
          <h2 className="font-bold text-lg">Manual status override</h2>
          <p className="text-xs text-muted-foreground">Used by the legacy server_status display.</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={s.online} onCheckedChange={(c) => setS({ ...s, online: c })} />
          <Label>Server online</Label>
        </div>
        <div>
          <Label>Players online</Label>
          <Input
            type="number"
            value={s.players_online}
            onChange={(e) => setS({ ...s, players_online: +e.target.value })}
          />
        </div>
        <div>
          <Label>Max players</Label>
          <Input type="number" value={s.players_max} onChange={(e) => setS({ ...s, players_max: +e.target.value })} />
        </div>
        <div>
          <Label>MOTD</Label>
          <Input value={s.motd} onChange={(e) => setS({ ...s, motd: e.target.value })} />
        </div>
        <Button onClick={save}>Save</Button>
      </Card>
    </div>
  );
};


const LogsTab = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const { user } = useAuth();

  const load = async () => {
    let q = supabase.from("admin_check_logs").select("*").order("created_at", { ascending: false }).limit(100);
    if (scope === "mine" && user) q = q.eq("user_id", user.id);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setLogs(data ?? []);
  };
  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, [scope]);

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Admin role check logs</h2>
        <div className="flex gap-2">
          <Button size="sm" variant={scope === "mine" ? "default" : "outline"} onClick={() => setScope("mine")}>
            My checks
          </Button>
          <Button size="sm" variant={scope === "all" ? "default" : "outline"} onClick={() => setScope("all")}>
            All (admin)
          </Button>
          <Button size="sm" variant="ghost" onClick={load}>
            Refresh
          </Button>
        </div>
      </div>
      <div className="space-y-2 max-h-[600px] overflow-auto">
        {logs.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No logs yet. Reload pages that check admin access to generate entries.
          </p>
        )}
        {logs.map((l) => (
          <div key={l.id} className="p-3 rounded-lg bg-secondary/40 text-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={l.is_admin ? "default" : "destructive"}>{l.is_admin ? "ALLOWED" : "DENIED"}</Badge>
                <span className="font-medium">{l.email ?? l.user_id?.slice(0, 8) ?? "anonymous"}</span>
                <span className="text-xs text-muted-foreground">{l.context}</span>
              </div>
              <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              roles: <span className="font-mono">{(l.roles_found ?? []).join(", ") || "(none)"}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

const BOT_KEY = "discord_bot";

const DiscordRoleMapCard = ({ guildId }: { guildId?: string }) => {
  const [map, setMap] = useState<Record<string, string>>({});
  const [customRoles, setCustomRoles] = useState<{ key: string; label: string; emoji: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [testUid, setTestUid] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    supabase
      .from("site_content").select("value").eq("key", "discord_role_map").maybeSingle()
      .then(({ data }) => {
        const m = (data?.value as any)?.map;
        if (m && typeof m === "object") setMap(m);
      });
    supabase
      .from("custom_roles").select("key,label,emoji").order("rank", { ascending: true })
      .then(({ data }) => setCustomRoles((data ?? []) as any));
  }, []);

  const allRoles = useMemo(
    () => [
      ...ALL_ROLES.map((r) => ({ key: r.value, label: `${r.emoji} ${r.label}` })),
      ...customRoles.map((r) => ({ key: r.key, label: `${r.emoji || "⭐"} ${r.label}` })),
    ],
    [customRoles],
  );

  const save = async () => {
    setSaving(true);
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(map)) if (v && v.trim()) clean[k] = v.trim();
    const { error } = await supabase
      .from("site_content").upsert({ key: "discord_role_map", value: { map: clean } });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Role mapping saved");
  };

  const runTestSync = async () => {
    if (!testUid.trim()) return;
    setTesting(true);
    const { data, error } = await supabase.functions.invoke("discord-sync-user-roles", {
      body: { user_id: testUid.trim() },
    });
    setTesting(false);
    if (error) return toast.error(error.message);
    if (data?.skipped) return toast.message(data.reason || "Skipped");
    if (data?.ok) toast.success(`Synced — added ${(data.added ?? []).length}, removed ${(data.removed ?? []).length}`);
    else toast.error(data?.error || `Errors: ${JSON.stringify(data?.errors ?? [])}`);
  };

  return (
    <Card className="p-6 mt-6">
      <h3 className="font-display font-bold text-lg mb-1">Discord Role Sync</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Map each website role to a Discord role ID. When admins assign or remove a role on the website, the bot will
        automatically add/remove the matching Discord role for users who have linked their Discord account.
        {!guildId && (
          <span className="block text-destructive mt-1">Set a guildId in the Discord settings above first.</span>
        )}
      </p>
      <div className="grid sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
        {allRoles.map((r) => (
          <div key={r.key} className="flex items-center gap-2">
            <div className="w-40 text-sm truncate">{r.label}</div>
            <Input
              placeholder="Discord role ID"
              value={map[r.key] ?? ""}
              onChange={(e) => setMap((m) => ({ ...m, [r.key]: e.target.value }))}
              className="font-mono text-xs"
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-4">
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save mapping"}</Button>
      </div>
      <div className="mt-6 pt-4 border-t border-border">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Test sync</div>
        <div className="flex gap-2">
          <Input
            placeholder="User ID (UUID)"
            value={testUid}
            onChange={(e) => setTestUid(e.target.value)}
            className="font-mono text-xs"
          />
          <Button variant="outline" onClick={runTestSync} disabled={testing || !testUid.trim()}>
            {testing ? "Syncing…" : "Sync now"}
          </Button>
        </div>
      </div>
    </Card>
  );
};



const BotDashboardSection = () => {
  const [cfg, setCfg] = useState<any>({
    enabled: false,
    status: "offline",
    guildId: "",
    inviteUrl: "",
    announceChannelId: "",
    statusChannelId: "",
    rolesChannelId: "1498961753457954847",
    infoChannelId: "",
    rulesChannelId: "",
    welcomeMessage: "",
  });
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionResults, setActionResults] = useState<Record<string, { ok: boolean; message: string }>>({});
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [previewChannelId, setPreviewChannelId] = useState<string>("");
  const [previewAction_, setPreviewAction_] = useState<"roles" | "info" | "rules" | null>(null);

  type EmbedField = { name: string; value: string; inline?: boolean };
  type EmbedOverride = {
    title?: string;
    description?: string;
    color?: string;
    footerText?: string;
    fields?: EmbedField[];
  };
  const [embedOverrides, setEmbedOverrides] = useState<Record<"info" | "rules" | "roles", EmbedOverride>>({
    info: {}, rules: {}, roles: {},
  });
  const [editingEmbed, setEditingEmbed] = useState<"info" | "rules" | "roles" | null>(null);
  const [embedForm, setEmbedForm] = useState<EmbedOverride>({});
  const [savingEmbed, setSavingEmbed] = useState(false);

  useEffect(() => {
    supabase
      .from("site_content")
      .select("value")
      .eq("key", BOT_KEY)
      .maybeSingle()
      .then(({ data }) => data?.value && setCfg((c: any) => ({ ...c, ...(data.value as any) })));
    supabase
      .from("site_content")
      .select("value")
      .eq("key", "discord_embeds")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value && typeof data.value === "object") {
          setEmbedOverrides((prev) => ({ ...prev, ...(data.value as any) }));
        }
      });
  }, []);

  const openEditEmbed = async (key: "info" | "rules" | "roles") => {
    setEditingEmbed(key);
    const existing = embedOverrides[key] ?? {};
    setEmbedForm(existing);
    try {
      const { data } = await supabase.functions.invoke("discord-bot-action", {
        body: { action: key, preview: true },
      });
      const p = data?.preview;
      if (p) {
        setEmbedForm((f) => ({
          title: f.title ?? p.title ?? "",
          description: f.description ?? p.description ?? "",
          footerText: f.footerText ?? p.footer?.text ?? "",
          fields:
            f.fields && f.fields.length > 0
              ? f.fields
              : Array.isArray(p.fields)
                ? p.fields.map((x: any) => ({ name: x.name ?? "", value: x.value ?? "", inline: !!x.inline }))
                : [],
        }));
      }
    } catch (_) { /* ignore */ }
  };

  const updateField = (idx: number, patch: Partial<EmbedField>) => {
    setEmbedForm((f) => {
      const fields = [...(f.fields ?? [])];
      fields[idx] = { ...fields[idx], ...patch };
      return { ...f, fields };
    });
  };
  const addField = () =>
    setEmbedForm((f) => ({ ...f, fields: [...(f.fields ?? []), { name: "", value: "", inline: false }] }));
  const removeField = (idx: number) =>
    setEmbedForm((f) => ({ ...f, fields: (f.fields ?? []).filter((_, i) => i !== idx) }));

  const saveEmbed = async () => {
    if (!editingEmbed) return;
    setSavingEmbed(true);
    const next = { ...embedOverrides, [editingEmbed]: embedForm };
    const { error } = await supabase
      .from("site_content")
      .upsert({ key: "discord_embeds", value: next });
    setSavingEmbed(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEmbedOverrides(next);
    setEditingEmbed(null);
    toast.success("Embed saved. Click Run/Preview to apply.");
  };

  const runTest = async () => {
    setTesting(true);
    setResult(null);
    const { data, error } = await supabase.functions.invoke("discord-bot-test", {
      body: { guildId: cfg.guildId || undefined },
    });
    setTesting(false);
    if (error) {
      setResult({ ok: false, error: error.message });
      toast.error("Connection test failed");
    } else {
      setResult(data);
      if (data?.ok) toast.success(`Connected as ${data.bot?.username}`);
      else toast.error(data?.error ?? "Test failed");
    }
  };

  type EmbedAction = "announce" | "status" | "welcome" | "roles" | "info" | "rules";

  const runAction = async (action: EmbedAction) => {
    setBusy(action);
    const { data, error } = await supabase.functions.invoke("discord-bot-action", {
      body: { action },
    });
    setBusy(null);
    const payload = error
      ? { ok: false, message: error.message }
      : { ok: !!data?.ok, message: data?.ok ? data.message : (data?.error ?? "Failed") };
    setActionResults((r) => ({ ...r, [action]: payload }));
    if (payload.ok) toast.success(payload.message);
    else toast.error(payload.message);
  };

  const previewAction = async (action: "roles" | "info" | "rules") => {
    setBusy(`${action}-preview`);
    const { data, error } = await supabase.functions.invoke("discord-bot-action", {
      body: { action, preview: true },
    });
    setBusy(null);
    if (error || !data?.ok) {
      toast.error(error?.message ?? data?.error ?? "Preview failed");
      return;
    }
    setPreviewData({ ...data.preview, _content: data.content });
    setPreviewChannelId(data.channelId ?? "");
    setPreviewAction_(action);
    setPreviewOpen(true);
  };

  const online = cfg.enabled && cfg.status === "online";
  const tests: { key: EmbedAction; label: string; desc: string; channel: string | undefined; canPreview?: boolean }[] =
    [
      {
        key: "announce",
        label: "Send test announcement",
        desc: "Posts an embed to the announcements channel.",
        channel: cfg.announceChannelId,
      },
      {
        key: "status",
        label: "Post server status",
        desc: "Sends a live status embed to the status channel.",
        channel: cfg.statusChannelId,
      },
      {
        key: "welcome",
        label: "Preview welcome message",
        desc: "Renders the welcome template and posts it for preview.",
        channel: cfg.announceChannelId || cfg.statusChannelId,
      },
      {
        key: "info",
        label: "Send server info",
        desc: "Posts (or updates) a polished server info embed with IP, ports, and quick links in the info channel.",
        channel: cfg.infoChannelId,
        canPreview: true,
      },
      {
        key: "rules",
        label: "Send server rules",
        desc: "Posts (or updates) the full Warden Network rules embed in the rules channel.",
        channel: cfg.rulesChannelId,
        canPreview: true,
      },
      {
        key: "roles",
        label: "Send Discord roles",
        desc: "Posts (or updates) the full Warden Network roles overview embed in the server-roles channel.",
        channel: cfg.rolesChannelId || "1498961753457954847",
        canPreview: true,
      },
    ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          title="Bot Status"
          value={online ? "Online" : cfg.enabled ? "Connecting" : "Disabled"}
          icon={Activity}
          color={online ? "bg-emerald-500" : cfg.enabled ? "bg-teal-500" : "bg-muted"}
        />
        <StatCard title="Guild ID" value={cfg.guildId || "—"} icon={ShieldCheck} color="bg-primary" />
        <StatCard
          title="Enabled"
          value={cfg.enabled ? "Yes" : "No"}
          icon={ShieldCheck}
          color={cfg.enabled ? "bg-primary" : "bg-muted"}
        />
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-bold">Connection test</h2>
            <p className="text-sm text-muted-foreground">Verify the bot token and (optionally) guild access.</p>
          </div>
          <Button onClick={runTest} disabled={testing}>
            {testing ? "Testing..." : "Test Connection"}
          </Button>
        </div>
        {result && (
          <div
            className={`p-4 rounded-lg border ${result.ok ? "border-emerald-500/40 bg-emerald-500/10" : "border-destructive/40 bg-destructive/10"} space-y-2 text-sm`}
          >
            <div className="flex items-center gap-2">
              <Badge variant={result.ok ? "default" : "destructive"}>{result.ok ? "SUCCESS" : "FAILED"}</Badge>
              {result.ok ? (
                <span>
                  Authenticated as <span className="font-mono">{result.bot?.username}</span> (id {result.bot?.id})
                </span>
              ) : (
                <span>{result.error}</span>
              )}
            </div>
            {result.ok && result.guild && (
              <div className="text-muted-foreground">
                Guild: <span className="text-foreground">{result.guild.name}</span> ({result.guild.id})
                {typeof result.guild.memberCount === "number" && <> · ~{result.guild.memberCount} members</>}
              </div>
            )}
            {result.ok && result.guildError && <div className="text-amber-400">Warning: {result.guildError}</div>}
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <h2 className="font-bold">Live channel tests</h2>
          <p className="text-sm text-muted-foreground">
            Send real Discord messages using the channel IDs and welcome template configured in Management.
          </p>
        </div>
        <div className="grid gap-3">
          {tests.map((t) => {
            const r = actionResults[t.key];
            const disabled = !!busy || !t.channel;
            const isPreviewable = !!t.canPreview;
            const previewKey = isPreviewable ? (t.key as "roles" | "info" | "rules") : null;
            return (
              <div
                key={t.key}
                className="flex items-start justify-between gap-4 p-4 rounded-lg border border-border/50 bg-card/40"
              >
                <div className="min-w-0">
                  <p className="font-medium">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                  <p className="text-xs mt-1">
                    Target channel:{" "}
                    {t.channel ? (
                      <span className="font-mono text-foreground">{t.channel}</span>
                    ) : (
                      <span className="text-destructive">not configured</span>
                    )}
                  </p>
                  {r && (
                    <div className={`mt-2 text-xs ${r.ok ? "text-emerald-400" : "text-destructive"}`}>
                      {r.ok ? "✓ " : "✗ "}
                      {r.message}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {previewKey && (
                    <Button size="sm" variant="outline" onClick={() => openEditEmbed(previewKey)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                  )}
                  {previewKey && (
                    <Button size="sm" variant="outline" onClick={() => previewAction(previewKey)} disabled={!!busy || !t.channel}>
                      {busy === `${previewKey}-preview` ? "Loading..." : "Preview"}
                    </Button>
                  )}
                  <Button size="sm" onClick={() => runAction(t.key)} disabled={disabled}>
                    {busy === t.key ? "Sending..." : "Run test"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <BotActionLogsPanel />

      <Card className="p-6 space-y-3">
        <h2 className="font-bold">About the Discord Bot</h2>
        <p className="text-sm text-muted-foreground">
          Configure your bot in the Management section. When enabled, it can sync with your Warden Network server to deliver
          announcements, role assignments, and live server status to your Discord guild.
        </p>
        {cfg.inviteUrl && (
          <a href={cfg.inviteUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">
            Open invite link →
          </a>
        )}
      </Card>

      <Dialog open={!!editingEmbed} onOpenChange={(o) => !o && setEditingEmbed(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit {editingEmbed === "info" ? "Server Info" : editingEmbed === "rules" ? "Server Rules" : "Roles"} embed
            </DialogTitle>
            <DialogDescription>
              Edit the title, description, fields, and footer. Values are prefilled from the current embed.
              {editingEmbed === "rules" && " Rule items are normally managed in the Rules section; edits here override them."}
              {editingEmbed === "roles" && " The role list is generated automatically; edits here override it."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input
                value={embedForm.title ?? ""}
                onChange={(e) => setEmbedForm({ ...embedForm, title: e.target.value })}
                placeholder="Default title"
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                rows={5}
                value={embedForm.description ?? ""}
                onChange={(e) => setEmbedForm({ ...embedForm, description: e.target.value })}
                placeholder="Default description"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Fields</Label>
                <Button type="button" size="sm" variant="outline" onClick={addField}>
                  + Add field
                </Button>
              </div>
              {(embedForm.fields ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">No fields. Click “Add field” to create one.</p>
              )}
              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                {(embedForm.fields ?? []).map((f, i) => (
                  <div key={i} className="rounded-md border border-border/60 p-3 space-y-2 bg-card/30">
                    <div className="flex items-center gap-2">
                      <Input
                        value={f.name}
                        onChange={(e) => updateField(i, { name: e.target.value })}
                        placeholder="Field name"
                      />
                      <Button type="button" size="sm" variant="ghost" onClick={() => removeField(i)}>
                        Remove
                      </Button>
                    </div>
                    <Textarea
                      rows={2}
                      value={f.value}
                      onChange={(e) => updateField(i, { value: e.target.value })}
                      placeholder="Field value (Markdown supported)"
                    />
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={!!f.inline}
                        onChange={(e) => updateField(i, { inline: e.target.checked })}
                      />
                      Inline
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Footer text</Label>
              <Input
                value={embedForm.footerText ?? ""}
                onChange={(e) => setEmbedForm({ ...embedForm, footerText: e.target.value })}
                placeholder="Default footer"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmbedForm({})} disabled={savingEmbed}>
              Reset to defaults
            </Button>
            <Button onClick={saveEmbed} disabled={savingEmbed}>
              {savingEmbed ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {previewAction_ === "info" ? "Server Info" : previewAction_ === "rules" ? "Server Rules" : "Roles"} Embed Preview
            </DialogTitle>
            <DialogDescription>
              This is how the message will look in channel{" "}
              {previewChannelId ? <span className="font-mono">{previewChannelId}</span> : "—"}.
            </DialogDescription>
          </DialogHeader>
          {previewData && (
            <div className="space-y-3">
              {previewData._content && (
                <div className="text-sm font-medium text-primary">{previewData._content}</div>
              )}
              <div
                className="rounded-lg border-l-4 p-4 bg-card/60 space-y-2"
                style={{ borderLeftColor: `#${(previewData.color ?? 0x5865f2).toString(16).padStart(6, "0")}` }}
              >
                {previewData.title && (
                  <div className="font-semibold text-base">{previewData.title}</div>
                )}
                {previewData.description && (
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {previewData.description}
                  </div>
                )}
                {Array.isArray(previewData.fields) && previewData.fields.length > 0 && (
                  <div className="grid gap-2 pt-1">
                    {previewData.fields.map((f: any, i: number) => (
                      <div key={i} className="text-sm">
                        <div className="font-semibold">{f.name}</div>
                        <div className="text-muted-foreground whitespace-pre-wrap">{f.value}</div>
                      </div>
                    ))}
                  </div>
                )}
                {previewData.footer?.text && (
                  <div className="text-xs text-muted-foreground pt-2 flex items-center gap-2 border-t border-border/40 mt-2">
                    <span>{previewData.footer.text}</span>
                    {previewData.timestamp && (
                      <>
                        <span>·</span>
                        <span>{new Date(previewData.timestamp).toLocaleString()}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setPreviewOpen(false);
                if (previewAction_) runAction(previewAction_);
              }}
              disabled={!previewAction_}
            >
              Send to channel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DiscordRoleMapCard guildId={cfg.guildId} />
    </div>
  );
};


const BotActionLogsPanel = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    let q = supabase.from("discord_bot_action_logs").select("*").order("created_at", { ascending: false }).limit(50);
    if (filter !== "all") q = q.eq("action", filter);
    const { data, error } = await q;
    setLoading(false);
    if (error) toast.error(error.message);
    else setLogs(data ?? []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const clearLogs = async () => {
    if (!(await confirm({ title: "Clear logs?", description: "Delete all Discord bot action logs? This cannot be undone.", confirmText: "Clear", destructive: true }))) return;
    const { error } = await supabase
      .from("discord_bot_action_logs")
      .delete()
      .gte("created_at", "1970-01-01");
    if (error) toast.error(error.message);
    else {
      toast.success("Logs cleared");
      load();
    }
  };

  const actions = ["all", "announce", "status", "welcome", "roles", "info", "rules"];

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-bold">Bot action logs</h2>
          <p className="text-sm text-muted-foreground">
            Last 50 requests sent to the Discord bot, including responses and errors.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-sm bg-background border border-border rounded-md px-2 py-1.5"
          >
            {actions.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </Button>
          <Button size="sm" variant="destructive" onClick={clearLogs} disabled={loading || logs.length === 0}>
            <Trash2 className="h-4 w-4 mr-1" /> Clear
          </Button>
        </div>
      </div>

      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No logs yet — run an action above to populate this list.</p>
      ) : (
        <div className="space-y-2">
          {logs.map((l) => {
            const isOpen = expanded === l.id;
            return (
              <div
                key={l.id}
                className={`rounded-lg border ${l.status === "ok" ? "border-emerald-500/30" : "border-destructive/40"} bg-card/40`}
              >
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : l.id)}
                  className="w-full flex items-center justify-between gap-3 p-3 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant={l.status === "ok" ? "default" : "destructive"}>{l.status.toUpperCase()}</Badge>
                    <span className="font-mono text-sm">{l.action}</span>
                    {l.http_status != null && (
                      <span className="text-xs text-muted-foreground">HTTP {l.http_status}</span>
                    )}
                    {l.duration_ms != null && (
                      <span className="text-xs text-muted-foreground">· {l.duration_ms}ms</span>
                    )}
                    {l.error && (
                      <span className="text-xs text-destructive truncate">— {l.error}</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(l.created_at).toLocaleString()}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-3 pb-3 space-y-2 text-xs">
                    <div>
                      <p className="font-semibold mb-1">Request</p>
                      <pre className="bg-background border border-border rounded p-2 overflow-x-auto">
{JSON.stringify(l.request, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <p className="font-semibold mb-1">Response</p>
                      <pre className="bg-background border border-border rounded p-2 overflow-x-auto">
{JSON.stringify(l.response, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

const BotManagementSection = () => {
  const [cfg, setCfg] = useState({
    enabled: false,
    status: "offline" as "online" | "offline",
    guildId: "",
    inviteUrl: "",
    announceChannelId: "",
    statusChannelId: "",
    welcomeChannelId: "",
    rolesChannelId: "1498961753457954847",
    infoChannelId: "",
    rulesChannelId: "",
    welcomeMessage: "Welcome to Warden Network, {user}!",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("site_content")
      .select("value")
      .eq("key", BOT_KEY)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setCfg((c) => ({ ...c, ...(data.value as any) }));
        setLoading(false);
      });
  }, []);

  const save = async () => {
    const { error } = await supabase.from("site_content").upsert([{ key: BOT_KEY, value: cfg as any }]);
    if (error) return toast.error(error.message);
    toast.success("Bot settings saved");
  };

  if (loading) return <Card className="p-6 text-sm text-muted-foreground">Loading...</Card>;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="p-6 space-y-4">
        <h2 className="font-bold">General</h2>
        <div className="flex items-center gap-2">
          <Switch checked={cfg.enabled} onCheckedChange={(c) => setCfg({ ...cfg, enabled: c })} />
          <Label>Enable Discord bot</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={cfg.status === "online"}
            onCheckedChange={(c) => setCfg({ ...cfg, status: c ? "online" : "offline" })}
          />
          <Label>Mark as online</Label>
        </div>
        <div>
          <Label>Guild ID</Label>
          <Input value={cfg.guildId} onChange={(e) => setCfg({ ...cfg, guildId: e.target.value })} />
        </div>
        <div>
          <Label>Bot invite URL</Label>
          <Input value={cfg.inviteUrl} onChange={(e) => setCfg({ ...cfg, inviteUrl: e.target.value })} />
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="font-bold">Channels & Messages</h2>
        <div>
          <Label>Announcements channel ID</Label>
          <Input
            value={cfg.announceChannelId}
            onChange={(e) => setCfg({ ...cfg, announceChannelId: e.target.value })}
          />
        </div>
        <div>
          <Label>Server status channel ID</Label>
          <Input value={cfg.statusChannelId} onChange={(e) => setCfg({ ...cfg, statusChannelId: e.target.value })} />
        </div>
        <div>
          <Label>Welcome channel ID</Label>
          <Input
            value={cfg.welcomeChannelId}
            onChange={(e) => setCfg({ ...cfg, welcomeChannelId: e.target.value })}
            placeholder="Channel where new members are greeted"
          />
        </div>
        <div>
          <Label>Server roles channel ID</Label>
          <Input
            value={cfg.rolesChannelId}
            onChange={(e) => setCfg({ ...cfg, rolesChannelId: e.target.value })}
            placeholder="Channel where the roles overview embed is posted"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Defaults to <code>#✭「🍸」・server-roles</code> (1498961753457954847). Used by the “Send Discord roles” action.
          </p>
        </div>
        <div>
          <Label>Server info channel ID</Label>
          <Input
            value={cfg.infoChannelId}
            onChange={(e) => setCfg({ ...cfg, infoChannelId: e.target.value })}
            placeholder="Channel where the info embed (IP, ports, links) is posted"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Used by the “Send server info” action. Posts (or updates) a polished embed with the IP, Bedrock port, and quick links, plus an <code>@everyone</code> ping.
          </p>
        </div>
        <div>
          <Label>Server rules channel ID</Label>
          <Input
            value={cfg.rulesChannelId}
            onChange={(e) => setCfg({ ...cfg, rulesChannelId: e.target.value })}
            placeholder="Channel where the rules embed is posted"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Used by the “Send server rules” action.
          </p>
        </div>
        <div>
          <Label>Welcome message</Label>
          <Textarea
            rows={3}
            value={cfg.welcomeMessage}
            onChange={(e) => setCfg({ ...cfg, welcomeMessage: e.target.value })}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Use <code>{"{user}"}</code> as a placeholder for the new member.
          </p>
        </div>
      </Card>

      <div className="md:col-span-2">
        <Button onClick={save}>Save bot settings</Button>
      </div>
    </div>
  );
};

// ============== Tickets admin ==============
type AdminTicket = {
  id: string;
  user_id: string;
  subject: string;
  body: string;
  category: string | null;
  status: "open" | "in_progress" | "waiting_user" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  created_at: string;
  updated_at: string;
  admin_last_viewed_at: string | null;
};
type AdminMsg = {
  id: string;
  ticket_id: string;
  author_id: string;
  is_staff: boolean;
  body: string;
  created_at: string;
};

const TICKET_STATUSES: AdminTicket["status"][] = ["open", "in_progress", "waiting_user", "closed"];

const TicketsAdminSection = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, { display_name: string | null }>>({});
  const [latestUserAt, setLatestUserAt] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"all" | AdminTicket["status"]>("open");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AdminMsg[]>([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const hasUnreadReply = (t: AdminTicket) => {
    const latest = latestUserAt[t.id];
    if (!latest) return false;
    if (!t.admin_last_viewed_at) return true;
    return new Date(latest).getTime() > new Date(t.admin_last_viewed_at).getTime();
  };

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
    const list = (data ?? []) as AdminTicket[];
    setTickets(list);
    const ids = Array.from(new Set(list.map((t) => t.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", ids);
      const map: Record<string, { display_name: string | null }> = {};
      (profs ?? []).forEach((p: any) => {
        map[p.id] = { display_name: p.display_name };
      });
      setProfilesById(map);
    }
    // Latest non-staff message per ticket, for unread badge
    const { data: msgs } = await supabase
      .from("support_ticket_messages")
      .select("ticket_id, created_at, is_staff")
      .eq("is_staff", false)
      .order("created_at", { ascending: false });
    const latestMap: Record<string, string> = {};
    (msgs ?? []).forEach((m: any) => {
      if (!latestMap[m.ticket_id]) latestMap[m.ticket_id] = m.created_at;
    });
    setLatestUserAt(latestMap);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    supabase
      .from("support_ticket_messages")
      .select("*")
      .eq("ticket_id", selectedId)
      .order("created_at")
      .then(({ data }) => setMessages((data ?? []) as AdminMsg[]));
    // Mark as viewed
    const nowIso = new Date().toISOString();
    setTickets((prev) =>
      prev.map((t) => (t.id === selectedId ? { ...t, admin_last_viewed_at: nowIso } : t)),
    );
    supabase
      .from("support_tickets")
      .update({ admin_last_viewed_at: nowIso })
      .eq("id", selectedId)
      .then(() => {});
  }, [selectedId]);


  const filtered = filter === "all" ? tickets : tickets.filter((t) => t.status === filter);
  const selected = tickets.find((t) => t.id === selectedId) ?? null;

  const updateStatus = async (id: string, status: AdminTicket["status"]) => {
    const { error } = await supabase.from("support_tickets").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Status: ${status}`);
    load();
  };
  const updatePriority = async (id: string, priority: AdminTicket["priority"]) => {
    const { error } = await supabase.from("support_tickets").update({ priority }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const sendReply = async () => {
    if (!selected || !user || !reply.trim()) return;
    setSending(true);
    const body = reply.trim();
    const tempId = `temp-${Date.now()}`;
    const optimistic: AdminMsg = {
      id: tempId,
      ticket_id: selected.id,
      author_id: user.id,
      is_staff: true,
      body,
      created_at: new Date().toISOString(),
    } as AdminMsg;
    setMessages((prev) => [...prev, optimistic]);
    setReply("");

    const { data: inserted, error } = await supabase
      .from("support_ticket_messages")
      .insert({
        ticket_id: selected.id,
        author_id: user.id,
        is_staff: true,
        body,
      })
      .select("*")
      .single();
    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setReply(body);
      setSending(false);
      return toast.error(error.message);
    }
    setMessages((prev) =>
      prev.map((m) => (m.id === tempId ? (inserted as AdminMsg) : m)),
    );
    setSending(false);

    if (selected.status === "open") updateStatus(selected.id, "waiting_user");

    // Fire-and-forget email notification
    (async () => {
      try {
        const { data: emailData } = await supabase.rpc("admin_get_user_email", { _user_id: selected.user_id });
        const recipientEmail = (emailData as string | null) ?? null;
        if (recipientEmail) {
          const recipientName = profilesById[selected.user_id]?.display_name ?? "there";
          const staffName = user.user_metadata?.display_name || user.email?.split("@")[0] || "Support";
          await supabase.functions.invoke("send-app-email", {
            body: {
              templateName: "ticket-reply",
              recipientEmail,
              from: '"Warden Network Support" <tickets@warden.rip>',
              idempotencyKey: `ticket-reply-${selected.id}-${Date.now()}`,
              templateData: {
                recipientName,
                subject: selected.subject,
                reply: body,
                staffName,
                ticketUrl: `${window.location.origin}/support`,
              },
            },
          });
        }
      } catch (e) {
        console.warn("ticket-reply email failed", e);
      }
    })();
  };

  const deleteTicket = async (id: string) => {
    if (!(await confirm({ title: "Delete ticket?", description: "This ticket and all its messages will be permanently deleted.", confirmText: "Delete", destructive: true }))) return;
    const { error } = await supabase.from("support_tickets").delete().eq("id", id);
    if (error) return toast.error(error.message);
    if (selectedId === id) setSelectedId(null);
    load();
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: tickets.length, open: 0, in_progress: 0, waiting_user: 0, closed: 0 };
    tickets.forEach((t) => {
      c[t.status]++;
    });
    return c;
  }, [tickets]);

  return (
    <div className="grid lg:grid-cols-[380px_1fr] gap-4">
      <Card className="p-3 max-h-[78vh] overflow-y-auto">
        <div className="flex flex-wrap gap-1 mb-3">
          {(["all", ...TICKET_STATUSES] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s as any)}
              className={`text-[11px] uppercase tracking-wider px-2 py-1 rounded border transition ${filter === s ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/40"}`}
            >
              {s.replace("_", " ")} ({counts[s] ?? 0})
            </button>
          ))}
        </div>
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground text-center">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground text-center">No tickets in this view.</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((t) => {
              const active = selectedId === t.id;
              const unread = hasUnreadReply(t);
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`w-full text-left p-3 rounded-lg border transition ${active ? "border-primary/60 bg-primary/5" : unread ? "border-destructive/60 hover:border-destructive bg-destructive/5" : "border-border hover:border-primary/40 hover:bg-secondary/30"}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="font-semibold text-sm truncate flex items-center gap-2">
                      {unread && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-destructive text-destructive-foreground shrink-0">
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          New reply
                        </span>
                      )}
                      <span className="truncate">{t.subject}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {t.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-2">{t.body}</div>
                  <div className="text-[10px] text-muted-foreground mt-1.5 uppercase tracking-wider flex justify-between">
                    <span>{profilesById[t.user_id]?.display_name ?? t.user_id.slice(0, 8)}</span>
                    <span>{new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <div>
        {!selected ? (
          <Card className="p-12 text-center text-muted-foreground">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 text-primary/60" />
            <p>Select a ticket to view and reply.</p>
          </Card>
        ) : (
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4 pb-4 border-b">
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  #{selected.id.slice(0, 8)} · {selected.category ?? "General"} · From{" "}
                  {profilesById[selected.user_id]?.display_name ?? selected.user_id.slice(0, 8)}
                </div>
                <h2 className="text-xl font-bold">{selected.subject}</h2>
                <div className="text-xs text-muted-foreground mt-1">
                  Opened {new Date(selected.created_at).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={selected.status} onValueChange={(v: any) => updateStatus(selected.id, v)}>
                  <SelectTrigger className="w-[150px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TICKET_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selected.priority} onValueChange={(v: any) => updatePriority(selected.id, v)}>
                  <SelectTrigger className="w-[120px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["low", "normal", "high", "urgent"] as const).map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => deleteTicket(selected.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
              <div className="rounded-lg p-4 border bg-secondary/40">
                <div className="text-xs font-bold uppercase tracking-wider mb-1">
                  User · {new Date(selected.created_at).toLocaleString()}
                </div>
                <div className="text-sm whitespace-pre-wrap break-words">{selected.body}</div>
              </div>
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-lg p-4 border ${m.is_staff ? "bg-primary/10 border-primary/40" : "bg-secondary/40"}`}
                >
                  <div className="text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                    {m.is_staff ? <span className="text-primary">Staff</span> : "User"}
                    <span className="text-muted-foreground font-normal">{new Date(m.created_at).toLocaleString()}</span>
                  </div>
                  <div className="text-sm whitespace-pre-wrap break-words">{m.body}</div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t space-y-2">
              <Label>Staff reply</Label>
              <Textarea
                rows={4}
                maxLength={4000}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Reply to the user…"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => updateStatus(selected.id, "closed")}>
                  Close ticket
                </Button>
                <Button size="sm" onClick={sendReply} disabled={sending || !reply.trim()}>
                  <Send className="h-4 w-4 mr-2" /> Send reply
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

type PluginRow = {
  id: string;
  short_id: string;
  name: string;
  description: string | null;
  long_description: string | null;
  version: string | null;
  author: string | null;
  download_url: string | null;
  icon_url: string | null;
  category: string | null;
  platform: string | null;
  tags: string[];
  featured: boolean;
  published: boolean;
  created_at: string;
  jar_path: string | null;
  jar_filename: string | null;
  jar_size: number | null;
  screenshots: string[];
  user_id: string | null;
};

const emptyPluginForm = {
  name: "",
  description: "",
  long_description: "",
  version: "",
  author: "",
  owner_username: "",
  download_url: "",
  icon_url: "",
  category: "",
  platform: "",
  tags: "",
  featured: false,
  published: true,
  jar_path: "" as string,
  jar_filename: "" as string,
  jar_size: 0 as number,
  screenshots: [] as string[],
};

const formatBytes = (b: number) => {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
};

const PluginsTab = () => {
  const [plugins, setPlugins] = useState<PluginRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyPluginForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("plugins").select("*").order("created_at", { ascending: false });
    setPlugins((data ?? []) as PluginRow[]);
  };
  useEffect(() => {
    load();
  }, []);

  const startEdit = async (p: PluginRow) => {
    setEditingId(p.id);
    let ownerUsername = "";
    if (p.user_id) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name, mc_username")
        .eq("id", p.user_id)
        .maybeSingle();
      ownerUsername = prof?.display_name || prof?.mc_username || "";
    }
    setForm({
      name: p.name,
      description: p.description ?? "",
      long_description: p.long_description ?? "",
      version: p.version ?? "",
      author: p.author ?? "",
      owner_username: ownerUsername,
      download_url: p.download_url ?? "",
      icon_url: p.icon_url ?? "",
      category: p.category ?? "",
      platform: p.platform ?? "",
      tags: (p.tags ?? []).join(", "),
      featured: p.featured,
      published: p.published,
      jar_path: p.jar_path ?? "",
      jar_filename: p.jar_filename ?? "",
      jar_size: p.jar_size ?? 0,
      screenshots: p.screenshots ?? [],
    });
  };

  const reset = () => {
    setEditingId(null);
    setForm(emptyPluginForm);
  };

  const [uploading, setUploading] = useState(false);

  const onJarSelected = async (file: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".jar")) {
      return toast.error("Please select a .jar file");
    }
    setUploading(true);
    try {
      // Remove old jar if replacing
      if (form.jar_path) {
        await supabase.storage.from("plugin-jars").remove([form.jar_path]);
      }
      const path = `${crypto.randomUUID()}/${file.name}`;
      const { error } = await supabase.storage
        .from("plugin-jars")
        .upload(path, file, { contentType: "application/java-archive", upsert: false });
      if (error) throw error;
      setForm((f) => ({
        ...f,
        jar_path: path,
        jar_filename: file.name,
        jar_size: file.size,
        download_url: "",
      }));
      toast.success("JAR uploaded");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const removeJar = async () => {
    if (!form.jar_path) return;
    if (!(await confirm({ title: "Remove JAR?", description: "The uploaded JAR file will be removed.", confirmText: "Remove", destructive: true }))) return;
    await supabase.storage.from("plugin-jars").remove([form.jar_path]);
    setForm((f) => ({ ...f, jar_path: "", jar_filename: "", jar_size: 0, download_url: "" }));
    toast.success("JAR removed");
  };

  const [uploadingShot, setUploadingShot] = useState(false);

  const onScreenshotsSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingShot(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`Skipped ${file.name}: not an image`);
          continue;
        }
        const path = `${crypto.randomUUID()}/${file.name}`;
        const { error } = await supabase.storage
          .from("plugin-screenshots")
          .upload(path, file, { contentType: file.type || "image/png", upsert: false });
        if (error) {
          toast.error(error.message);
          continue;
        }
        const { data: pub } = supabase.storage.from("plugin-screenshots").getPublicUrl(path);
        urls.push(pub.publicUrl);
      }
      if (urls.length) {
        setForm((f) => ({ ...f, screenshots: [...f.screenshots, ...urls] }));
        toast.success(`Added ${urls.length} screenshot${urls.length > 1 ? "s" : ""}`);
      }
    } finally {
      setUploadingShot(false);
    }
  };

  const removeScreenshot = (url: string) => {
    setForm((f) => ({ ...f, screenshots: f.screenshots.filter((u) => u !== url) }));
  };

  const [uploadingIcon, setUploadingIcon] = useState(false);

  const onIconSelected = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please select an image");
    setUploadingIcon(true);
    try {
      const path = `icons/${crypto.randomUUID()}/${file.name}`;
      const { error } = await supabase.storage
        .from("plugin-screenshots")
        .upload(path, file, { contentType: file.type || "image/png", upsert: false });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("plugin-screenshots").getPublicUrl(path);
      setForm((f) => ({ ...f, icon_url: pub.publicUrl }));
      toast.success("Icon uploaded");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploadingIcon(false);
    }
  };

  const removeIcon = () => setForm((f) => ({ ...f, icon_url: "" }));

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    setSaving(true);

    // Resolve owner username -> user_id (case-insensitive match on display_name or mc_username)
    let ownerUserId: string | null | undefined = undefined; // undefined = don't change
    const uname = form.owner_username.trim();
    if (uname) {
      const { data: matches } = await supabase
        .from("profiles")
        .select("id, display_name, mc_username")
        .or(`display_name.ilike.${uname},mc_username.ilike.${uname}`)
        .limit(2);
      if (!matches || matches.length === 0) {
        setSaving(false);
        return toast.error(`No user found with username "${uname}"`);
      }
      if (matches.length > 1) {
        setSaving(false);
        return toast.error(`Multiple users match "${uname}". Please be more specific.`);
      }
      ownerUserId = matches[0].id;
    } else if (editingId) {
      // explicitly cleared -> unassign
      ownerUserId = null;
    }

    const payload: Record<string, any> = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      long_description: form.long_description.trim() || null,
      version: form.version.trim() || null,
      author: form.author.trim() || null,
      download_url: form.download_url.trim() || null,
      icon_url: form.icon_url.trim() || null,
      category: form.category.trim() || null,
      platform: form.platform.trim() || null,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      featured: form.featured,
      published: form.published,
      jar_path: form.jar_path || null,
      jar_filename: form.jar_filename || null,
      jar_size: form.jar_size || null,
      screenshots: form.screenshots,
    };
    if (ownerUserId !== undefined) payload.user_id = ownerUserId;

    const { data: auth } = await supabase.auth.getUser();
    const insertPayload = {
      ...payload,
      user_id: ownerUserId !== undefined ? ownerUserId : auth.user?.id ?? null,
    };
    const { error } = editingId
      ? await (supabase.from("plugins") as any).update(payload).eq("id", editingId)
      : await (supabase.from("plugins") as any).insert(insertPayload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editingId ? "Plugin updated" : "Plugin added");
    reset();
    load();
  };

  const remove = async (id: string) => {
    if (!(await confirm({ title: "Delete plugin?", description: "This plugin will be permanently deleted.", confirmText: "Delete", destructive: true }))) return;
    const target = plugins.find((p) => p.id === id);
    if (target?.jar_path) {
      await supabase.storage.from("plugin-jars").remove([target.jar_path]);
    }
    const { error } = await supabase.from("plugins").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Plugin deleted");
    if (editingId === id) reset();
    load();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold flex items-center gap-2">
            <Puzzle className="h-4 w-4" /> {editingId ? "Edit plugin" : "Add plugin"}
          </h2>
          {editingId && (
            <Button size="sm" variant="ghost" onClick={reset}>
              Cancel
            </Button>
          )}
        </div>
        <div className="space-y-3">
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Version</Label>
              <Input
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
                placeholder="1.0.0"
              />
            </div>
            <div>
              <Label>Author</Label>
              <Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Assign to user (username)</Label>
            <Input
              value={form.owner_username}
              onChange={(e) => setForm({ ...form, owner_username: e.target.value })}
              placeholder="Their display name or Minecraft username"
            />
            <p className="text-xs text-muted-foreground mt-1">
              The plugin will appear in this user's /dashboard. Leave blank to keep it admin-owned.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Economy, PvP, ..."
              />
            </div>
            <div>
              <Label>Platform</Label>
              <Input
                value={form.platform}
                onChange={(e) => setForm({ ...form, platform: e.target.value })}
                placeholder="Bukkit, Spigot, Paper"
              />
            </div>
          </div>
          <div>
            <Label>Short description</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <Label>Long description</Label>
            <Textarea
              rows={5}
              value={form.long_description}
              onChange={(e) => setForm({ ...form, long_description: e.target.value })}
            />
          </div>
          <div className="space-y-2 rounded-lg border border-border bg-secondary/30 p-3">
            <Label>Icon</Label>
            {form.icon_url ? (
              <div className="flex items-center gap-3 rounded-md bg-background p-2 border border-border">
                <img src={form.icon_url} alt="" className="h-12 w-12 rounded object-cover border border-border" />
                <div className="flex-1 min-w-0 text-xs text-muted-foreground truncate font-mono">{form.icon_url}</div>
                <Button asChild size="sm" variant="outline">
                  <label className="cursor-pointer">
                    Replace
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        onIconSelected(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </Button>
                <Button size="sm" variant="ghost" onClick={removeIcon}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button asChild variant="outline" disabled={uploadingIcon} className="w-full">
                <label className="cursor-pointer">
                  {uploadingIcon ? "Uploading..." : "Upload icon (.png)"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      onIconSelected(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
              </Button>
            )}
            <p className="text-xs text-muted-foreground">PNG, JPG, or WebP. Square images look best.</p>
          </div>
          <div className="space-y-2 rounded-lg border border-border bg-secondary/30 p-3">
            <Label>Plugin JAR file</Label>
            {form.jar_filename ? (
              <div className="flex items-center justify-between gap-2 rounded-md bg-background px-3 py-2 border border-border">
                <div className="min-w-0">
                  <div className="text-sm font-mono truncate">{form.jar_filename}</div>
                  <div className="text-xs text-muted-foreground">{formatBytes(form.jar_size)}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button asChild size="sm" variant="outline">
                    <label className="cursor-pointer">
                      Replace
                      <input
                        type="file"
                        accept=".jar,application/java-archive"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && onJarSelected(e.target.files[0])}
                      />
                    </label>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={removeJar}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <Button asChild variant="outline" disabled={uploading} className="w-full">
                <label className="cursor-pointer">
                  {uploading ? "Uploading..." : "Upload .jar file"}
                  <input
                    type="file"
                    accept=".jar,application/java-archive"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && onJarSelected(e.target.files[0])}
                  />
                </label>
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Max 100 MB. The download URL is filled automatically when you upload.
            </p>
            <div className="text-xs font-mono text-primary/80 pt-1">
              Download filename:{" "}
              {(() => {
                const sanitize = (s: string) => s.trim().replace(/\s+/g, "-");
                const parts = [
                  sanitize(form.name) || "Plugin",
                  sanitize(form.platform) || "Platform",
                  sanitize(form.version) || "Version",
                ];
                return `${parts.join("-")}.jar`;
              })()}
            </div>
          </div>
          <div className="space-y-2 rounded-lg border border-border bg-secondary/30 p-3">
            <Label>Screenshots</Label>
            {form.screenshots.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {form.screenshots.map((url) => (
                  <div key={url} className="relative group">
                    <img src={url} alt="" className="w-full h-20 object-cover rounded border border-border" />
                    <button
                      type="button"
                      onClick={() => removeScreenshot(url)}
                      className="absolute top-1 right-1 bg-background/90 border border-border rounded p-1 opacity-0 group-hover:opacity-100 transition"
                      aria-label="Remove screenshot"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <Button asChild variant="outline" disabled={uploadingShot} className="w-full">
              <label className="cursor-pointer">
                {uploadingShot ? "Uploading..." : "Upload screenshots (.png)"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    onScreenshotsSelected(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            </Button>
            <p className="text-xs text-muted-foreground">PNG, JPG, or WebP. You can upload multiple at once.</p>
          </div>
          <div>
            <Label>Tags (comma separated)</Label>
            <Input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="pvp, economy"
            />
          </div>
          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} />
              Featured
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
              Published
            </label>
          </div>
          <Button onClick={submit} disabled={saving} className="w-full">
            <Plus className="h-4 w-4 mr-1" /> {editingId ? "Save changes" : "Add plugin"}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-bold mb-4">All plugins ({plugins.length})</h2>
        <div className="space-y-2 max-h-[700px] overflow-y-auto">
          {plugins.length === 0 && <p className="text-sm text-muted-foreground">No plugins yet.</p>}
          {plugins.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-secondary/40">
              <div className="flex items-center gap-3 min-w-0">
                {p.icon_url ? (
                  <img src={p.icon_url} alt="" className="h-9 w-9 rounded object-cover border border-border" />
                ) : (
                  <div className="h-9 w-9 rounded bg-primary/10 border border-primary/30 flex items-center justify-center">
                    <Puzzle className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-medium truncate flex items-center gap-2">
                    {p.name}
                    {!p.published && (
                      <Badge variant="outline" className="text-xs">
                        draft
                      </Badge>
                    )}
                    {p.featured && <Badge className="text-xs">featured</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    #{p.short_id}
                    {p.version ? ` · v${p.version}` : ""}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => startEdit(p)}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(p.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Admin;

// ============= Changelog Tab =============
type ChangelogRow = {
  id: string;
  title: string;
  content: string;
  category: string;
  version: string | null;
  entry_date: string;
  published: boolean;
  created_at: string;
};

const CHANGELOG_CATS = ["server", "feature", "update", "fix", "balance", "security", "addition"];
const emptyChangelog = {
  id: "",
  title: "",
  content: "",
  category: "",
  version: "",
  entry_date: new Date().toISOString().slice(0, 10),
  published: true,
};

const ChangelogTab = () => {
  const [items, setItems] = useState<ChangelogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<typeof emptyChangelog | null>(null);
  const [saving, setSaving] = useState(false);
  const [testFor, setTestFor] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [broadcastingId, setBroadcastingId] = useState<string | null>(null);

  const sendBroadcast = async (entry: ChangelogRow) => {
    if (!entry.published) {
      toast.error("Publish the entry before sending to subscribers");
      return;
    }
    if (!(await confirm({
      title: "Send changelog email?",
      description: `This will email "${entry.title}" to every subscribed user on the site. Continue?`,
      confirmText: "Send",
    }))) return;
    setBroadcastingId(entry.id);
    const { data, error } = await supabase.functions.invoke("notify-changelog", {
      body: { entryId: entry.id },
    });
    setBroadcastingId(null);
    if (error) return toast.error(`Send failed: ${error.message}`);
    if (data?.ok) toast.success(`Queued to ${data.queued ?? 0} subscriber${data.queued === 1 ? "" : "s"}`);
    else toast.error(data?.error ?? "Send failed");
  };

  const sendTest = async (entryId: string) => {
    const email = testEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Enter a valid email address");
      return;
    }
    setTestSending(true);
    const { data, error } = await supabase.functions.invoke("notify-changelog", {
      body: { entryId, testEmail: email },
    });
    setTestSending(false);
    if (error) return toast.error(`Test send failed: ${error.message}`);
    if (data?.ok) {
      toast.success(`Test email queued to ${email}`);
      setTestFor(null);
      setTestEmail("");
    } else {
      toast.error(data?.error ?? "Test send failed");
    }
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("changelog_entries")
      .select("*")
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as ChangelogRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!editing) return;
    if (!editing.title.trim() || !editing.content.trim()) {
      toast.error("Title and content are required");
      return;
    }
    setSaving(true);
    const payload = {
      title: editing.title.trim(),
      content: editing.content.trim(),
      category: editing.category,
      version: editing.version.trim() || null,
      entry_date: editing.entry_date,
      published: editing.published,
    };
    const { data: saved, error } = editing.id
      ? await supabase.from("changelog_entries").update(payload).eq("id", editing.id).select("id, published").maybeSingle()
      : await supabase.from("changelog_entries").insert(payload).select("id, published").maybeSingle();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editing.id ? "Entry updated" : "Entry created");

    // Notify all subscribed users when a new published entry is created
    if (!editing.id && saved?.id && saved?.published) {
      supabase.functions
        .invoke("notify-changelog", { body: { entryId: saved.id } })
        .then(({ data, error: ne }) => {
          if (ne) toast.error(`Email notify failed: ${ne.message}`);
          else if (data?.ok) toast.success(`Notified ${data.queued ?? 0} subscriber${data.queued === 1 ? "" : "s"}`);
        });
    }

    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!(await confirm({ title: "Delete entry?", description: "This changelog entry will be permanently deleted.", confirmText: "Delete", destructive: true }))) return;
    const { error } = await supabase.from("changelog_entries").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setEditing({ ...emptyChangelog })}>
          <Plus className="h-4 w-4 mr-1" /> New entry
        </Button>
      </div>

      {editing && (
        <Card className="p-6 space-y-4 border-primary/40">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Title</Label>
              <Input
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder="Added new boss arena"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHANGELOG_CATS.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Version (optional)</Label>
              <Input
                value={editing.version}
                onChange={(e) => setEditing({ ...editing, version: e.target.value })}
                placeholder="1.2.0"
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={editing.entry_date}
                onChange={(e) => setEditing({ ...editing, entry_date: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Content</Label>
            <Textarea
              value={editing.content}
              onChange={(e) => setEditing({ ...editing, content: e.target.value })}
              rows={6}
              placeholder="Describe what changed..."
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={editing.published} onCheckedChange={(v) => setEditing({ ...editing, published: v })} />
            <Label className="m-0">Published</Label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </Card>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">No changelog entries yet.</Card>
      ) : (
        <div className="space-y-2">
          {items.map((e) => (
            <Card key={e.id} className="p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant="outline" className="capitalize">{e.category}</Badge>
                    {e.version && (
                      <Badge variant="secondary" className="font-mono">v{e.version}</Badge>
                    )}
                    {!e.published && (
                      <Badge variant="outline" className="text-muted-foreground">Draft</Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(e.entry_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="font-display font-bold">{e.title}</div>
                  <p className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap">{e.content}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setTestFor(testFor === e.id ? null : e.id);
                      setTestEmail("");
                    }}
                    title="Send a test notification email"
                  >
                    <Mail className="h-4 w-4 mr-1" /> Test
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => sendBroadcast(e)}
                    disabled={broadcastingId === e.id || !e.published}
                    title={e.published ? "Email this entry to all subscribers" : "Publish the entry first"}
                  >
                    <Mail className="h-4 w-4 mr-1" />
                    {broadcastingId === e.id ? "Sending…" : "Send Changelog"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setEditing({
                        id: e.id,
                        title: e.title,
                        content: e.content,
                        category: e.category,
                        version: e.version ?? "",
                        entry_date: e.entry_date,
                        published: e.published,
                      })
                    }
                  >
                    Edit
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(e.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>

              {testFor === e.id && (
                <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-end gap-2">
                  <div className="flex-1 min-w-[220px]">
                    <Label className="text-xs">Send test notification to</Label>
                    <Input
                      type="email"
                      autoFocus
                      placeholder="you@example.com"
                      value={testEmail}
                      onChange={(ev) => setTestEmail(ev.target.value)}
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter") sendTest(e.id);
                      }}
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Sends a one-off "[TEST]" email from updates@warden.rip. Bypasses subscriber list and suppression.
                      {!e.published && " Works on drafts too."}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => sendTest(e.id)} disabled={testSending}>
                    {testSending ? "Sending…" : "Send test"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setTestFor(null);
                      setTestEmail("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// ============= Applications Tab =============
type ApplicationRow = {
  id: string;
  user_id: string;
  type: "staff" | "builder" | "youtuber";
  status: "pending" | "approved" | "rejected" | "reviewed";
  mc_username: string;
  discord: string | null;
  age: number | null;
  timezone: string | null;
  experience: string | null;
  why: string;
  portfolio_url: string | null;
  reviewer_notes: string | null;
  created_at: string;
};

type EmailLogRow = {
  id: string;
  message_id: string | null;
  template_name: string | null;
  recipient_email: string | null;
  status: string | null;
  error_message: string | null;
  created_at: string;
};

const ApplicationEmailLog = () => {
  const [rows, setRows] = useState<EmailLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("email_send_log")
      .select("id, message_id, template_name, recipient_email, status, error_message, created_at")
      .like("template_name", "application-%")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) toast.error(error.message);
    // Deduplicate by message_id, keep latest status
    const seen = new Set<string>();
    const deduped: EmailLogRow[] = [];
    for (const r of (data as EmailLogRow[]) ?? []) {
      const key = r.message_id ?? r.id;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(r);
    }
    setRows(deduped);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const statusCls = (s: string | null) => {
    if (s === "sent") return "text-emerald-400 border-emerald-400/40";
    if (s === "dlq" || s === "failed" || s === "bounced") return "text-destructive border-destructive/40";
    if (s === "suppressed" || s === "complained") return "text-amber-400 border-amber-400/40";
    return "text-muted-foreground border-border";
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          <div className="font-display font-bold">Application email delivery log</div>
        </div>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Latest status per email (deduplicated). Shows the most recent 100 application-related sends.
      </p>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">No application emails yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="text-left border-b">
                <th className="py-2 pr-3 font-medium">When</th>
                <th className="py-2 pr-3 font-medium">Template</th>
                <th className="py-2 pr-3 font-medium">Recipient</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">Error</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/50">
                  <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="py-2 pr-3">{r.template_name}</td>
                  <td className="py-2 pr-3">{r.recipient_email}</td>
                  <td className="py-2 pr-3">
                    <Badge variant="outline" className={statusCls(r.status)}>{r.status ?? "—"}</Badge>
                  </td>
                  <td className="py-2 pr-3 text-destructive max-w-xs truncate" title={r.error_message ?? ""}>
                    {r.error_message ?? ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

const ApplicationsTab = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected" | "reviewed">("pending");
  const [open, setOpen] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [testEmail, setTestEmail] = useState<string>("");
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email && !testEmail) setTestEmail(user.email);
  }, [user, testEmail]);

  const sendTest = async (kind: "received" | "status" | "admin") => {
    const recipient = testEmail.trim();
    if (!recipient) return toast.error("Enter a recipient email");
    setTesting(kind);
    const stamp = Date.now();
    const common = {
      mcUsername: "TestPlayer",
      applicationType: "builder",
      discord: "tester#0001",
      age: 18,
      timezone: "UTC",
      experience: "Test experience entry to verify the template renders correctly.",
      why: "This is a test application body to verify the email template renders correctly.",
      portfolioUrl: "https://example.com/portfolio",
    };
    let templateName: string;
    let templateData: Record<string, unknown>;
    if (kind === "received") {
      templateName = "application-received";
      templateData = common;
    } else if (kind === "status") {
      templateName = "application-status";
      templateData = {
        ...common,
        status: "approved",
        reviewerNotes: "Thanks for applying — this is a test status update.",
        dashboardUrl: `${window.location.origin}/dashboard`,
      };
    } else {
      templateName = "application-admin";
      templateData = {
        ...common,
        adminUrl: `${window.location.origin}/admin?tab=applications`,
      };
    }
    const { error } = await supabase.functions.invoke("send-app-email", {
      body: {
        templateName,
        recipientEmail: recipient,
        idempotencyKey: `test-${templateName}-${stamp}`,
        from: "Warden Network Applications <applications@warden.rip>",
        templateData,
      },
    });
    setTesting(null);
    if (error) return toast.error(error.message ?? "Failed to send test email");
    toast.success(`Test "${templateName}" queued to ${recipient}`);
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("applications")
      .select(
        "id, user_id, type, status, mc_username, discord, age, timezone, experience, why, portfolio_url, extra, reviewed_by, reviewed_at, created_at, updated_at"
      )
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    const rows = ((data as any[]) ?? []).map((r) => ({ ...r, reviewer_notes: null })) as ApplicationRow[];
    if (rows.length) {
      const { data: notes } = await (supabase.rpc as any)("admin_get_application_notes", {
        _ids: rows.map((r) => r.id),
      });
      const map = new Map<string, string | null>(((notes as any[]) ?? []).map((n) => [n.id, n.reviewer_notes]));
      for (const r of rows) r.reviewer_notes = map.get(r.id) ?? null;
    }
    setItems(rows);
    setLoading(false);
  };


  useEffect(() => {
    load();
  }, []);

  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);

  const decide = async (id: string, status: "approved" | "rejected" | "reviewed") => {
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    const app = items.find((i) => i.id === id);
    const { error } = await supabase
      .from("applications")
      .update({
        status: status as any,
        reviewer_notes: notes || null,
        reviewed_by: u?.id ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Application ${status}`);

    if (status === "approved" && app?.user_id) {
      const ROLE_MAP: Record<string, string> = {
        staff: "helper",
        creator: "media",
        admin: "admin",
        developer: "developer",
        builder: "builder",
      };
      const role = ROLE_MAP[String(app.type)];
      if (role) {
        const { error: roleErr } = await supabase
          .from("user_roles")
          .upsert({ user_id: app.user_id, role: role as any }, { onConflict: "user_id,role" });
        if (roleErr) {
          toast.error(`Role assign failed: ${roleErr.message}`);
        } else {
          toast.success(`Granted ${role} role`);
          supabase.functions.invoke("discord-sync-user-roles", {
            body: { user_id: app.user_id },
          }).catch(() => {});
        }
      }
    }

    supabase.functions.invoke("send-application-status-email", {
      body: {
        applicationId: id,
        status,
        reviewerNotes: notes || null,
        dashboardUrl: `${window.location.origin}/dashboard`,
      },
    }).catch(() => {});
    setOpen(null);
    setNotes("");
    load();
  };


  const remove = async (id: string) => {
    if (!(await confirm({ title: "Delete application?", description: "This application will be permanently deleted.", confirmText: "Delete", destructive: true }))) return;
    const { error } = await supabase.from("applications").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const statusCls = (s: ApplicationRow["status"]) =>
    s === "approved"
      ? "text-emerald-400 border-emerald-400/40"
      : s === "rejected"
        ? "text-destructive border-destructive/40"
        : s === "reviewed"
          ? "text-sky-400 border-sky-400/40"
          : "text-amber-400 border-amber-400/40";

  return (
    <div className="space-y-6">
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          <div className="font-display font-bold">Test application email hooks</div>
        </div>
        <p className="text-xs text-muted-foreground">
          Sends a sample of each application email template to the address below. Uses the live email queue — check your inbox (and spam) to confirm delivery.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="email"
            placeholder="recipient@example.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="flex-1"
          />
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" disabled={!!testing} onClick={() => sendTest("received")}>
              {testing === "received" ? <Loader2 className="h-3 w-3 animate-spin" /> : "New application"}
            </Button>
            <Button size="sm" variant="outline" disabled={!!testing} onClick={() => sendTest("status")}>
              {testing === "status" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Status change"}
            </Button>
            <Button size="sm" variant="outline" disabled={!!testing} onClick={() => sendTest("admin")}>
              {testing === "admin" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Admin alert"}
            </Button>
          </div>
        </div>
      </Card>

      <ApplicationEmailLog />

      <ApplicationStatusEmailEditor />





      <div className="flex flex-wrap gap-2">
        {(["all", "pending", "reviewed", "approved", "rejected"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f} {f !== "all" && `(${items.filter((i) => i.status === f).length})`}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">No applications.</Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const isOpen = open === a.id;
            return (
              <Card key={a.id} className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="outline" className="capitalize">
                        {a.type}
                      </Badge>
                      <Badge variant="outline" className={statusCls(a.status)}>
                        {a.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
                    </div>
                    <div className="font-display font-bold">{a.mc_username}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.discord && <>Discord: {a.discord} · </>}
                      {a.age && <>Age: {a.age} · </>}
                      {a.timezone && <>TZ: {a.timezone}</>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setOpen(isOpen ? null : a.id);
                        setNotes(a.reviewer_notes ?? "");
                      }}
                    >
                      {isOpen ? "Close" : "Review"}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(a.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-4 space-y-4 border-t pt-4">
                    {a.experience && (
                      <div>
                        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Experience</div>
                        <p className="text-sm whitespace-pre-wrap">{a.experience}</p>
                      </div>
                    )}
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Why</div>
                      <p className="text-sm whitespace-pre-wrap">{a.why}</p>
                    </div>
                    {a.portfolio_url && (
                      <div>
                        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Portfolio</div>
                        <a
                          href={a.portfolio_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary underline break-all"
                        >
                          {a.portfolio_url}
                        </a>
                      </div>
                    )}
                    <div>
                      <Label>Reviewer notes</Label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        placeholder="Internal notes..."
                      />
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button variant="secondary" onClick={() => decide(a.id, "reviewed")}>
                        Mark reviewed
                      </Button>
                      <Button variant="outline" onClick={() => decide(a.id, "rejected")}>
                        Reject
                      </Button>
                      <Button onClick={() => decide(a.id, "approved")}>Approve</Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

const AlertsTab = () => {
  const [settings, setSettings] = useState({
    webhook_urls: [] as string[],
    email_recipients: [] as string[],
    down_payload_template: null as any,
    up_payload_template: null as any,
  });
  const [webhookInput, setWebhookInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [downJson, setDownJson] = useState("");
  const [upJson, setUpJson] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewKind, setPreviewKind] = useState<"down" | "up">("down");
  const [previewPayload, setPreviewPayload] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [previewButtonsDetected, setPreviewButtonsDetected] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  const sampleVars: Record<string, string> = {
    service_name: "Minecraft Server",
    service_key: "minecraft",
    status: "DOWN",
    uptime_window: "99.42%",
    incident_duration: "12m 34s",
    error: "Connection timeout after 10s",
    timestamp: new Date().toISOString(),
  };

  const interpolateTemplate = (template: unknown, vars: Record<string, string>): unknown => {
    if (typeof template === "string") {
      return template.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) => vars[key] ?? `{{${key}}}`);
    }
    if (Array.isArray(template)) {
      return template.map((item) => interpolateTemplate(item, vars));
    }
    if (template && typeof template === "object") {
      const obj: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(template as Record<string, unknown>)) {
        obj[k] = interpolateTemplate(v, vars);
      }
      return obj;
    }
    return template;
  };

  const buildPreview = (kind: "down" | "up") => {
    const jsonStr = kind === "down" ? downJson : upJson;
    const vars = {
      ...sampleVars,
      status: kind === "down" ? "DOWN" : "UP",
      error: kind === "down" ? sampleVars.error : "",
    };
    let template: unknown;
    if (jsonStr.trim()) {
      try { template = JSON.parse(jsonStr); } catch { toast.error(`${kind} payload JSON is invalid`); return; }
    } else {
      // Default fallback matching edge function
      template = {
        username: "Uptime Monitor",
        embeds: [{
          title: kind === "down" ? `🔴 {{service_name}} is DOWN` : `🟢 {{service_name}} recovered`,
          description: kind === "down"
            ? `Service has failed multiple consecutive checks.\n**Uptime (24h):** {{uptime_window}}\n**Error:** {{error}}`
            : `Service is responding successfully again.\n**Uptime (24h):** {{uptime_window}}\n**Incident lasted:** {{incident_duration}}`,
          color: kind === "down" ? 0xef4444 : 0x22c55e,
          timestamp: "{{timestamp}}",
        }],
      };
    }
    const payload = interpolateTemplate(template, vars);
    setPreviewPayload(JSON.stringify(payload, null, 2));
    setPreviewKind(kind);
    setPreviewOpen(true);
  };

  const sendTestWebhook = async () => {
    const urls = webhookInput.split(/\n+/).map((s) => s.trim()).filter((s) => /^https?:\/\//i.test(s));
    if (urls.length === 0) {
      toast.error("No valid webhook URLs configured");
      return;
    }
    setSendingTest(true);
    try {
      const results = await Promise.allSettled(
        urls.map(async (url) => {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: previewPayload,
          });
          return { url, ok: res.ok, status: res.status };
        })
      );
      const successes = results.filter((r) => r.status === "fulfilled" && r.value.ok).length;
      const failures = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok)).length;
      if (failures === 0) {
        toast.success(`Test ${previewKind} sent to all ${successes} webhook(s)`);
      } else {
        toast.error(`${failures} of ${urls.length} webhooks failed — check console for details`);
        for (const r of results) {
          if (r.status === "rejected") {
            console.error("Webhook failed:", r.reason);
          } else if (!r.value.ok) {
            console.error("Webhook returned error:", r.value.url, r.value.status);
          }
        }
      }
    } catch (e: any) {
      toast.error(e.message ?? "Webhook request failed");
    } finally {
      setSendingTest(false);
    }
  };

  useEffect(() => {
    supabase
      .from("alert_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSettings({
            webhook_urls: data.webhook_urls ?? [],
            email_recipients: data.email_recipients ?? [],
            down_payload_template: data.down_payload_template,
            up_payload_template: data.up_payload_template,
          });
          setWebhookInput((data.webhook_urls ?? []).join("\n"));
          setEmailInput((data.email_recipients ?? []).join("\n"));
          setDownJson(data.down_payload_template ? JSON.stringify(data.down_payload_template, null, 2) : "");
          setUpJson(data.up_payload_template ? JSON.stringify(data.up_payload_template, null, 2) : "");
        }
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (cardRef.current) {
        const buttons = cardRef.current.querySelectorAll('button');
        const hasPreview = Array.from(buttons).some((b) => b.textContent?.includes('Preview'));
        setPreviewButtonsDetected(hasPreview);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [loading]);

  const save = async () => {
    let downTemplate: object | null = null;
    let upTemplate: object | null = null;
    if (downJson.trim()) {
      try { downTemplate = JSON.parse(downJson); } catch { toast.error("Down payload JSON is invalid"); return; }
    }
    if (upJson.trim()) {
      try { upTemplate = JSON.parse(upJson); } catch { toast.error("Up payload JSON is invalid"); return; }
    }
    setSaving(true);
    const urls = webhookInput.split(/\n+/).map((s) => s.trim()).filter((s) => /^https?:\/\//i.test(s));
    const emails = emailInput.split(/\n+/).map((s) => s.trim()).filter((s) => /^[^\s@]+@[^\s@\.]+\.[^\s@]+$/i.test(s));
    const { error } = await supabase
      .from("alert_settings")
      .upsert({
        id: 1,
        webhook_urls: urls,
        email_recipients: emails,
        down_payload_template: downTemplate,
        up_payload_template: upTemplate,
      } as any);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Alert settings saved");
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <h2 className="font-bold flex items-center gap-2">
          <Bell className="h-4 w-4" /> Alert Recipients
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Webhook URLs (one per line)</Label>
            <Textarea
              value={webhookInput}
              onChange={(e) => setWebhookInput(e.target.value)}
              rows={4}
              placeholder="https://discord.com/api/webhooks/..."
            />
            <p className="text-xs text-muted-foreground mt-1">Each URL gets the payload in parallel.</p>
          </div>
          <div>
            <Label>Email Recipients (one per line)</Label>
            <Textarea
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              rows={4}
              placeholder="admin@example.com"
            />
            <p className="text-xs text-muted-foreground mt-1">Email delivery requires a verified domain.</p>
          </div>
        </div>
      </Card>

      <Card className="p-6 space-y-4" ref={cardRef}>
        <h2 className="font-bold flex items-center gap-2">
          <Code className="h-4 w-4" /> Custom Payload Templates
        </h2>
        <p className="text-sm text-muted-foreground">
          Override the default Discord embed payload. Use <code className="text-xs bg-secondary px-1 rounded">{"{{variable}}"}</code> placeholders.
          Available variables: <code className="text-xs bg-secondary px-1 rounded">service_name</code>,{" "}
          <code className="text-xs bg-secondary px-1 rounded">service_key</code>,{" "}
          <code className="text-xs bg-secondary px-1 rounded">status</code>,{" "}
          <code className="text-xs bg-secondary px-1 rounded">uptime_window</code>,{" "}
          <code className="text-xs bg-secondary px-1 rounded">incident_duration</code>,{" "}
          <code className="text-xs bg-secondary px-1 rounded">error</code>,{" "}
          <code className="text-xs bg-secondary px-1 rounded">timestamp</code>.
          Leave empty to use the default Discord embed format.
        </p>
        {!previewButtonsDetected && (
          <div className="rounded-lg border border-dashed border-destructive/40 p-4 bg-destructive/10 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Preview buttons not detected
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                The page may be cached. Try a hard reload to load the latest version.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Reload page
            </Button>
          </div>
        )}
        <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4 bg-secondary/20">
          <p className="text-sm font-medium">Troubleshooting: Preview buttons not showing?</p>
          <ul className="text-xs text-muted-foreground list-disc list-inside mt-1 space-y-0.5">
            <li>Make sure you are viewing the latest version — hard refresh the page (Cmd/Ctrl+Shift+R).</li>
            <li>Ensure at least one webhook URL is configured above so the test has a destination.</li>
            <li>If the entire Alerts tab is blank, check that you are signed in as an admin.</li>
          </ul>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Down Payload (JSON)</Label>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => buildPreview("down")}>
                  <Eye className="h-3.5 w-3.5 mr-1" /> Preview
                </Button>
              </div>
            </div>
            <Textarea
              value={downJson}
              onChange={(e) => setDownJson(e.target.value)}
              rows={12}
              placeholder={JSON.stringify({
                username: "Uptime Monitor",
                embeds: [{
                  title: "🔴 {{service_name}} is DOWN",
                  description: "Uptime (24h): {{uptime_window}}\nDuration: {{incident_duration}}\nError: {{error}}",
                  color: 0xef4444,
                  timestamp: "{{timestamp}}",
                }],
              }, null, 2)}
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Up Payload (JSON)</Label>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => buildPreview("up")}>
                  <Eye className="h-3.5 w-3.5 mr-1" /> Preview
                </Button>
              </div>
            </div>
            <Textarea
              value={upJson}
              onChange={(e) => setUpJson(e.target.value)}
              rows={12}
              placeholder={JSON.stringify({
                username: "Uptime Monitor",
                embeds: [{
                  title: "🟢 {{service_name}} recovered",
                  description: "Uptime (24h): {{uptime_window}}\nIncident lasted: {{incident_duration}}",
                  color: 0x22c55e,
                  timestamp: "{{timestamp}}",
                }],
              }, null, 2)}
              className="font-mono text-xs"
            />
          </div>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving || loading}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
        {loading && <span className="text-sm text-muted-foreground">Loading...</span>}
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              {previewKind === "down" ? "Down Alert Preview" : "Up Alert Preview"}
            </DialogTitle>
            <DialogDescription>
              Exact payload that will be sent to all configured webhooks.
            </DialogDescription>
          </DialogHeader>
          <pre className="bg-secondary/40 rounded-lg p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
            {previewPayload}
          </pre>
          <DialogFooter className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
            <Button onClick={sendTestWebhook} disabled={sendingTest}>
              <Play className="h-3.5 w-3.5 mr-1" />
              {sendingTest ? "Sending..." : "Send Test to All Webhooks"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
