import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileCode, Search, Download, Upload, Clock, Filter, X } from "lucide-react";
import { useAuth } from "@/lib/auth";

type Skript = {
  id: string;
  name: string;
  description: string | null;
  filename: string;
  storage_path: string;
  size_bytes: number | null;
  version: string | null;
  tags: string[];
  downloads: number;
  uploaded_by: string;
  icon_url: string | null;
  created_at: string;
};

type Uploader = { display_name: string | null; mc_username: string | null };

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
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

const fmtBytes = (n: number | null) => {
  if (!n) return "—";
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
};

const fmt = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));

const Skripts = () => {
  const { user } = useAuth();
  const [skripts, setSkripts] = useState<Skript[]>([]);
  const [uploaders, setUploaders] = useState<Record<string, Uploader>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"recent" | "downloads" | "name">("recent");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("user_skripts" as any)
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false });
    const rows = ((data as unknown) ?? []) as Skript[];
    setSkripts(rows);
    const ids = Array.from(new Set(rows.map((r) => r.uploaded_by).filter(Boolean)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, mc_username")
        .in("id", ids);
      const map: Record<string, Uploader> = {};
      (profs ?? []).forEach((p: any) => {
        map[p.id] = { display_name: p.display_name, mc_username: p.mc_username };
      });
      setUploaders(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    document.title = "Skripts — Warden Network";
    load();
  }, []);

  const allTags = useMemo(() => {
    const s = new Set<string>();
    skripts.forEach((sk) => sk.tags?.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [skripts]);

  const filtered = useMemo(() => {
    let res = skripts.filter((sk) => {
      if (activeTag && !sk.tags?.includes(activeTag)) return false;
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return (
        sk.name.toLowerCase().includes(s) ||
        (sk.description ?? "").toLowerCase().includes(s) ||
        sk.tags?.some((t) => t.toLowerCase().includes(s))
      );
    });
    if (sortBy === "downloads") res = [...res].sort((a, b) => b.downloads - a.downloads);
    else if (sortBy === "name") res = [...res].sort((a, b) => a.name.localeCompare(b.name));
    return res;
  }, [skripts, q, activeTag, sortBy]);

  const totalDownloads = skripts.reduce((s, sk) => s + (sk.downloads ?? 0), 0);
  const latest = skripts[0]?.created_at;

  const download = async (sk: Skript) => {
    const { data, error } = await supabase.functions.invoke("skript-file-url", {
      body: { skript_id: sk.id },
    });
    if (error || !data?.url) {
      toast.error(error?.message ?? data?.error ?? "Download failed");
      return;
    }
    await supabase.rpc("record_user_skript_download" as any, { _skript_id: sk.id });
    try {
      const res = await fetch(data.url);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = sk.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open(data.url, "_blank", "noopener");
    }
    setSkripts((prev) =>
      prev.map((s) => (s.id === sk.id ? { ...s, downloads: s.downloads + 1 } : s)),
    );
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
                <FileCode className="h-3 w-3" /> Skript · Library
              </div>
              <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight leading-[0.95]">
                Community{" "}
                <span className="bg-gradient-to-br from-orange-300 via-orange-500 to-rose-600 bg-clip-text text-transparent">
                  Skripts
                </span>
              </h1>
              <p className="text-muted-foreground mt-2 text-sm md:text-base max-w-lg">
                Share .sk files, grab community-built utilities, and drop them straight into your server.
              </p>
              {user && (
                <Button asChild size="sm" className="mt-4">
                  <Link to="/dashboard#skripts">
                    <Upload className="h-4 w-4 mr-1" /> Upload a Skript
                  </Link>
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-px bg-orange-500/10">
              {[
                { label: "Skripts live", value: skripts.length, tone: "text-orange-300" },
                { label: "Downloads", value: fmt(totalDownloads), tone: "text-emerald-300" },
                { label: "Tags", value: allTags.length, tone: "text-amber-300" },
                { label: "Latest", value: latest ? timeAgo(latest) : "—", tone: "text-rose-300" },
              ].map((s) => (
                <div key={s.label} className="bg-card/60 p-4 md:p-5">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    {s.label}
                  </div>
                  <div className={`font-display font-black text-2xl md:text-3xl mt-1 ${s.tone}`}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="px-6 md:px-8 py-2.5 border-t border-orange-500/20 bg-black/20 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Feed online
            </span>
            <span>·</span>
            <span>{loading ? "Syncing…" : `${filtered.length} matching`}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="rounded-xl border border-border/70 bg-card/60 p-3 mb-3 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search skripts, tags..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-9 h-10 bg-background/70"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="h-10 bg-background/70 border border-border rounded-md px-3 text-sm text-foreground"
            >
              <option value="recent">Recently added</option>
              <option value="downloads">Most downloaded</option>
              <option value="name">Name (A–Z)</option>
            </select>
          </div>
          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground mr-1">
                <Filter className="h-3 w-3 text-orange-400" /> Tag
              </div>
              {allTags.map((t) => {
                const active = activeTag === t;
                return (
                  <button
                    key={t}
                    onClick={() => setActiveTag(active ? null : t)}
                    className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
                      active
                        ? "border-orange-500/60 bg-orange-500/15 text-orange-200"
                        : "border-border/60 text-muted-foreground hover:text-foreground hover:border-orange-500/40"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
              {activeTag && (
                <button
                  onClick={() => setActiveTag(null)}
                  className="text-[11px] px-2 py-1 rounded-full text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-12">Loading skripts...</p>
        ) : filtered.length === 0 ? (
          <Card className="p-12 text-center">
            <FileCode className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">No skripts yet.</p>
            {user ? (
              <Button asChild size="sm">
                <Link to="/dashboard#skripts">
                  <Upload className="h-4 w-4 mr-1" /> Upload the first one
                </Link>
              </Button>
            ) : (
              <Button asChild size="sm">
                <Link to="/auth">Sign in to upload</Link>
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((sk) => {
              const u = uploaders[sk.uploaded_by];
              const name = u?.display_name || u?.mc_username || "Community";
              return (
                <Card
                  key={sk.id}
                  className="relative p-0 h-full overflow-hidden hover:border-orange-500/50 hover:shadow-[0_0_25px_-10px_hsl(24_95%_53%/0.4)] transition group"
                >
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent opacity-0 group-hover:opacity-100 transition" />
                  <Link to={`/skripts/${sk.id}`} className="block p-4">
                    <div className="flex gap-3">
                      {sk.icon_url ? (
                        <img src={sk.icon_url} alt="" className="h-12 w-12 rounded-md object-cover border border-orange-500/30 shrink-0" />
                      ) : (
                        <div className="h-12 w-12 rounded-md bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shrink-0">
                          <FileCode className="h-6 w-6 text-orange-400" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-display font-semibold group-hover:text-orange-300 transition truncate">
                            {sk.name}
                          </h3>
                          {sk.version && (
                            <Badge variant="secondary" className="text-[10px]">v{sk.version}</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          by <span className="text-foreground/80">{name}</span>
                        </div>
                        {sk.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1.5">
                            {sk.description}
                          </p>
                        )}
                        {sk.tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {sk.tags.slice(0, 4).map((t) => (
                              <Badge key={t} variant="outline" className="text-[10px]">
                                {t}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-2 font-mono">
                          <span className="inline-flex items-center gap-1">
                            <Download className="h-3 w-3" /> {fmt(sk.downloads)}
                          </span>
                          <span>·</span>
                          <span>{fmtBytes(sk.size_bytes)}</span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {timeAgo(sk.created_at)}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-3"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            download(sk);
                          }}
                        >
                          <Download className="h-4 w-4 mr-1" /> Download .sk
                        </Button>
                      </div>
                    </div>
                  </Link>
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

export default Skripts;
