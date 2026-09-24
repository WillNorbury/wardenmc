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
    tone: "bg-white/5",
    dot: "bg-[#5f6472]",
    text: "text-[#9ca3af]",
    border: "border-white/10",
    icon: HelpCircle,
  },
};

const dayColor = (status: DayStatus) => {
  if (status === "up") return "bg-emerald-500/80";
  if (status === "degraded") return "bg-amber-500/80";
  if (status === "down") return "bg-red-500/80";
  return "bg-white/10";
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
  <div className="rounded-lg border border-border bg-card/70 p-4 min-w-0">
    <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </div>
    <div className="font-display text-2xl font-bold leading-none truncate">{value}</div>
  </div>
);

const Status = () => {
  const [range, setRange] = useState<Range>(90);
  const [rows, setRows] = useState<DailyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoInterval, setAutoInterval] = useState<number>(0);
  const [isOwner, setIsOwner] = useState(false);
  const [pageTitle, setPageTitle] = useState("Warden Network Status");
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
    document.title = "Status — Warden Network";

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

  const nowStamp = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
  const totalChecksWindow = rows.reduce((sum, r) => sum + Number(r.total_checks), 0);
  const totalUpWindow = rows.reduce((sum, r) => sum + Number(r.up_checks), 0);
  const totalDownWindow = Math.max(0, totalChecksWindow - totalUpWindow);

  return (
    <div className="min-h-screen flex flex-col bg-[#07070b] text-slate-100">
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;500;700&family=JetBrains+Mono:wght@400;600&display=swap"
        rel="stylesheet"
      />
      <Navbar />

      {/* Top ticker */}
      <div className="border-y border-white/5 bg-[#0a0a0f] font-['JetBrains_Mono'] text-[10px] uppercase tracking-[0.25em] text-[#9ca3af]">
        <div className="max-w-7xl w-full mx-auto px-4 md:px-8 py-2 flex flex-wrap items-center gap-x-6 gap-y-1">
          <span className="flex items-center gap-2">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full animate-pulse",
                currentStatus === "up" && "bg-emerald-400",
                currentStatus === "degraded" && "bg-amber-400",
                currentStatus === "down" && "bg-red-400",
                currentStatus === "none" && "bg-white/30",
              )}
            />
            <span className="text-[#ff5722]">SYS://</span> {currentMeta.label}
          </span>
          <span>
            T: <span className="text-slate-200">{nowStamp}</span>
          </span>
          <span>
            WINDOW: <span className="text-slate-200">{range}D</span>
          </span>
          <span>
            SVC: <span className="text-emerald-400">{statusCounts.up}</span>/
            <span className="text-slate-200">{services.length}</span>
          </span>
          <span>
            INC: <span className={cn(activeIncidents ? "text-red-400" : "text-slate-200")}>{activeIncidents}</span> OPEN
          </span>
          <span className="ml-auto">
            UPTIME: <span className="text-slate-200">{overall !== null ? `${overall.toFixed(3)}%` : "—"}</span>
          </span>
        </div>
      </div>

      <main className="flex-1 w-full font-['Inter']">
        <div className="max-w-7xl w-full mx-auto px-4 md:px-8 py-8 md:py-10 flex flex-col gap-8">
          {/* Command header */}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="border border-white/5 bg-[#0f0f16] p-6 md:p-8">
              <div className="flex items-center gap-2 text-[10px] font-['JetBrains_Mono'] tracking-[0.35em] uppercase text-[#ff5722]">
                <span className="h-px w-6 bg-[#ff5722]" /> Command Center · Node 01
              </div>
              <h1 className="mt-3 font-['Space_Grotesk'] text-5xl md:text-7xl font-bold tracking-tighter italic leading-none">
                STATUS<span className="text-[#ff5722]">.</span>
              </h1>
              <p className="mt-3 max-w-xl text-sm text-[#9ca3af]">{pageSubtitle}</p>
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5 border border-white/5">
                {[
                  { label: "Checks", value: totalChecksWindow.toLocaleString() },
                  { label: "OK", value: totalUpWindow.toLocaleString(), tone: "text-emerald-400" },
                  {
                    label: "Fail",
                    value: totalDownWindow.toLocaleString(),
                    tone: totalDownWindow ? "text-red-400" : "text-slate-200",
                  },
                  { label: "Services", value: `${statusCounts.up}/${services.length}` },
                ].map((s) => (
                  <div key={s.label} className="bg-[#0f0f16] px-4 py-3">
                    <div className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#5f6472]">
                      {s.label}
                    </div>
                    <div className={cn("mt-1 font-['Space_Grotesk'] text-xl font-bold", s.tone ?? "text-slate-100")}>
                      {s.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className={cn(
                "relative border p-6 flex flex-col justify-between overflow-hidden",
                currentStatus === "up" && "border-emerald-500/40 bg-emerald-500/[0.04]",
                currentStatus === "degraded" && "border-amber-500/40 bg-amber-500/[0.04]",
                currentStatus === "down" && "border-red-500/40 bg-red-500/[0.04]",
                currentStatus === "none" && "border-white/10 bg-[#0f0f16]",
              )}
            >
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.06]"
                style={{
                  backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 3px,#fff 3px,#fff 4px)",
                }}
              />
              <div className="relative">
                <div className="flex items-center gap-2 text-[10px] font-['JetBrains_Mono'] uppercase tracking-[0.3em] text-[#9ca3af]">
                  <CurrentIcon
                    className={cn(
                      "h-3.5 w-3.5",
                      currentStatus === "up" && "text-emerald-400",
                      currentStatus === "degraded" && "text-amber-400",
                      currentStatus === "down" && "text-red-400",
                    )}
                  />
                  Global Health
                </div>
                <div className="mt-4 font-['Space_Grotesk'] text-6xl font-bold leading-none tracking-tighter">
                  {overall !== null ? `${overall.toFixed(2)}` : "—"}
                  <span className="text-2xl text-[#9ca3af]">%</span>
                </div>
                <div
                  className={cn(
                    "mt-2 text-[10px] font-['JetBrains_Mono'] uppercase tracking-[0.35em]",
                    currentStatus === "up" && "text-emerald-400",
                    currentStatus === "degraded" && "text-amber-400",
                    currentStatus === "down" && "text-red-400",
                    currentStatus === "none" && "text-[#9ca3af]",
                  )}
                >
                  &gt;&gt; {currentMeta.label}
                </div>
                <p className="mt-3 text-xs text-[#9ca3af]">{currentMeta.summary}</p>
              </div>
              <div className="relative mt-6 grid grid-cols-3 gap-2 text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest">
                <div>
                  <span className="text-[#5f6472]">UP </span>
                  <span className="text-emerald-400">{statusCounts.up}</span>
                </div>
                <div>
                  <span className="text-[#5f6472]">DEG </span>
                  <span className="text-amber-400">{statusCounts.degraded}</span>
                </div>
                <div>
                  <span className="text-[#5f6472]">DWN </span>
                  <span className="text-red-400">{statusCounts.down}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Controls bar */}
          <div className="flex flex-col gap-3 border border-white/5 bg-[#0f0f16] p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="text-[10px] font-['JetBrains_Mono'] tracking-[0.3em] uppercase text-[#ff5722] shrink-0">
                  / query
                </span>
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#5f6472]" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search services…"
                    className="w-full bg-[#07070b] border border-white/10 pl-8 pr-8 py-2 text-xs font-['JetBrains_Mono'] text-slate-100 placeholder:text-[#5f6472] focus:outline-none focus:border-[#ff5722] transition"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5f6472] hover:text-[#ff5722]"
                      aria-label="Clear search"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 border border-white/10 p-1">
                        <Timer className="ml-2 h-3.5 w-3.5 text-[#9ca3af]" />
                        {[0, 1, 5, 15].map((min) => (
                          <button
                            key={min}
                            type="button"
                            onClick={() => isOwner && setAutoInterval(min)}
                            disabled={!isOwner}
                            className={cn(
                              "px-2.5 py-1 text-[10px] font-['JetBrains_Mono'] tracking-widest uppercase transition",
                              autoInterval === min ? "bg-[#ff5722] text-white" : "text-[#9ca3af] hover:text-[#ff5722]",
                              !isOwner && "opacity-40 cursor-not-allowed hover:text-[#9ca3af]",
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
                <button
                  type="button"
                  onClick={() => {
                    setSubDone(false);
                    setSubOpen(true);
                  }}
                  className="inline-flex items-center gap-2 border border-[#ff5722]/60 bg-[#ff5722]/10 px-3 py-2 text-[10px] font-['JetBrains_Mono'] tracking-widest uppercase text-[#ff5722] hover:bg-[#ff5722] hover:text-white transition"
                >
                  <Bell className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Subscribe</span>
                </button>
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 border border-white/10 px-3 py-2 text-[10px] font-['JetBrains_Mono'] tracking-widest uppercase text-[#9ca3af] hover:border-[#ff5722] hover:text-[#ff5722] transition disabled:opacity-40"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
                  <span className="hidden sm:inline">{refreshing ? "Running" : "Refresh"}</span>
                </button>
                <div className="flex items-center border border-white/10 p-1">
                  {RANGES.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setRange(item.value)}
                      className={cn(
                        "px-3 py-1 text-[10px] font-['JetBrains_Mono'] tracking-widest uppercase transition",
                        range === item.value ? "bg-[#ff5722] text-white" : "text-[#9ca3af] hover:text-[#ff5722]",
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {/* State filter chips */}
            <div className="flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
              <span className="text-[10px] font-['JetBrains_Mono'] tracking-[0.3em] uppercase text-[#ff5722]">
                / filter
              </span>
              {(
                [
                  {
                    key: "all",
                    label: "All",
                    count: services.length,
                    tone: "text-slate-200",
                    active: "bg-[#ff5722] text-white border-[#ff5722]",
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
                    label: "No Data",
                    count: statusCounts.none,
                    tone: "text-[#9ca3af]",
                    active: "bg-white/10 text-slate-200 border-white/30",
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
                      "inline-flex items-center gap-2 border px-2.5 py-1 text-[10px] font-['JetBrains_Mono'] tracking-widest uppercase transition",
                      on ? f.active : cn("border-white/10 hover:border-[#ff5722]/50", f.tone),
                    )}
                  >
                    <span>{f.label}</span>
                    <span className={cn("px-1 border", on ? "border-current/40" : "border-white/10 text-[#5f6472]")}>
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
                  className="ml-auto inline-flex items-center gap-1 text-[10px] font-['JetBrains_Mono'] tracking-widest uppercase text-[#5f6472] hover:text-[#ff5722]"
                >
                  <X className="h-3 w-3" /> Reset
                </button>
              )}
            </div>
          </div>

          {loadError && rows.length === 0 ? (
            <div className="border border-white/5 bg-[#0f0f16] p-12 text-center">
              <AlertTriangle className="h-6 w-6 mx-auto mb-3 text-amber-400" />
              <p className="font-['JetBrains_Mono'] text-sm text-[#9ca3af] mb-5">
                Couldn't load status data right now.
              </p>
              <button
                type="button"
                onClick={() => loadData(range)}
                className="inline-flex items-center gap-2 border border-white/10 px-3 py-2 text-[10px] font-['JetBrains_Mono'] tracking-widest uppercase text-[#9ca3af] hover:border-[#ff5722] hover:text-[#ff5722] transition"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Try again
              </button>
            </div>
          ) : loading && rows.length === 0 ? (
            <div className="border border-white/5 bg-[#0f0f16] divide-y divide-white/5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-4">
                  <div className="h-2 w-2 rounded-full bg-white/5" />
                  <div className="h-4 w-32 bg-white/5 rounded" />
                  <div className="flex-1 h-8 bg-white/5 rounded" />
                  <div className="h-5 w-16 bg-white/5 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <>
          {/* Services table */}
          <section className="border border-white/5 bg-[#0f0f16]">
            <div className="hidden lg:grid grid-cols-[2rem_16rem_minmax(0,1fr)_6rem_7rem_10rem] items-center gap-4 px-4 py-2 border-b border-white/5 text-[10px] font-['JetBrains_Mono'] uppercase tracking-[0.25em] text-[#5f6472]">
              <span>#</span>
              <span>Service</span>
              <span>Timeline · {range}d</span>
              <span className="text-right">Uptime</span>
              <span className="text-right">State</span>
              <span className="text-right">Actions</span>
            </div>
            <div className="divide-y divide-white/5">
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
                    <div className="px-4 py-10 text-center font-['JetBrains_Mono'] text-xs uppercase tracking-widest text-[#5f6472]">
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
                      className="group grid lg:grid-cols-[2rem_16rem_minmax(0,1fr)_6rem_7rem_10rem] grid-cols-1 items-center gap-4 px-4 py-3 cursor-pointer hover:bg-[#16161f] transition focus:outline-none focus-visible:bg-[#16161f]"
                    >
                      <span className="hidden lg:block font-['JetBrains_Mono'] text-[10px] text-[#5f6472]">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", meta.dot)} />
                          <span className="font-['Space_Grotesk'] font-bold truncate group-hover:text-[#ff5722] transition-colors">
                            {service.name}
                          </span>
                          {service.url && (
                            <a
                              href={service.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Open ${service.name}`}
                              className="shrink-0 text-[#5f6472] hover:text-[#ff5722]"
                            >
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                        <div className="truncate font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-[#5f6472] mt-1">
                          {service.desc}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <DayGrid days={range} byDay={days} />
                      </div>
                      <div className={cn("font-['Space_Grotesk'] text-base font-bold lg:text-right", meta.text)}>
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
                          className="inline-flex items-center gap-1 border border-white/10 px-2 py-1 text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#9ca3af] hover:border-[#ff5722] hover:text-[#ff5722] transition"
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
                          className="inline-flex items-center gap-1 border border-white/10 px-2 py-1 text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#9ca3af] hover:border-[#ff5722] hover:text-[#ff5722] transition"
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
            <section className="border border-white/5 bg-[#0f0f16]">
              <div className="flex items-center gap-3 border-b border-white/5 px-4 py-2">
                <span className="text-[10px] font-['JetBrains_Mono'] tracking-[0.3em] uppercase text-[#ff5722]">
                  / incident log
                </span>
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-[10px] font-['JetBrains_Mono'] uppercase tracking-widest text-[#5f6472]">
                  {incidents.length} entries
                </span>
              </div>
              <div className="divide-y divide-white/5 font-['JetBrains_Mono'] text-xs">
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
                      className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2 hover:bg-[#16161f] group"
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          ongoing ? "bg-red-500 animate-pulse" : "bg-[#5f6472]",
                        )}
                      />
                      <span
                        className={cn(
                          "shrink-0 text-[10px] uppercase tracking-widest",
                          ongoing ? "text-red-400" : "text-emerald-400",
                        )}
                      >
                        {ongoing ? "OPEN" : "RESOLVED"}
                      </span>
                      <span className="min-w-0 flex items-center gap-3">
                        <span className="text-[#5f6472] shrink-0">{formatDateTime(incident.opened_at)}</span>
                        <span className="text-slate-200 shrink-0">#{incident.incident_number}</span>
                        <span className="text-slate-300 shrink-0">{service?.name ?? incident.service_key}</span>
                        <span className="text-[#5f6472] truncate">
                          · {duration < 60 ? `${duration}m` : `${Math.floor(duration / 60)}h ${duration % 60}m`}
                          {incident.last_error ? ` · ${incident.last_error}` : ""}
                        </span>
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 text-[#5f6472] group-hover:text-[#ff5722]" />
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Legend footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4 text-xs">
            <div className="flex flex-wrap items-center gap-4 font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-[#9ca3af]">
              <span className="text-[#5f6472]">// legend</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 bg-emerald-500" /> Up
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 bg-amber-500" /> Degraded
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 bg-red-500" /> Outage
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 bg-white/10" /> No data
              </span>
            </div>
            <div className="font-['JetBrains_Mono'] text-[10px] uppercase tracking-widest text-[#5f6472]">
              Auto: {autoInterval === 0 ? "OFF" : `${autoInterval}m`} · Poll: 5m
            </div>
          </div>
          {pageFootnote && (
            <p className="whitespace-pre-wrap text-center text-xs text-[#5f6472] font-['JetBrains_Mono']">
              {pageFootnote}
            </p>
          )}
            </>
          )}
        </div>
      </main>
      <Footer />

      <Dialog open={!!detailKey} onOpenChange={(open) => !open && setDetailKey(null)}>
        <DialogContent className="left-0 right-0 top-auto bottom-0 max-h-[88vh] w-full max-w-none translate-x-0 translate-y-0 overflow-y-auto overflow-x-hidden rounded-t-lg p-4 sm:bottom-auto sm:left-[50%] sm:right-auto sm:top-[50%] sm:w-[min(48rem,calc(100vw-2rem))] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg sm:p-6">
          {selectedService && (
            <>
              <DialogHeader className="pr-8 text-left">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <DialogTitle className="font-display text-2xl leading-tight break-words">
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
                      className={cn("rounded-lg border p-3", statusMeta[status].border, statusMeta[status].tone)}
                    >
                      <div className={cn("font-display text-xl font-bold", statusMeta[status].text)}>
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
                  <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">Loading…</div>
                ) : detailChecks.length === 0 ? (
                  <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
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
                              ongoing ? "bg-destructive animate-pulse" : "bg-muted-foreground",
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
        <DialogContent className="sm:max-w-md bg-[#1a1a24] border-white/10 text-slate-100">
          <DialogHeader>
            <DialogTitle className="font-['Space_Grotesk'] text-2xl flex items-center gap-2">
              <Bell className="h-5 w-5 text-[#ff5722]" /> Incident alerts
            </DialogTitle>
            <DialogDescription className="text-[#9ca3af]">
              Get an email whenever we post or update a status incident. Unsubscribe anytime.
            </DialogDescription>
          </DialogHeader>
          {subDone ? (
            <div className="mt-2 rounded border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                You're on the list. We'll email <span className="font-mono">{subEmail}</span> when incidents are posted
                or updated.
              </div>
            </div>
          ) : (
            <div className="mt-2 space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5f6472]" />
                <Input
                  type="email"
                  value={subEmail}
                  onChange={(e) => setSubEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-9 bg-[#0a0a0f] border-white/10 text-slate-100"
                />
              </div>
              <button
                type="button"
                onClick={submitSubscribe}
                disabled={subSubmitting}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#ff5722] hover:bg-[#ff5722]/90 disabled:opacity-50 text-white px-4 py-2.5 text-xs font-mono tracking-widest uppercase transition"
              >
                {subSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
                {subSubmitting ? "Subscribing" : "Notify me"}
              </button>
              <button
                type="button"
                onClick={unsubscribeMe}
                disabled={subSubmitting}
                className="w-full text-center text-[10px] font-mono uppercase tracking-widest text-[#9ca3af] hover:text-[#ff5722] transition disabled:opacity-40"
              >
                Already subscribed? Unsubscribe this email
              </button>
              <p className="text-[10px] font-mono uppercase tracking-widest text-[#5f6472] text-center">
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
