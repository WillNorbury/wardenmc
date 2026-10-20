import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import AnimatedCounter from "@/components/site/AnimatedCounter";
import ServerStatusWidget from "@/components/site/ServerStatusWidget";
import { supabase } from "@/integrations/supabase/client";
import { partnerSlug } from "@/lib/partnerSlug";
import { changelogSlug } from "@/lib/changelog-slug";
import { userProfilePath } from "@/lib/userSlug";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  ArrowRight,
  BookOpen,
  ClipboardList,
  Download,
  Handshake,
  HelpCircle,
  MessageCircle,
  Package,
  Shield,
  Users,
} from "lucide-react";
import DiscordMark from "@/components/site/DiscordMark";

const TILES = [
  { to: "/plugins", icon: Package, title: "Plugins", text: "Browse and download community plugins.", big: true },
  { to: "/posts", icon: MessageCircle, title: "Posts", text: "See what members are sharing." },
  { to: "/staff", icon: Shield, title: "Staff", text: "Meet the team behind WardenMC." },
  { to: "/rules", icon: BookOpen, title: "Rules", text: "How we keep things fair." },
  { to: "/faq", icon: HelpCircle, title: "FAQ", text: "Quick answers to common questions." },
  { to: "/discord", icon: DiscordMark, title: "Discord", text: "Join the conversation.", big: true },
];

type Plugin = { id: string; name: string; slug: string | null; short_id: string; description: string | null };
type Post = { id: string; content: string; created_at: string };
type Entry = { id: string; title: string; category: string; entry_date: string };
type Partner = { id: string; label: string; url: string; description: string | null };
type Member = { id: string; display_name: string | null; mc_username: string | null; avatar_url: string | null; created_at: string };

const SectionHeading = ({ eyebrow, title, to }: { eyebrow: string; title: string; to: string }) => (
  <div className="mb-6 flex items-end justify-between gap-4">
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">{eyebrow}</p>
      <h2 className="font-display text-4xl tracking-wide md:text-5xl">{title}</h2>
    </div>
    <Button asChild variant="ghost" size="sm" className="shrink-0">
      <Link to={to}>
        View all <ArrowRight className="ml-1 h-4 w-4" />
      </Link>
    </Button>
  </div>
);

