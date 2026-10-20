import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Gauge,
  HelpCircle,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  ShieldCheck,
  Timer,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Range = 90 | 180;
type DayStatus = "up" | "degraded" | "down" | "none";

type DailyRow = {
  service_key: string;
  day: string;
  total_checks: number;
  up_checks: number;
  uptime_pct: number | null;
};

type Service = { key: string; name: string; desc: string; url: string };
type Incident = {
  id: string;
  incident_number: number;
  service_key: string;
  opened_at: string;
  closed_at: string | null;
  last_error: string | null;
};
type Check = {
  checked_at: string;
  is_up: boolean;
  latency_ms: number | null;
  status_code: number | null;
  error: string | null;
};

const RANGES: { label: string; value: Range }[] = [
  { label: "90 days", value: 90 },
  { label: "180 days", value: 180 },
];

const DEFAULT_SERVICES: Service[] = [
  { key: "website", name: "Website", desc: "Main site & dashboard", url: "https://warden.rip" },
  { key: "minecraft", name: "Minecraft Server", desc: "mc.warden.rip", url: "" },
  { key: "api", name: "API & Database", desc: "Backend services", url: "" },
  { key: "panel", name: "Panel", desc: "dash.nightly.host", url: "https://dash.nightly.host" },
  { key: "discord", name: "Discord Server", desc: "https://discord.warden.rip", url: "https://discord.warden.rip" },
  { key: "bot", name: "WardenBot", desc: "Discord bot · warden.rip/bot", url: "https://warden.rip/bot" },
];

const toDayKey = (d: Date) => d.toISOString().slice(0, 10);
const formatDate = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
const formatDateTime = (value: string) =>
  new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

const statusFromPct = (pct: number | null, total: number): DayStatus => {
  if (!total || pct === null) return "none";
  if (pct >= 99) return "up";
  if (pct >= 80) return "degraded";
  return "down";
};

const statusMeta: Record<
  DayStatus,
  { label: string; summary: string; tone: string; dot: string; text: string; border: string; icon: typeof CheckCircle2 }
> = {
  up: {
    label: "Operational",
    summary: "Systems are responding normally.",
    tone: "bg-emerald-500/10",
    dot: "bg-emerald-400",
    text: "text-emerald-400",
    border: "border-emerald-500/35",
    icon: CheckCircle2,
  },
  degraded: {
    label: "Degraded",
    summary: "One or more checks are slower than expected.",
    tone: "bg-amber-500/10",
    dot: "bg-amber-400",
    text: "text-amber-400",
    border: "border-amber-500/35",
    icon: AlertTriangle,
  },
  down: {
    label: "Outage",
    summary: "A service is currently failing checks.",
    tone: "bg-red-500/10",
    dot: "bg-red-400",
    text: "text-red-400",
    border: "border-red-500/35",
    icon: XCircle,
  },
  none: {
    label: "No data",
    summary: "Checks are still being collected.",
    tone: "bg-muted/40",
    dot: "bg-muted-foreground",
    text: "text-muted-foreground",
    border: "border-border",
    icon: HelpCircle,
  },
};

const dayColor = (status: DayStatus) => {
  if (status === "up") return "bg-emerald-500/80";
  if (status === "degraded") return "bg-amber-500/80";
  if (status === "down") return "bg-red-500/80";
  return "bg-muted";
};

const getUptime = (days?: Map<string, { pct: number | null; total: number }>) => {
  let total = 0;
  let up = 0;
  if (days) {
    for (const v of days.values()) {
      total += v.total;
      up += Math.round(((v.pct ?? 0) / 100) * v.total);
    }
  }
  return total ? (100 * up) / total : null;
};

