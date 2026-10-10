import { useEffect, useState } from "react";
import { Play, Eye } from "lucide-react";

type Clip = {
  id: string;
  title: string;
  url: string;
  embedUrl: string;
  thumbnailUrl: string;
  viewCount: number;
  createdAt: string;
  duration: number;
  creatorName: string;
};

export default function TwitchClipsGallery({ login, parents }: { login: string; parents: string[] }) {
  const [clips, setClips] = useState<Clip[] | null>(null);
  const [active, setActive] = useState<Clip | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = `${(import.meta as any).env.VITE_SUPABASE_URL}/functions/v1/twitch-status?mode=clips&login=${encodeURIComponent(login)}&limit=8`;
        const r = await fetch(url, {
          headers: {
            apikey: (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${(import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
        });
        const j = await r.json();
        if (!cancelled) {
          if (j?.clips) setClips(j.clips);
          else setError(j?.error ?? "Failed to load clips");
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load clips");
      }
    })();
    return () => { cancelled = true; };
  }, [login]);

  const parentPart = parents.map((p) => `parent=${encodeURIComponent(p)}`).join("&");

  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between border-b border-border pb-3">
        <div>
          <span className="text-primary font-mono text-xs tracking-widest uppercase">Recent</span>
          <h2 className="text-2xl md:text-3xl font-bold font-display tracking-tighter italic">
            CLIPS
          </h2>
        </div>
        <a
          href={`https://www.twitch.tv/${login}/clips`}
          target="_blank"
          rel="noreferrer"
          className="text-[10px] font-mono tracking-widest uppercase text-muted-foreground hover:text-primary transition"
        >
          View all →
        </a>
      </div>

      {clips === null && !error && (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-video bg-white/5 animate-pulse border border-border" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-muted-foreground font-mono">Clips unavailable right now.</p>
      )}

      {clips && clips.length === 0 && (
        <p className="text-sm text-muted-foreground font-mono">No recent clips.</p>
      )}

      {clips && clips.length > 0 && (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {clips.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActive(c)}
              className="group text-left border border-border hover:border-primary transition bg-black overflow-hidden focus:outline-none focus:border-primary"
            >
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={c.thumbnailUrl}
                  alt={c.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                  <Play className="w-10 h-10 text-foreground" strokeWidth={1.25} />
                </div>
                <div className="absolute bottom-1 right-1 bg-black/70 px-1.5 py-0.5 text-[10px] font-mono text-foreground">
                  {Math.round(c.duration)}s
                </div>
              </div>
              <div className="p-2 space-y-1">
                <div className="text-xs text-foreground line-clamp-2 leading-tight">{c.title}</div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                  <span className="truncate">{c.creatorName}</span>
                  <span className="inline-flex items-center gap-1">
                    <Eye className="w-3 h-3" /> {c.viewCount}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setActive(null)}
        >
          <div
            className="relative w-full max-w-4xl bg-black border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-2 border-b border-border">
              <div className="text-sm text-foreground truncate">{active.title}</div>
              <button
                type="button"
                onClick={() => setActive(null)}
                className="text-muted-foreground hover:text-foreground text-xs font-mono tracking-widest uppercase"
              >
                Close
              </button>
            </div>
            <div className="aspect-video">
              <iframe
                src={`${active.embedUrl}&${parentPart}&autoplay=true`}
                title={active.title}
                allowFullScreen
                allow="autoplay; fullscreen"
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
