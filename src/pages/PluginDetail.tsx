import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { useAuth } from "@/lib/auth";
import { Pencil } from "lucide-react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import PageLoader from "@/components/site/PageLoader";
import { supabase } from "@/integrations/supabase/client";
import { getJarDownloadUrl, getVersionJarDownloadUrl } from "@/lib/plugin-files";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Gamepad2, ChevronDown, Search, KeyRound, Info } from "lucide-react";
import ItemReviews from "@/components/site/ItemReviews";
import ReportDialog from "@/components/site/ReportDialog";
import FoliaBanner from "@/components/site/FoliaBanner";
import PluginSupportBadges from "@/components/site/PluginSupportBadges";
import {
  ArrowLeft,
  Bookmark,
  Calendar,
  Download,
  Flag,
  Heart,
  Link as LinkIcon,
  Monitor,
  MoreVertical,
  Package,
  Puzzle,
  User,
} from "lucide-react";

type Plugin = {
  id: string;
  short_id: string;
  slug: string | null;
  name: string;
  description: string | null;
  long_description: string | null;
  version: string | null;
  author: string | null;
  download_url: string | null;
  icon_url: string | null;
  category: string | null;
  platform: string | null;
  platforms: string[] | null;
  mc_versions: string[] | null;
  tags: string[];
  featured: boolean;
  created_at: string;
  updated_at: string | null;
  jar_filename: string | null;
  jar_size: number | null;
  jar_path?: string | null;
  screenshots: string[];
  website_url?: string | null;
  source_url?: string | null;
  issues_url?: string | null;
  discord_url?: string | null;
};


