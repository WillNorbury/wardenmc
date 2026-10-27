import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { roleLabel } from "@/lib/roles";
import { toast } from "sonner";
import {
  ClipboardList,
  ExternalLink,
  FileText,
  Flame,
  LifeBuoy,
  Link2,
  Loader2,
  ShieldCheck,
  Trophy,
  User as UserIcon,
  Vote as VoteIcon,
} from "lucide-react";
import MyPluginsPanel from "@/components/dashboard/MyPluginsPanel";
import MySkriptsPanel from "@/components/dashboard/MySkriptsPanel";
import MyServersPanel from "@/components/dashboard/MyServersPanel";
import MyFavoritePluginsPanel from "@/components/dashboard/MyFavoritePluginsPanel";
import OrganizationsCard from "@/components/site/OrganizationsCard";
import AffiliatesCard from "@/components/site/AffiliatesCard";
import MembershipTiersSection from "@/components/site/MembershipTiersSection";

type Streaks = {
  login_streak: number;
  login_best: number;
  total_logins: number;
  vote_streak: number;
  vote_best: number;
  total_votes: number;
  last_vote_date: string | null;
};

type Application = {
  id: string;
  type: string;
  status: string;
  created_at: string;
};

const quickLinks = [
  { to: "/support", label: "Player Support Centre" },
  { to: "/applications", label: "My applications" },
  { to: "/changelog", label: "Changelog" },
  { to: "/community", label: "Community hub" },
  { to: "/servers", label: "Server directory" },
  { to: "/status", label: "Network status" },
  { to: "/rules", label: "Rules" },
  { to: "/profile", label: "Profile & appearance" },
];

