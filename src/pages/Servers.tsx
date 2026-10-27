import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Server as ServerIcon,
  Search,
  Sparkles,
  Clock,
  Filter,
  X,
  Copy,
  Users,
  Globe,
  MessageCircle,
} from "lucide-react";

type Row = {
  id: string;
  name: string;
  slug: string;
  ip: string;
  port: number | null;
  description: string | null;
  version: string | null;
  tags: string[];
  icon_url: string | null;
  banner_url: string | null;
  website_url: string | null;
  discord_url: string | null;
  featured: boolean;
  updated_at: string;
};

type Live = { online: boolean; players: number; max: number; motd?: string | null };

const TAGS = [
  "Survival", "SMP", "Skyblock", "Prison", "Factions", "Creative",
  "Minigames", "PvP", "Anarchy", "Towny", "Economy", "Modded", "Bedrock",
];

const timeAgo = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  if (d < 365) return `${Math.floor(d / 30)}mo ago`;
  return `${Math.floor(d / 365)}y ago`;
};

const Servers = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [live, setLive] = useState<Record<string, Live>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"featured" | "players" | "updated" | "name">("featured");

  const load = async () => {
    setLoading(true);
    setLoadError(false);
    const { data, error } = await supabase
      .from("user_servers" as any)
      .select("id, name, slug, ip, port, description, version, tags, icon_url, banner_url, website_url, discord_url, featured, updated_at")
      .eq("published", true)
      .order("featured", { ascending: false })
      .order("updated_at", { ascending: false });
    if (error) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    const list = ((data as unknown) ?? []) as Row[];
    setRows(list);
    setLoading(false);

    list.forEach(async (r) => {
      const host = r.port ? `${r.ip}:${r.port}` : r.ip;
      try {
        const res = await fetch(`https://api.mcsrvstat.us/3/${encodeURIComponent(host)}`);
        const j = await res.json();
        setLive((prev) => ({
          ...prev,
          [r.id]: {
            online: !!j.online,
            players: j.players?.online ?? 0,
            max: j.players?.max ?? 0,
            motd: j.motd?.clean?.join(" ") ?? null,
          },
        }));
      } catch {
        setLive((prev) => ({ ...prev, [r.id]: { online: false, players: 0, max: 0 } }));
      }
    });
  };

  useEffect(() => {
    document.title = "Servers — Warden Network";
    load();
  }, []);

  const toggleTag = (t: string) =>
    setActiveTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  const filtered = useMemo(() => {
    let res = rows.filter((r) => {
      if (activeTags.length > 0) {
        const set = new Set(r.tags.map((t) => t.toLowerCase()));
        if (!activeTags.some((t) => set.has(t.toLowerCase()))) return false;
      }
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return (
        r.name.toLowerCase().includes(s) ||
        r.ip.toLowerCase().includes(s) ||
        (r.description ?? "").toLowerCase().includes(s) ||
        r.tags.some((t) => t.toLowerCase().includes(s))
      );
    });
    if (sortBy === "players") {
      res = [...res].sort((a, b) => (live[b.id]?.players ?? 0) - (live[a.id]?.players ?? 0));
    } else if (sortBy === "updated") {
      res = [...res].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    } else if (sortBy === "name") {
      res = [...res].sort((a, b) => a.name.localeCompare(b.name));
    }
    return res;
  }, [rows, q, activeTags, sortBy, live]);

  const featured = rows.filter((r) => r.featured).slice(0, 3);
  const onlineCount = rows.filter((r) => live[r.id]?.online).length;
  const totalPlayers = rows.reduce((s, r) => s + (live[r.id]?.players ?? 0), 0);
  const lastUpdated = rows[0]?.updated_at;

  const copyIp = (r: Row) => {
    navigator.clipboard.writeText(r.port ? `${r.ip}:${r.port}` : r.ip);
    toast.success("Server IP copied");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container pt-24 pb-16 max-w-[1400px]">
        {/* Command-center header */}
        <div className="relative mb-6 rounded-2xl border border-orange-500/30 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.2),transparent_60%),linear-gradient(135deg,hsl(var(--card))_0%,hsl(var(--background))_100%)] overflow-hidden">
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-orange-500/60 to-transparent" />
          <div className="grid md:grid-cols-[1.4fr_1fr] gap-0">
            <div className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-orange-500/20">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/40 bg-orange-500/10 px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest text-orange-300 mb-4">
                <ServerIcon className="h-3 w-3" /> Network · Server Directory
              </div>
              <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight leading-[0.95]">
                Server{" "}
                <span className="bg-gradient-to-br from-orange-300 via-orange-500 to-rose-600 bg-clip-text text-transparent">
                  command deck
                </span>
              </h1>
              <p className="text-muted-foreground mt-2 text-sm md:text-base max-w-lg">
                Community-submitted Minecraft servers — search, filter, and copy an IP in one view.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-px bg-orange-500/10">
              {[
                { label: "Servers listed", value: rows.length, icon: ServerIcon, tone: "text-orange-300" },
                { label: "Featured", value: featured.length, icon: Sparkles, tone: "text-amber-300" },
                { label: "Online now", value: onlineCount, icon: Globe, tone: "text-emerald-300" },
                { label: "Players", value: totalPlayers, icon: Users, tone: "text-rose-300" },
              ].map((s) => (
                <div key={s.label} className="bg-card/60 p-4 md:p-5">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    <s.icon className={`h-3 w-3 ${s.tone}`} /> {s.label}
                  </div>
                  <div className={`font-display font-black text-2xl md:text-3xl mt-1 ${s.tone}`}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="px-6 md:px-8 py-2.5 border-t border-orange-500/20 bg-black/20 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Feed online</span>
            <span>·</span>
            <span>{loading ? "Syncing…" : `${filtered.length} matching`}</span>
            {lastUpdated && <><span>·</span><span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Last update {timeAgo(lastUpdated)}</span></>}
          </div>
        </div>

        {/* Featured */}
        {featured.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-5 w-1 rounded-full bg-gradient-to-b from-orange-400 to-rose-600" />
              <Sparkles className="h-4 w-4 text-orange-400" />
              <h2 className="font-display font-bold text-sm uppercase tracking-wider">Featured</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              {featured.map((r) => (
                <Card key={r.id} onClick={() => navigate(`/server/${r.slug}`)} className="relative cursor-pointer p-4 h-full overflow-hidden border-orange-500/20 bg-gradient-to-br from-card via-card to-orange-500/5 hover:border-orange-500/60 transition group">
                  <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-orange-400 via-orange-500 to-rose-600 opacity-70 group-hover:opacity-100 transition" />
                  <div className="flex gap-3 items-start pl-2">
                    {r.icon_url ? (
                      <img src={r.icon_url} alt="" className="h-12 w-12 rounded-md border border-orange-500/30 object-cover" />
                    ) : (
                      <div className="h-12 w-12 rounded-md bg-orange-500/10 border border-orange-500/30 flex items-center justify-center">
                        <ServerIcon className="h-6 w-6 text-orange-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-display font-semibold truncate group-hover:text-orange-300 transition">{r.name}</div>
                      <div className="text-xs font-mono text-muted-foreground truncate">{r.port ? `${r.ip}:${r.port}` : r.ip}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Controls bar */}
        <div className="rounded-xl border border-border/70 bg-card/60 p-3 mb-3 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search servers, IPs, gamemodes..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9 h-10 bg-background/70"
              />
            </div>
            <div className="flex gap-1.5">
              {(["featured", "players", "updated", "name"] as const).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={sortBy === s ? "default" : "outline"}
                  className="h-10 capitalize"
                  onClick={() => setSortBy(s)}
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground mr-1">
              <Filter className="h-3 w-3" /> Gamemodes
            </span>
            {TAGS.map((t) => (
              <button
                key={t}
                onClick={() => toggleTag(t)}
                className={`px-2.5 py-1 rounded-full text-xs border transition ${
                  activeTags.includes(t)
                    ? "border-orange-500/60 bg-orange-500/15 text-orange-300"
                    : "border-border/70 text-muted-foreground hover:border-orange-500/40"
                }`}
              >
                {t}
              </button>
            ))}
            {activeTags.length > 0 && (
              <button
                onClick={() => setActiveTags([])}
                className="px-2 py-1 rounded-full text-xs border border-border/70 text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 rounded-lg border border-border/60 bg-card/40 animate-pulse" />
            ))}
          </div>
        ) : loadError ? (
          <Card className="p-10 text-center space-y-3">
            <p className="text-muted-foreground">Couldn't load the server list.</p>
            <Button size="sm" variant="outline" onClick={load}>Try again</Button>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">
            No servers listed yet — add yours from your dashboard.
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((r) => {
              const l = live[r.id];
              return (
                <Card key={r.id} className="p-4 flex flex-col gap-3 border-border/70 hover:border-orange-500/50 transition group">
                  <div className="flex gap-3 items-start">
                    {r.icon_url ? (
                      <img src={r.icon_url} alt="" className="h-12 w-12 rounded-md object-cover border border-border shrink-0" />
                    ) : (
                      <div className="h-12 w-12 rounded-md bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shrink-0">
                        <ServerIcon className="h-6 w-6 text-orange-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link to={`/server/${r.slug}`} className="font-display font-semibold truncate group-hover:text-orange-300 transition hover:underline">
                          {r.name}
                        </Link>
                        <Badge variant="outline" className={l?.online ? "border-emerald-500/40 text-emerald-400" : "text-muted-foreground"}>
                          <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${l?.online ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`} />
                          {l ? (l.online ? "Online" : "Offline") : "…"}
                        </Badge>
                      </div>
                      {r.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{r.description}</p>
                      )}
                    </div>

                  </div>

                  <button
                    onClick={() => copyIp(r)}
                    className="flex items-center gap-2 text-sm font-mono px-3 py-2 rounded-md bg-muted/40 hover:bg-muted transition w-full text-left"
                  >
                    <span className="flex-1 truncate">{r.port ? `${r.ip}:${r.port}` : r.ip}</span>
                    <Copy className="h-4 w-4 text-muted-foreground" />
                  </button>

                  <div className="flex flex-wrap gap-1.5">
                    {r.version && <Badge variant="secondary" className="text-[10px]">{r.version}</Badge>}
                    {r.tags.slice(0, 4).map((t) => (
                      <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>

                  <div className="mt-auto flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3" /> {l ? `${l.players}/${l.max}` : "—"}
                    </span>
                    <span className="flex items-center gap-2">
                      {r.website_url && (
                        <a href={r.website_url} target="_blank" rel="noreferrer" className="hover:text-orange-300 inline-flex items-center gap-1">
                          <Globe className="h-3 w-3" /> Site
                        </a>
                      )}
                      {r.discord_url && (
                        <a href={r.discord_url} target="_blank" rel="noreferrer" className="hover:text-orange-300 inline-flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" /> Discord
                        </a>
                      )}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Servers;