const formatSize = (b: number | null) => {
  if (!b) return "";
  const kb = b / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

const timeAgo = (iso: string | null) => {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  const m = s / 60;
  if (m < 60) return `${Math.floor(m)} minutes ago`;
  const h = m / 60;
  if (h < 24) return `${Math.floor(h)} hours ago`;
  const d = h / 24;
  if (d < 7) return `${Math.floor(d)} days ago`;
  const w = d / 7;
  if (w < 5) return `${Math.floor(w)} weeks ago`;
  const mo = d / 30;
  if (mo < 12) return `${Math.floor(mo)} months ago`;
  return `${Math.floor(d / 365)} years ago`;
};

const buildJarName = (plugin: Plugin, platform?: string | null) => {
  const sanitize = (s: string | null) => (s ? s.replace(/\s+/g, "-") : "");
  const plat = platform ?? plugin.platform;
  const parts = [sanitize(plugin.name), sanitize(plat), sanitize(plugin.version)].filter(Boolean);
  return parts.length > 0 ? `${parts.join("-")}.jar` : `${sanitize(plugin.name) || "plugin"}.jar`;
};

const PLATFORM_LABELS: Record<string, string> = {
  bukkit: "Bukkit",
  spigot: "Spigot",
  paper: "Paper",
  folia: "Folia",
  purpur: "Purpur",
  velocity: "Velocity",
  bungee: "BungeeCord",
  bungeecord: "BungeeCord",
  waterfall: "Waterfall",
};

const GAME_VERSIONS = [
  "1.21.11","1.21.10","1.21.9","1.21.8","1.21.7","1.21.6","1.21.5","1.21.4","1.21.3","1.21.2","1.21.1","1.21",
  "1.20.6","1.20.5","1.20.4","1.20.3","1.20.2","1.20.1","1.20",
  "1.19.4","1.19.3","1.19.2","1.19.1","1.19",
  "1.18.2","1.18.1","1.18","1.17.1","1.17","1.16.5","1.16.4","1.16.3","1.16.2","1.16.1","1.16",
];

type Tab = "description" | "gallery" | "versions" | "reviews";

type PluginVersion = {
  id: string;
  version: string;
  changelog: string | null;
  jar_filename: string | null;
  jar_size: number | null;
  download_url: string | null;
  jar_path: string | null;
  created_at: string;
};

const PluginDetail = () => {
  const { slug, shortId } = useParams<{ slug?: string; shortId?: string }>();
  const key = slug ?? shortId;
  const { user, isAdmin } = useAuth();
  const [plugin, setPlugin] = useState<Plugin | null>(null);
  const [versions, setVersions] = useState<PluginVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>("description");
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [downloadCount, setDownloadCount] = useState(0);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const [versionQuery, setVersionQuery] = useState("");
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [platformOpen, setPlatformOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!key) return;
    (async () => {
      setLoading(true);
      let { data } = await supabase.from("plugins").select("id, short_id, slug, name, description, long_description, version, author, download_url, icon_url, category, platform, platforms, mc_versions, tags, featured, created_at, updated_at, jar_filename, jar_size, jar_path, screenshots, website_url, source_url, issues_url, discord_url").eq("published", true).eq("slug", key).maybeSingle();
      if (!data) {
        const fb = await supabase.from("plugins").select("id, short_id, slug, name, description, long_description, version, author, download_url, icon_url, category, platform, platforms, mc_versions, tags, featured, created_at, updated_at, jar_filename, jar_size, jar_path, screenshots, website_url, source_url, issues_url, discord_url").eq("published", true).eq("short_id", key).maybeSingle();
        data = fb.data;
      }
      if (!data) setNotFound(true);
      else {
        const p = data as Plugin;
        setPlugin(p);
        document.title = `${p.name} — Plugin — Warden Network`;
        const [vsRes, dlRes, favRes, myFavRes]: any = await Promise.all([
          (supabase.from("plugin_versions" as any) as any)
            .select(user
              ? "id, version, changelog, jar_filename, jar_size, jar_path, download_url, created_at"
              : "id, version, changelog, jar_size, download_url, created_at")
            .eq("plugin_id", p.id)
            .order("created_at", { ascending: false }),
          supabase.rpc("get_plugin_download_counts" as any, { _plugin_ids: [p.id] }),
          supabase.rpc("get_plugin_favorite_counts" as any, { _plugin_ids: [p.id] }),
          user
            ? (supabase.from("plugin_favorites" as any) as any)
                .select("plugin_id")
                .eq("user_id", user.id)
                .eq("plugin_id", p.id)
                .maybeSingle()
            : Promise.resolve({ data: null }),
        ]);
        setVersions((vsRes.data ?? []) as PluginVersion[]);
        setDownloadCount(Number((dlRes.data?.[0]?.total) ?? 0));
        setFavoriteCount(Number((favRes.data?.[0]?.total) ?? 0));
        setSaved(!!myFavRes.data);
        if (user) {
          const own = await supabase.from("plugins").select("id").eq("id", p.id).eq("user_id", user.id).maybeSingle();
          setIsOwner(!!own.data);
        } else {
          setIsOwner(false);
        }
        setLiked(!!myFavRes.data);
      }
      setLoading(false);
    })();
  }, [key, user]);

  const toggleFavorite = async () => {
    if (!plugin) return;
    if (!user) {
      toast.error("Sign in to favorite plugins");
      return;
    }
    const nextSaved = !saved;
    setSaved(nextSaved);
    setLiked(nextSaved);
    setFavoriteCount((n) => Math.max(0, n + (nextSaved ? 1 : -1)));
    const { data, error } = await (supabase.rpc as any)("toggle_plugin_favorite", { _plugin_id: plugin.id });
    if (error) {
      // revert
      setSaved(!nextSaved);
      setLiked(!nextSaved);
      setFavoriteCount((n) => Math.max(0, n + (nextSaved ? -1 : 1)));
      toast.error("Could not update favorite");
    } else {
      // sync from server truth
      const isFav = !!data;
      setSaved(isFav);
      setLiked(isFav);
    }
  };

  const trackDownload = () => {
    if (!plugin) return;
    (supabase.rpc as any)("record_plugin_download", { _plugin_id: plugin.id }).then(() => {
      setDownloadCount((n) => n + 1);
    });
  };

  // Jar files live in a private bucket; resolve a short-lived signed link on demand.
  const resolveVersionUrl = (v: PluginVersion) => v.jar_path || v.download_url || null;

  const latestDownloadSource =
    plugin?.jar_path ||
    plugin?.download_url ||
    (versions.length > 0 ? resolveVersionUrl(versions[0]) : null);


  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const platforms = (
    plugin?.platforms && plugin.platforms.length
      ? plugin.platforms
      : (plugin?.platform || "")
          .split(/[,/|]/)
          .map((p) => p.trim())
          .filter(Boolean)
  ).map((p) => p.toLowerCase());

  const mcVersions = plugin?.mc_versions ?? [];


  const downloadVersion = async (v: PluginVersion) => {
    if (!plugin) return;
    // Anonymous visitors can't see jar_path (column-level grant) — resolve by version id instead.
    const src = resolveVersionUrl(v);
    const url = src ? await getJarDownloadUrl(src) : await getVersionJarDownloadUrl(v.id);
    if (!url) {
      toast.error("Could not create a download link");
      return;
    }
    const sanitize = (s: string | null) => (s ? s.replace(/\s+/g, "-") : "");
    const filename =
      v.jar_filename ||
      [sanitize(plugin.name), sanitize(plugin.platform), sanitize(v.version)]
        .filter(Boolean)
        .join("-") + ".jar";
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank", "noopener");
    }
    trackDownload();
  };

  const doDownload = async () => {
    if (!plugin || !latestDownloadSource) return;
    const latestDownloadUrl = await getJarDownloadUrl(latestDownloadSource);
    if (!latestDownloadUrl) {
      toast.error("Could not create a download link");
      return;
    }
    const filename = buildJarName(plugin, selectedPlatform);
    try {
      const res = await fetch(latestDownloadUrl);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.open(latestDownloadUrl, "_blank", "noopener");
    }
    trackDownload();
  };

  const handleDownload = () => {
    if (!latestDownloadSource) return;
    if (platforms.length === 1) setSelectedPlatform((p) => p ?? platforms[0]);
    if (mcVersions.length === 1) setSelectedVersion((v) => v ?? mcVersions[0]);
    setDownloadOpen(true);
  };


  const tabs: { id: Tab; label: string }[] = [
    { id: "description", label: "Description" },
    { id: "gallery", label: "Gallery" },
    { id: "versions", label: "Versions" },
    { id: "reviews", label: "Reviews" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageLoader loading={loading} label="Loading plugin" />
      <Navbar />
      <main className="container pt-28 pb-16 max-w-6xl">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link to="/plugins">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to plugins
          </Link>
        </Button>

        {notFound && !loading && (
          <Card className="p-10 text-center">
            <h1 className="text-2xl font-bold mb-2">Plugin not found</h1>
            <p className="text-muted-foreground">
              The plugin you're looking for doesn't exist or isn't published.
            </p>
          </Card>
        )}

        {plugin && (
          <>
            {/* Header — forge slab */}
            <div className="relative rounded-3xl border border-orange-500/25 bg-[radial-gradient(ellipse_at_top_right,hsl(24_95%_53%/0.18),transparent_60%),linear-gradient(135deg,hsl(var(--card))_0%,hsl(var(--background))_100%)] p-6 md:p-8 overflow-hidden">
              <div className="absolute -top-16 -left-16 h-56 w-56 rounded-full bg-orange-500/15 blur-3xl pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
              <div className="relative flex items-start gap-5 flex-wrap md:flex-nowrap">
                {plugin.icon_url ? (
                  <img
                    src={plugin.icon_url}
                    alt=""
                    className="h-24 w-24 rounded-xl object-cover border border-orange-500/30 shrink-0 bg-card shadow-[0_0_25px_-8px_hsl(24_95%_53%/0.4)]"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shrink-0">
                    <Puzzle className="h-12 w-12 text-orange-400" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/40 bg-orange-500/10 px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-widest text-orange-300 mb-2">
                    <Puzzle className="h-3 w-3" /> Plugin
                    {plugin.version && <span className="text-orange-200/70">· v{plugin.version}</span>}
                  </div>
                  <h1 className="text-3xl md:text-5xl font-display font-black leading-[1.05] tracking-tight">
                    {plugin.name}
                  </h1>
                  {plugin.description && (
                    <p className="text-sm md:text-base text-muted-foreground mt-2 line-clamp-2 max-w-2xl">
                      {plugin.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1.5 font-mono">
                      <Download className="h-4 w-4" /> {downloadCount.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1.5 font-mono">
                      <Heart className={`h-4 w-4 ${saved ? "fill-rose-400 text-rose-400" : ""}`} /> {favoriteCount.toLocaleString()}
                    </span>
                    {plugin.category && (
                      <Badge variant="secondary" className="rounded-full">{plugin.category}</Badge>
                    )}
                    {plugin.tags?.slice(0, 2).map((t) => (
                      <Badge key={t} variant="secondary" className="rounded-full">{t}</Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {plugin && user && (isOwner || isAdmin) && (
                    <Button
                      asChild
                      variant="outline"
                      className="rounded-full px-5 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200"
                    >
                      <Link to={`/plugin/${plugin.slug ?? plugin.short_id}/settings`}>
                        <Pencil className="h-4 w-4 mr-1.5" /> Edit
                      </Link>
                    </Button>
                  )}
                  {latestDownloadSource ? (
                    <Button
                      onClick={handleDownload}
                      className="rounded-full px-6 bg-gradient-to-br from-orange-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 text-white shadow-[0_0_20px_-4px_hsl(24_95%_53%/0.6)] border-0"
                    >
                      <Download className="h-4 w-4 mr-1.5" /> Download
                    </Button>
                  ) : (
                    <Button disabled className="rounded-full px-5">Unavailable</Button>
                  )}

                  <Button
                    variant={liked ? "default" : "outline"}
                    size="icon"
                    className={`rounded-full h-10 w-10 ${liked ? "bg-rose-500 hover:bg-rose-500/90 text-white border-rose-500" : ""}`}
                    aria-label={liked ? "Unfavorite" : "Favorite"}
                    onClick={toggleFavorite}
                  >
                    <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
                  </Button>
                  <Button
                    variant={saved ? "default" : "outline"}
                    size="icon"
                    className="rounded-full h-10 w-10"
                    aria-label={saved ? "Remove bookmark" : "Bookmark"}
                    onClick={toggleFavorite}
                  >
                    <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-full h-10 w-10" aria-label="More">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={copyLink}>
                        <LinkIcon className="h-4 w-4 mr-2" /> Copy link
                      </DropdownMenuItem>
                      {latestDownloadSource && (
                        <DropdownMenuItem onClick={handleDownload}>
                          <Download className="h-4 w-4 mr-2" /> Download jar
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          setReportOpen(true);
                        }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Flag className="h-4 w-4 mr-2" /> Report plugin
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {plugin && (
                    <ReportDialog
                      targetType="plugin"
                      targetId={plugin.id}
                      targetLabel={plugin.name}
                      open={reportOpen}
                      onOpenChange={setReportOpen}
                    />
                  )}
                </div>
              </div>
            </div>


            {/* Body: tabs + sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 mt-6">
              <div>
                <div className="flex items-center gap-1 mb-4 border-b border-border/60">
                  {tabs.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`relative px-4 py-2.5 text-sm font-semibold uppercase tracking-wider transition-colors ${
                        tab === t.id
                          ? "text-orange-300"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t.label}
                      {tab === t.id && (
                        <span className="absolute inset-x-2 -bottom-px h-0.5 bg-gradient-to-r from-orange-400 to-rose-500 rounded-full" />
                      )}
                    </button>
                  ))}
                </div>


                <Card className="p-6">
                  {tab === "description" && (
                    <div className="prose prose-invert prose-sm max-w-none text-foreground/90 prose-img:rounded-lg prose-a:text-primary">
                      {platforms.includes("folia") && <FoliaBanner />}
                      <PluginSupportBadges
                        platforms={platforms}
                        discordUrl={plugin.discord_url}
                        sourceUrl={plugin.source_url}
                        wikiUrl={null}
                        issuesUrl={plugin.issues_url}
                        websiteUrl={plugin.website_url}
                      />
                      {plugin.long_description || plugin.description ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeRaw]}
                          components={{
                            a: ({ node, ...props }) => (
                              <a {...props} target="_blank" rel="noreferrer noopener" />
                            ),
                            img: ({ node, ...props }) => (
                              <img {...props} loading="lazy" className="rounded-lg max-w-full h-auto" />
                            ),
                          }}
                        >
                          {plugin.long_description || plugin.description || ""}
                        </ReactMarkdown>
                      ) : (
                        <span className="text-muted-foreground">No description provided.</span>
                      )}
                    </div>
                  )}
                  {tab === "gallery" && (
                    plugin.screenshots?.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {plugin.screenshots.map((url) => (
                          <button
                            key={url}
                            type="button"
                            onClick={() => setLightbox(url)}
                            className="block group text-left"
                          >
                            <img
                              src={url}
                              alt={`${plugin.name} screenshot`}
                              loading="lazy"
                              className="w-full rounded-lg border border-border object-cover aspect-video group-hover:border-primary/50 transition cursor-zoom-in"
                            />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No gallery images yet.</p>
                    )
                  )}
                  {tab === "versions" && (
                    <div className="space-y-2">
                      {versions.length > 0 ? (
                        versions.map((v, i) => {
                          const url = resolveVersionUrl(v);
                          return (
                            <div key={v.id} className="flex items-start justify-between p-3 rounded-md border border-border gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm">v{v.version}</span>
                                  {i === 0 && <Badge>Latest</Badge>}
                                  <span className="text-xs text-muted-foreground">{timeAgo(v.created_at)}</span>
                                </div>
                                {v.jar_filename && (
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    {v.jar_filename}
                                    {v.jar_size ? ` · ${formatSize(v.jar_size)}` : ""}
                                  </div>
                                )}
                                {v.changelog && (
                                  <p className="text-xs text-muted-foreground whitespace-pre-wrap mt-1.5">{v.changelog}</p>
                                )}
                              </div>
                              {url ? (
                                <Button size="sm" variant="outline" onClick={() => downloadVersion(v)}>
                                  <Download className="h-4 w-4 mr-1" /> Download
                                </Button>
                              ) : null}

                            </div>
                          );
                        })
                      ) : latestDownloadSource && plugin ? (
                        <div className="flex items-center justify-between p-3 rounded-md border border-border gap-3">
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">
                              {plugin.jar_filename || buildJarName(plugin)}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                              {plugin.version && <span>v{plugin.version}</span>}
                              {plugin.platform && <span>· {plugin.platform}</span>}
                              {plugin.jar_size ? <span>· {formatSize(plugin.jar_size)}</span> : null}
                            </div>
                          </div>
                          <Button onClick={handleDownload} size="sm" variant="outline">
                            <Download className="h-4 w-4 mr-1" /> Download
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No versions available.</p>
                      )}
                    </div>
                  )}

                  {tab === "reviews" && plugin && (
                    <ItemReviews targetType="plugin" targetId={plugin.id} />
                  )}

                </Card>

              </div>

              {/* Sidebar */}
              <aside className="space-y-4">
                <Card className="p-5">
                  <h3 className="font-bold mb-3">Compatibility</h3>
                  {platforms.length > 0 && (
                    <>
                      <div className="text-sm font-semibold mb-1">Platforms</div>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {platforms.map((p) => (
                          <Badge key={p} variant="secondary" className="rounded-full">
                            <Package className="h-3 w-3 mr-1" />
                            {PLATFORM_LABELS[p] || p}
                          </Badge>
                        ))}
                      </div>
                    </>
                  )}
                  {mcVersions.length > 0 && (() => {
                    const groups = new Map<string, string[]>();
                    const singles: string[] = [];
                    for (const v of mcVersions) {
                      const m = v.match(/^(\d+\.\d+)(?:\.\d+)?$/);
                      if (m) {
                        const arr = groups.get(m[1]) ?? [];
                        arr.push(v);
                        groups.set(m[1], arr);
                      } else {
                        singles.push(v);
                      }
                    }
                    const display: string[] = [];
                    for (const [base, arr] of groups) {
                      if (arr.length >= 3) display.push(`${base}.x`);
                      else display.push(...arr);
                    }
                    display.push(...singles);
                    return (
                      <>
                        <div className="text-sm font-semibold mb-1">Minecraft versions</div>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {display.map((v) => (
                            <Badge key={v} variant="secondary" className="rounded-full">{v}</Badge>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                  <div className="text-sm font-semibold mb-1">Supported environments</div>
                  <Badge variant="secondary" className="rounded-full">
                    <Monitor className="h-3 w-3 mr-1" />
                    Server-side
                  </Badge>
                </Card>


                {plugin.tags?.length > 0 && (
                  <Card className="p-5">
                    <h3 className="font-bold mb-3">Tags</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {plugin.tags.map((t) => (
                        <Badge key={t} variant="secondary" className="rounded-full">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                )}

                {plugin.author && (
                  <Card className="p-5">
                    <h3 className="font-bold mb-3">Creators</h3>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{plugin.author}</div>
                        <div className="text-xs text-muted-foreground">Author</div>
                      </div>
                    </div>
                  </Card>
                )}

                <Card className="p-5">
                  <h3 className="font-bold mb-3">Details</h3>
                  <div className="space-y-2 text-sm">
                    {plugin.version && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Package className="h-4 w-4" /> Version {plugin.version}
                      </div>
                    )}
                    {plugin.created_at && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" /> Published {timeAgo(plugin.created_at)}
                      </div>
                    )}
                    {plugin.updated_at && plugin.updated_at !== plugin.created_at && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" /> Updated {timeAgo(plugin.updated_at)}
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground/70 font-mono pt-1">
                      #{plugin.short_id}
                    </div>
                  </div>
                </Card>
              </aside>
            </div>
          </>
        )}
      </main>
      <Footer />
      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-5xl p-2 bg-background/95 border-border">
          {lightbox && (
            <img
              src={lightbox}
              alt="Screenshot"
              className="w-full h-auto rounded-md object-contain max-h-[85vh]"
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={downloadOpen} onOpenChange={setDownloadOpen}>
        <DialogContent className="max-w-md bg-card border-primary/30 overflow-hidden p-0">
          {/* Forge header slab */}
          <div className="relative px-5 pt-5 pb-4 border-b border-primary/20 overflow-hidden">
            <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ background: "var(--gradient-fire)" }} />
            <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-primary/25 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-orange-500/20 blur-3xl pointer-events-none" />
            <DialogHeader className="relative">
              <div className="text-[10px] uppercase tracking-[0.28em] text-primary font-bold mb-2 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Forge Download
              </div>
              <DialogTitle className="flex items-center gap-3 text-lg">
                {plugin?.icon_url ? (
                  <img src={plugin.icon_url} alt="" className="h-10 w-10 rounded-md object-cover border border-primary/40 shadow-[0_0_20px_rgba(249,115,22,0.25)]" />
                ) : (
                  <div className="h-10 w-10 rounded-md bg-primary/15 border border-primary/40 flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.25)]">
                    <Puzzle className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate font-display font-black">{plugin?.name}</div>
                  {plugin?.version && (
                    <div className="text-[11px] font-mono text-muted-foreground truncate">v{plugin.version}</div>
                  )}
                </div>
              </DialogTitle>
            </DialogHeader>
          </div>

          <div className="space-y-3 px-5 pb-5 pt-4">
            {/* Game version */}
            <div className="rounded-md border border-border bg-background/60 overflow-hidden transition-colors hover:border-primary/40">
              <button
                type="button"
                onClick={() => setVersionOpen((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-primary/5 transition-colors"
              >
                <span className="flex items-center gap-2 text-foreground/90 min-w-0">
                  <Gamepad2 className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Game</span>
                  <span className="font-mono font-semibold truncate">
                    {selectedVersion ?? "Select version"}
                  </span>
                </span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${versionOpen ? "rotate-180" : ""}`} />
              </button>

              <div
                className={`grid transition-all duration-300 ease-out ${
                  versionOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="border-t border-border">
                    {mcVersions.length > 4 && (
                      <div className="p-2">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input
                            value={versionQuery}
                            onChange={(e) => setVersionQuery(e.target.value)}
                            placeholder="Search game versions..."
                            className="h-8 pl-8 text-sm bg-background/60"
                          />
                        </div>
                      </div>
                    )}
                    <div className="max-h-56 overflow-y-auto px-2 pb-2 pt-2 space-y-1">
                      {mcVersions.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground">No supported versions listed.</div>
                      ) : (
                        mcVersions
                          .filter((v) => v.toLowerCase().includes(versionQuery.toLowerCase()))
                          .map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => {
                                setSelectedVersion(v);
                                setVersionOpen(false);
                              }}
                              className={`w-full text-left px-3 py-1.5 rounded text-sm font-mono transition-colors ${
                                selectedVersion === v
                                  ? "bg-primary/15 text-primary border border-primary/30"
                                  : "hover:bg-primary/5 text-foreground/85 border border-transparent"
                              }`}
                            >
                              {v}
                            </button>
                          ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Platform */}
            <div className="rounded-md border border-border bg-background/60 overflow-hidden transition-colors hover:border-primary/40">
              <button
                type="button"
                onClick={() => setPlatformOpen((v) => !v)}
                disabled={platforms.length === 0}
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-primary/5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="flex items-center gap-2 text-foreground/90 min-w-0">
                  <KeyRound className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Platform</span>
                  <span className="font-semibold truncate">
                    {selectedPlatform
                      ? PLATFORM_LABELS[selectedPlatform] ?? selectedPlatform
                      : platforms.length === 0
                        ? "Unknown"
                        : "Select"}
                  </span>
                </span>
                {platforms.length > 0 && (
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${platformOpen ? "rotate-180" : ""}`} />
                )}
              </button>
              <div
                className={`grid transition-all duration-300 ease-out ${
                  platformOpen && platforms.length > 0
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="border-t border-border max-h-56 overflow-y-auto p-2 space-y-1">
                    {platforms.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setSelectedPlatform(p);
                          setPlatformOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
                          selectedPlatform === p
                            ? "bg-primary/15 text-primary border border-primary/30"
                            : "hover:bg-primary/5 text-foreground/85 border border-transparent"
                        }`}
                      >
                        {PLATFORM_LABELS[p] ?? p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>


            {/* Filename preview */}
            <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2.5 flex items-center gap-2 text-sm">
              <Info className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Filename</div>
                <div className="font-mono text-xs truncate text-foreground/90">
                  {plugin ? buildJarName(plugin, selectedPlatform) : ""}
                </div>
              </div>
            </div>

            {/* Glowing forge CTA */}
            <div className="relative group pt-1">
              <div className="absolute -inset-0.5 rounded-md opacity-70 group-hover:opacity-100 blur-md transition-opacity"
                   style={{ background: "var(--gradient-fire)" }} />
              <Button
                onClick={() => {
                  doDownload();
                  setDownloadOpen(false);
                }}
                disabled={!latestDownloadSource}
                className="relative w-full font-display font-bold tracking-wide bg-primary hover:bg-primary/90 shadow-[0_8px_30px_-8px_rgba(249,115,22,0.6)]"
              >
                <Download className="h-4 w-4 mr-2" />
                Forge & Download {plugin?.version ? `v${plugin.version}` : "jar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PluginDetail;
