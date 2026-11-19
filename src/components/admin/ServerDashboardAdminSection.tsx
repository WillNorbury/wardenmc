import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Activity, Ban, Gauge, Map, MapPin, RefreshCw, Server, ShieldBan, UserRound, Users, Wifi } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Status = { ok: boolean; ip?: string; online?: boolean; players?: number; max?: number; player_list?: string[]; version?: string | null; latency_ms?: number | null; uptime_pct?: number | null; checked_at?: string; error?: string };
type Player = { name: string; uuid?: string; online?: boolean };
type MapRow = { id: string; name: string; url: string; description: string | null; sort_order: number; enabled: boolean };
type Check = { checked_at: string; is_up: boolean; latency_ms: number | null };

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

export function ServerDashboardAdminSection() {
  const [status, setStatus] = useState<Status | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [checks, setChecks] = useState<Check[]>([]);
  const [maps, setMaps] = useState<MapRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mapForm, setMapForm] = useState({ name: "", url: "", description: "" });
  const [mapBusy, setMapBusy] = useState(false);

  const load = useCallback(async (withProbe = false) => {
    setRefreshing(true);
    try {
      const [mapsResult, checksResult] = await Promise.all([
        supabase.from("server_maps").select("id, name, url, description, sort_order, enabled").order("sort_order"),
        supabase.from("uptime_checks").select("checked_at, is_up, latency_ms").eq("service_key", "mc:panel").order("checked_at", { ascending: false }).limit(60),
      ]);
      if (mapsResult.error) throw mapsResult.error;
      setMaps((mapsResult.data ?? []) as MapRow[]);
      setChecks(((checksResult.data ?? []) as Check[]).reverse());
      if (withProbe || !status) {
        const { data, error } = await supabase.functions.invoke("server-panel-status", { body: {} });
        if (error) throw error;
        const next = data as Status;
        setStatus(next);
        setPlayers((next.player_list ?? []).map((name) => ({ name, online: true })));
      }
    } catch (error) {
      toast({ title: "Server dashboard unavailable", description: error instanceof Error ? error.message : "Could not load server data", variant: "destructive" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);


  useEffect(() => { void load(true); }, [load]);
  useEffect(() => {
    const timer = window.setInterval(() => void load(true), 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const runCommand = async (command: string, player: string) => {
    const { data: servers } = await supabase.from("mc_servers").select("id").eq("enabled", true).order("created_at").limit(1);
    const serverId = servers?.[0]?.id;
    if (!serverId) { toast({ title: "No bridge server configured", description: "Configure a connected server before sending commands.", variant: "destructive" }); return; }
    const { data: session } = await supabase.auth.getSession();
    const response = await fetch(`https://${PROJECT_ID}.functions.supabase.co/mc-console-send`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.session?.access_token ?? ""}` }, body: JSON.stringify({ server_id: serverId, command: `${command} ${player}` }) });
    if (!response.ok) { const body = await response.json().catch(() => null); toast({ title: "Command failed", description: body?.error ?? `HTTP ${response.status}`, variant: "destructive" }); return; }
    toast({ title: "Command queued", description: `${command} sent for ${player}` });
  };

  const addMap = async () => {
    if (!mapForm.name.trim() || !mapForm.url.trim()) return;
    setMapBusy(true);
    const { data, error } = await supabase.from("server_maps").insert({ name: mapForm.name.trim(), url: mapForm.url.trim(), description: mapForm.description.trim() || null, sort_order: maps.length }).select().single();
    setMapBusy(false);
    if (error) { toast({ title: "Map could not be added", description: error.message, variant: "destructive" }); return; }
    setMaps((current) => [...current, data as MapRow]);
    setMapForm({ name: "", url: "", description: "" });
  };

  const chart = useMemo(() => checks.map((check) => ({ time: new Date(check.checked_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), ping: check.latency_ms ?? 0 })), [checks]);
  const playerCount = status?.players ?? players.length;

  if (loading) return <div className="flex items-center gap-2 py-8 text-muted-foreground"><RefreshCw className="h-4 w-4 animate-spin" />Loading server dashboard…</div>;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-2xl font-semibold">Live server dashboard</h2><p className="text-sm text-muted-foreground">Monitor your Minecraft network and send moderation commands.</p></div>
      <Button onClick={() => void load(true)} disabled={refreshing}><RefreshCw className={refreshing ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />Refresh</Button>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={<Server />} label="Status" value={status?.online ? "Online" : "Offline"} detail={status?.version ?? "No version reported"} tone={status?.online ? "text-emerald-500" : "text-destructive"} />
      <Metric icon={<Users />} label="Players online" value={`${playerCount}/${status?.max ?? 0}`} detail="Current player count" />
      <Metric icon={<Wifi />} label="Ping" value={status?.latency_ms == null ? "—" : `${status.latency_ms} ms`} detail="Status API response" />
      <Metric icon={<Activity />} label="30-day uptime" value={status?.uptime_pct == null ? "—" : `${status.uptime_pct}%`} detail={status?.checked_at ? `Checked ${new Date(status.checked_at).toLocaleTimeString()}` : "Awaiting check"} />
    </div>
    <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
      <Card><CardHeader className="flex-row items-center justify-between space-y-0"><CardTitle className="flex items-center gap-2"><Gauge className="h-5 w-5" />Latency history</CardTitle><Badge variant="outline">Last 60 checks</Badge></CardHeader><CardContent><div className="h-64">{chart.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={chart}><defs><linearGradient id="pingFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.28} /><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="time" tick={{ fontSize: 11 }} /><YAxis unit="ms" tick={{ fontSize: 11 }} /><Tooltip /><Area type="monotone" dataKey="ping" stroke="hsl(var(--primary))" fill="url(#pingFill)" /></AreaChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No telemetry yet.</div>}</div></CardContent></Card>
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><UserRound className="h-5 w-5" />Players online</CardTitle></CardHeader><CardContent>{players.length ? <div className="space-y-2">{players.map((player) => <div className="flex items-center justify-between border-b py-2 last:border-0" key={player.name}><span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-500" />{player.name}</span><span className="flex gap-1"><Button size="sm" variant="outline" title={`Kick ${player.name}`} onClick={() => void runCommand("kick", player.name)}><Ban className="h-3.5 w-3.5" /></Button><Button size="sm" variant="outline" title={`Ban ${player.name}`} onClick={() => void runCommand("ban", player.name)}><ShieldBan className="h-3.5 w-3.5" /></Button></span></div>)}</div> : <p className="text-sm text-muted-foreground">No player list was provided by the server.</p>}</CardContent></Card>
    </div>
    <div className="grid gap-6 xl:grid-cols-2">
      <Card><CardHeader><CardTitle className="flex items-center gap-2"><Map className="h-5 w-5" />Server maps</CardTitle></CardHeader><CardContent className="space-y-4"><div className="space-y-2">{maps.map((map) => <div className="flex items-center justify-between gap-3 border-b py-2 last:border-0" key={map.id}><div><div className="font-medium">{map.name}</div><div className="text-xs text-muted-foreground">{map.description || map.url}</div></div><Button size="sm" variant="outline" asChild><a href={map.url} target="_blank" rel="noreferrer"><MapPin className="mr-1 h-3.5 w-3.5" />Open</a></Button></div>)}{!maps.length && <p className="text-sm text-muted-foreground">No maps added yet.</p>}</div><div className="grid gap-2 sm:grid-cols-3"><div><Label>Name</Label><Input value={mapForm.name} onChange={(event) => setMapForm((form) => ({ ...form, name: event.target.value }))} /></div><div><Label>Map URL</Label><Input value={mapForm.url} onChange={(event) => setMapForm((form) => ({ ...form, url: event.target.value }))} placeholder="https://…" /></div><div><Label>Description</Label><Input value={mapForm.description} onChange={(event) => setMapForm((form) => ({ ...form, description: event.target.value }))} /></div></div><Button onClick={() => void addMap()} disabled={mapBusy || !mapForm.name.trim() || !mapForm.url.trim()}>Add map</Button></CardContent></Card>
      <Card><CardHeader><CardTitle>Server connection</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><div className="flex items-center justify-between"><span className="text-muted-foreground">Address</span><span className="font-mono">{status?.ip ?? "Not configured"}</span></div><div className="flex items-center justify-between"><span className="text-muted-foreground">Last checked</span><span>{status?.checked_at ? new Date(status.checked_at).toLocaleString() : "—"}</span></div><div className="flex items-center justify-between"><span className="text-muted-foreground">MOTD sync</span><Badge variant="secondary">Automatic</Badge></div><p className="border-t pt-3 text-muted-foreground">Player actions require a connected server bridge. Commands are queued and recorded in the console log.</p></CardContent></Card>
    </div>
  </div>;
}

function Metric({ icon, label, value, detail, tone }: { icon: ReactNode; label: string; value: string; detail: string; tone?: string }) { return <Card><CardContent className="p-5"><div className="flex items-center gap-3 text-muted-foreground">{icon}<span className="text-sm">{label}</span></div><div className={`mt-3 text-2xl font-semibold ${tone ?? ""}`}>{value}</div><div className="mt-1 text-xs text-muted-foreground">{detail}</div></CardContent></Card>; }
