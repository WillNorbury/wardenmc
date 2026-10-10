import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles,
  Wrench,
  Bug,
  Zap,
  ShieldCheck,
  Plus,
  ArrowRight,
  Radio,
  Maximize2,
  Mail,
  Globe,
  MessageSquareOff,
} from "lucide-react";
import { changelogSlug } from "@/lib/changelog-slug";
import Lightbox from "@/components/site/Lightbox";

type Entry = {
  id: string;
  title: string;
  content: string;
  category: string;
  version: string | null;
  entry_date: string;
  image_url: string | null;
};

const CATEGORIES: { key: string; label: string; icon: any }[] = [
  { key: "feature", label: "Feature", icon: Sparkles },
  { key: "update", label: "Update", icon: Zap },
  { key: "fix", label: "Bug Fix", icon: Bug },
  { key: "balance", label: "Balance", icon: Wrench },
  { key: "security", label: "Security", icon: ShieldCheck },
  { key: "addition", label: "Addition", icon: Plus },
];

const catMeta = (key: string) =>
  CATEGORIES.find((c) => c.key === key) ?? { key, label: key, icon: Zap };

const Changelog = () => {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const openLightbox = (src: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLightboxSrc(src);
  };

  useEffect(() => {
    supabase
      .from("changelog_entries")
      .select("id,title,content,category,version,entry_date,image_url")
      .eq("published", true)
      .order("entry_date", { ascending: false })
      .then(({ data }) => {
        setEntries((data as Entry[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return entries.filter((e) => {
      if (filter !== "all" && e.category !== filter) return false;
      if (!needle) return true;
      return (
        e.title.toLowerCase().includes(needle) ||
        e.content.toLowerCase().includes(needle) ||
        (e.version ?? "").toLowerCase().includes(needle)
      );
    });
  }, [entries, filter, q]);

  const featured = filtered[0];
  const sideEntries = filtered.slice(1, 3);
  const reference = filtered.slice(3, 7);
  const rest = filtered.slice(7);

  const restByDate = useMemo(() => {
    const g: Record<string, Entry[]> = {};
    for (const e of rest) {
      (g[e.entry_date] ||= []).push(e);
    }
    return g;
  }, [rest]);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Helmet>
        <title>Changelog — Warden Network</title>
        <meta
          name="description"
          content="Every patch, fix, and feature shipped to Warden Network — the running log."
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
                Server Updates
              </span>
              <h1 className="text-6xl md:text-8xl font-bold font-display tracking-tighter italic">
                CHANGELOG
              </h1>
            </div>
            <div className="relative group max-w-md w-full">
              <div className="absolute -inset-0.5 bg-primary opacity-20 blur-sm group-focus-within:opacity-40 transition pointer-events-none" />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search patches, features, versions..."
                className="relative w-full bg-card border border-border px-6 py-4 rounded-none focus:outline-none focus:border-primary text-lg font-display tracking-wide text-foreground placeholder:text-muted-foreground"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary font-mono text-xs opacity-50 hidden sm:block">
                [/]
              </div>
            </div>
          </div>

          {/* Notification channels */}
          <div className="-mt-6 flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-widest">
            <span className="text-muted-foreground">Broadcast on:</span>
            <span className="inline-flex items-center gap-1.5 border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 px-2.5 py-1">
              <Globe className="w-3 h-3" strokeWidth={1.5} /> Website
              <span className="ml-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </span>
            <span className="inline-flex items-center gap-1.5 border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 px-2.5 py-1">
              <Mail className="w-3 h-3" strokeWidth={1.5} /> Email subscribers
              <span className="ml-1 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </span>
            <span
              className="inline-flex items-center gap-1.5 border border-border bg-white/5 text-muted-foreground px-2.5 py-1 line-through decoration-primary/60"
              title="Automatic Discord posts are disabled — updates are sent manually."
            >
              <MessageSquareOff className="w-3 h-3" strokeWidth={1.5} /> Discord (manual only)
            </span>
          </div>

          {/* Category filter chips */}
          <div className="flex flex-wrap gap-2 -mt-4">

            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 text-xs font-mono tracking-widest uppercase border transition ${
                filter === "all"
                  ? "bg-primary border-primary text-foreground"
                  : "border-border text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            >
              All
            </button>
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.key}
                  onClick={() => setFilter(c.key)}
                  className={`px-4 py-2 text-xs font-mono tracking-widest uppercase border transition inline-flex items-center gap-2 ${
                    filter === c.key
                      ? "bg-primary border-primary text-foreground"
                      : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                  {c.label}
                </button>
              );
            })}
          </div>

          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground">
              {entries.length === 0 ? "No changelog entries yet." : "No entries match your search."}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Featured hero */}
              {featured && (
                <Link
                  to={`/changelog/${changelogSlug(featured.title)}`}
                  className="md:col-span-8 group relative bg-card overflow-hidden min-h-[320px] md:min-h-[380px] flex flex-col justify-end p-8 border border-border hover:border-primary/40 transition-colors"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent z-10" />
                  {featured.image_url ? (
                    <>
                      <img
                        src={featured.image_url}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-70 z-0 group-hover:opacity-90 group-hover:scale-105 transition-all duration-700"
                      />
                      <button
                        type="button"
                        onClick={openLightbox(featured.image_url)}
                        aria-label="View image"
                        className="absolute top-4 left-4 z-30 w-9 h-9 grid place-items-center bg-black/60 border border-border text-foreground opacity-0 group-hover:opacity-100 hover:bg-primary hover:border-primary transition"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <div
                      className="absolute inset-0 opacity-30 z-0"
                      style={{
                        background:
                          "radial-gradient(circle at 20% 30%, rgba(255,87,34,0.35), transparent 55%)",
                      }}
                    />
                  )}
                  <div className="absolute top-0 right-0 p-4 z-20 flex gap-2 items-center">
                    {featured.version && (
                      <span className="bg-black/40 border border-border text-foreground text-[10px] font-mono px-2 py-1 tracking-widest uppercase">
                        v{featured.version}
                      </span>
                    )}
                    <span className="bg-primary text-foreground text-[10px] font-bold px-2 py-1 tracking-widest uppercase">
                      {catMeta(featured.category).label}
                    </span>
                  </div>
                  <div className="relative z-20 space-y-4">
                    <div className="text-xs font-mono text-primary tracking-widest uppercase">
                      {fmtDate(featured.entry_date)}
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold font-display leading-none group-hover:text-primary transition-colors">
                      {featured.title}
                    </h2>
                    <p className="text-muted-foreground max-w-md line-clamp-2">{featured.content}</p>
                    <div className="flex items-center gap-4 text-xs font-mono text-primary uppercase tracking-widest">
                      <span>Read Entry</span>
                      <div className="h-px w-12 bg-primary group-hover:w-20 transition-all" />
                    </div>
                  </div>
                </Link>
              )}

              {/* Sidebar entries */}
              {sideEntries.length > 0 && (
                <div className="md:col-span-4 flex flex-col gap-6">
                  {sideEntries.map((e, i) => {
                    const meta = catMeta(e.category);
                    return (
                      <Link
                        key={e.id}
                        to={`/changelog/${changelogSlug(e.title)}`}
                        className={`bg-card border-l-4 flex flex-col justify-between min-h-[180px] hover:bg-card transition-all group overflow-hidden ${
                          i === 0
                            ? "border-primary"
                            : "border-border hover:border-primary"
                        }`}
                      >
                        {e.image_url && (
                          <div className="relative h-24 overflow-hidden">
                            <img
                              src={e.image_url}
                              alt=""
                              loading="lazy"
                              className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                            <button
                              type="button"
                              onClick={openLightbox(e.image_url)}
                              aria-label="View image"
                              className="absolute top-2 right-2 z-10 w-8 h-8 grid place-items-center bg-black/60 border border-border text-foreground opacity-0 group-hover:opacity-100 hover:bg-primary hover:border-primary transition"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        <div className="p-6 flex flex-col justify-between flex-1">
                          <div>
                            <div className="text-[10px] font-mono text-primary tracking-widest uppercase mb-2">
                              {meta.label}
                              {e.version ? ` · v${e.version}` : ""}
                            </div>
                            <h3 className="text-xl font-bold font-display group-hover:text-primary transition-colors">
                              {e.title}
                            </h3>
                            <p className="text-muted-foreground text-sm mt-2 line-clamp-2">{e.content}</p>
                          </div>
                          <span className="text-xs font-mono text-muted-foreground mt-4">
                            {fmtDate(e.entry_date)}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Reference row */}
              {reference.length > 0 && (
                <div className="md:col-span-12 mt-8">
                  <div className="flex items-center gap-4 mb-6">
                    <h2 className="text-sm font-mono text-primary uppercase tracking-[0.3em]">
                      Recent Patches
                    </h2>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {reference.map((e) => {
                      const meta = catMeta(e.category);
                      const Icon = meta.icon;
                      return (
                        <Link
                          key={e.id}
                          to={`/changelog/${changelogSlug(e.title)}`}
                          className="bg-card border border-border hover:border-primary/30 transition group overflow-hidden flex flex-col"
                        >
                          {e.image_url && (
                            <div className="relative h-32 overflow-hidden">
                              <img
                                src={e.image_url}
                                alt=""
                                loading="lazy"
                                className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                              <button
                                type="button"
                                onClick={openLightbox(e.image_url)}
                                aria-label="View image"
                                className="absolute top-2 right-2 z-10 w-8 h-8 grid place-items-center bg-black/60 border border-border text-foreground opacity-0 group-hover:opacity-100 hover:bg-primary hover:border-primary transition"
                              >
                                <Maximize2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                          <div className="p-6 flex flex-col flex-1">
                            <div className="text-primary mb-4 flex items-center justify-between">
                              <Icon className="w-6 h-6" strokeWidth={1.5} />
                              {e.version && (
                                <span className="text-[10px] font-mono text-muted-foreground tracking-widest">
                                  v{e.version}
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold font-display group-hover:text-primary transition-colors">
                              {e.title}
                            </h4>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{e.content}</p>
                            <div className="text-[10px] font-mono text-muted-foreground mt-3 tracking-widest uppercase">
                              {fmtDate(e.entry_date)}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Remaining entries grouped by date */}
              {Object.entries(restByDate).map(([date, arr]) => (
                <div key={date} className="md:col-span-12 mt-4">
                  <div className="flex items-center gap-4 mb-6">
                    <h2 className="text-sm font-mono text-primary uppercase tracking-[0.3em]">
                      {fmtDate(date)}
                    </h2>
                    <div className="flex-1 h-px bg-white/5" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {arr.map((e) => {
                      const meta = catMeta(e.category);
                      const Icon = meta.icon;
                      return (
                        <Link
                          key={e.id}
                          to={`/changelog/${changelogSlug(e.title)}`}
                          className="p-6 bg-card border border-border hover:border-primary/30 transition group flex flex-col"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-mono tracking-widest uppercase text-primary">
                              <Icon className="w-3 h-3" strokeWidth={1.8} />
                              {meta.label}
                            </span>
                            {e.version && (
                              <span className="text-[10px] font-mono text-muted-foreground tracking-widest">
                                v{e.version}
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold font-display group-hover:text-primary transition-colors">
                            {e.title}
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{e.content}</p>
                          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border text-[10px] font-mono text-muted-foreground tracking-widest">
                            <span>READ ENTRY</span>
                            <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Footer strip */}
              <div className="md:col-span-12 flex flex-col md:flex-row gap-4 items-center justify-between mt-6 pt-6 border-t border-border">
                <div className="flex flex-wrap gap-6 md:gap-8">
                  <Link
                    to="/wiki"
                    className="text-xs font-mono text-muted-foreground hover:text-primary tracking-widest transition"
                  >
                    WIKI
                  </Link>
                  <Link
                    to="/store"
                    className="text-xs font-mono text-muted-foreground hover:text-primary tracking-widest transition"
                  >
                    STORE
                  </Link>
                  <Link
                    to="/servers-status"
                    className="text-xs font-mono text-muted-foreground hover:text-primary tracking-widest transition"
                  >
                    SERVER STATUS
                  </Link>
                  <Link
                    to="/discord"
                    className="text-xs font-mono text-primary hover:text-foreground tracking-widest transition"
                  >
                    DISCORD
                  </Link>
                </div>
                <div className="text-[10px] text-foreground/20 font-mono flex items-center gap-2">
                  <Radio className="w-3 h-3" /> WARDEN NETWORK BROADCAST
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      <Footer />
    </div>
  );
};

export default Changelog;
