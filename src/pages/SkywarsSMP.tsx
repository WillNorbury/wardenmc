import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ClipboardList, Copy, Gamepad2, ListOrdered, MessageCircle, Server, Terminal } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { SEO } from "@/components/site/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard, IpCopyButton, PageHero, Reveal } from "@/components/site/ui-kit";
import {
  DEFAULT_SKYWARSSMP_CONTENT,
  fetchSkywarsSMPContent,
  type SkywarsSMPContent,
} from "@/lib/skywarssmp";

const SkywarsSMP = () => {
  const [content, setContent] = useState<SkywarsSMPContent>(DEFAULT_SKYWARSSMP_CONTENT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchSkywarsSMPContent()
      .then((saved) => {
        if (active) setContent(saved);
      })
      .catch(() => {
        // The complete default instructions remain available if saved content cannot load.
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(content.join_command);
      toast.success(`Copied ${content.join_command}`);
    } catch {
      toast.error("Couldn't copy — select the command manually");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="SkywarsSMP — How to Join"
        description={content.description}
        path="/skywarssmp"
      />
      <Navbar />
      <main className="flex-1">
        <PageHero
          eyebrow={
            <>
              <Gamepad2 className="h-3.5 w-3.5" /> SkywarsSMP
            </>
          }
          title="Enter the"
          highlight="SkywarsSMP queue"
          description={content.description}
        >
          <div className="flex flex-wrap items-center gap-3">
            {content.server_ip && <IpCopyButton ip={content.server_ip} />}
            <Button size="lg" variant="outline" onClick={copyCommand}>
              <Copy className="h-4 w-4 mr-2" /> Copy queue command
            </Button>
            <Button asChild size="lg" variant="ghost">
              <Link to="/skywarssmp/apply">
                Apply for staff <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </PageHero>

        <section className="container pb-24 grid lg:grid-cols-[minmax(0,1fr)_340px] gap-8 items-start">
          <Reveal>
            <GlassCard glow className="p-6 md:p-9">
              <div className="flex items-center gap-3 mb-7">
                <div className="h-11 w-11 rounded-xl border border-primary/30 bg-primary/15 text-primary grid place-items-center">
                  <ListOrdered className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-widest text-primary">Server guide</p>
                  <h2 className="font-display text-2xl md:text-3xl font-black">How to join SkywarsSMP</h2>
                </div>
              </div>

              {loading ? (
                <div className="space-y-3" aria-label="Loading joining instructions">
                  {[0, 1, 2, 3].map((item) => (
                    <div key={item} className="h-16 rounded-xl bg-muted/40 animate-pulse" />
                  ))}
                </div>
              ) : (
                <ol className="space-y-4">
                  {content.join_steps.map((step, index) => (
                    <li key={`${index}-${step}`} className="flex gap-4 rounded-xl border border-border/60 bg-background/40 p-4">
                      <span className="h-8 w-8 shrink-0 rounded-full border border-primary/40 bg-primary/10 text-primary grid place-items-center font-display font-bold text-sm">
                        {index + 1}
                      </span>
                      <p className="text-sm md:text-base text-muted-foreground leading-relaxed pt-1">{step}</p>
                    </li>
                  ))}
                </ol>
              )}
            </GlassCard>
          </Reveal>

          <aside className="space-y-6 lg:sticky lg:top-24">
            <Reveal delay={80}>
              <GlassCard className="p-6">
                <Badge variant="outline" className="border-primary/40 text-primary mb-5">{content.tagline}</Badge>
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-2">
                      <Server className="h-3.5 w-3.5" /> Server address
                    </div>
                    <code className="block rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground break-all">
                      {content.server_ip || "Address coming soon"}
                    </code>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-2">
                      <Terminal className="h-3.5 w-3.5" /> In-game command
                    </div>
                    <button
                      type="button"
                      onClick={copyCommand}
                      className="w-full rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-left text-sm font-mono text-primary hover:border-primary transition-colors"
                      aria-label={`Copy queue command ${content.join_command}`}
                    >
                      {content.join_command}
                    </button>
                  </div>
                </div>
              </GlassCard>
            </Reveal>

            <Reveal delay={140}>
              <GlassCard className="p-6 space-y-4">
                <h2 className="font-display text-xl font-black">Need a hand?</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Ask the community for help, or visit Support if you cannot join the queue.
                </p>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link to="/discord"><MessageCircle className="h-4 w-4 mr-2" /> Join Discord</Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-start">
                  <Link to="/support"><ClipboardList className="h-4 w-4 mr-2" /> Visit Support</Link>
                </Button>
              </GlassCard>
            </Reveal>
          </aside>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default SkywarsSMP;
