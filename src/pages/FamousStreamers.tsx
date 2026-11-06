import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import TwitchLiveWidget from "@/components/site/TwitchLiveWidget";
import TwitchClipsGallery from "@/components/site/TwitchClipsGallery";
import { MessageSquare, Radio, Tv, Users } from "lucide-react";

const CHANNELS: { tab: string; login: string; label: string; role: string }[] = [
  { tab: "kaicenat", login: "kaicenat", label: "kaicenat", role: "Famous" },
  { tab: "ibai", login: "ibai", label: "ibai", role: "Famous" },
  { tab: "ninja", login: "ninja", label: "ninja", role: "Famous" },
  { tab: "Auronplay", login: "Auronplay", label: "Auronplay", role: "Famous" },
  { tab: "Rubius", login: "Rubius", label: "Rubius", role: "Famous" },
];

export default function Live() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const active = CHANNELS.find((c) => c.tab.toLowerCase() === (tabParam ?? "").toLowerCase()) ?? CHANNELS[0];

  const [parents, setParents] = useState<string[]>([]);
  const [showChat, setShowChat] = useState(true);

  useEffect(() => {
    document.title = `${active.label} — Famous — Warden Network`;
    const hosts = new Set<string>();
    if (typeof window !== "undefined") hosts.add(window.location.hostname);
    ["warden.rip", "www.warden.rip", "localhost"].forEach((h) => hosts.add(h));
    setParents(Array.from(hosts));
  }, [active.label]);

  const twitchPlayerSrc = useMemo(() => {
    if (!parents.length) return "";
    const qp = new URLSearchParams();
    qp.set("channel", active.login);
    qp.set("muted", "false");
    qp.set("autoplay", "true");
    const parentPart = parents.map((p) => `parent=${encodeURIComponent(p)}`).join("&");
    return `https://player.twitch.tv/?${qp.toString()}&${parentPart}`;
  }, [parents, active.login]);

  // null = checking, true/false = known. Twitch's embed plays old clips when offline,
  // so only mount the player while the channel is actually live.
  const [isLive, setIsLive] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    setIsLive(null);
    const check = async () => {
      try {
        const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/twitch-status`);
        url.searchParams.set("login", active.login);
        const res = await fetch(url.toString(), {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string },
        });
        const data = await res.json().catch(() => null);
        if (!cancelled && res.ok) setIsLive(!!data?.isLive);
        else if (!cancelled) setIsLive((prev) => prev ?? false);
      } catch {
        if (!cancelled) setIsLive((prev) => prev ?? false);
      }
    };
    check();
    const id = setInterval(check, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [active.login]);

  const twitchChatSrc = useMemo(() => {
    if (!parents.length) return "";
    const parentPart = parents.map((p) => `parent=${encodeURIComponent(p)}`).join("&");
    return `https://www.twitch.tv/embed/${active.login}/chat?darkpopout&${parentPart}`;
  }, [parents, active.login]);

  const setTab = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1 w-full">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                "radial-gradient(60% 80% at 20% 0%, hsl(var(--primary) / 0.18), transparent 70%), radial-gradient(50% 70% at 90% 20%, hsl(var(--accent) / 0.14), transparent 70%)",
            }}
          />
          <div className="container relative max-w-[1400px] pt-32 pb-14">
            <span className="font-mono text-xs tracking-[0.3em] uppercase text-primary flex items-center gap-2">
              <Radio className="h-3.5 w-3.5" /> Twitch · Live streams
            </span>
            <h1 className="font-display text-5xl md:text-7xl font-black tracking-tight mt-3">
              WATCH <span className="text-primary">LIVE</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mt-3">
              These are the most famous streams in the world, so hope you stay and enjoy!
            </p>
          </div>
        </section>

        <div className="container max-w-[1400px] py-10 flex flex-col gap-10">
          {/* Channel picker */}
          <div className="flex flex-wrap items-center gap-2">
            {CHANNELS.map((c) => {
              const isActive = c.tab === active.tab;
              return (
                <button
                  key={c.tab}
                  type="button"
                  onClick={() => setTab(c.tab)}
                  aria-pressed={isActive}
                  className={
                    "inline-flex items-center gap-2 border px-4 py-2 font-mono text-[11px] tracking-widest uppercase transition " +
                    (isActive
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground")
                  }
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* Live status */}
          <TwitchLiveWidget key={`w-${active.login}`} login={active.login} variant="full" />

          {/* Player + chat */}
          <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <span className="text-primary font-mono text-xs tracking-widest uppercase">Now showing</span>
              <h2 className="text-2xl md:text-3xl font-bold font-display tracking-tighter italic">
                {active.label.toUpperCase()}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowChat((v) => !v)}
              className="inline-flex items-center gap-2 border border-border px-3 py-2 text-[10px] font-mono tracking-widest uppercase text-muted-foreground hover:border-primary/50 hover:text-foreground transition"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {showChat ? "Hide chat" : "Show chat"}
            </button>
          </div>

          <div className={showChat ? "grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]" : "grid gap-4"}>
            <div
              className="relative w-full overflow-hidden border border-border bg-black"
              style={{ aspectRatio: "16 / 9" }}
            >
              {isLive === false ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-muted-foreground px-6">
                  <Tv className="h-8 w-8" />
                  <p className="font-semibold text-foreground">{active.label} is offline</p>
                  <p className="text-sm">
                    The stream will appear here automatically when they go live. Check out recent clips below.
                  </p>
                </div>
              ) : isLive && twitchPlayerSrc ? (
                <iframe
                  key={twitchPlayerSrc}
                  src={twitchPlayerSrc}
                  title={`${active.login} Twitch stream`}
                  allowFullScreen
                  allow="autoplay; fullscreen; picture-in-picture"
                  className="absolute inset-0 h-full w-full"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                  <Tv className="h-6 w-6 mr-2" /> Checking stream…
                </div>
              )}
            </div>

            {showChat && (
              <div className="border border-border bg-black min-h-[420px] lg:min-h-0">
                {twitchChatSrc && (
                  <iframe
                    key={twitchChatSrc}
                    src={twitchChatSrc}
                    title={`${active.login} Twitch chat`}
                    className="h-full min-h-[420px] w-full"
                  />
                )}
              </div>
            )}
          </div>

          {/* Clips */}
          <TwitchClipsGallery key={`c-${active.login}`} login={active.login} parents={parents} />

          {/* Footer note */}
          <div className="flex items-center gap-3 border border-border bg-card p-4 text-sm text-muted-foreground">
            <Users className="h-4 w-4 text-primary shrink-0" />
            These are the most famous streamers on the planet, so hopefully you stay and enjoy it.
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
