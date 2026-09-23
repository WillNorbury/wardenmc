import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { SEO } from "@/components/site/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard, PageHero, Reveal } from "@/components/site/ui-kit";
import { toUserSlug } from "@/lib/userSlug";
import { cn } from "@/lib/utils";
import { Calendar, Crown, Loader2, Sparkles, Trophy } from "lucide-react";

type Winner = { place?: number; player?: string; category?: string; prize?: string };
type Highlight = { title?: string; body?: string };

type Season = {
  id: string;
  slug: string;
  name: string;
  number: number | null;
  theme: string | null;
  summary: string | null;
  description: string | null;
  banner_url: string | null;
  starts_at: string | null;
  ends_at: string | null;
  status: string;
  winners: Winner[];
  highlights: Highlight[];
  sort_order: number;
};

type CmsSection = { id?: string; heading?: string; body?: string[] };

const fmt = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : "TBA";

const statusStyle = (s: string) => {
  switch (s) {
    case "live":
      return "bg-primary/15 text-primary border-primary/40";
    case "ended":
      return "bg-muted/40 text-muted-foreground border-border";
    default:
      return "bg-amber-400/15 text-amber-300 border-amber-400/30";
  }
};

const statusLabel = (s: string) =>
  s === "live" ? "Live now" : s === "ended" ? "Concluded" : "Upcoming";

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

const Seasons = () => {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [cms, setCms] = useState<{ intro: string | null; sections: CmsSection[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: rows }, { data: page }] = await Promise.all([
        (supabase.from("seasons" as any) as any)
          .select("*")
          .eq("published", true)
          .order("sort_order", { ascending: true })
          .order("number", { ascending: false, nullsFirst: false }),
        (supabase.from("site_pages" as any) as any)
          .select("intro, sections")
          .eq("slug", "seasons")
          .maybeSingle(),
      ]);
      setSeasons(
        ((rows ?? []) as any[]).map((r) => ({
          ...r,
          winners: asArray<Winner>(r.winners),
          highlights: asArray<Highlight>(r.highlights),
        })) as Season[],
      );
      if (page) setCms({ intro: page.intro ?? null, sections: asArray<CmsSection>(page.sections) });
      setLoading(false);
    })();
  }, []);

  const current = useMemo(() => seasons.find((s) => s.status === "live") ?? null, [seasons]);
  const rest = useMemo(() => seasons.filter((s) => s.id !== current?.id), [seasons, current]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Warden Network Seasons",
    itemListElement: seasons.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: s.name,
      url: `https://www.warden.rip/seasons#${s.slug}`,
    })),
  };

  const WinnerRow = ({ w }: { w: Winner }) => {
    const slug = toUserSlug(w.player);
    const label = w.player ?? "TBA";
    return (
      <div className="flex items-center gap-3 py-2.5">
        <div className="h-8 w-8 shrink-0 rounded-full border border-border flex items-center justify-center font-display text-xs font-bold">
          {w.place ?? "—"}
        </div>
        {w.player && (
          <img
            src={`https://mc-heads.net/avatar/${encodeURIComponent(w.player)}/64`}
            alt={`${label} Minecraft head`}
            loading="lazy"
            className="h-8 w-8 rounded-md border border-border"
          />
        )}
        <div className="min-w-0 flex-1">
          {slug ? (
            <Link to={`/user/${slug}`} className="font-medium truncate hover:text-primary transition-colors">
              {label}
            </Link>
          ) : (
            <span className="font-medium truncate">{label}</span>
          )}
          {w.category && <div className="text-xs text-muted-foreground truncate">{w.category}</div>}
        </div>
        {w.prize && <span className="text-xs text-muted-foreground shrink-0">{w.prize}</span>}
      </div>
    );
  };

  const SeasonCard = ({ s, featured = false }: { s: Season; featured?: boolean }) => (
    <GlassCard id={s.slug} glow={featured} className="overflow-hidden scroll-mt-28">
      {s.banner_url && (
        <img
          src={s.banner_url}
          alt={`${s.name} banner`}
          loading="lazy"
          className="h-40 w-full object-cover border-b border-border/60"
        />
      )}
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn("rounded-full", statusStyle(s.status))}>
            {statusLabel(s.status)}
          </Badge>
          {s.number != null && (
            <Badge variant="secondary" className="rounded-full">Season {s.number}</Badge>
          )}
          {s.theme && <span className="text-xs text-muted-foreground">{s.theme}</span>}
        </div>

        <div>
          <h2 className="font-display text-2xl font-bold">{s.name}</h2>
          {s.summary && <p className="text-sm text-muted-foreground mt-1">{s.summary}</p>}
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 shrink-0" />
          <span>
            {fmt(s.starts_at)} — {fmt(s.ends_at)}
          </span>
        </div>

        {s.description && (
          <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{s.description}</p>
        )}

        {s.highlights.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {s.highlights.map((h, i) => (
              <div key={i} className="rounded-lg border border-border/60 bg-card/40 p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  {h.title}
                </div>
                {h.body && <p className="text-xs text-muted-foreground mt-1">{h.body}</p>}
              </div>
            ))}
          </div>
        )}

        {s.winners.length > 0 && (
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold mb-1">
              <Crown className="h-4 w-4 text-amber-400" /> Winners
            </div>
            <div className="divide-y divide-border/50">
              {s.winners.map((w, i) => (
                <WinnerRow key={i} w={w} />
              ))}
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <SEO
        title="Seasons — Warden Network Season History & Winners"
        description="Every Warden Network season: start and end dates, themes, highlights, and the players who topped the leaderboards."
        path="/seasons"
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          // Escape characters that could break out of the script tag.
          __html: JSON.stringify(jsonLd)
            .replace(/</g, "\\u003c")
            .replace(/>/g, "\\u003e")
            .replace(/&/g, "\\u0026"),
        }}
      />
      <Navbar />

      <main className="flex-1">
        <PageHero
          eyebrow="Progression"
          title="Seasons"
          description={cms?.intro ?? "Season dates, themes, and the players who finished on top."}
        />

        <div className="container mx-auto px-4 pb-20 max-w-4xl space-y-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : seasons.length === 0 ? (
            <GlassCard className="p-12 text-center">
              <Trophy className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">
                No seasons published yet. Season one details land here as soon as they're announced.
              </p>
              <Button asChild variant="outline" className="mt-5">
                <Link to="/leaderboard">View the live leaderboard</Link>
              </Button>
            </GlassCard>
          ) : (
            <>
              {current && (
                <Reveal>
                  <SeasonCard s={current} featured />
                </Reveal>
              )}
              {rest.map((s, i) => (
                <Reveal key={s.id} delay={i * 80}>
                  <SeasonCard s={s} />
                </Reveal>
              ))}
            </>
          )}

          {cms && cms.sections.length > 0 && (
            <GlassCard className="p-6 space-y-6">
              <h2 className="font-display text-xl font-bold">How seasons work</h2>
              {cms.sections.map((sec, i) => (
                <div key={sec.id ?? i}>
                  <h3 className="font-semibold text-sm mb-1">{sec.heading}</h3>
                  {(sec.body ?? []).map((p, j) => (
                    <p key={j} className="text-sm text-muted-foreground leading-relaxed">
                      {p}
                    </p>
                  ))}
                </div>
              ))}
            </GlassCard>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Seasons;