const DayGrid = ({ days, byDay }: { days: Range; byDay: Map<string, { pct: number | null; total: number }> }) => {
  const today = new Date();
  const cells = Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - (days - 1 - index));
    const key = toDayKey(date);
    const rec = byDay.get(key);
    const status = statusFromPct(rec?.pct ?? null, rec?.total ?? 0);
    return { date, key, status, pct: rec?.pct ?? null, total: rec?.total ?? 0 };
  });

  return (
    <div
      className="grid w-full min-w-0 gap-px overflow-hidden rounded-sm"
      style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}
      aria-label={`${days} day uptime timeline`}
    >
      {cells.map((cell) => (
        <span
          key={cell.key}
          className={cn("h-8 min-w-0 transition-opacity hover:opacity-80", dayColor(cell.status))}
          title={
            cell.total
              ? `${formatDate(cell.date)} — ${cell.pct?.toFixed(1)}% (${cell.total} checks)`
              : `${formatDate(cell.date)} — no data`
          }
        />
      ))}
    </div>
  );
};

const StatusPill = ({ status, className }: { status: DayStatus; className?: string }) => {
  const meta = statusMeta[status];
  return (
    <Badge variant="outline" className={cn("gap-1.5 whitespace-nowrap", meta.border, meta.text, className)}>
      <span className={cn("h-2 w-2 rounded-full", meta.dot, status !== "none" && "animate-pulse")} />
      {meta.label}
    </Badge>
  );
};

const MiniMetric = ({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string | number }) => (
  <div className="min-w-0 rounded-xl border border-border/60 bg-card/60 p-4">
    <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </div>
    <div className="truncate font-display text-2xl leading-none">{value}</div>
  </div>
);

