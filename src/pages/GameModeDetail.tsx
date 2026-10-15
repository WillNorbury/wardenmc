import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { SEO } from "@/components/site/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { GlassCard, IpCopyButton, Reveal } from "@/components/site/ui-kit";
import { getIcon } from "@/lib/features";
import { fetchGameMode, fetchGameModes, STATUS_LABEL, type GameMode } from "@/lib/gameModes";
import { ArrowLeft, ArrowRight, Check, ImageIcon } from "lucide-react";

const GameModeDetail = () => {
  const { slug = "" } = useParams();
  const [mode, setMode] = useState<GameMode | null>(null);
  const [others, setOthers] = useState<GameMode[]>([]);
  const [loading, setLoading] = useState(true);
  const [shot, setShot] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchGameMode(slug), fetchGameModes()]).then(([m, all]) => {
      if (cancelled) return;
      setMode(m);
      setOthers(all.filter((x) => x.slug !== slug).slice(0, 3));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container pt-32 pb-20">
          <div className="h-64 rounded-2xl bg-card/50 animate-pulse" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!mode) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <SEO title="Game mode not found — Warden Network" description="This game mode does not exist." path={`/gamemodes/${slug}`} />
        <Navbar />
        <main className="flex-1 container pt-32 pb-20 text-center">
          <h1 className="font-display text-3xl font-black mb-3">Game mode not found</h1>
          <p className="text-muted-foreground mb-6">It may have been unpublished or renamed.</p>
          <Button asChild>
            <Link to="/gamemodes">Back to game modes</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const Icon = getIcon(mode.icon);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title={`${mode.name} — Warden Network Game Modes`}
        description={mode.description ?? `Play ${mode.name} on Warden Network.`}
        path={`/gamemodes/${mode.slug}`}
        image={mode.banner_url ?? undefined}
        type="article"
      />
      <Navbar />
      <main className="flex-1">
        {/* Banner */}
        <section className="relative overflow-hidden pt-28 pb-14">
          {mode.banner_url ? (
            <>
              <img src={mode.banner_url} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-35" />
              <div className="absolute inset-0 bg-gradient-to-b from-background/75 via-background/85 to-background" />
            </>
          ) : (
            <div className="absolute inset-0 bg-grid opacity-[0.08]" />
          )}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 left-1/3 h-64 w-[36rem] rounded-full bg-primary/20 blur-[120px]"
          />
          <div className="container relative">
            <Link
              to="/gamemodes"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" /> All game modes
            </Link>
            <Reveal>
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 shrink-0 rounded-2xl bg-primary/15 text-primary flex items-center justify-center border border-primary/30">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <h1 className="font-display text-4xl md:text-6xl font-black tracking-tight">{mode.name}</h1>
                    <Badge variant="outline" className="border-primary/50 text-primary">
                      {STATUS_LABEL[mode.status] ?? mode.status}
                    </Badge>
                  </div>
                  {mode.tagline && <p className="text-primary/90 font-medium">{mode.tagline}</p>}
                  {mode.description && (
                    <p className="text-muted-foreground md:text-lg max-w-2xl mt-3 leading-relaxed">{mode.description}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-3 mt-8">
                {mode.server_ip && <IpCopyButton ip={mode.server_ip} />}
                <Button asChild size="lg">
                  <Link to="/store">Get a rank</Link>
                </Button>
                <Button asChild size="lg" variant="ghost">
                  <Link to="/rules">Read the rules</Link>
                </Button>
              </div>
            </Reveal>
          </div>
        </section>

        <div className="container pb-24 grid lg:grid-cols-[1fr_320px] gap-8 items-start">
          <div className="space-y-8 min-w-0">
            {mode.long_description && (
              <Reveal>
                <GlassCard className="p-6 md:p-8">
                  <article className="prose prose-invert max-w-none prose-headings:font-display prose-headings:font-black prose-a:text-primary">
                    <ReactMarkdown>{mode.long_description}</ReactMarkdown>
                  </article>
                </GlassCard>
              </Reveal>
            )}

            <Reveal>
              <GlassCard className="p-6 md:p-8">
                <h2 className="font-display text-2xl font-black mb-5">Screenshots</h2>
                {mode.screenshots.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/70 p-10 text-center text-muted-foreground">
                    <ImageIcon className="h-6 w-6 mx-auto mb-2 opacity-60" />
                    <p className="text-sm">No screenshots yet — check the community gallery.</p>
                    <Button asChild variant="link" className="mt-1">
                      <Link to="/gallery">Open gallery</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {mode.screenshots.map((src) => (
                      <button
                        key={src}
                        type="button"
                        onClick={() => setShot(src)}
                        className="group relative aspect-video overflow-hidden rounded-xl border border-border/60 bg-muted"
                      >
                        <img
                          src={src}
                          alt={`${mode.name} screenshot`}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </GlassCard>
            </Reveal>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24">
            <Reveal>
              <GlassCard className="p-6">
                <h2 className="font-display text-lg font-black mb-4">Features</h2>
                <ul className="space-y-3">
                  {mode.features.map((f) => (
                    <li key={f} className="flex gap-3 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </GlassCard>
            </Reveal>

            {others.length > 0 && (
              <Reveal delay={80}>
                <GlassCard className="p-6">
                  <h2 className="font-display text-lg font-black mb-4">Other modes</h2>
                  <div className="space-y-2">
                    {others.map((o) => {
                      const OIcon = getIcon(o.icon);
                      return (
                        <Link
                          key={o.id}
                          to={`/gamemodes/${o.slug}`}
                          className="group flex items-center gap-3 rounded-xl border border-border/60 p-3 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                        >
                          <OIcon className="h-4 w-4 text-primary shrink-0" />
                          <span className="text-sm font-medium flex-1 truncate">{o.name}</span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                        </Link>
                      );
                    })}
                  </div>
                </GlassCard>
              </Reveal>
            )}
          </aside>
        </div>
      </main>
      <Footer />

      <Dialog open={!!shot} onOpenChange={(o) => !o && setShot(null)}>
        <DialogContent className="max-w-5xl p-2 bg-card/95 backdrop-blur-xl">
          {shot && <img src={shot} alt={`${mode.name} screenshot`} className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GameModeDetail;
