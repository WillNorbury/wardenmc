import { useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, HelpCircle, MessageCircle, Package, Shield } from "lucide-react";
import DiscordMark from "@/components/site/DiscordMark";

const TILES = [
  { to: "/plugins", icon: Package, title: "Plugins", text: "Browse and download community plugins.", big: true },
  { to: "/posts", icon: MessageCircle, title: "Posts", text: "See what members are sharing." },
  { to: "/staff", icon: Shield, title: "Staff", text: "Meet the team behind WardenMC." },
  { to: "/rules", icon: BookOpen, title: "Rules", text: "How we keep things fair." },
  { to: "/faq", icon: HelpCircle, title: "FAQ", text: "Quick answers to common questions." },
  { to: "/discord", icon: DiscordMark, title: "Discord", text: "Join the conversation.", big: true },
];

const Index = () => {
  useEffect(() => {
    document.title = "WardenMC — Minecraft Community";
  }, []);

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
      </main>
      <Footer />
    </div>
  );
};

export default Index;
