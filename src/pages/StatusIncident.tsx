import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const SERVICE_NAMES: Record<string, string> = {
  website: "Website",
  minecraft: "Minecraft Server",
  api: "API & Database",
  panel: "Panel",
  discord: "Discord",
  portfolio: "Portfolio",
};

type Incident = {
  id: string;
  incident_number: number;
  service_key: string;
  opened_at: string;
  closed_at: string | null;
  last_error: string | null;
};
type Check = {
  id: string;
  checked_at: string;
  is_up: boolean;
  latency_ms: number | null;
  status_code: number | null;
  error: string | null;
};

const fmtDur = (ms: number) => {
  const m = Math.max(1, Math.round(ms / 60000));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  if (h < 24) return `${h}h ${rm}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h ${rm}m`;
};

const StatusIncident = () => {
  const { number } = useParams<{ number: string }>();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    document.title = `Incident #${number} — Warden Network Status`;
    (async () => {
      setLoading(true);
      const n = Number(number);
      if (!Number.isFinite(n)) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const { data: incRows } = await supabase.rpc("get_public_uptime_incident_by_number", { _number: n });
      const inc = Array.isArray(incRows) ? incRows[0] : null;
      if (!inc) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setIncident(inc as Incident);
      // Pull checks for that service around the incident window (open -> close + 1h buffer)
      const fromTs = new Date(new Date(inc.opened_at).getTime() - 30 * 60_000).toISOString();
      const toTs = new Date(
        (inc.closed_at ? new Date(inc.closed_at).getTime() : Date.now()) + 60 * 60_000,
      ).toISOString();
      const { data: chk } = await supabase.rpc("get_public_uptime_checks_between", {
        _service_key: inc.service_key,
        _from: fromTs,
        _to: toTs,
      });
      setChecks((chk ?? []) as Check[]);
      setLoading(false);
    })();
  }, [number]);

  const stats = useMemo(() => {
    if (!incident) return null;
    const start = new Date(incident.opened_at).getTime();
    const end = incident.closed_at ? new Date(incident.closed_at).getTime() : Date.now();
    const duringIncident = checks.filter((c) => {
      const t = new Date(c.checked_at).getTime();
      return t >= start && t <= end;
    });
    const failed = duringIncident.filter((c) => !c.is_up).length;
    const recovered = duringIncident.filter((c) => c.is_up).length;
    return { duration: end - start, failed, recovered, totalChecks: duringIncident.length };
  }, [incident, checks]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 pt-24 pb-16">
          <div className="container max-w-3xl px-4 text-center text-muted-foreground">Loading…</div>
        </main>
        <Footer />
      </div>
    );
  }
  if (notFound || !incident) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 pt-24 pb-16">
          <div className="container max-w-3xl px-4 text-center">
            <h1 className="font-display text-3xl font-bold mb-2">Incident not found</h1>
            <p className="text-muted-foreground mb-6">No incident matches #{number}.</p>
            <Button asChild>
              <Link to="/status">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to status
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const ongoing = !incident.closed_at;
  const serviceName = SERVICE_NAMES[incident.service_key] ?? incident.service_key;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container max-w-3xl px-4">
          <Button asChild variant="ghost" size="sm" className="mb-4">
            <Link to="/status">
              <ArrowLeft className="h-4 w-4 mr-2" />
              All incidents
            </Link>
          </Button>

          <div className="flex items-start justify-between gap-3 mb-6">
            <div>
              <Badge variant={ongoing ? "destructive" : "secondary"} className="mb-3">
                {ongoing ? (
                  <>
                    <AlertTriangle className="h-3 w-3 mr-1" /> Ongoing
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Resolved
                  </>
                )}
              </Badge>
              <h1 className="font-display text-3xl md:text-4xl font-black">
                Incident <span className="text-gradient">#{incident.incident_number}</span>
              </h1>
              <p className="text-muted-foreground mt-1">{serviceName} outage</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Card className="p-4">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Started</div>
              <div className="text-sm font-medium mt-1">{new Date(incident.opened_at).toLocaleString()}</div>
            </Card>
            <Card className="p-4">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {ongoing ? "Still down" : "Resolved"}
              </div>
              <div className="text-sm font-medium mt-1">
                {incident.closed_at ? new Date(incident.closed_at).toLocaleString() : "—"}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Duration</div>
              <div className="text-sm font-medium mt-1">
                {fmtDur(
                  (incident.closed_at ? new Date(incident.closed_at).getTime() : Date.now()) -
                    new Date(incident.opened_at).getTime(),
                )}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Failed checks</div>
              <div className="text-sm font-medium mt-1">
                {stats?.failed ?? 0} / {stats?.totalChecks ?? 0}
              </div>
            </Card>
          </div>

          {incident.last_error && (
            <Card className="p-4 mb-6 border-destructive/40 bg-destructive/5">
              <div className="text-[10px] uppercase tracking-widest text-destructive mb-1">Last error</div>
              <div className="text-sm font-mono break-words">{incident.last_error}</div>
            </Card>
          )}

          <h2 className="font-display text-xl font-bold mb-3">Timeline</h2>
          <Card className="divide-y divide-border">
            <div className="p-4 flex items-start gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive mt-1.5 shrink-0" />
              <div>
                <div className="font-medium text-sm">Incident opened</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(incident.opened_at).toLocaleString()} — {serviceName} reported as down.
                </div>
              </div>
            </div>
            {checks.map((c) => {
              const inWindow =
                new Date(c.checked_at).getTime() >= new Date(incident.opened_at).getTime() &&
                (!incident.closed_at || new Date(c.checked_at).getTime() <= new Date(incident.closed_at).getTime());
              return (
                <div key={c.id} className="p-3 flex items-center gap-3 text-sm">
                  {c.is_up ? (
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs text-muted-foreground">
                      {new Date(c.checked_at).toLocaleString()}
                    </div>
                    <div className="truncate">
                      {c.is_up ? "Up" : "Down"}
                      {c.status_code != null ? ` · HTTP ${c.status_code}` : ""}
                      {c.latency_ms != null ? ` · ${c.latency_ms}ms` : ""}
                      {c.error ? ` · ${c.error}` : ""}
                    </div>
                  </div>
                  {!inWindow && (
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      context
                    </Badge>
                  )}
                </div>
              );
            })}
            {incident.closed_at && (
              <div className="p-4 flex items-start gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <div>
                  <div className="font-medium text-sm">Incident resolved</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(incident.closed_at).toLocaleString()} — {serviceName} recovered.
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default StatusIncident;
