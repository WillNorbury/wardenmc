import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import TwitchLiveWidget from "@/components/site/TwitchLiveWidget";
import TwitchClipsGallery from "@/components/site/TwitchClipsGallery";
import { MessageSquare, Radio, Tv, Users } from "lucide-react";

const CHANNELS: { tab: string; login: string; label: string; role: string }[] = [
  { tab: "WillNorbury", login: "will_norbury", label: "WillNorbury", role: "Founder" },
  { tab: "SpectorDev", login: "spectordev", label: "SpectorDev", role: "Developer" },
];

export default function Live() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const active =
    CHANNELS.find((c) => c.tab.toLowerCase() === (tabParam ?? "").toLowerCase()) ??
    CHANNELS[0];

  const [parents, setParents] = useState<string[]>([]);
  const [showChat, setShowChat] = useState(true);

  useEffect(() => {
    document.title = `${active.label} — Live — Warden Network`;
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
              Streams from the Warden Network team, embedded right here — player, chat and
              clips without leaving the site. Status refreshes every minute.
            </p>
          </div>
        </section>

        <div className="container max-w-[1400px] py-10 flex flex-col gap-10">
          {/* Channel picker cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            {CHANNELS.map((c) => {
              const isActive = c.tab === active.tab;
              return (
                <button
                  key={c.tab}
                  type="button"
                  onClick={() => setTab(c.tab)}
                  className={
                    "group relative overflow-hidden border p-5 text-left transition " +
                    (isActive
                      ? "border-primary bg-primary/10"
                      : "border-border bg-card hover:border-primary/50")
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="font-mono text-[10px] tracking-widest uppercase text-muted-foreground">
                        {c.role}
                      </span>
                      <h2 className="font-display text-2xl font-black tracking-tight truncate">
                        {c.label.toUpperCase()}
                      </h2>
                      <span className="text-xs text-muted-foreground font-mono">
                        twitch.tv/{c.login}
                      </span>
                    </div>
                    <div
                      className={
                        "flex h-11 w-11 shrink-0 items-center justify-center border transition " +
                        (isActive
                          ? "border-primary text-primary"
                          : "border-border text-muted-foreground group-hover:text-primary group-hover:border-primary/50")
                      }
                    >
                      <Tv className="h-5 w-5" />
                    </div>
                  </div>
                  {isActive && (
                    <span className="absolute right-0 top-0 bg-primary px-2 py-1 text-[9px] font-mono tracking-widest uppercase text-primary-foreground">
                      Watching
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Live status */}
          <TwitchLiveWidget key={`w-${active.login}`} login={active.login} variant="full" />

          {/* Player + chat */}
          <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
            <div>
              <span className="text-primary font-mono text-xs tracking-widest uppercase">
                Now showing
              </span>
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

          <div
            className={
              showChat ? "grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]" : "grid gap-4"
            }
          >
            <div
              className="relative w-full overflow-hidden border border-border bg-black"
              style={{ aspectRatio: "16 / 9" }}
            >
              {twitchPlayerSrc ? (
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
                  <Tv className="h-6 w-6 mr-2" /> Loading player…
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
            Follow both channels on Twitch to get notified the moment a stream starts.
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
