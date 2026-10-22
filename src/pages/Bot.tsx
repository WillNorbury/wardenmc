import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity,
  Bot as BotIcon,
  ExternalLink,
  Globe,
  Gavel,
  Mic,
  PartyPopper,
  Copy,
  Check,
  Loader2,
  Users,
} from "lucide-react";
import DiscordMark from "@/components/site/DiscordMark";

type InviteState =
  | { status: "loading" }
  | { status: "ready"; inviteUrl: string; botUsername: string | null }
  | { status: "error"; message: string };

const FEATURES = [
  {
    icon: Gavel,
    title: "Moderation",
    text: "Ban, kick, warn, mute and more — with clear commands your staff already know.",
  },
  { icon: Mic, title: "Voice tools", text: "Mute, deafen, move and disconnect members right from a slash command." },
  { icon: PartyPopper, title: "Fun commands", text: "8ball, coinflip, dice rolls, RPS and jokes to keep chat alive." },
  { icon: Users, title: "Server perks", text: "Auto-assigns roles and keeps website ranks in sync." },
];

const LINKS = [
  { label: "Website", href: "https://warden.rip" },
  { label: "Main Discord Server", href: "https://discord.warden.rip" },
  { label: "Discord TOS", href: "https://discord.com/tos" },
  { label: "Bot Dashboard", href: "https://bot.warden.rip" },
];

const Bot = () => {
  const [invite, setInvite] = useState<InviteState>({ status: "loading" });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.title = "WardenBot — WardenMC";
    let active = true;
    supabase.functions
      .invoke("discord-bot-invite")
      .then(({ data, error }) => {
        if (!active) return;
        const d = (data ?? {}) as { ok?: boolean; inviteUrl?: string; bot?: { username?: string }; error?: string };
        if (error || !d.ok || !d.inviteUrl) {
          setInvite({ status: "error", message: d.error ?? "The invite link is not available right now." });
        } else {
          setInvite({ status: "ready", inviteUrl: d.inviteUrl, botUsername: d.bot?.username ?? null });
        }
      })
      .catch(() => {
        if (active) setInvite({ status: "error", message: "The invite link is not available right now." });
      });
    return () => {
      active = false;
    };
  }, []);

  const copyInvite = async () => {
    if (invite.status !== "ready") return;
    try {
      await navigator.clipboard.writeText(invite.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="aurora relative overflow-hidden pt-36 pb-20">
          <div className="container max-w-[1100px] text-center">
            <BotIcon className="mx-auto mb-5 h-16 w-16 text-primary drop-shadow-[0_0_28px_rgba(45,212,191,0.45)]" />
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-accent">Discord bot</p>
            <h1 className="font-display text-7xl leading-none tracking-wide md:text-9xl">
              ADD <span className="text-gradient">WARDENBOT</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
              Bring WardenMC's own Discord bot to your server — moderation, voice tools and fun commands, free for
              everyone.
            </p>
            {invite.status === "ready" && (
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button asChild size="lg" className="rounded-full px-8 text-base glow">
                  <a
                    href={invite.inviteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center"
                  >
                    <BotIcon className="mr-2 h-5 w-5" /> Add to Discord
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full px-8 text-base">
                  <Link to="/bot/status" className="inline-flex items-center">
                    <Activity className="mr-2 h-5 w-5" /> Live status
                  </Link>
                </Button>
              </div>
            )}
            {invite.status === "ready" && (
              <div className="mt-3 flex items-center justify-center gap-3 text-sm text-muted-foreground">
                <button
                  type="button"
                  onClick={copyInvite}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 transition-colors hover:bg-accent/10"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy invite link"}
                </button>
                {invite.botUsername && <span>@{invite.botUsername}</span>}
              </div>
            )}
            {invite.status === "loading" && (
              <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Getting the invite link…
              </div>
            )}
            {invite.status === "error" && <p className="mt-8 text-sm text-destructive">{invite.message}</p>}
          </div>
        </section>

        <section className="container grid max-w-[1100px] gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="glass rounded-2xl p-6">
              <f.icon className="mb-3 h-6 w-6 text-primary" />
              <h2 className="font-display text-3xl tracking-wide">{f.title}</h2>
              <p className="mt-1 text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </section>

        <section className="container max-w-[1100px] pt-10 pb-20">
          <div className="glass rounded-2xl p-6 sm:p-8">
            <h2 className="font-display text-3xl tracking-wide">About WardenBot</h2>
            <p className="mt-3 text-muted-foreground">
              This bot is made by Will Norbury (
              <span className="inline-flex items-center gap-1 font-medium text-foreground">
                <DiscordMark className="h-4 w-4 text-primary" /> will_norbury
              </span>
              ), if you have any questions, add me on discord or reach out.
            </p>
            <ul className="mt-5 space-y-3">
              {LINKS.map((l) => (
                <li key={l.href} className="flex items-center gap-3">
                  {l.href.startsWith("https://discord.warden.rip") ? (
                    <DiscordMark className="h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <Globe className="h-4 w-4 shrink-0 text-primary" />
                  )}
                  <span className="text-sm font-semibold uppercase tracking-wider">{l.label}</span>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary underline-offset-4 hover:underline"
                  >
                    {l.href.replace(/^https:\/\//, "")}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Bot;
