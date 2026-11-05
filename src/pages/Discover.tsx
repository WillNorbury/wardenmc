import { FormEvent, ReactNode, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHero, GlassCard, Reveal } from "@/components/site/ui-kit";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { loadPluginDirectory, formatCompactNumber, type PluginDirectoryItem } from "@/lib/plugin-directory";
import { fetchPosts, relativeTime, type Post } from "@/lib/posts";
import { partnerSlug } from "@/lib/partnerSlug";
import { popularity, recommendPlugins } from "@/lib/discover";
import {
  ArrowRight, Search as SearchIcon, Server, Puzzle, Gamepad2, Users, Radio, MessageSquare,
  Building2, Handshake, Film, Flame, Star, Sparkles, Heart, Download, AlertTriangle, Compass,
} from "lucide-react";

type ServerRow = { id: string; name: string; slug: string; description: string | null; icon_url: string | null; tags: string[] | null; featured: boolean; created_at?: string; updated_at: string };
type OrgRow = { id: string; slug: string | null; name: string; description: string | null; avatar_url: string | null; created_at?: string };
type PartnerRow = { id: string; label: string; description: string | null; url: string | null };
type Stream = { login: string; displayName: string; isLive: boolean; title: string | null; viewerCount: number; profileImage?: string; gameName?: string | null };

const QUICK = [
  { label: "Servers", to: "/servers", icon: Server },
  { label: "Plugins", to: "/plugins", icon: Puzzle },
  { label: "Gamemodes", to: "/gamemodes", icon: Gamepad2 },
  { label: "Community", to: "/community", icon: Users },
  { label: "Streams", to: "/live", icon: Radio },
];

const CATEGORIES = [
  { label: "Servers", to: "/servers", icon: Server, desc: "Minecraft servers to join" },
  { label: "Plugins", to: "/plugins", icon: Puzzle, desc: "Tools for your server" },
  { label: "Gamemodes", to: "/gamemodes", icon: Gamepad2, desc: "Ways to play on WardenMC" },
  { label: "Community", to: "/community", icon: Users, desc: "Discord, members & more" },
  { label: "Posts", to: "/posts", icon: MessageSquare, desc: "What players are saying" },
  { label: "Organizations", to: "/organizations", icon: Building2, desc: "Teams building together" },
  { label: "Partners", to: "/partners", icon: Handshake, desc: "Communities we work with" },
  { label: "Live", to: "/live", icon: Radio, desc: "Watch our streamers" },
  { label: "Clips", to: "/clips", icon: Film, desc: "Highlights from players" },
];

const CHANNELS = ["will_norbury", "spectordev"];

const truncate = (s: string, n = 110) => (s.length > n ? `${s.slice(0, n)}…` : s);

function Section({ icon, title, action, children }: { icon: ReactNode; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="container max-w-[1400px] pb-14">
      <Reveal>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-2xl font-black tracking-tight md:text-3xl">
            <span className="text-primary">{icon}</span>{title}
          </h2>
          {action}
        </div>
        {children}
      </Reveal>
    </section>
  );
}

const Grid = ({ children }: { children: ReactNode }) => <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
const Loading = ({ n = 3 }: { n?: number }) => <Grid>{Array.from({ length: n }).map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}</Grid>;
const Empty = ({ text }: { text: string }) => <GlassCard className="p-8 text-center text-sm text-muted-foreground">{text}</GlassCard>;
const ErrorNote = ({ onRetry }: { onRetry: () => void }) => (
  <GlassCard className="flex flex-col items-center gap-3 p-8 text-center text-sm text-muted-foreground">
    <AlertTriangle className="h-5 w-5 text-destructive" />Couldn't load this section.
    <Button size="sm" variant="outline" onClick={onRetry}>Try again</Button>
  </GlassCard>
);