const Status = () => {
  const [range, setRange] = useState<Range>(90);
  const [rows, setRows] = useState<DailyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoInterval, setAutoInterval] = useState<number>(0);
  const [isOwner, setIsOwner] = useState(false);
  const [pageTitle, setPageTitle] = useState("WardenMC Status");
  const [pageSubtitle, setPageSubtitle] = useState("Live uptime — automated checks every 5 minutes.");
  const [pageFootnote, setPageFootnote] = useState("");
  const [services, setServices] = useState<Service[]>(DEFAULT_SERVICES);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [detailChecks, setDetailChecks] = useState<Check[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [subEmail, setSubEmail] = useState("");
  const [subSubmitting, setSubSubmitting] = useState(false);
  const [subDone, setSubDone] = useState(false);
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<"all" | DayStatus>("all");
  const [loadError, setLoadError] = useState(false);
  const { toast } = useToast();

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${label} copied`, description: text });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setSubEmail(user.email);
    });
  }, []);

  const submitSubscribe = async () => {
    const email = subEmail.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast({ title: "Enter a valid email", variant: "destructive" });
      return;
    }
    setSubSubmitting(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("status_subscribers").insert({ email, user_id: user?.id ?? null });
    setSubSubmitting(false);
    if (error && !/duplicate|unique/i.test(error.message)) {
      toast({ title: "Couldn't subscribe", description: error.message, variant: "destructive" });
      return;
    }
    setSubDone(true);
    toast({ title: "You're subscribed", description: "We'll email you when incidents are posted or updated." });
  };

  const unsubscribeMe = async () => {
    const email = subEmail.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      toast({ title: "Enter your email first", variant: "destructive" });
      return;
    }
    setSubSubmitting(true);
    const { data: row } = await supabase
      .from("status_subscribers")
      .select("unsubscribe_token")
      .ilike("email", email)
      .maybeSingle();
    if (!row?.unsubscribe_token) {
      setSubSubmitting(false);
      toast({ title: "Not subscribed", description: "That email isn't on the list." });
      return;
    }
    const { error } = await supabase.rpc("status_unsubscribe", { _token: row.unsubscribe_token });
    setSubSubmitting(false);
    if (error) {
      toast({ title: "Couldn't unsubscribe", description: error.message, variant: "destructive" });
      return;
    }
    setSubDone(false);
    setSubOpen(false);
    toast({ title: "Unsubscribed", description: "You won't receive incident emails." });
  };

  useEffect(() => {
    document.title = "Status — WardenMC";

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "owner")
        .maybeSingle()
        .then(({ data }) => setIsOwner(!!data));
    });

    supabase
      .from("site_content")
      .select("value")
      .eq("key", "status_page")
      .maybeSingle()
      .then(({ data }) => {
        const value = (data?.value as any) ?? {};
        if (value.title) setPageTitle(value.title);
        if (value.subtitle) setPageSubtitle(value.subtitle);
        if (typeof value.footnote === "string") setPageFootnote(value.footnote);
        if (Array.isArray(value.services) && value.services.length) setServices(value.services);
      });
  }, []);

  const loadData = async (days: Range) => {
    setLoading(true);
    setLoadError(false);
    const { data, error } = await supabase.rpc("get_uptime_daily", { _days: days });
    if (error) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    setRows((data ?? []) as DailyRow[]);

    const { data: incidentRows, error: incError } = await supabase.rpc("get_public_uptime_incidents", { _limit: 20 });
    if (incError) {
      setLoadError(true);
      setLoading(false);
      return;
    }
    setIncidents((incidentRows ?? []) as Incident[]);
    setLoading(false);
  };

  useEffect(() => {
    loadData(range);
  }, [range]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await supabase.functions.invoke("uptime-check", { method: "POST" });
    } catch {
      // Manual refresh should not block the page if the check endpoint is unavailable.
    }
    await loadData(range);
    setRefreshing(false);
  };

  useEffect(() => {
    if (autoInterval <= 0) return;
    const id = window.setInterval(handleRefresh, autoInterval * 60_000);
    return () => window.clearInterval(id);
  }, [autoInterval, range]);

  useEffect(() => {
    if (!detailKey) return;
    setDetailLoading(true);
    setDetailChecks([]);
    supabase.rpc("get_public_uptime_checks_for_service", { _service_key: detailKey, _limit: 30 }).then(({ data }) => {
      setDetailChecks((data ?? []) as Check[]);
      setDetailLoading(false);
    });
  }, [detailKey]);

  const byService = useMemo(() => {
    const map = new Map<string, Map<string, { pct: number | null; total: number }>>();
    for (const row of rows) {
      if (!map.has(row.service_key)) map.set(row.service_key, new Map());
      map.get(row.service_key)!.set(row.day, { pct: row.uptime_pct, total: Number(row.total_checks) });
    }
    return map;
  }, [rows]);

  const overall = useMemo(() => {
    let total = 0;
    let up = 0;
    for (const row of rows) {
      total += Number(row.total_checks);
      up += Number(row.up_checks);
    }
    return total ? (100 * up) / total : null;
  }, [rows]);

  const serviceCurrent: Record<string, DayStatus> = useMemo(() => {
    const today = toDayKey(new Date());
    const result: Record<string, DayStatus> = {};
    for (const service of services) {
      const rec = byService.get(service.key)?.get(today);
      result[service.key] = statusFromPct(rec?.pct ?? null, rec?.total ?? 0);
    }
    return result;
  }, [byService, services]);

  const currentStatus: DayStatus = useMemo(() => {
    const values = Object.values(serviceCurrent);
    if (values.includes("down")) return "down";
    if (values.includes("degraded")) return "degraded";
    if (values.every((value) => value === "none")) return "none";
    return "up";
  }, [serviceCurrent]);

  const statusCounts = useMemo(() => {
    const counts = { up: 0, degraded: 0, down: 0, none: 0 };
    for (const service of services) counts[serviceCurrent[service.key] ?? "none"] += 1;
    return counts;
  }, [serviceCurrent, services]);

  const activeIncidents = incidents.filter((incident) => !incident.closed_at).length;
  const currentMeta = statusMeta[currentStatus];
  const CurrentIcon = currentMeta.icon;

  const selectedService = detailKey ? services.find((service) => service.key === detailKey) : null;
  const selectedDays = detailKey ? byService.get(detailKey) : undefined;
  const selectedStatus = detailKey ? (serviceCurrent[detailKey] ?? "none") : "none";
  const selectedIncidents = detailKey ? incidents.filter((incident) => incident.service_key === detailKey) : [];
  const selectedOpenIncidents = selectedIncidents.filter((incident) => !incident.closed_at).length;
  const selectedUptime = getUptime(selectedDays);
  const lastCheck = detailChecks[0];
  const avgLatency = useMemo(() => {
    const latencies = detailChecks
      .filter((check) => check.is_up && check.latency_ms != null)
      .map((check) => check.latency_ms!);
    return latencies.length ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length) : null;
  }, [detailChecks]);

  const daySummary = useMemo(() => {
    const summary = { up: 0, degraded: 0, down: 0, none: 0 };
    if (!selectedDays) return { ...summary, none: range };
    for (const value of selectedDays.values()) summary[statusFromPct(value.pct, value.total)] += 1;
    summary.none += Math.max(0, range - selectedDays.size);
    return summary;
  }, [selectedDays, range]);

  const totalChecksWindow = rows.reduce((sum, r) => sum + Number(r.total_checks), 0);
  const totalUpWindow = rows.reduce((sum, r) => sum + Number(r.up_checks), 0);
  const totalDownWindow = Math.max(0, totalChecksWindow - totalUpWindow);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      {/* Hero */}
      <section className="aurora relative overflow-hidden pt-36 pb-16">
        <div className="container max-w-[1100px] text-center">
          <Activity className="mx-auto mb-5 h-14 w-14 text-primary drop-shadow-[0_0_28px_rgba(45,212,191,0.45)]" />
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-accent">Live status</p>
          <h1 className="font-display text-7xl leading-none tracking-wide md:text-9xl">
            NETWORK <span className="text-gradient">STATUS</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">{pageSubtitle}</p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => {
                setSubDone(false);
                setSubOpen(true);
              }}
            >
              <Bell className="mr-2 h-4 w-4" /> Subscribe
            </Button>
            <Button variant="outline" className="rounded-full" onClick={handleRefresh} disabled={refreshing}>
              <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} /> Refresh
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  currentStatus === "up" && "animate-pulse bg-emerald-400",
                  currentStatus === "degraded" && "animate-pulse bg-amber-400",
                  currentStatus === "down" && "animate-pulse bg-red-400",
                  currentStatus === "none" && "bg-muted-foreground",
                )}
              />
              <span className="text-foreground">{currentMeta.label}</span>
            </span>
            <span>
              Uptime <span className="text-foreground">{overall !== null ? `${overall.toFixed(3)}%` : "—"}</span>
            </span>
            <span>
              <span className="text-foreground">{statusCounts.up}</span> of {services.length} services operational
            </span>
            <span>
              <span className={cn(activeIncidents > 0 && "text-red-400")}>{activeIncidents}</span> open incidents
            </span>
          </div>
        </div>
      </section>

      <main className="flex-1">
        <section className="container max-w-[1100px] space-y-4 pb-20">
          {/* Global health */}
          <div className={cn("glass flex flex-col gap-6 rounded-2xl border p-6 lg:flex-row lg:items-center", currentMeta.border)}>
            <div className="shrink-0">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                <CurrentIcon className="h-4 w-4" /> Overall health
              </div>
              <div className="mt-2 font-display text-6xl leading-none tracking-wide">
                {overall !== null ? `${overall.toFixed(2)}` : "—"}
                <span className="text-2xl text-muted-foreground">%</span>
              </div>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground">{currentMeta.summary}</p>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { label: "Checks", value: totalChecksWindow.toLocaleString(), tone: "" },
                { label: "Passed", value: totalUpWindow.toLocaleString(), tone: "text-emerald-400" },
                {
                  label: "Failed",
                  value: totalDownWindow.toLocaleString(),
                  tone: totalDownWindow ? "text-red-400" : "",
                },
                { label: "Operational", value: `${statusCounts.up}/${services.length}`, tone: "text-emerald-400" },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-border/60 bg-background/40 p-4">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">{s.label}</div>
                  <div className={cn("mt-1 font-display text-2xl tracking-wide", s.tone)}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="glass rounded-2xl p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search services…"
                  className="h-9 w-full rounded-full border border-border bg-background/60 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 rounded-full border border-border p-1">
                        <Timer className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
                        {[0, 1, 5, 15].map((min) => (
                          <button
                            key={min}
                            type="button"
                            onClick={() => isOwner && setAutoInterval(min)}
                            disabled={!isOwner}
                            className={cn(
                              "rounded-full px-2.5 py-1 text-xs transition",
                              autoInterval === min
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground",
                              !isOwner && "cursor-not-allowed opacity-40 hover:text-muted-foreground",
                            )}
                          >
                            {min === 0 ? "Off" : `${min}m`}
                          </button>
                        ))}
                      </div>
                    </TooltipTrigger>
                    {!isOwner && (
                      <TooltipContent side="bottom">
                        <p>Only owners can change auto-refresh.</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => {
                    setSubDone(false);
                    setSubOpen(true);
                  }}
                >
                  <Bell className="mr-2 h-4 w-4" /> Alerts
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} /> Refresh
                </Button>
                <div className="flex items-center gap-1 rounded-full border border-border p-1">
                  {RANGES.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setRange(item.value)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs transition",
                        range === item.value
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {/* State filter chips */}
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
              {(
                [
                  {
                    key: "all",
                    label: "All",
                    count: services.length,
                    tone: "text-muted-foreground",
                    active: "bg-primary text-primary-foreground border-primary",
                  },
                  {
                    key: "up",
                    label: "Operational",
                    count: statusCounts.up,
                    tone: "text-emerald-400",
                    active: "bg-emerald-500/20 text-emerald-300 border-emerald-500/50",
                  },
                  {
                    key: "degraded",
                    label: "Degraded",
                    count: statusCounts.degraded,
                    tone: "text-amber-400",
                    active: "bg-amber-500/20 text-amber-300 border-amber-500/50",
                  },
                  {
                    key: "down",
                    label: "Outage",
                    count: statusCounts.down,
                    tone: "text-red-400",
                    active: "bg-red-500/20 text-red-300 border-red-500/50",
                  },
                  {
                    key: "none",
                    label: "No data",
                    count: statusCounts.none,
                    tone: "text-muted-foreground",
                    active: "bg-muted text-foreground border-border",
                  },
                ] as const
              ).map((f) => {
                const on = stateFilter === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setStateFilter(f.key)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition",
                      on ? f.active : cn("border-border hover:border-primary/50", f.tone),
                    )}
                  >
                    <span>{f.label}</span>
                    <span
                      className={cn(
                        "rounded-full border px-1.5",
                        on ? "border-current/40" : "border-border text-muted-foreground",
                      )}
                    >
                      {f.count}
                    </span>
                  </button>
                );
              })}
              {(query || stateFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setStateFilter("all");
                  }}
                  className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                >
                  <X className="h-3 w-3" /> Reset
                </button>
              )}
            </div>
          </div>

          {loadError && rows.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-amber-400" />
              <p className="text-muted-foreground">Couldn't load status data right now.</p>
              <Button variant="outline" className="mt-5 rounded-full" onClick={() => loadData(range)}>
                <RefreshCw className="mr-2 h-4 w-4" /> Try again
              </Button>
            </div>
          ) : loading && rows.length === 0 ? (
            <div className="glass divide-y divide-border/60 rounded-2xl p-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-4">
                  <div className="h-2 w-2 rounded-full bg-muted" />
                  <div className="h-4 w-32 rounded bg-muted" />
                  <div className="h-8 flex-1 rounded bg-muted" />
                  <div className="h-5 w-16 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Services table */}
              <section className="glass overflow-hidden rounded-2xl">
                <div className="hidden border-b border-border/60 px-4 py-2 text-[10px] uppercase tracking-widest text-muted-foreground lg:grid lg:grid-cols-[2rem_16rem_minmax(0,1fr)_6rem_7rem_10rem] lg:items-center lg:gap-4">
                  <span>#</span>
                  <span>Service</span>
                  <span>Timeline · {range}d</span>
                  <span className="text-right">Uptime</span>
                  <span className="text-right">State</span>
                  <span className="text-right">Actions</span>
                </div>
                <div className="divide-y divide-border/60">
                  {(() => {
                    const q = query.trim().toLowerCase();
                    const filtered = services
                      .map((service, idx) => ({
                        service,
                        idx,
                        status: serviceCurrent[service.key] ?? ("none" as DayStatus),
                      }))
                      .filter(({ service, status }) => {
                        if (stateFilter !== "all" && status !== stateFilter) return false;
                        if (!q) return true;
                        return (
                          service.name.toLowerCase().includes(q) ||
                          service.desc.toLowerCase().includes(q) ||
                          service.key.toLowerCase().includes(q)
                        );
                      });
                    if (filtered.length === 0) {
                      return (
                        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                          No services match your filter.
                        </div>
                      );
                    }
                    return filtered.map(({ service, idx, status }) => {
                      const meta = statusMeta[status];
                      const days = byService.get(service.key) ?? new Map<string, { pct: number | null; total: number }>();
                      const uptime = getUptime(days);
                      return (
                        <div
                          key={service.key}
                          role="button"
                          tabIndex={0}
                          onClick={() => setDetailKey(service.key)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setDetailKey(service.key);
                            }
                          }}
                          className="group grid cursor-pointer grid-cols-1 items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/40 focus:outline-none focus-visible:bg-muted/40 lg:grid-cols-[2rem_16rem_minmax(0,1fr)_6rem_7rem_10rem]"
                        >
                          <span className="hidden text-xs text-muted-foreground lg:block">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", meta.dot)} />
                              <span className="truncate font-display text-xl tracking-wide transition-colors group-hover:text-primary">
                                {service.name}
                              </span>
                              {service.url && (
                                <a
                                  href={service.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  aria-label={`Open ${service.name}`}
                                  className="shrink-0 text-muted-foreground hover:text-primary"
                                >
                                  <ArrowUpRight className="h-3.5 w-3.5" />
                                </a>
                              )}
                            </div>
                            <div className="mt-1 truncate text-xs text-muted-foreground">{service.desc}</div>
                          </div>
                          <div className="min-w-0">
                            <DayGrid days={range} byDay={days} />
                          </div>
                          <div className={cn("font-display text-lg tracking-wide lg:text-right", meta.text)}>
                            {uptime !== null ? `${uptime.toFixed(2)}%` : loading ? "…" : "—"}
                          </div>
                          <div className="lg:flex lg:justify-end">
                            <StatusPill status={status} />
                          </div>
                          <div className="flex items-center gap-1 lg:justify-end" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyText(service.url || service.desc, service.name);
                              }}
                              className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-muted-foreground transition hover:border-primary hover:text-primary"
                              title="Copy link/IP"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailKey(service.key);
                              }}
                              className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary hover:text-primary"
                            >
                              Details <ChevronRight className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </section>

              {/* Incidents feed */}
              {incidents.length > 0 && (
                <section className="glass rounded-2xl p-6">
                  <div className="flex items-center gap-3">
                    <h2 className="font-display text-3xl tracking-wide">INCIDENT LOG</h2>
                    <span className="text-sm text-muted-foreground">{incidents.length} entries</span>
                  </div>
                  <div className="mt-4 divide-y divide-border/60">
                    {incidents.map((incident) => {
                      const service = services.find((item) => item.key === incident.service_key);
                      const ongoing = !incident.closed_at;
                      const duration = Math.max(
                        1,
                        Math.round(
                          ((incident.closed_at ? new Date(incident.closed_at).getTime() : Date.now()) -
                            new Date(incident.opened_at).getTime()) /
                            60000,
                        ),
                      );
                      return (
                        <Link
                          key={incident.id}
                          to={`/status/${incident.incident_number}`}
                          className="group flex flex-wrap items-center gap-x-4 gap-y-1 px-2 py-3 text-sm transition-colors hover:bg-muted/40"
                        >
                          <span
                            className={cn(
                              "h-2 w-2 shrink-0 rounded-full",
                              ongoing ? "animate-pulse bg-red-400" : "bg-muted-foreground",
                            )}
                          />
                          <span
                            className={cn(
                              "shrink-0 text-xs font-semibold uppercase tracking-wider",
                              ongoing ? "text-red-400" : "text-emerald-400",
                            )}
                          >
                            {ongoing ? "Open" : "Resolved"}
                          </span>
                          <span className="shrink-0 font-medium text-foreground">
                            #{incident.incident_number} · {service?.name ?? incident.service_key}
                          </span>
                          <span className="min-w-0 truncate text-xs text-muted-foreground">
                            {formatDateTime(incident.opened_at)} ·{" "}
                            {duration < 60 ? `${duration}m` : `${Math.floor(duration / 60)}h ${duration % 60}m`}
                            {incident.last_error ? ` · ${incident.last_error}` : ""}
                          </span>
                          <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                        </Link>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Legend footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-2 pb-2 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/80" /> Up
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-amber-500/80" /> Degraded
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-red-500/80" /> Outage
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm bg-muted" /> No data
                  </span>
                </div>
                <div>
                  Auto-refresh: {autoInterval === 0 ? "Off" : `${autoInterval}m`} · Checks every 5 minutes
                </div>
              </div>
              {pageFootnote && (
                <p className="whitespace-pre-wrap text-center text-xs text-muted-foreground">{pageFootnote}</p>
              )}
            </>
          )}
        </section>
      </main>
      <Footer />

      <Dialog open={!!detailKey} onOpenChange={(open) => !open && setDetailKey(null)}>
        <DialogContent className="left-0 right-0 top-auto bottom-0 max-h-[88vh] w-full max-w-none translate-x-0 translate-y-0 overflow-y-auto overflow-x-hidden rounded-t-lg p-4 sm:bottom-auto sm:left-[50%] sm:right-auto sm:top-[50%] sm:w-[min(48rem,calc(100vw-2rem))] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg sm:p-6">
          {selectedService && (
            <>
              <DialogHeader className="pr-8 text-left">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <DialogTitle className="font-display text-3xl leading-tight tracking-wide break-words">
                    {selectedService.name}
                  </DialogTitle>
                  <StatusPill status={selectedStatus} />
                </div>
                <DialogDescription className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="min-w-0 break-words">{selectedService.desc}</span>
                  {selectedService.url && (
                    <a
                      href={selectedService.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 border-l border-border pl-2 text-primary hover:underline"
                    >
                      Visit <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MiniMetric
                  icon={Activity}
                  label="Uptime"
                  value={selectedUptime !== null ? `${selectedUptime.toFixed(2)}%` : "—"}
                />
                <MiniMetric icon={Gauge} label="Avg latency" value={avgLatency !== null ? `${avgLatency}ms` : "—"} />
                <MiniMetric
                  icon={Zap}
                  label="Incidents"
                  value={
                    selectedOpenIncidents
                      ? `${selectedIncidents.length} (${selectedOpenIncidents} open)`
                      : selectedIncidents.length
                  }
                />
                <MiniMetric
                  icon={Clock}
                  label="Last check"
                  value={
                    lastCheck
                      ? new Date(lastCheck.checked_at).toLocaleTimeString(undefined, {
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "—"
                  }
                />
              </div>

              <section className="mt-5">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Day breakdown
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(["up", "degraded", "down", "none"] as DayStatus[]).map((status) => (
                    <div
                      key={status}
                      className={cn("rounded-xl border p-3", statusMeta[status].border, statusMeta[status].tone)}
                    >
                      <div className={cn("font-display text-2xl tracking-wide", statusMeta[status].text)}>
                        {daySummary[status]}
                      </div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {statusMeta[status].label}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="mt-5">
                <div className="mb-2 text-sm font-semibold">Recent checks</div>
                {detailLoading ? (
                  <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">Loading…</div>
                ) : detailChecks.length === 0 ? (
                  <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
                    No recent checks recorded.
                  </div>
                ) : (
                  <Card className="max-h-64 divide-y divide-border overflow-y-auto overflow-x-hidden">
                    {detailChecks.map((check, index) => (
                      <div
                        key={`${check.checked_at}-${index}`}
                        className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-3 py-2 text-xs"
                      >
                        {check.is_up ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-destructive" />
                        )}
                        <span className="min-w-0">
                          <span className="block truncate font-mono text-[10px] text-muted-foreground">
                            {formatDateTime(check.checked_at)}
                          </span>
                          <span className="block truncate">
                            {check.is_up ? "Up" : "Down"}
                            {check.status_code != null ? ` · HTTP ${check.status_code}` : ""}
                            {check.error ? ` · ${check.error}` : ""}
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-muted-foreground">
                          {check.latency_ms != null ? `${check.latency_ms}ms` : "—"}
                        </span>
                      </div>
                    ))}
                  </Card>
                )}
              </section>

              {selectedIncidents.length > 0 && (
                <section className="mt-5">
                  <div className="mb-2 text-sm font-semibold">Incidents for {selectedService.name}</div>
                  <Card className="divide-y divide-border overflow-hidden">
                    {selectedIncidents.map((incident) => {
                      const ongoing = !incident.closed_at;
                      const duration = Math.max(
                        1,
                        Math.round(
                          ((incident.closed_at ? new Date(incident.closed_at).getTime() : Date.now()) -
                            new Date(incident.opened_at).getTime()) /
                            60000,
                        ),
                      );
                      return (
                        <Link
                          key={incident.id}
                          to={`/status/${incident.incident_number}`}
                          onClick={() => setDetailKey(null)}
                          className="flex min-w-0 items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-muted/40"
                        >
                          <span
                            className={cn(
                              "h-2 w-2 shrink-0 rounded-full",
                              ongoing ? "animate-pulse bg-destructive" : "bg-muted-foreground",
                            )}
                          />
                          <span className="shrink-0 font-semibold">#{incident.incident_number}</span>
                          <span className="min-w-0 flex-1 truncate text-muted-foreground">
                            {formatDateTime(incident.opened_at)} ·{" "}
                            {duration < 60 ? `${duration}m` : `${Math.floor(duration / 60)}h ${duration % 60}m`}
                            {incident.last_error ? ` · ${incident.last_error}` : ""}
                          </span>
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        </Link>
                      );
                    })}
                  </Card>
                </section>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={subOpen} onOpenChange={setSubOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-3xl tracking-wide">
              <Bell className="h-5 w-5 text-primary" /> Incident alerts
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Get an email whenever we post or update a status incident. Unsubscribe anytime.
            </DialogDescription>
          </DialogHeader>
          {subDone ? (
            <div className="mt-2 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                You're on the list. We'll email <span className="font-mono">{subEmail}</span> when incidents are posted
                or updated.
              </div>
            </div>
          ) : (
            <div className="mt-2 space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={subEmail}
                  onChange={(e) => setSubEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="border-border bg-background pl-9 text-foreground"
                />
              </div>
              <Button type="button" onClick={submitSubscribe} disabled={subSubmitting} className="w-full rounded-full">
                {subSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bell className="mr-2 h-4 w-4" />}
                {subSubmitting ? "Subscribing" : "Notify me"}
              </Button>
              <button
                type="button"
                onClick={unsubscribeMe}
                disabled={subSubmitting}
                className="w-full text-center text-xs text-muted-foreground transition hover:text-primary disabled:opacity-40"
              >
                Already subscribed? Unsubscribe this email
              </button>
              <p className="text-center text-xs text-muted-foreground">
                Email notifications are currently off — we're collecting subscribers and will turn them on soon.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Status;
