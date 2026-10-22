import { useEffect } from "react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { ExternalLink, Globe, MessageSquare, Sparkles, Users } from "lucide-react";

const INVITE = "https://yapin.gg/invite/wardenmc";

const PERKS = [
  { icon: Globe, title: "Server listing", text: "WardenMC has its own listing on Yapin' — find us alongside other communities." },
  { icon: MessageSquare, title: "Meet players", text: "Discover the network, bring your friends and hang out with the community." },
  { icon: Sparkles, title: "Show support", text: "A quick bump or vote helps more players find WardenMC." },
  { icon: Users, title: "Grow together", text: "Every new face makes the community better for everyone." },
];

const Yapin = () => {
  useEffect(() => {
    document.title = "Yapin' — WardenMC";
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="aurora relative overflow-hidden pt-36 pb-20">
          <div className="container max-w-[1100px] text-center">
            <Sparkles className="mx-auto mb-5 h-16 w-16 text-primary drop-shadow-[0_0_28px_rgba(45,212,191,0.45)]" />
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-accent">Community</p>
            <h1 className="font-display text-7xl leading-none tracking-wide md:text-9xl">
              JOIN US ON <span className="text-gradient">YAPIN'</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
              WardenMC is on Yapin' — check out the listing, bump the server and meet the community.
            </p>
            <Button asChild size="lg" className="mt-8 rounded-full px-8 text-base glow">
              <a href={INVITE} target="_blank" rel="noopener noreferrer" className="inline-flex items-center">
                Open Yapin' <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <p className="mt-3 text-sm text-muted-foreground">yapin.gg/invite/wardenmc</p>
          </div>
        </section>

        <section className="container grid max-w-[1100px] gap-4 sm:grid-cols-2">
          {PERKS.map((p) => (
            <div key={p.title} className="glass rounded-2xl p-6">
              <p.icon className="mb-3 h-6 w-6 text-primary" />
              <h2 className="font-display text-3xl tracking-wide">{p.title}</h2>
              <p className="mt-1 text-muted-foreground">{p.text}</p>
            </div>
          ))}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Yapin;