function Card({ to, external, icon, image, kind, title, text, meta, highlight }: {
  to: string; external?: boolean; icon: ReactNode; image?: string | null; kind: string; title: string; text?: string | null; meta?: ReactNode; highlight?: boolean;
}) {
  const body = (
    <GlassCard interactive glow={highlight} className={`group flex h-full gap-4 p-5 ${highlight ? "border-primary/40" : ""}`}>
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted/40 text-primary">
        {image ? <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" /> : icon}
      </div>
      <div className="min-w-0 flex-1">
        <Badge variant="outline" className="mb-1.5 text-[10px] uppercase tracking-wider">{kind}</Badge>
        <h3 className="truncate font-display font-semibold transition-colors group-hover:text-primary">{title}</h3>
        {text && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{text}</p>}
        {meta && <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">{meta}</div>}
      </div>
    </GlassCard>
  );
  return external
    ? <a href={to} target="_blank" rel="noopener noreferrer" className="block h-full">{body}</a>
    : <Link to={to} className="block h-full">{body}</Link>;
}

const pluginCard = (p: PluginDirectoryItem, kind = "Plugin", highlight = false) => (
  <Card key={`p-${p.id}-${kind}`} to={`/plugin/${p.slug}`} icon={<Puzzle className="h-5 w-5" />} image={p.icon} kind={kind} title={p.name} text={p.description} highlight={highlight}
    meta={<><span className="flex items-center gap-1"><Download className="h-3 w-3" />{formatCompactNumber(p.downloads)}</span><span className="flex items-center gap-1"><Heart className="h-3 w-3" />{formatCompactNumber(p.favorites)}</span><span>{p.category}</span></>} />
);
const serverCard = (s: ServerRow, kind = "Server", highlight = false) => (
  <Card key={`s-${s.id}-${kind}`} to={`/server/${s.slug}`} icon={<Server className="h-5 w-5" />} image={s.icon_url} kind={kind} title={s.name} text={s.description} highlight={highlight}
    meta={s.tags?.length ? <span>{s.tags.slice(0, 3).join(" · ")}</span> : undefined} />
);
const postCard = (p: Post, kind = "Post", highlight = false) => (
  <Card key={`po-${p.id}-${kind}`} to="/posts" icon={<MessageSquare className="h-5 w-5" />} image={p.author?.avatar_url} kind={kind}
    title={p.author?.display_name || p.author?.mc_username || "Member"} text={truncate(p.content)} highlight={highlight}
    meta={<><span className="flex items-center gap-1"><Heart className="h-3 w-3" />{p.likes}</span><span>{relativeTime(p.created_at)}</span></>} />
);

export default function Discover() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [plugins, setPlugins] = useState<PluginDirectoryItem[]>([]);
  const [servers, setServers] = useState<ServerRow[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);

  useEffect(() => { document.title = "Discover — WardenMC"; }, []);

  const load = async () => {
    setLoading(true);
    const errs: Record<string, boolean> = {};
    const [pl, sv, po, og, pa] = await Promise.allSettled([
      loadPluginDirectory(user?.id ?? null),
      supabase.from("user_servers" as any).select("id, name, slug, description, icon_url, tags, featured, created_at, updated_at").eq("published", true).order("created_at", { ascending: false }).limit(30),
      fetchPosts({ viewerId: user?.id ?? null }),
      supabase.from("organizations").select("id, slug, name, description, avatar_url, created_at").order("created_at", { ascending: false }).limit(6),
      supabase.from("partners").select("id, label, description, url").eq("is_active", true).limit(6),
    ]);
    if (pl.status === "fulfilled") setPlugins(pl.value as PluginDirectoryItem[]); else errs.plugins = true;
    if (sv.status === "fulfilled" && !(sv.value as any).error) setServers(((sv.value as any).data ?? []) as ServerRow[]); else errs.servers = true;
    if (po.status === "fulfilled") setPosts(((po.value as Post[]) ?? []).filter((p) => !p.reply_to)); else if (user) errs.posts = true;
    if (og.status === "fulfilled" && !og.value.error) setOrgs((og.value.data ?? []) as OrgRow[]); else errs.orgs = true;
    if (pa.status === "fulfilled" && !pa.value.error) setPartners((pa.value.data ?? []) as PartnerRow[]); else errs.partners = true;
    setErrors(errs);
    setLoading(false);

    const base = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const live = await Promise.all(CHANNELS.map(async (login) => {
      try {
        const r = await fetch(`${base}/functions/v1/twitch-status?login=${login}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
        return r.ok ? ((await r.json()) as Stream) : null;
      } catch { return null; }
    }));
    setStreams(live.filter((s): s is Stream => !!s?.isLive));
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/search?q=${encodeURIComponent(term)}` : "/search");
  };

  const topPlugins = [...plugins].sort((a, b) => popularity(b) - popularity(a));
  const topPosts = [...posts].sort((a, b) => b.likes + b.replies - (a.likes + a.replies));
  const anyError = Object.keys(errors).length > 0;

  const trending: ReactNode[] = [
    ...streams.map((s) => <Card key={`st-${s.login}`} to={`/live?tab=${s.login === "spectordev" ? "SpectorDev" : "WillNorbury"}`} icon={<Radio className="h-5 w-5" />} image={s.profileImage} kind="Live now" title={s.displayName} text={s.title} highlight meta={<span>{s.viewerCount} watching{s.gameName ? ` · ${s.gameName}` : ""}</span>} />),
    ...topPlugins.slice(0, 3).map((p) => pluginCard(p, "Trending plugin")),
    ...servers.slice(0, 2).map((s) => serverCard(s, "Popular server")),
    ...topPosts.filter((p) => p.likes > 0).slice(0, 2).map((p) => postCard(p, "Popular post")),
    ...[...new Map(topPlugins.map((p) => [p.developer.username, p.developer])).values()].slice(0, 1).map((d) => (
      <Card key={`d-${d.id}`} to={d.profilePath ?? "/plugins/developers"} icon={<Users className="h-5 w-5" />} image={d.avatar} kind="Featured creator" title={d.displayName} text={d.bio} />
    )),
  ].slice(0, 9);

  const featServer = servers.find((s) => s.featured);
  const featPlugin = plugins.find((p) => p.featured) ?? topPlugins[0];
  const featPost = topPosts[0];
  const featPartner = partners[0];
  const featured: ReactNode[] = [
    featServer && serverCard(featServer, "Featured server", true),
    featPlugin && pluginCard(featPlugin, "Featured plugin", true),
    featPost && postCard(featPost, "Featured post", true),
    featPartner && <Card key={`pa-${featPartner.id}`} to={`/partners/${partnerSlug(featPartner.label)}`} icon={<Handshake className="h-5 w-5" />} kind="Featured partner" title={featPartner.label} text={featPartner.description} highlight />,
  ].filter(Boolean) as ReactNode[];

  const newestPlugins = [...plugins].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const fresh = [
    { title: "Servers", to: "/servers", items: servers.slice(0, 3).map((s) => serverCard(s, "New server")) },
    { title: "Plugins", to: "/plugins", items: newestPlugins.slice(0, 3).map((p) => pluginCard(p, "New plugin")) },
    { title: "Posts", to: "/posts", items: posts.slice(0, 3).map((p) => postCard(p, "New post")) },
    { title: "Organizations", to: "/organizations", items: orgs.slice(0, 3).map((o) => <Card key={`o-${o.id}`} to={o.slug ? `/organization/${o.slug}` : "/organizations"} icon={<Building2 className="h-5 w-5" />} image={o.avatar_url} kind="New organization" title={o.name} text={o.description} />) },
  ];

  const rec = recommendPlugins(plugins);

  return (
    <div className="pb-10">
      <PageHero eyebrow="Discover" title="Discover" highlight="WardenMC" description="Explore servers, plugins, creators, community content and more.">
        <form onSubmit={onSearch} className="relative max-w-2xl" role="search">
          <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search plugins, players, posts, partners…" aria-label="Search WardenMC" className="h-14 rounded-lg pl-12 pr-28 text-base" />
          <Button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2">Search</Button>
        </form>
        <div className="mt-5 flex flex-wrap gap-2">
          {QUICK.map((c) => (
            <Button key={c.to} asChild variant="outline" size="sm" className="rounded-full">
              <Link to={c.to}><c.icon className="mr-1.5 h-4 w-4" />{c.label}</Link>
            </Button>
          ))}
        </div>
      </PageHero>

      {anyError && !loading && (
        <div className="container max-w-[1400px] pb-6"><ErrorNote onRetry={load} /></div>
      )}

      <Section icon={<Flame className="h-6 w-6" />} title="Trending Now">
        {loading ? <Loading n={6} /> : trending.length ? <Grid>{trending}</Grid> : <Empty text="Nothing trending yet — check back soon." />}
      </Section>

      <Section icon={<Star className="h-6 w-6" />} title="Featured on WardenMC">
        {loading ? <Loading n={4} /> : featured.length
          ? <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 md:p-6"><div className="grid gap-4 sm:grid-cols-2">{featured}</div></div>
          : <Empty text="No featured picks right now." />}
      </Section>

      {user ? (
        <Section icon={<Sparkles className="h-6 w-6" />} title="Recommended for You" action={<p className="text-sm text-muted-foreground">{rec.personalised ? "Based on plugins you've favourited" : "Popular picks — favourite plugins to personalise this"}</p>}>
          {loading ? <Loading /> : rec.items.length ? <Grid>{rec.items.map((p) => pluginCard(p, "For you"))}</Grid> : <Empty text="No recommendations yet." />}
        </Section>
      ) : (
        <Section icon={<Sparkles className="h-6 w-6" />} title="Popular with Players" action={<Button asChild variant="ghost" size="sm"><Link to="/auth">Sign in for picks made for you <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>}>
          {loading ? <Loading /> : rec.items.length ? <Grid>{rec.items.map((p) => pluginCard(p, "Popular"))}</Grid> : <Empty text="Nothing here yet." />}
        </Section>
      )}

      <Section icon={<Compass className="h-6 w-6" />} title="New on WardenMC">
        <div className="space-y-8">
          {fresh.map((f) => (
            <div key={f.title}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">{f.title}</h3>
                <Button asChild variant="outline" size="sm"><Link to={f.to}>View All <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
              </div>
              {loading ? <Loading /> : f.items.length ? <Grid>{f.items}</Grid> : <Empty text={`No new ${f.title.toLowerCase()} yet.`} />}
            </div>
          ))}
        </div>
      </Section>

      <Section icon={<Compass className="h-6 w-6" />} title="Explore by Category">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
          {CATEGORIES.map((c) => (
            <Link key={c.to + c.label} to={c.to} className="block">
              <GlassCard interactive className="group h-full p-4 text-center">
                <c.icon className="mx-auto mb-3 h-7 w-7 text-primary transition-transform group-hover:scale-110" />
                <div className="font-display font-semibold">{c.label}</div>
                <p className="mt-1 text-xs text-muted-foreground">{c.desc}</p>
              </GlassCard>
            </Link>
          ))}
        </div>
      </Section>
    </div>
  );
}
