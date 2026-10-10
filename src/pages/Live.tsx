import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import TwitchLiveWidget from "@/components/site/TwitchLiveWidget";
import TwitchClipsGallery from "@/components/site/TwitchClipsGallery";
import { MessageSquare, Tv } from "lucide-react";

const CHANNELS: { tab: string; login: string; label: string }[] = [
  { tab: "WillNorbury", login: "will_norbury", label: "WillNorbury" },
  { tab: "ItzVoxel", login: "voxelisadev", label: "ItzVoxel" },
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
    document.title = `${active.label} — Twitch Live — Warden Network`;
    const hosts = new Set<string>();
    if (typeof window !== "undefined") hosts.add(window.location.hostname);
    [
      "warden.rip",
      "www.warden.rip",
      "carnagemc.lovable.app",
      "havocsmp.net",
      "www.havocsmp.net",
      "localhost",
    ].forEach((h) => hosts.add(h));
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
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;500;700&display=swap"
        rel="stylesheet"
      />
      <Navbar />
      <main className="flex-1 w-full">
        <div className="max-w-7xl w-full mx-auto px-4 md:px-8 py-10 md:py-14 flex flex-col gap-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-border pb-6">
            <div className="min-w-0">
              <span className="font-mono text-sm tracking-widest uppercase text-primary">
                Twitch · Live
              </span>
              <h1 className="text-5xl md:text-7xl font-bold font-display tracking-tighter italic break-words">
                {active.label.toUpperCase()}
              </h1>
              <p className="text-muted-foreground max-w-xl mt-1">
                Watch the stream without leaving the site. Status updates every minute.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start">
              {CHANNELS.map((c) => {
                const isActive = c.tab === active.tab;
                return (
                  <button
                    key={c.tab}
                    type="button"
                    onClick={() => setTab(c.tab)}
                    className={
                      "inline-flex items-center gap-2 border px-3 py-2 text-[10px] font-mono tracking-widest uppercase transition " +
                      (isActive
                        ? "border-primary text-foreground bg-primary/10"
                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground")
                    }
                  >
                    <Tv className="h-3.5 w-3.5" />
                    {c.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setShowChat((v) => !v)}
                className="inline-flex items-center gap-2 border border-border px-3 py-2 text-[10px] font-mono tracking-widest uppercase text-muted-foreground hover:border-primary/50 hover:text-foreground transition"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                {showChat ? "Hide chat" : "Show chat"}
              </button>
            </div>
          </div>

          <TwitchLiveWidget key={`w-${active.login}`} login={active.login} variant="full" />

          <div
            className={
              showChat
                ? "grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]"
                : "grid gap-4"
            }
          >
            <div className="relative w-full overflow-hidden border border-border bg-black" style={{ aspectRatio: "16 / 9" }}>
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

          <TwitchClipsGallery key={`c-${active.login}`} login={active.login} parents={parents} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