const statusTone = (status: string) =>
  status === "approved"
    ? "border-emerald-400/40 text-emerald-400"
    : status === "rejected"
      ? "border-destructive/40 text-destructive"
      : "border-amber-400/40 text-amber-400";

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [mcUsername, setMcUsername] = useState("");
  const [savedMc, setSavedMc] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [tickets, setTickets] = useState(0);
  const [streaks, setStreaks] = useState<Streaks | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = "Dashboard — WardenMC";
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    (async () => {
      const [{ data: profile }, builtIn, custom, { data: applications }, { count: ticketCount }, streakRow] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("display_name, mc_username, avatar_url")
            .eq("id", user.id)
            .maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", user.id),
          supabase.from("user_custom_roles").select("role_key").eq("user_id", user.id),
          supabase
            .from("applications")
            .select("id, type, status, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("support_tickets")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabase.rpc("record_login_streak"),
        ]);
      setDisplayName(profile?.display_name ?? "");
      setAvatarUrl(profile?.avatar_url ?? "");
      setMcUsername(profile?.mc_username ?? "");
      setSavedMc(profile?.mc_username ?? "");
      setRoles([
        ...((builtIn?.data ?? []) as { role: string }[]).map((row) => row.role),
        ...((custom?.data ?? []) as { role_key: string }[]).map((row) => row.role_key),
      ]);
      setApps((applications ?? []) as Application[]);
      setTickets(ticketCount ?? 0);
      if (streakRow?.data) setStreaks(streakRow.data as unknown as Streaks);
      setLoading(false);
    })();
  }, [user, authLoading, navigate]);

  const linkAccount = async () => {
    if (!user) return;
    const trimmed = mcUsername.trim();
    if (!/^[A-Za-z0-9_]{3,16}$/.test(trimmed)) {
      toast.error("Invalid Minecraft username (3-16 chars, letters/numbers/underscore)");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ mc_username: trimmed }).eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSavedMc(trimmed);
    toast.success("Minecraft account linked");
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="flex flex-1 items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading your dashboard…</span>
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) return null;

  const initials = (displayName || user.email || "?").slice(0, 2).toUpperCase();
  const avatarSrc = avatarUrl || (savedMc ? `https://mc-heads.net/avatar/${savedMc}/128` : undefined);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <header className="container max-w-5xl pt-32 pb-10">
          <p className="mb-3 text-sm font-semibold text-primary">WARDENMC</p>
          <h1 className="font-display text-5xl sm:text-6xl">
            Dash<span className="text-gradient">board</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Your account, applications and uploads in one place.
          </p>
        </header>

        <div className="container max-w-5xl pb-16">
          <MembershipTiersSection className="mb-8" title="Upgrade your membership" subtitle="Unlock perks in-game and support the network." />

          <Card className="mb-6 flex flex-wrap items-center gap-5 p-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarSrc} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="font-display truncate text-xl font-bold">{displayName || user.email}</div>
              <div className="font-mono truncate text-xs text-muted-foreground">{user.email}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {roles.length === 0 && <span className="text-xs text-muted-foreground">Member</span>}
                {roles.map((role) => (
                  <Badge key={role} variant="secondary">
                    {roleLabel(role)}
                  </Badge>
                ))}
              </div>
            </div>
            <Button asChild variant="outline">
              <Link to="/profile">
                <UserIcon className="mr-1 h-4 w-4" /> Edit profile
              </Link>
            </Button>
          </Card>

          {streaks && (
            <Card className="mb-6 p-6">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Flame className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-bold">Streaks</h2>
                <p className="ml-2 text-xs text-muted-foreground">Visit daily and vote daily to keep them alive.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                    <Flame className="h-3.5 w-3.5 text-primary" /> Login streak
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-4xl font-black text-primary">{streaks.login_streak}</span>
                    <span className="text-sm text-muted-foreground">
                      day{streaks.login_streak === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Trophy className="h-3 w-3" /> Best {streaks.login_best}
                    </span>
                    <span>•</span>
                    <span>{streaks.total_logins} total</span>
                  </div>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                    <VoteIcon className="h-3.5 w-3.5 text-primary" /> Vote streak
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-4xl font-black text-primary">{streaks.vote_streak}</span>
                    <span className="text-sm text-muted-foreground">
                      day{streaks.vote_streak === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Trophy className="h-3 w-3" /> Best {streaks.vote_best}
                    </span>
                    <span>•</span>
                    <span>{streaks.total_votes} total</span>
                  </div>
                </div>
              </div>
            </Card>
          )}

          <Card className="mb-6 p-6">
            <div className="mb-1 flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-bold">Link Minecraft account</h2>
              {savedMc && (
                <Badge variant="outline" className="ml-2 border-emerald-400/40 text-emerald-400">
                  Linked
                </Badge>
              )}
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Add your in-game username so your skin avatar shows across the site.
            </p>
            <div className="grid max-w-xl items-end gap-2 sm:grid-cols-[1fr_auto]">
              <div>
                <Label htmlFor="mc-username">Minecraft username</Label>
                <Input
                  id="mc-username"
                  value={mcUsername}
                  onChange={(event) => setMcUsername(event.target.value)}
                  placeholder="Notch"
                  maxLength={16}
                />
              </div>
              <Button onClick={() => void linkAccount()} disabled={saving || mcUsername.trim() === savedMc}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {savedMc ? "Update" : "Link"}
              </Button>
            </div>
          </Card>

          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <Card className="p-5">
              <ClipboardList className="mb-2 h-5 w-5 text-primary" />
              <div className="font-display text-2xl font-bold">{apps.length}</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Applications</div>
            </Card>
            <Card className="p-5">
              <LifeBuoy className="mb-2 h-5 w-5 text-primary" />
              <div className="font-display text-2xl font-bold">{tickets}</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Support tickets</div>
            </Card>
            <Card className="p-5">
              <ShieldCheck className="mb-2 h-5 w-5 text-primary" />
              <div className="font-display text-2xl font-bold">{roles.length}</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Roles</div>
            </Card>
          </div>

          <Card className="mb-8 p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold">My applications</h2>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to="/applications">Status</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/apply">New application</Link>
                </Button>
              </div>
            </div>
            {apps.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You haven&apos;t applied yet. Apply to join the staff, build or content creator team.
              </p>
            ) : (
              <div className="space-y-2">
                {apps.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3"
                  >
                    <div className="min-w-0">
                      <div className="font-display font-bold capitalize">{app.type}</div>
                      <div className="text-xs text-muted-foreground">
                        Submitted {new Date(app.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge variant="outline" className={statusTone(app.status)}>
                      {app.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <h2 className="font-display mt-2 mb-3 text-2xl font-black">My stuff</h2>
          <div className="space-y-6">
            <OrganizationsCard userId={user.id} />
            <AffiliatesCard profileId={user.id} isOwn viewerId={user.id} />
            <MyFavoritePluginsPanel userId={user.id} />
            <MyPluginsPanel userId={user.id} />
            <MySkriptsPanel />
            <MyServersPanel />
          </div>

          <Card className="mt-8 p-6">
            <h2 className="font-display mb-4 text-lg font-bold">Quick links</h2>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              {quickLinks.map((link) => (
                <Button key={link.to} asChild variant="outline" className="justify-between">
                  <Link to={link.to}>
                    <span className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5" />
                      {link.label}
                    </span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </Button>
              ))}
            </div>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
