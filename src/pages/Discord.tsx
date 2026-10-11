import { useEffect } from "react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { ExternalLink, Gavel, Megaphone, MessageSquare, Users } from "lucide-react";

const INVITE = "https://discord.warden.rip";

const PERKS = [
  { icon: Megaphone, title: "Announcements", text: "Updates, events and drops land here first." },
  { icon: MessageSquare, title: "Chat", text: "Hang out with players and plugin developers." },
  { icon: Users, title: "Supporter role", text: "Put our invite in your status to earn the Supporter role." },
  { icon: Gavel, title: "Fair moderation", text: "Clear rules, active staff and quick support." },
];

const Discord = () => {
  useEffect(() => {
    document.title = "Discord — WardenMC";
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="aurora relative overflow-hidden pt-36 pb-20">
          <div className="container max-w-[1100px] text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-accent">Community</p>
            <h1 className="font-display text-7xl leading-none tracking-wide md:text-9xl">
              JOIN THE <span className="text-gradient">DISCORD</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
              Talk with the WardenMC community, get help from staff and be first to hear what's next.
            </p>
            <Button asChild size="lg" className="mt-8 rounded-full px-8 text-base glow">
              <a href={INVITE} target="_blank" rel="noopener noreferrer">
                Open invite <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <p className="mt-3 text-sm text-muted-foreground">discord.warden.rip</p>
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

export default Discord;
