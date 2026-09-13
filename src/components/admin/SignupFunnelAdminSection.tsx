import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, UserPlus, UserCheck, TrendingDown } from "lucide-react";

type RangeKey = "24h" | "7d" | "30d" | "all";

const RANGES: { key: RangeKey; label: string; since: () => string | null }[] = [
  { key: "24h", label: "24h", since: () => new Date(Date.now() - 24 * 3600e3).toISOString() },
  { key: "7d", label: "7 days", since: () => new Date(Date.now() - 7 * 86400e3).toISOString() },
  { key: "30d", label: "30 days", since: () => new Date(Date.now() - 30 * 86400e3).toISOString() },
  { key: "all", label: "All time", since: () => null },
];

type Row = { event: string; session_id: string };

export default function SignupFunnelAdminSection() {
  const [range, setRange] = useState<RangeKey>("7d");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    const since = RANGES.find((r) => r.key === range)!.since();
    let query = supabase.from("funnel_events").select("event, session_id");
    if (since) query = query.gte("created_at", since);
    const { data, error } = await query;
    if (error) setError(error.message);
    setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [range]);

  const stats = useMemo(() => {
    if (!rows) return null;
    const viewSessions = new Set(rows.filter((r) => r.event === "signup_view").map((r) => r.session_id));
    const completeSessions = new Set(rows.filter((r) => r.event === "signup_complete").map((r) => r.session_id));
    const views = viewSessions.size;
    const completes = [...completeSessions].filter((s) => viewSessions.has(s)).length;
    const completionRate = views ? (completes / views) * 100 : 0;
    return { views, completes, dropouts: views - completes, completionRate };
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1.5">
          {RANGES.map((r) => (
            <Button key={r.key} size="sm" variant={range === r.key ? "default" : "outline"} onClick={() => setRange(r.key)}>
              {r.label}
            </Button>
          ))}
        </div>
        <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {loading && !stats ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : error ? (
        <Card><CardContent className="py-8 text-center text-sm text-destructive">{error}</CardContent></Card>
      ) : stats && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Reached sign-up form</CardTitle>
                <UserPlus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-3xl font-bold">{stats.views}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Finished sign-up</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-3xl font-bold">{stats.completes}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Dropped out</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent><div className="text-3xl font-bold">{stats.dropouts}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Completion rate</CardTitle>
              </CardHeader>
              <CardContent><div className="text-3xl font-bold">{stats.completionRate.toFixed(1)}%</div></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sign-up funnel</CardTitle>
              <CardDescription>Unique visitors per step (matched by session, {RANGES.find((r) => r.key === range)!.label.toLowerCase()}).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Viewed sign-up form", value: stats.views, pct: 100 },
                { label: "Completed sign-up", value: stats.completes, pct: stats.completionRate },
              ].map((step) => (
                <div key={step.label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{step.label}</span>
                    <span className="text-muted-foreground">{step.value} · {step.pct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(step.pct, step.value ? 2 : 0)}%` }} />
                  </div>
                </div>
              ))}
              {stats.views === 0 && <p className="text-sm text-muted-foreground">No funnel data in this range yet. Events are recorded from now on.</p>}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
