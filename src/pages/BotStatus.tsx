import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bot as BotIcon,
  CheckCircle2,
  Gamepad2,
  Loader2,
  RefreshCw,
  Users,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type BotStatusData = {
  bot: { online: boolean; statusText: string | null; lastSeenAt: string | null };
  minecraft: {
    online: boolean;
    playersOnline: number | null;
    playersMax: number | null;
    version: string | null;
    motd: string | null;
  };
  incidents: {
    id: string;
    incident_number: number;
    service_key: string;
    opened_at: string;
    last_error: string | null;
  }[];
  checkedAt: string;
};

const REFRESH_MS = 60_000;

const formatTime = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const timeAgo = (value: string) => {
  const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const BotStatus = () => {
  const [data, setData] = useState<BotStatusData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    const { data: d, error: e } = await supabase.functions.invoke("bot-status");
    if (e || !d?.ok) {
      setError(d?.error ?? "Status is not available right now.");
    } else {
      setData(d as BotStatusData);
      setError(null);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    document.title = "WardenBot Status — WardenMC";
    load(true);
    const id = window.setInterval(() => load(false), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const botOnline = data?.bot.online ?? false;
  const mcOnline = data?.minecraft.online ?? false;
  const openIncidents = data?.incidents.length ?? 0;
  const allGood = data ? botOnline && mcOnline && openIncidents === 0 : false;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="aurora relative overflow-hidden pt-36 pb-16">
          <div className="container max-w-[1100px] text-center">
            <Activity className="mx-auto mb-5 h-14 w-14 text-primary drop-shadow-[0_0_28px_rgba(45,212,191,0.45)]" />
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-accent">Live status</p>
            <h1 className="font-display text-7xl leading-none tracking-wide md:text-9xl">
              BOT <span className="text-gradient">STATUS</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
              WardenBot's live presence, Minecraft server players and any ongoing issues — refreshed every minute.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/bot">
                  <ArrowLeft className="mr-2 h-4 w-4" /> WardenBot
                </Link>
              </Button>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => load(false)}
                disabled={refreshing || loading}
              >
                <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} /> Refresh
              </Button>
            </div>
          </div>
        </section>

        <section className="container max-w-[1100px] pb-20">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking live status…
            </div>
          )}

          {error && !loading && (
            <div className="glass rounded-2xl p-8 text-center">
              <XCircle className="mx-auto mb-3 h-8 w-8 text-destructive" />
              <p className="text-muted-foreground">{error}</p>
            </div>
          )}

          {data && !loading && (
            <div className="space-y-4">
              {/* Overall banner */}
              <div
                className={cn(
                  "glass flex items-center gap-4 rounded-2xl border p-6",
                  allGood ? "border-emerald-500/35" : "border-amber-500/35",
                )}
              >
                {allGood ? (
                  <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-8 w-8 shrink-0 text-amber-400" />
                )}
                <div>
                  <p className="font-display text-3xl tracking-wide">
                    {allGood ? "ALL SYSTEMS OPERATIONAL" : "SOMETHING NEEDS ATTENTION"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Last checked {timeAgo(data.checkedAt)} · auto-refreshes every minute
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* WardenBot presence */}
                <div className="glass rounded-2xl p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <BotIcon className="h-6 w-6 text-primary" />
                      <h2 className="font-display text-3xl tracking-wide">WardenBot</h2>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider",
                        botOnline
                          ? "border-emerald-500/35 text-emerald-400"
                          : "border-red-500/35 text-red-400",
                      )}
                    >
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          botOnline ? "animate-pulse bg-emerald-400" : "bg-red-400",
                        )}
                      />
                      {botOnline ? "Online" : "Offline"}
                    </span>
                  </div>
                  {data.bot.statusText && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Status: <span className="text-foreground">{data.bot.statusText}</span>
                    </p>
                  )}
                  {data.bot.lastSeenAt && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Last seen {timeAgo(data.bot.lastSeenAt)}
                    </p>
                  )}
                </div>

                {/* Minecraft server */}
                <div className="glass rounded-2xl p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Gamepad2 className="h-6 w-6 text-primary" />
                      <h2 className="font-display text-3xl tracking-wide">Minecraft</h2>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider",
                        mcOnline
                          ? "border-emerald-500/35 text-emerald-400"
                          : "border-red-500/35 text-red-400",
                      )}
                    >
                      <span
                        className={cn(
                          "h-2 w-2 rounded-full",
                          mcOnline ? "animate-pulse bg-emerald-400" : "bg-red-400",
                        )}
                      />
                      {mcOnline ? "Online" : "Offline"}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-foreground">
                      {data.minecraft.playersOnline ?? 0}
                      {data.minecraft.playersMax != null && ` / ${data.minecraft.playersMax}`}
                    </span>
                    <span>players on mc.warden.rip</span>
                  </div>
                  {data.minecraft.version && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Version: <span className="text-foreground">{data.minecraft.version}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Ongoing issues */}
              <div className="glass rounded-2xl p-6">
                <h2 className="font-display text-3xl tracking-wide">Ongoing issues</h2>
                {openIncidents === 0 ? (
                  <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" /> No ongoing issues right now.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {data.incidents.map((incident) => (
                      <li
                        key={incident.id}
                        className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4"
                      >
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                        <Link
                          to={`/status/${incident.incident_number}`}
                          className="font-medium text-foreground underline-offset-4 hover:underline"
                        >
                          Incident #{incident.incident_number} — {incident.service_key}
                        </Link>
                        <span className="text-sm text-muted-foreground">
                          opened {formatTime(incident.opened_at)}
                        </span>
                        {incident.last_error && (
                          <span className="w-full text-sm text-muted-foreground">{incident.last_error}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-4 text-sm text-muted-foreground">
                  Full service history lives on the{" "}
                  <Link to="/status" className="text-primary underline-offset-4 hover:underline">
                    network status page
                  </Link>
                  .
                </p>
              </div>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default BotStatus;
