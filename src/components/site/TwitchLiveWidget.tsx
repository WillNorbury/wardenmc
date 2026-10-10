import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Radio, Users, Gamepad2, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export type TwitchStatus = {
  isLive: boolean;
  login: string;
  displayName: string;
  profileImage?: string;
  title?: string | null;
  gameName?: string | null;
  viewerCount?: number;
  startedAt?: string | null;
  thumbnailUrl?: string | null;
};

type Variant = "compact" | "full";

const fmtViewers = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n);

const useElapsed = (start: string | null | undefined) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!start) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [start]);
  if (!start) return null;
  const s = Math.max(0, Math.floor((now - new Date(start).getTime()) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m ${sec}s`;
};

export default function TwitchLiveWidget({
  login = "will_norbury",
  variant = "compact",
  className,
}: {
  login?: string;
  variant?: Variant;
  className?: string;
}) {
  const [status, setStatus] = useState<TwitchStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const load = async (attempt = 0) => {
    try {
      const url = new URL(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/twitch-status`,
      );
      url.searchParams.set("login", login);
      const res = await fetch(url.toString(), {
        headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        // Transient edge-runtime / upstream errors: retry a couple of times, then fall back quietly
        if (res.status >= 500 && attempt < 2) {
          await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
          if (mounted.current) return load(attempt + 1);
          return;
        }
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      if (mounted.current) {
        setStatus(data);
        setError(null);
      }
    } catch (err: any) {
      if (mounted.current) setError(err?.message ?? "Failed to load");
    } finally {
      if (mounted.current) setLoading(false);
    }
  };


  useEffect(() => {
    mounted.current = true;
    load();
    const id = window.setInterval(() => load(), 60_000);
    return () => {
      mounted.current = false;
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [login]);

  const uptime = useElapsed(status?.startedAt);
  const channelUrl = `https://twitch.tv/${status?.login ?? login}`;

  if (loading && !status) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 border border-border bg-card px-3 py-2 text-xs text-muted-foreground",
          className,
        )}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking Twitch…
      </div>
    );
  }

  if (error || !status) {
    return (
      <a
        href={channelUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex items-center gap-2 border border-border bg-card px-3 py-2 text-xs text-muted-foreground hover:text-foreground",
          className,
        )}
      >
        <Radio className="h-3.5 w-3.5" /> Twitch
        <ArrowUpRight className="h-3 w-3" />
      </a>
    );
  }

  const live = status.isLive;

  if (variant === "compact") {
    return (
      <Link
        to="/live"
        className={cn(
          "group inline-flex items-center gap-3 border px-3 py-2 bg-card transition min-w-0",
          live
            ? "border-primary/50 hover:border-primary"
            : "border-border hover:border-border",
          className,
        )}
      >
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          {live && (
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
          )}
          <span
            className={cn(
              "relative inline-flex h-2.5 w-2.5 rounded-full",
              live ? "bg-red-500" : "bg-muted-foreground",
            )}
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest">
            <span className={live ? "text-red-400" : "text-muted-foreground"}>
              {live ? "Live now" : "Offline"}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-primary">Twitch</span>
          </span>
          <span className="block truncate text-sm font-semibold text-foreground">
            {status.displayName}
          </span>
          {live && status.title && (
            <span className="block truncate text-xs text-muted-foreground">{status.title}</span>
          )}
        </span>
        {live && (
          <span className="hidden sm:flex flex-col items-end text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            <span className="flex items-center gap-1 text-red-400">
              <Users className="h-3 w-3" /> {fmtViewers(status.viewerCount ?? 0)}
            </span>
            {uptime && <span>{uptime}</span>}
          </span>
        )}
        <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground transition" />
      </Link>
    );
  }

  return (
    <div
      className={cn(
        "border p-5 bg-card flex flex-col gap-4",
        live ? "border-primary/40" : "border-border",
        className,
      )}
    >
      <div className="flex items-start gap-4">
        {status.profileImage && (
          <img
            src={status.profileImage}
            alt={status.displayName}
            loading="lazy"
            className="h-14 w-14 rounded-full border border-border object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest",
                live
                  ? "border-red-500/40 text-red-400 bg-red-500/10"
                  : "border-border text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  live ? "bg-red-500 animate-pulse" : "bg-muted-foreground",
                )}
              />
              {live ? "Live" : "Offline"}
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-primary">
              twitch.tv/{status.login}
            </span>
          </div>
          <div className="mt-1 font-display text-xl font-bold text-foreground">
            {status.displayName}
          </div>
          {live ? (
            <div className="mt-1 text-sm text-foreground line-clamp-2">
              {status.title || "Streaming now"}
            </div>
          ) : (
            <div className="mt-1 text-sm text-muted-foreground">
              Not streaming right now — follow for a heads up.
            </div>
          )}
        </div>
        <a
          href={channelUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1.5 border border-primary/50 bg-primary/10 px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-primary hover:bg-primary hover:text-primary-foreground transition"
        >
          Open <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      </div>

      {live && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <Stat icon={<Users className="h-3.5 w-3.5 text-red-400" />} label="Viewers" value={fmtViewers(status.viewerCount ?? 0)} />
          <Stat icon={<Gamepad2 className="h-3.5 w-3.5 text-primary" />} label="Game" value={status.gameName ?? "—"} />
          <Stat icon={<Radio className="h-3.5 w-3.5 text-primary" />} label="Uptime" value={uptime ?? "—"} />
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="border border-border bg-background p-2.5 min-w-0">
      <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 truncate font-display text-base font-bold text-foreground">
        {value}
      </div>
    </div>
  );
}
