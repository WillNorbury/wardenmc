import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ALL_ROLES, roleLabel, type AppRole } from "@/lib/roles";
import { matchesUserSlug, userProfileSlug } from "@/lib/userSlug";
import {
  Loader2,
  Package,
  Download,
  Heart,
  Calendar,
  Pencil,
  MoreVertical,
  Globe,
  Flag,
  Link as LinkIcon,
  UserPlus,
  UserCheck,
  Boxes,
  Building2,
  Swords,
  Skull,
  Target,
  Crosshair,
  Trophy,
  Clock,
  Coins,
  Bug,
} from "lucide-react";
import { toast } from "sonner";
import ReportDialog from "@/components/site/ReportDialog";

type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  mc_username: string | null;
  bio: string | null;
  created_at: string;
};

type Project = {
  kind: "mod" | "plugin";
  id: string;
  slug?: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  category: string | null;
  tags: string[];
  likes: number;
  short_id: string;
  updated_at: string | null;
};

type PlayerStats = {
  player_name: string;
  kills: number;
  deaths: number;
  killstreak: number;
  best_killstreak: number;
  playtime_seconds: number;
  balance: number;
  mob_kills: number;
  kdr: number;
  last_seen_at: string | null;
  updated_at: string | null;
};

const roleRank = (r: AppRole) => {
  const idx = ALL_ROLES.findIndex((x) => x.value === r);
  return idx === -1 ? 999 : idx;
};

const timeAgo = (iso: string | null) => {
  if (!iso) return "recently";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  const d = s / 86400;
  if (d < 1) return "today";
  if (d < 30) return `${Math.floor(d)} days ago`;
  const mo = d / 30;
  if (mo < 12) return `${Math.floor(mo)} month${Math.floor(mo) === 1 ? "" : "s"} ago`;
  const y = Math.floor(d / 365);
  return `${y} year${y === 1 ? "" : "s"} ago`;
};