const Index = () => {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [counts, setCounts] = useState({ plugins: 0, members: 0, posts: 0, downloads: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "WardenMC — Minecraft Community & Plugin Directory";
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [pl, po, ch, pa, mem, plCount, memCount, poCount, dlSum] = await Promise.all([
        supabase.from("plugins").select("id,name,slug,short_id,description").eq("published", true).order("created_at", { ascending: false }).limit(6),
        supabase.from("posts").select("id,content,created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("changelog_entries").select("id,title,category,entry_date").eq("published", true).order("entry_date", { ascending: false }).limit(4),
        supabase.from("partners").select("id,label,url,description").eq("is_active", true).order("sort_order", { ascending: true }).limit(6),
        supabase.from("profiles").select("id,display_name,mc_username,avatar_url,created_at").order("created_at", { ascending: false }).limit(8),
        supabase.from("plugins").select("id", { count: "exact", head: true }).eq("published", true),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("posts").select("id", { count: "exact", head: true }),
        supabase.from("plugin_downloads").select("id", { count: "exact", head: true }),
      ]);
      if (cancelled) return;
      setPlugins((pl.data ?? []) as Plugin[]);
      setPosts((po.data ?? []) as Post[]);
      setEntries((ch.data ?? []) as Entry[]);
      setPartners((pa.data ?? []) as Partner[]);
      setMembers((mem.data ?? []) as Member[]);
      setCounts({
        plugins: plCount.count ?? 0,
        members: memCount.count ?? 0,
        posts: poCount.count ?? 0,
        downloads: dlSum.count ?? 0,
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = [
    { label: "Plugins", value: counts.plugins, icon: Package },
    { label: "Downloads", value: counts.downloads, icon: Download },
    { label: "Members", value: counts.members, icon: Users },
    { label: "Posts", value: counts.posts, icon: MessageCircle },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="aurora relative overflow-hidden pt-40 pb-28">
          <div className="container max-w-[1400px]">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-accent">
              Minecraft · Plugins · Community
            </p>
            <h1 className="font-display text-[clamp(4.5rem,13vw,11rem)] leading-[0.85] tracking-wide">
              GUARD THE
              <br />
              <span className="text-gradient">REALM.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground md:text-xl">
              WardenMC is home to a Minecraft community, a growing plugin directory and the people who build it.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="rounded-full px-8 text-base glow">
                <Link to="/plugins">
                  Explore plugins <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-8 text-base">
                <Link to="/discord">
                  <DiscordMark className="mr-2 h-5 w-5" /> Join Discord
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="container max-w-[1400px]">
          <div className="grid auto-rows-[180px] gap-4 md:grid-cols-4">
            {TILES.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                className={`glass group flex flex-col justify-between rounded-2xl p-6 transition-all hover:-translate-y-1 hover:border-primary/50 ${
                  t.big ? "md:col-span-2" : ""
                }`}
              >
                <t.icon className="h-7 w-7 text-primary transition-colors group-hover:text-accent" />
                <div>
                  <h2 className="font-display text-4xl tracking-wide">{t.title}</h2>
                  <p className="text-muted-foreground">{t.text}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Live server + stats */}
        <section className="container mt-20 max-w-[1400px]">
          <div className="grid gap-4 lg:grid-cols-3">
            <ServerStatusWidget className="lg:col-span-1" />
            <div className="grid grid-cols-2 gap-4 lg:col-span-2">
              {stats.map((s) => (
                <div key={s.label} className="glass flex flex-col justify-center rounded-2xl p-6">
                  <s.icon className="mb-3 h-6 w-6 text-primary" />
                  <p className="font-display text-4xl tracking-wide md:text-5xl">
                    {loading ? "—" : <AnimatedCounter to={s.value} />}
                  </p>
                  <p className="text-sm uppercase tracking-widest text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Latest plugins */}
        <section className="container mt-20 max-w-[1400px]">
          <SectionHeading eyebrow="Fresh from the forge" title="LATEST PLUGINS" to="/plugins" />
          {loading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))}
            </div>
          ) : plugins.length === 0 ? (
            <p className="text-muted-foreground">No plugins yet — check back soon.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {plugins.map((p) => (
                <Link
                  key={p.id}
                  to={`/plugin/${p.slug ?? p.short_id}`}
                  className="glass group rounded-2xl p-5 transition-all hover:-translate-y-1 hover:border-primary/50"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Package className="h-5 w-5 shrink-0 text-primary" />
                    <h3 className="truncate font-display text-2xl tracking-wide">{p.name}</h3>
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {p.description || "A community plugin."}
                  </p>
                  <p className="mt-3 flex items-center gap-1 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    View plugin <ArrowRight className="h-3.5 w-3.5" />
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Latest posts + changelog */}
        <section className="container mt-20 max-w-[1400px]">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <SectionHeading eyebrow="Community" title="LATEST POSTS" to="/posts" />
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-xl" />
                  ))}
                </div>
              ) : posts.length === 0 ? (
                <p className="text-muted-foreground">No posts yet — be the first to share something.</p>
              ) : (
                <div className="divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/60 bg-card/50 backdrop-blur">
                  {posts.map((p) => (
                    <Link key={p.id} to="/posts" className="block px-5 py-4 transition-colors hover:bg-primary/5">
                      <p className="line-clamp-2">{p.content}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div>
              <SectionHeading eyebrow="What's new" title="CHANGELOG" to="/changelog" />
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-xl" />
                  ))}
                </div>
              ) : entries.length === 0 ? (
                <p className="text-muted-foreground">Nothing published yet.</p>
              ) : (
                <div className="divide-y divide-border/50 overflow-hidden rounded-2xl border border-border/60 bg-card/50 backdrop-blur">
                  {entries.map((e) => (
                    <Link
                      key={e.id}
                      to={`/changelog#${changelogSlug(e.title)}`}
                      className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-primary/5"
                    >
                      <ClipboardList className="h-4 w-4 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{e.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(e.entry_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 capitalize">{e.category}</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Newest members */}
        {!loading && members.length > 0 && (
          <section className="container mt-20 max-w-[1400px]">
            <SectionHeading eyebrow="Fresh faces" title="NEWEST MEMBERS" to="/users" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {members.map((m) => {
                const name = m.display_name ?? m.mc_username ?? "Unknown";
                const skin = m.mc_username
                  ? `https://mc-heads.net/avatar/${m.mc_username}/96`
                  : null;
                return (
                  <Link
                    key={m.id}
                    to={userProfilePath({ id: m.id, display_name: m.display_name, mc_username: m.mc_username })}
                    className="glass group flex items-center gap-4 rounded-2xl p-5 transition-all hover:-translate-y-1 hover:border-primary/50"
                  >
                    <Avatar className="h-12 w-12 ring-2 ring-primary/30">
                      <AvatarImage src={skin ?? m.avatar_url ?? undefined} alt={name} />
                      <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold">{name}</h3>
                      <p className="truncate text-xs text-muted-foreground">
                        Joined {new Date(m.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Partners */}
        {partners.length > 0 && (
          <section className="container mt-20 max-w-[1400px]">
            <SectionHeading eyebrow="Our friends" title="PARTNERS" to="/partners" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {partners.map((p) => (
                <Link
                  key={p.id}
                  to={`/partners/${partnerSlug(p.label)}`}
                  className="glass group flex items-center gap-4 rounded-2xl p-5 transition-all hover:-translate-y-1 hover:border-primary/50"
                >
                  <Handshake className="h-6 w-6 shrink-0 text-primary transition-colors group-hover:text-accent" />
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-2xl tracking-wide">{p.label}</h3>
                    <p className="truncate text-sm text-muted-foreground">{p.url}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="container my-24 max-w-[1400px]">
          <div className="aurora relative overflow-hidden rounded-3xl border border-border/60 px-8 py-16 text-center md:py-20">
            <h2 className="font-display text-5xl tracking-wide md:text-6xl">
              READY TO <span className="text-gradient">JOIN?</span>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-muted-foreground">
              Hop on the server, grab a plugin, or say hi in Discord — the realm is waiting.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="rounded-full px-8 glow">
                <Link to="/auth">Create an account</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-8">
                <Link to="/apply">Apply for staff</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
