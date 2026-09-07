import { Link } from "react-router-dom";
import {
  Shield,
  Zap,
  CheckCircle2,
  Settings,
  Coins,
  Bell,
  Terminal,
  ArrowRight,
} from "lucide-react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { SEO } from "@/components/site/SEO";
import { PageHero, GlassCard } from "@/components/site/ui-kit";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: Shield,
    title: "Advanced Moderation",
    description:
      "Ban, kick, mute, and manage members with powerful moderation tools. Auto-mod capabilities keep your community safe around the clock.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description:
      "Optimized for speed and performance. Commands execute instantly with zero lag or delays.",
  },
  {
    icon: CheckCircle2,
    title: "Always Online",
    description:
      "Hosted on reliable infrastructure and monitored 24/7. Always ready to serve your community.",
  },
  {
    icon: Settings,
    title: "Fully Customizable",
    description:
      "Tailor every aspect of the bot to your needs with flexible settings and configurations.",
  },
  {
    icon: Coins,
    title: "Economy System",
    description:
      "Gamify your server with virtual currency, a leveling system, and economy features tied into the network.",
  },
  {
    icon: Bell,
    title: "Live Notifications",
    description:
      "Announcements, changelogs, application updates, and ticket alerts delivered straight to your Discord.",
  },
];

const STEPS = [
  {
    number: "1",
    title: "Join the Discord",
    description:
      "Hop into the Warden Network Discord server — the bot is already there, ready to go. No setup needed.",
  },
  {
    number: "2",
    title: "Link Your Account",
    description:
      "Link your website account to unlock member-only commands, ticket access, and synced roles.",
  },
  {
    number: "3",
    title: "Start Using Commands",
    description:
      "Check server status, manage tickets, appeal punishments, and more — right from Discord.",
  },
];

const STATS = [
  { value: "24/7", label: "Always Online" },
  { value: "50+", label: "Commands" },
  { value: "<1s", label: "Response Time" },
  { value: "Auto", label: "Role Sync" },
];

const DiscordBot = () => (
  <div className="min-h-screen bg-background flex flex-col">
    <SEO
      title="Discord Bot — Warden Network"
      description="The Warden Network Discord bot: moderation, tickets, server status, account linking, and live notifications — all from Discord."
      path="/bot"
    />
    <Navbar />
    <main className="flex-1">
      <PageHero
        eyebrow="Discord Bot"
        title="Meet the Warden"
        highlight="Bot"
        description="Moderation, tickets, server status, account linking, and live network notifications — one bot, built for the Warden Network community."
      >
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild size="lg">
            <Link to="/discord">
              Join the Discord
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/commands">
              <Terminal className="mr-2 h-4 w-4" />
              View Commands
            </Link>
          </Button>
        </div>
      </PageHero>

      {/* Stats */}
      <section className="container py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((stat) => (
            <GlassCard key={stat.label} className="p-6 text-center" glow>
              <div className="font-display text-3xl md:text-4xl font-bold text-primary mb-1">
                {stat.value}
              </div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="container py-12">
        <div className="text-center mb-10">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">Powerful Features</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Everything you need to manage, moderate, and stay connected to the network — without leaving Discord.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feature) => (
            <GlassCard key={feature.title} className="p-6" interactive>
              <feature.icon className="h-10 w-10 text-primary mb-4" />
              <h3 className="font-display text-lg font-bold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="container py-12">
        <div className="text-center mb-10">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-3">Get Started in Minutes</h2>
          <p className="text-muted-foreground">Three simple steps and you're in.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {STEPS.map((step) => (
            <GlassCard key={step.number} className="p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-primary/40 bg-primary/10 font-display text-xl font-bold text-primary">
                {step.number}
              </div>
              <h3 className="font-display text-lg font-bold mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-20 pt-6">
        <GlassCard className="p-10 text-center" glow>
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform Your Server Experience?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-6">
            Join the Warden Network Discord and start using the bot today. Already a member? Link your account to unlock everything.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg">
              <Link to="/discord">Join the Discord</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/link-account">Link Your Account</Link>
            </Button>
          </div>
        </GlassCard>
      </section>
    </main>
    <Footer />
  </div>
);

export default DiscordBot;