const UserProfile = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [orgs, setOrgs] = useState<{ id: string; slug: string; name: string; avatar_url: string | null; role: string }[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editDisplay, setEditDisplay] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [ignStats, setIgnStats] = useState<PlayerStats | null>(null);

  const isOwn = !!user && !!profile && user.id === profile.id;

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setNotFound(false);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, mc_username, bio, created_at");
      const match = (profiles ?? []).find((p) => matchesUserSlug(p, slug))
        ?? (user?.id.toLowerCase().startsWith(slug.trim().toLowerCase())
          ? (profiles ?? []).find((p) => p.id === user.id)
          : null);
      if (!match) {
        // No website account matches — fall back to an in-game name (IGN) view
        // so leaderboard rows for unlinked players still resolve to a page.
        const ign = (slug ?? "").trim();
        const { data: sdata } = await (supabase as any).rpc("get_player_stats_by_name", { _player_name: ign });
        const s = (sdata as any[])?.[0];
        if (!cancelled) {
          setIgnStats(
            s
              ? {
                  player_name: s.player_name,
                  kills: s.kills ?? 0,
                  deaths: s.deaths ?? 0,
                  killstreak: s.killstreak ?? 0,
                  best_killstreak: s.best_killstreak ?? 0,
                  playtime_seconds: s.playtime_seconds ?? 0,
                  balance: s.balance ?? 0,
                  mob_kills: s.mob_kills ?? 0,
                  kdr: Number(s.kdr) || 0,
                  last_seen_at: s.last_seen_at ?? null,
                  updated_at: s.updated_at ?? null,
                }
              : null,
          );
          setNotFound(true);
          setProfile(null);
          setLoading(false);
        }
        return;
      }
      setIgnStats(null);
      const p = match as Profile;
      setProfile(p);
      const canonicalSlug = userProfileSlug(p);
      if (canonicalSlug !== slug.trim().toLowerCase()) {
        navigate(`/user/${canonicalSlug}`, { replace: true });
      }
      document.title = `${p.display_name ?? "Player"} — Warden Network`;

      // Roles
      const { data: r } = await supabase
        .from("user_roles").select("role").eq("user_id", p.id);
      setRoles(((r ?? []) as { role: AppRole }[]).map((x) => x.role).sort((a, b) => roleRank(a) - roleRank(b)));

      // Gameplay stats (matched by Minecraft username)
      if (p.mc_username) {
        (supabase as any).rpc("get_player_stats_by_name", { _player_name: p.mc_username })
          .then(({ data: sdata }: any) => {
            if (cancelled) return;
            const s = (sdata as any[])?.[0];
            if (s) setStats({
              player_name: s.player_name,
              kills: s.kills ?? 0,
              deaths: s.deaths ?? 0,
              killstreak: s.killstreak ?? 0,
              best_killstreak: s.best_killstreak ?? 0,
              playtime_seconds: s.playtime_seconds ?? 0,
              balance: s.balance ?? 0,
              mob_kills: s.mob_kills ?? 0,
              kdr: Number(s.kdr) || 0,
              last_seen_at: s.last_seen_at ?? null,
              updated_at: s.updated_at ?? null,
            });
          });
      }

      // Projects: match by author = display_name or mc_username
      const authorMatches = [p.display_name, p.mc_username].filter(Boolean) as string[];
      let allProjects: Project[] = [];
      if (authorMatches.length > 0) {
        const [{ data: mods }, { data: plugins }] = await Promise.all([
          (supabase.from("mods" as any) as any)
            .select("id, slug, short_id, name, description, icon_url, category, tags, updated_at")
            .eq("published", true)
            .in("author", authorMatches),
          (supabase.from("plugins" as any) as any)
            .select("id, short_id, name, description, icon_url, category, tags, updated_at")
            .eq("published", true)
            .in("author", authorMatches),
        ]);
        const modIds = (mods ?? []).map((m: any) => m.id);
        let likesByMod: Record<string, number> = {};
        if (modIds.length) {
          const { data: likes } = await (supabase as any).rpc("get_mod_like_counts", { _mod_ids: modIds });
          for (const l of (likes ?? []) as { mod_id: string; likes: number }[]) {
            likesByMod[l.mod_id] = Number(l.likes) || 0;
          }
        }

        allProjects = [
          ...((mods ?? []) as any[]).map((m) => ({
            kind: "mod" as const, id: m.id, slug: m.slug, short_id: m.short_id,
            name: m.name, description: m.description, icon_url: m.icon_url,
            category: m.category, tags: m.tags ?? [], updated_at: m.updated_at,
            likes: likesByMod[m.id] ?? 0,
          })),
          ...((plugins ?? []) as any[]).map((pl) => ({
            kind: "plugin" as const, id: pl.id, short_id: pl.short_id,
            name: pl.name, description: pl.description, icon_url: pl.icon_url,
            category: pl.category, tags: pl.tags ?? [], updated_at: pl.updated_at,
            likes: 0,
          })),
        ];
      }
      setProjects(allProjects);

      // Organizations the user is a member of
      const { data: memberships } = await supabase
        .from("organization_members")
        .select("role, organizations(id, slug, name, avatar_url)")
        .eq("user_id", p.id);
      setOrgs(
        ((memberships ?? []) as any[])
          .filter((m) => m.organizations)
          .map((m) => ({
            id: m.organizations.id,
            slug: m.organizations.slug,
            name: m.organizations.name,
            avatar_url: m.organizations.avatar_url,
            role: m.role,
          }))
      );

      // Follower counts (via secure RPC so the social graph is not enumerable)
      const { data: followers } = await supabase
        .rpc("get_follower_count", { _user_id: p.id });
      setFollowerCount((followers as number | null) ?? 0);
      if (user?.id && user.id !== p.id) {
        const { data: a } = await supabase
          .from("user_follows").select("follower_id")
          .eq("follower_id", user.id).eq("followee_id", p.id).maybeSingle();
        setIsFollowing(!!a);
      } else {
        setIsFollowing(false);
      }

      setLoading(false);
    })();
  }, [slug, user?.id, navigate]);

  const openEdit = () => {
    if (!profile) return;
    setEditDisplay(profile.display_name ?? "");
    setEditBio(profile.bio ?? "");
    setEditAvatar(profile.avatar_url ?? "");
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!profile) return;
    setEditBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: editDisplay.trim() || null,
        bio: editBio.trim() || null,
        avatar_url: editAvatar.trim() || null,
      })
      .eq("id", profile.id);
    setEditBusy(false);
    if (error) { toast.error(error.message); return; }
    setProfile({ ...profile, display_name: editDisplay.trim() || null, bio: editBio.trim() || null, avatar_url: editAvatar.trim() || null });
    setEditOpen(false);
    toast.success("Profile updated");
  };

  const toggleFollow = async () => {
    if (!user) { toast.error("Sign in to follow players"); return; }
    if (!profile) return;
    setFollowBusy(true);
    if (isFollowing) {
      const { error } = await supabase
        .from("user_follows").delete()
        .eq("follower_id", user.id).eq("followee_id", profile.id);
      if (error) toast.error(error.message);
      else { setIsFollowing(false); setFollowerCount((c) => Math.max(0, c - 1)); }
    } else {
      const { error } = await supabase
        .from("user_follows")
        .insert({ follower_id: user.id, followee_id: profile.id });
      if (error) toast.error(error.message);
      else { setIsFollowing(true); setFollowerCount((c) => c + 1); }
    }
    setFollowBusy(false);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Profile link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (notFound || !profile) {
    const ign = ignStats?.player_name ?? (slug ?? "");
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 pt-24 pb-16 max-w-3xl">
          {ignStats ? (
            <>
              <div className="flex items-center gap-5 pb-6 border-b border-border">
                <Avatar className="h-20 w-20 rounded-md border border-border shrink-0">
                  <AvatarImage src={`https://mc-heads.net/avatar/${encodeURIComponent(ign)}/256`} />
                  <AvatarFallback>{ign.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h1 className="text-2xl md:text-3xl font-display font-bold leading-tight truncate">{ign}</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    In-game player · no linked website account
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                {[
                  { label: "Kills", value: ignStats.kills, icon: Swords },
                  { label: "Deaths", value: ignStats.deaths, icon: Skull },
                  { label: "K/D", value: ignStats.kdr.toFixed(2), icon: Target },
                  { label: "Best streak", value: ignStats.best_killstreak, icon: Crosshair },
                  { label: "Killstreak", value: ignStats.killstreak, icon: Trophy },
                  { label: "Playtime", value: `${Math.floor(ignStats.playtime_seconds / 3600)}h`, icon: Clock },
                  { label: "Balance", value: `$${Math.round(ignStats.balance).toLocaleString()}`, icon: Coins },
                  { label: "Mob kills", value: ignStats.mob_kills, icon: Bug },
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <Card key={s.label} className="p-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Icon className="h-3.5 w-3.5" /> {s.label}
                      </div>
                      <div className="font-display text-xl font-bold">{s.value}</div>
                    </Card>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-2 mt-6">
                <Button asChild variant="outline">
                  <Link to={`/punishments/${encodeURIComponent(ign)}`}>View punishment history</Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link to="/leaderboard">Back to leaderboard</Link>
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <h1 className="text-3xl font-display font-bold mb-2">Player not found</h1>
              <p className="text-muted-foreground mb-6">
                No member or in-game player matches “{slug}”.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button asChild><Link to="/users">Browse all members</Link></Button>
                <Button asChild variant="outline">
                  <Link to={`/punishments/${encodeURIComponent(slug ?? "")}`}>Check punishments</Link>
                </Button>
              </div>
            </div>
          )}
        </main>
        <Footer />
      </div>
    );
  }

  const initials = (profile.display_name ?? "?").slice(0, 2).toUpperCase();
  const avatar = profile.avatar_url || (profile.mc_username ? `https://mc-heads.net/avatar/${profile.mc_username}/256` : undefined);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 pt-24 pb-16 max-w-6xl">
        {/* Header row */}
        <div className="flex items-start gap-5 pb-6 border-b border-border">
          <Avatar className="h-24 w-24 rounded-full border border-border shrink-0">
            <AvatarImage src={avatar} />
            <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-display font-bold leading-tight">
              {profile.display_name ?? "Unnamed Player"}
            </h1>
            {profile.bio ? (
              <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{profile.bio}</p>
            ) : isOwn ? (
              <p className="text-sm text-muted-foreground/70 italic mt-1">
                Add a bio to tell people about yourself.
              </p>
            ) : null}

            <div className="flex items-center gap-5 mt-3 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5">
                <Package className="h-4 w-4" />
                <strong className="text-foreground">{projects.length}</strong> project{projects.length === 1 ? "" : "s"}
              </span>
              <span className="flex items-center gap-1.5">
                <Download className="h-4 w-4" />
                <strong className="text-foreground">0</strong> downloads
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                Joined {timeAgo(profile.created_at)}
              </span>
              {roles.length > 0 && roles.slice(0, 3).map((r) => (
                <Badge key={r} variant="secondary" className="rounded-full">{roleLabel(r)}</Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isOwn ? (
              <Button variant="outline" size="sm" className="rounded-md" onClick={openEdit}>
                <Pencil className="h-4 w-4 mr-1.5" /> Edit
              </Button>
            ) : user ? (
              <Button
                size="sm"
                variant={isFollowing ? "outline" : "default"}
                onClick={toggleFollow}
                disabled={followBusy}
              >
                {followBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isFollowing ? (
                  <><UserCheck className="h-4 w-4 mr-1" /> Following</>
                ) : (
                  <><UserPlus className="h-4 w-4 mr-1" /> Follow</>
                )}
              </Button>
            ) : null}

            {profile.mc_username && (
              <Button asChild variant="outline" size="sm" className="rounded-md">
                <Link to={`/punishments/${encodeURIComponent(profile.mc_username)}`}>Punishments</Link>
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-md" aria-label="More">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={copyLink}>
                  <LinkIcon className="h-4 w-4 mr-2" /> Copy profile link
                </DropdownMenuItem>
                {isOwn ? (
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <Pencil className="h-4 w-4 mr-2" /> Account settings
                  </DropdownMenuItem>
                ) : (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                        setReportOpen(true);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Flag className="h-4 w-4 mr-2" /> Report user
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            {profile && (
              <ReportDialog
                targetType="user"
                targetId={profile.id}
                targetLabel={profile.display_name ?? profile.mc_username ?? "User"}
                open={reportOpen}
                onOpenChange={setReportOpen}
              />
            )}
          </div>
        </div>

        {/* Gameplay stats */}
        {stats && (
          <Card className="p-5 mt-6">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Swords className="h-4 w-4 text-primary" /> In-Game Stats
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {[
                { label: "Kills", value: stats.kills.toLocaleString(), icon: Swords },
                { label: "Deaths", value: stats.deaths.toLocaleString(), icon: Skull },
                { label: "KDR", value: Number(stats.kdr).toFixed(2), icon: Target },
                { label: "Killstreak", value: stats.killstreak.toLocaleString(), icon: Crosshair },
                { label: "Best Streak", value: stats.best_killstreak.toLocaleString(), icon: Trophy },
                { label: "Playtime", value: stats.playtime_seconds >= 3600 ? `${Math.floor(stats.playtime_seconds / 3600)}h` : `${Math.floor(stats.playtime_seconds / 60)}m`, icon: Clock },
                { label: "Balance", value: `$${stats.balance.toLocaleString()}`, icon: Coins },
                { label: "Mob Kills", value: stats.mob_kills.toLocaleString(), icon: Bug },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="rounded-lg border border-border/60 bg-card/50 p-3 text-center">
                    <Icon className="h-4 w-4 mx-auto mb-1.5 text-muted-foreground" />
                    <div className="font-display text-lg font-bold text-foreground">{s.value}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
                  </div>
                );
              })}
            </div>
            {stats.last_seen_at && (
              <p className="text-xs text-muted-foreground mt-3">
                Last seen {timeAgo(stats.last_seen_at)}
              </p>
            )}
          </Card>
        )}

        {/* Body: projects + sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 mt-6">
          <div className="space-y-3">
            {projects.length === 0 ? (
              <Card className="p-10 text-center">
                <Boxes className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h2 className="font-bold text-lg mb-1">No projects yet</h2>
                <p className="text-sm text-muted-foreground">
                  {isOwn ? "Projects you publish will show up here." : "This member hasn't published any projects."}
                </p>
              </Card>
            ) : (
              projects.map((p) => {
                const href = p.kind === "mod" ? `/mod/${p.slug}` : `/plugin/${p.short_id}`;
                return (
                  <Link key={`${p.kind}-${p.id}`} to={href}>
                    <Card className="p-4 hover:border-primary/50 transition-colors">
                      <div className="flex items-start gap-4">
                        {p.icon_url ? (
                          <img src={p.icon_url} alt="" className="h-16 w-16 rounded-md object-cover border border-border bg-card shrink-0" />
                        ) : (
                          <div className="h-16 w-16 rounded-md bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                            <Boxes className="h-7 w-7 text-primary" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-base">{p.name}</h3>
                            <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                              <Globe className="h-3 w-3" /> Public
                            </span>
                          </div>
                          {p.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                          )}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {p.category && (
                              <Badge variant="secondary" className="rounded-full">{p.category}</Badge>
                            )}
                            {p.tags?.slice(0, 3).map((t) => (
                              <Badge key={t} variant="secondary" className="rounded-full">{t}</Badge>
                            ))}
                          </div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground shrink-0 space-y-1">
                          <div className="flex items-center justify-end gap-3">
                            <span className="flex items-center gap-1"><Download className="h-3.5 w-3.5" /> 0</span>
                            <span className="flex items-center gap-1"><Heart className="h-3.5 w-3.5" /> {p.likes}</span>
                          </div>
                          <div className="text-xs">{timeAgo(p.updated_at)}</div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })
            )}
          </div>

          <aside className="space-y-4">
            <Card className="p-5">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Organizations
              </h3>
              {orgs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {isOwn ? "You're not a member of any organizations yet." : "No organizations."}
                </p>
              ) : (
                <ul className="space-y-2">
                  {orgs.map((o) => {
                    const initials = o.name.slice(0, 2).toUpperCase();
                    return (
                      <li key={o.id}>
                        <Link
                          to={`/organization/${o.slug}`}
                          className="flex items-center gap-3 rounded-md p-2 -mx-2 hover:bg-muted transition-colors"
                        >
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={o.avatar_url ?? undefined} />
                            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-sm truncate">{o.name}</div>
                            <div className="text-xs text-muted-foreground capitalize">{o.role}</div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="font-bold mb-3">Followers</h3>
              <div className="text-2xl font-display font-bold text-glow">{followerCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {followerCount === 1 ? "person follows" : "people follow"} this member
              </p>
            </Card>
          </aside>
        </div>
      </main>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="dn">Display name</Label>
              <Input id="dn" value={editDisplay} onChange={(e) => setEditDisplay(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="av">Avatar URL</Label>
              <Input id="av" value={editAvatar} onChange={(e) => setEditAvatar(e.target.value)} placeholder="https://…" />
            </div>
            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea id="bio" value={editBio} onChange={(e) => setEditBio(e.target.value)} rows={3} placeholder="A few words about you" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={editBusy}>
              {editBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default UserProfile;
