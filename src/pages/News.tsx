import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, Search, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { GlassCard, PageHero, Reveal } from "@/components/site/ui-kit";

type Priority = "low" | "normal" | "high" | "urgent";

type News = {
  id: string;
  title: string;
  excerpt: string | null;
  content: string;
  slug: string;
  cover_url: string | null;
  priority: Priority;
  created_at: string;
};

const priorityColor: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-primary/10 text-primary",
  high: "bg-amber-500/15 text-amber-500",
  urgent: "bg-destructive/15 text-destructive",
};

const priorityAccent: Record<string, string> = {
  low: "from-muted to-muted/80",
  normal: "from-primary/80 to-primary/40",
  high: "from-amber-600/80 to-amber-500/40",
  urgent: "from-destructive/80 to-destructive/40",
};

const PRIORITIES: (Priority | "all")[] = ["all", "urgent", "high", "normal", "low"];

const NewsPage = () => {
  const [items, setItems] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<Priority | "all">("all");

  const load = () => {
    setLoading(true);
    setLoadError(false);
    supabase
      .from("news")
      .select("id,title,excerpt,content,slug,cover_url,priority,created_at")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setLoadError(true);
        else setItems((data ?? []) as News[]);
        setLoading(false);
      });
  };

  useEffect(() => {
    document.title = "News — Warden Network";
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((n) => {
      if (priority !== "all" && n.priority !== priority) return false;
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        (n.excerpt ?? "").toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q)
      );
    });
  }, [items, query, priority]);

  const [featured, ...rest] = filtered;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1">
        <PageHero
          eyebrow={<><Megaphone className="h-3 w-3 mr-1" /> Announcements</>}
          title="Latest"
          highlight="News"
          description="Updates, patch notes and announcements straight from the Warden Network team."
        />

        <section className="container pb-24 max-w-[1400px]">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between mb-10">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search news…"
                aria-label="Search news"
                className="pl-9 bg-card/60 backdrop-blur-xl"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {PRIORITIES.map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={priority === p ? "premium" : "glass"}
                  className="rounded-full capitalize"
                  onClick={() => setPriority(p)}
                >
                  {p}
                </Button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-2xl" />
              ))}
            </div>
          ) : loadError ? (
            <GlassCard className="max-w-md mx-auto p-12 text-center">
              <Megaphone className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h2 className="text-lg font-medium">Couldn't load the news</h2>
              <p className="text-muted-foreground text-sm mt-1">Check your connection and try again</p>
              <Button variant="premium" size="sm" className="mt-4 rounded-full" onClick={load}>Try again</Button>
            </GlassCard>
          ) : filtered.length === 0 ? (
            <GlassCard className="max-w-md mx-auto p-12 text-center">
              <Megaphone className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h2 className="text-lg font-medium">
                {items.length === 0 ? "No news yet" : "Nothing matches that filter"}
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                {items.length === 0 ? "Check back later for updates" : "Try a different search or priority"}
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-10">
              {/* Featured */}
              <Reveal>
                <GlassCard interactive className="overflow-hidden">
                  <Link to={`/news/${featured.slug}`} className="grid md:grid-cols-2 group">
                    <div className="relative h-56 md:h-full min-h-[14rem] overflow-hidden">
                      {featured.cover_url ? (
                        <img
                          src={featured.cover_url}
                          alt={featured.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className={`h-full w-full bg-gradient-to-br ${priorityAccent[featured.priority] || priorityAccent.normal} flex items-center justify-center`}>
                          <Megaphone className="h-12 w-12 text-primary-foreground/80" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent md:bg-gradient-to-r" />
                    </div>
                    <div className="p-6 md:p-8 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className={`${priorityColor[featured.priority] || ""} text-[10px] capitalize`}>
                          {featured.priority}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(featured.created_at), "MMM d, yyyy")}
                        </span>
                      </div>
                      <h2 className="font-display text-2xl md:text-3xl font-black tracking-tight mb-3">
                        {featured.title}
                      </h2>
                      <p className="text-muted-foreground line-clamp-3">
                        {featured.excerpt || featured.content}
                      </p>
                      <span className="mt-5 inline-flex items-center gap-2 text-primary font-medium text-sm">
                        Read article
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </Link>
                </GlassCard>
              </Reveal>

              {rest.length > 0 && (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((n, i) => (
                    <Reveal key={n.id} delay={i * 50}>
                      <GlassCard interactive className="h-full overflow-hidden">
                        <Link to={`/news/${n.slug}`} className="group block h-full">
                          <div className="relative h-44 overflow-hidden">
                            {n.cover_url ? (
                              <img
                                src={n.cover_url}
                                alt={n.title}
                                loading="lazy"
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className={`h-full w-full bg-gradient-to-br ${priorityAccent[n.priority] || priorityAccent.normal} flex items-center justify-center transition-transform duration-500 group-hover:scale-105`}>
                                <Megaphone className="h-10 w-10 text-primary-foreground/80" />
                              </div>
                            )}
                          </div>
                          <div className="p-5">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={`${priorityColor[n.priority] || ""} text-[10px] capitalize`}>
                                {n.priority}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(n.created_at), "MMM d, yyyy")}
                              </span>
                            </div>
                            <h3 className="font-semibold truncate">{n.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {n.excerpt || n.content}
                            </p>
                          </div>
                        </Link>
                      </GlassCard>
                    </Reveal>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default NewsPage;
