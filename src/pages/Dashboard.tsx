import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MembershipTiersSection from "@/components/site/MembershipTiersSection";
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
import { roleLabel, type AppRole } from "@/lib/roles";
import { toast } from "sonner";
import { Loader2, User as UserIcon, FileText, LifeBuoy, ClipboardList, Link2, ExternalLink, CheckCircle2, Flame, Vote as VoteIcon, Trophy, FileCode, Plus, Puzzle, Boxes } from "lucide-react";
import MyPluginsPanel from "@/components/dashboard/MyPluginsPanel";
import MySkriptsPanel from "@/components/dashboard/MySkriptsPanel";
import MyServersPanel from "@/components/dashboard/MyServersPanel";
import MyFavoritePluginsPanel from "@/components/dashboard/MyFavoritePluginsPanel";
import OrganizationsCard from "@/components/site/OrganizationsCard";

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
  type: "staff" | "builder" | "youtuber";
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [mcUsername, setMcUsername] = useState("");
  const [savedMc, setSavedMc] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [tickets, setTickets] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [streaks, setStreaks] = useState<Streaks | null>(null);

  useEffect(() => {
    document.title = "Warden Network Dashboard";
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    (async () => {
      const [{ data: p }, { data: r }, { data: a }, { count: tc }, { data: streakRow }] = await Promise.all([
        supabase.from("profiles").select("display_name, mc_username").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase
          .from("applications")
          .select("id,type,status,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.rpc("record_login_streak"),
      ]);
      if (!p?.mc_username) {
        navigate("/link-account", { replace: true });
        return;
      }
      setDisplayName(p?.display_name ?? "");
      setMcUsername(p?.mc_username ?? "");
      setSavedMc(p?.mc_username ?? "");
      setRoles(((r ?? []) as { role: AppRole }[]).map((x) => x.role));
      setApps((a as Application[]) ?? []);
      setTickets(tc ?? 0);
      if (streakRow) setStreaks(streakRow as unknown as Streaks);
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
    if (error) return toast.error(error.message);
    setSavedMc(trimmed);
    toast.success("Minecraft account linked");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span>Loading your Warden Network dashboard...</span>
        </div>
        <Footer />
      </div>
    );
  }

  const initials = (displayName || user!.email || "?").slice(0, 2).toUpperCase();
  const statusBadge = (s: Application["status"]) =>
    s === "approved"
      ? "text-emerald-400 border-emerald-400/40"
      : s === "rejected"
      ? "text-destructive border-destructive/40"
      : "text-amber-400 border-amber-400/40";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container pt-28 pb-16 max-w-5xl">
        <header className="mb-8">
          <h1 className="font-display text-4xl md:text-5xl font-black">
            Warden Network<span className="text-gradient">.</span>
          </h1>
          <p className="text-muted-foreground mt-1">Your member dashboard and network activity hub</p>
        </header>

        <MembershipTiersSection className="mb-8" title="Upgrade your membership" subtitle="Unlock perks in-game and support the network." />

        {/* Top: profile summary */}
        <Card className="p-6 mb-6 flex items-center gap-5 flex-wrap">
          <Avatar className="h-20 w-20">
            <AvatarImage src={savedMc ? `https://mc-heads.net/avatar/${savedMc}/128` : undefined} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-xl truncate">{displayName || user!.email}</div>
            <div className="text-xs text-muted-foreground font-mono truncate">{user!.email}</div>
            <div className="flex flex-wrap gap-1 mt-2">
              {roles.length === 0 && <span className="text-xs text-muted-foreground">No roles</span>}
              {roles.map((r) => (
                <Badge key={r} variant="secondary">
                  {roleLabel(r)}
                </Badge>
              ))}
            </div>
          </div>
          <Button asChild variant="outline">
            <Link to="/profile">
              <UserIcon className="h-4 w-4 mr-1" /> Edit profile
            </Link>
          </Button>
        </Card>

        {/* Streaks */}
        {streaks && (
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="h-5 w-5 text-teal-300" />
              <h2 className="font-display font-bold text-lg">Streaks</h2>
              <p className="text-xs text-muted-foreground ml-2">Visit daily and vote daily to keep your streaks alive.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-border/60 bg-gradient-to-br from-teal-500/10 to-transparent">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  <Flame className="h-3.5 w-3.5 text-teal-300" /> Login streak
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-4xl font-black text-teal-200">{streaks.login_streak}</span>
                  <span className="text-sm text-muted-foreground">day{streaks.login_streak === 1 ? "" : "s"}</span>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Trophy className="h-3 w-3" /> Best {streaks.login_best}</span>
                  <span>•</span>
                  <span>{streaks.total_logins} total</span>
                </div>
              </div>
              <div className="p-4 rounded-lg border border-border/60 bg-gradient-to-br from-primary/10 to-transparent">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  <VoteIcon className="h-3.5 w-3.5 text-primary" /> Vote streak
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-4xl font-black text-primary">{streaks.vote_streak}</span>
                  <span className="text-sm text-muted-foreground">day{streaks.vote_streak === 1 ? "" : "s"}</span>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Trophy className="h-3 w-3" /> Best {streaks.vote_best}</span>
                  <span>•</span>
                  <span>{streaks.total_votes} total</span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Link account */}
        <Card className="p-6 mb-6" id="link-account">
          <div className="flex items-center gap-2 mb-1">
            <Link2 className="h-5 w-5 text-primary" />
            <h2 className="font-display font-bold text-lg">Link Minecraft Account</h2>
            {savedMc && (
              <Badge variant="outline" className="text-emerald-400 border-emerald-400/40 ml-2">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Linked
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Link your in-game username to display your skin avatar and unlock account features.
          </p>
          <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end max-w-xl">
            <div>
              <Label htmlFor="mc">Minecraft username</Label>
              <Input
                id="mc"
                value={mcUsername}
                onChange={(e) => setMcUsername(e.target.value)}
                placeholder="Notch"
                maxLength={16}
              />
            </div>
            <Button onClick={linkAccount} disabled={saving || mcUsername.trim() === savedMc}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {savedMc ? "Update" : "Link"}
            </Button>
          </div>
        </Card>

        {/* Quick stats */}
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <Card className="p-5">
            <ClipboardList className="h-5 w-5 text-primary mb-2" />
            <div className="font-display text-2xl font-bold">{apps.length}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Applications</div>
          </Card>
          <Card className="p-5">
            <LifeBuoy className="h-5 w-5 text-primary mb-2" />
            <div className="font-display text-2xl font-bold">{tickets}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Support Tickets</div>
          </Card>
          <Card className="p-5">
            <FileText className="h-5 w-5 text-primary mb-2" />
            <div className="font-display text-2xl font-bold">{roles.length}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Roles</div>
          </Card>
        </div>

        {/* Applications list */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <h2 className="font-display font-bold text-lg">My Applications</h2>
            <Button asChild size="sm">
              <Link to="/apply">New application</Link>
            </Button>
          </div>
          {apps.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You haven't applied yet. Apply to join the staff, build team, or content creator program.
            </p>
          ) : (
            <div className="space-y-2">
              {apps.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/60">
                  <div className="min-w-0">
                    <div className="font-display font-bold capitalize">{a.type}</div>
                    <div className="text-xs text-muted-foreground">
                      Submitted {new Date(a.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge variant="outline" className={statusBadge(a.status)}>
                    {a.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* My Stuff */}
        <h2 className="font-display text-2xl font-black mb-3 mt-2">My Stuff</h2>
        <OrganizationsCard userId={user!.id} />
        <MyFavoritePluginsPanel userId={user!.id} />
        <MyPluginsPanel userId={user!.id} />
        <MySkriptsPanel />
        <MyServersPanel />



        {/* Quick links */}
        <Card className="p-6">
          <h2 className="font-display font-bold text-lg mb-4">Quick Links</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
            {[
              { to: "/tickets", label: "Support Tickets" },
              { to: "/vote", label: "Vote & Earn" },
              { to: "/changelog", label: "Changelog" },
              { to: "/news", label: "News" },
              { to: "/rules", label: "Rules" },
              { to: "/community", label: "Community" },
            ].map((l) => (
              <Button key={l.to} asChild variant="outline" className="justify-between">
                <Link to={l.to}>
                  {l.label} <ExternalLink className="h-3 w-3" />
                </Link>
              </Button>
            ))}
          </div>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
