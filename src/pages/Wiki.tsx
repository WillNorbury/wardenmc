import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { BookOpen, Command, Award, Scale, Users, MessageCircle, LifeBuoy, FileText } from "lucide-react";

type Article = {
  id: string;
  slug: string;
  title: string;
  category: string | null;
  excerpt: string | null;
  updated_at?: string | null;
};

const iconFor = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes("command")) return Command;
  if (t.includes("rank") || t.includes("perk")) return Award;
  if (t.includes("ban") || t.includes("appeal") || t.includes("rule")) return Scale;
  if (t.includes("staff") || t.includes("apply")) return Users;
  if (t.includes("vote") || t.includes("reward")) return Award;
  if (t.includes("support") || t.includes("help")) return LifeBuoy;
  if (t.includes("discord")) return MessageCircle;
  return FileText;
};

export default function Wiki() {
  const [items, setItems] = useState<Article[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError(false);
    const { data, error } = await supabase
      .from("wiki_articles")
      .select("id, slug, title, category, excerpt, updated_at")
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true });
    if (error) setLoadError(true);
    else setItems((data as Article[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (a) =>
        a.title.toLowerCase().includes(needle) ||
        (a.excerpt ?? "").toLowerCase().includes(needle) ||
        (a.category ?? "").toLowerCase().includes(needle),
    );
  }, [items, q]);

  const featured = filtered[0];
  const sideArticles = filtered.slice(1, 3);
  const referenceArticles = filtered.slice(3, 7);
  const rest = filtered.slice(7);

  const restByCategory = useMemo(() => {
    const g: Record<string, Article[]> = {};
    for (const a of rest) {
      const c = a.category || "More";
      (g[c] ||= []).push(a);
    }
    return g;
  }, [rest]);

  const relative = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso).getTime();
    const diff = Date.now() - d;
    const days = Math.floor(diff / 86_400_000);
    if (days < 1) return "Updated today";
    if (days === 1) return "Updated 1 day ago";
    if (days < 30) return `Updated ${days} days ago`;
    const months = Math.floor(days / 30);
    return `Updated ${months} month${months === 1 ? "" : "s"} ago`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Helmet>
        <title>Wiki — Warden Network Knowledge Hub</title>
        <meta
          name="description"
          content="Warden Network wiki: guides, mechanics, commands, ranks, appeals and community how-tos."
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;500;700&display=swap"
          rel="stylesheet"
        />
      </Helmet>
      <Navbar />
      <main className="flex-1 w-full">
        <div className="max-w-6xl w-full mx-auto px-4 md:px-8 py-10 md:py-14 flex flex-col gap-12">
          {/* Header & Search */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border pb-8">
            <div className="space-y-2">
              <span className="text-primary font-mono text-sm tracking-widest uppercase">
                Knowledge Hub
              </span>
              <h1 className="text-6xl md:text-8xl font-bold font-display tracking-tighter italic">
                WIKI
              </h1>
            </div>
            <div className="relative group max-w-md w-full">
              <div className="absolute -inset-0.5 bg-primary opacity-20 blur-sm group-focus-within:opacity-40 transition pointer-events-none" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search the archives..."
                className="relative w-full bg-card border border-border px-6 py-4 rounded-none focus:outline-none focus:border-primary text-lg font-display tracking-wide text-foreground placeholder:text-muted-foreground"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary font-mono text-xs opacity-50 hidden sm:block">
                [/]
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-8 min-h-[320px] bg-card border border-border animate-pulse" />
              <div className="md:col-span-4 flex flex-col gap-6">
                <div className="flex-1 min-h-[150px] bg-card border border-border animate-pulse" />
                <div className="flex-1 min-h-[150px] bg-card border border-border animate-pulse" />
              </div>
            </div>
          ) : loadError ? (
            <div className="border border-border bg-card p-10 text-center space-y-4">
              <p className="text-muted-foreground">Couldn't load the wiki right now.</p>
              <button
                onClick={load}
                className="px-5 py-2 bg-primary text-foreground text-xs font-mono uppercase tracking-widest hover:opacity-90 transition"
              >
                Try again
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground">
              {items.length === 0 ? "No articles yet." : "No articles match your search."}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Featured */}
              {featured && (
                <Link
                  to={`/wiki/${featured.slug}`}
                  className="md:col-span-8 group relative bg-card overflow-hidden min-h-[320px] md:min-h-[380px] flex flex-col justify-end p-8 border border-border hover:border-primary/40 transition-colors"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10" />
                  <div
                    className="absolute inset-0 opacity-30 z-0"
                    style={{
                      background:
                        "radial-gradient(circle at 20% 30%, rgba(255,87,34,0.35), transparent 55%)",
                    }}
                  />
                  <div className="absolute top-0 right-0 p-4 z-20">
                    <span className="bg-primary text-foreground text-[10px] font-bold px-2 py-1 tracking-widest uppercase">
                      {featured.category || "Featured"}
                    </span>
                  </div>
                  <div className="relative z-20 space-y-4">
                    <h2 className="text-4xl md:text-5xl font-bold font-display leading-none group-hover:text-primary transition-colors">
                      {featured.title}
                    </h2>
                    {featured.excerpt && (
                      <p className="text-muted-foreground max-w-md line-clamp-2">{featured.excerpt}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs font-mono text-primary uppercase tracking-widest">
                      <span>Read Entry</span>
                      <div className="h-px w-12 bg-primary group-hover:w-20 transition-all" />
                    </div>
                  </div>
                </Link>
              )}

              {/* Sidebar */}
              {sideArticles.length > 0 && (
                <div className="md:col-span-4 flex flex-col gap-6">
                  {sideArticles.map((a, i) => (
                    <Link
                      key={a.id}
                      to={`/wiki/${a.slug}`}
                      className={`bg-card p-6 border-l-4 flex flex-col justify-between min-h-[180px] hover:bg-card transition-all group ${
                        i === 0 ? "border-primary" : "border-border hover:border-primary"
                      }`}
                    >
                      <h3 className="text-xl font-bold font-display group-hover:text-primary transition-colors">
                        {a.title}
                      </h3>
                      {a.excerpt && (
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{a.excerpt}</p>
                      )}
                      <span className="text-xs font-mono text-muted-foreground">
                        {a.category ? a.category.toUpperCase() : relative(a.updated_at)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              {/* Reference row */}
              {referenceArticles.length > 0 && (
                <div className="md:col-span-12 mt-8">
                  <div className="flex items-center gap-4 mb-6">
                    <h2 className="text-sm font-mono text-primary uppercase tracking-[0.3em]">
                      Reference Material
                    </h2>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {referenceArticles.map((a) => {
                      const Icon = iconFor(a.title);
                      return (
                        <Link
                          key={a.id}
                          to={`/wiki/${a.slug}`}
                          className="p-6 bg-card border border-border hover:border-primary/30 transition group"
                        >
                          <div className="text-primary mb-4">
                            <Icon className="w-6 h-6" strokeWidth={1.5} />
                          </div>
                          <h4 className="font-bold font-display group-hover:text-primary transition-colors">
                            {a.title}
                          </h4>
                          {a.excerpt && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.excerpt}</p>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Remaining sections by category */}
              {Object.entries(restByCategory).map(([cat, arr]) => (
                <div key={cat} className="md:col-span-12 mt-4">
                  <div className="flex items-center gap-4 mb-6">
                    <h2 className="text-sm font-mono text-primary uppercase tracking-[0.3em]">
                      {cat}
                    </h2>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {arr.map((a) => (
                      <Link
                        key={a.id}
                        to={`/wiki/${a.slug}`}
                        className="p-6 bg-card border border-border hover:border-primary/30 transition group"
                      >
                        <h4 className="font-bold font-display group-hover:text-primary transition-colors">
                          {a.title}
                        </h4>
                        {a.excerpt && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.excerpt}</p>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}

              {/* Footer strip */}
              <div className="md:col-span-12 flex flex-col md:flex-row gap-4 items-center justify-between mt-6 pt-6 border-t border-border">
                <div className="flex flex-wrap gap-6 md:gap-8">
                  <Link
                    to="/support"
                    className="text-xs font-mono text-muted-foreground hover:text-primary tracking-widest transition"
                  >
                    GETTING SUPPORT
                  </Link>
                  <Link
                    to="/discord"
                    className="text-xs font-mono text-muted-foreground hover:text-primary tracking-widest transition"
                  >
                    DISCORD HUB
                  </Link>
                  <Link
                    to="/changelog"
                    className="text-xs font-mono text-muted-foreground hover:text-primary tracking-widest transition"
                  >
                    LATEST UPDATES
                  </Link>
                  <Link
                    to="/servers-status"
                    className="text-xs font-mono text-muted-foreground hover:text-primary tracking-widest transition"
                  >
                    SERVER STATUS
                  </Link>
                  <Link
                    to="/wiki/more"
                    className="text-xs font-mono text-primary hover:text-foreground tracking-widest transition"
                  >
                    MORE WIKI
                  </Link>
                </div>
                <div className="text-[10px] text-foreground/20 font-mono flex items-center gap-2">
                  <BookOpen className="w-3 h-3" /> WARDEN NETWORK ARCHIVE
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
