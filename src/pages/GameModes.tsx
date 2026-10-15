import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { SEO } from "@/components/site/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard, PageHero, Reveal, SectionHeader } from "@/components/site/ui-kit";
import { getIcon } from "@/lib/features";
import { fetchGameModes, STATUS_LABEL, type GameMode } from "@/lib/gameModes";
import { ArrowRight, Gamepad2, Layers } from "lucide-react";

const statusTone = (status: string) =>
  status === "live"
    ? "border-primary/50 text-primary"
    : status === "beta"
      ? "border-accent/50 text-accent-foreground bg-accent/20"
      : "border-border text-muted-foreground";

const GameModes = () => {
  const [modes, setModes] = useState<GameMode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGameModes().then((m) => {
      setModes(m);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Game Modes — Warden Network"
        description="Explore every Warden Network game mode: Survival, Lifesteal, 4Dupe and Hub-2. Features, gameplay details and how to join each world."
        path="/gamemodes"
      />
      <Navbar />
      <main className="flex-1">
        <PageHero
          eyebrow={
            <>
              <Gamepad2 className="h-3 w-3 mr-1" /> Worlds
            </>
          }
          title="Pick your"
          highlight="battlefield"
          description="Four distinct worlds, one network. Whether you want to build for months or lose every heart in an afternoon, there's a Warden Network mode for it."
        />

        <section className="container pb-24">
          {loading ? (
            <div className="grid sm:grid-cols-2 gap-6">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-64 rounded-2xl bg-card/50 animate-pulse" />
              ))}
            </div>
          ) : modes.length === 0 ? (
            <p className="text-center text-muted-foreground">No game modes published yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-6">
              {modes.map((m, i) => {
                const Icon = getIcon(m.icon);
                return (
                  <Reveal key={m.id} delay={i * 80}>
                    <Link to={`/gamemodes/${m.slug}`} className="block h-full group">
                      <GlassCard interactive className="h-full overflow-hidden">
                        <div className="relative h-36 overflow-hidden">
                          {m.banner_url ? (
                            <img
                              src={m.banner_url}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="h-full w-full bg-grid opacity-30" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/70 to-transparent" />
                          <div className="absolute bottom-4 left-5 flex items-center gap-3">
                            <div className="h-11 w-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center border border-primary/30">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <h2 className="font-display text-xl font-black leading-none">{m.name}</h2>
                              {m.tagline && (
                                <p className="text-xs text-muted-foreground mt-1">{m.tagline}</p>
                              )}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={`absolute top-4 right-4 ${statusTone(m.status)}`}
                          >
                            {STATUS_LABEL[m.status] ?? m.status}
                          </Badge>
                        </div>

                        <div className="p-5 pt-4">
                          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                            {m.description}
                          </p>
                          {m.features.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-4">
                              {m.features.slice(0, 3).map((f) => (
                                <span
                                  key={f}
                                  className="text-[11px] rounded-full border border-border/70 px-2.5 py-1 text-muted-foreground"
                                >
                                  {f}
                                </span>
                              ))}
                              {m.features.length > 3 && (
                                <span className="text-[11px] rounded-full border border-border/70 px-2.5 py-1 text-muted-foreground">
                                  +{m.features.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                          <div className="mt-5 flex items-center text-sm font-semibold text-primary">
                            View mode
                            <ArrowRight className="h-4 w-4 ml-1.5 transition-transform group-hover:translate-x-1" />
                          </div>
                        </div>
                      </GlassCard>
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          )}

          <Reveal className="mt-16">
            <GlassCard glow className="p-8 md:p-10 text-center">
              <SectionHeader
                eyebrow={
                  <>
                    <Layers className="h-3 w-3 mr-1" /> One IP, every world
                  </>
                }
                title="Jump between modes"
                highlight="instantly"
                description="Every mode shares a single connection. Join once, then warp anywhere from the hub."
                className="mb-6"
              />
              <div className="flex flex-wrap justify-center gap-3">
                <Button asChild size="lg">
                  <Link to="/store">Visit the store</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/discord">Join Discord</Link>
                </Button>
              </div>
            </GlassCard>
          </Reveal>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default GameModes;
