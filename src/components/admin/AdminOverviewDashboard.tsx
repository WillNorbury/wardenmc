import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Users, Package, MessageSquare, Inbox, Server, ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "./StatCard";

type QueueItem = { id: string; kind: string; tab: string; title: string; sub: string; created_at: string };

const since = (days: number) => new Date(Date.now() - days * 864e5).toISOString();
const ago = (d: string) => formatDistanceToNow(new Date(d), { addSuffix: true });

export const AdminOverviewDashboard = ({ onNavigate }: { onNavigate: (s: any) => void }) => {
  const [s, setS] = useState({
    members: 0, newMembers: 0, plugins: 0, published: 0, featured: 0,
    discord: 0, discordFail: 0, online: false, players: 0, max: 0,
  });
  const [newest, setNewest] = useState<any[]>([]);
  const [latestPlugins, setLatestPlugins] = useState<any[]>([]);
  const [discordLog, setDiscordLog] = useState<any[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const c = { count: "exact" as const, head: true };
      const [
        members, newMembers, plugins, published, featured, discord, discordFail, status,
        newestP, latestPl, dLog, apps, appeals, reports, tickets, contact,
      ] = await Promise.all([
        supabase.from("profiles").select("id", c),
        supabase.from("profiles").select("id", c).gte("created_at", since(7)),
        supabase.from("plugins").select("id", c),
        supabase.from("plugins").select("id", c).eq("published", true),
        supabase.from("plugins").select("id", c).eq("featured", true),
        supabase.from("discord_bot_action_logs").select("id", c).gte("created_at", since(7)),
        supabase.from("discord_bot_action_logs").select("id", c).gte("created_at", since(7)).neq("status", "success"),
        supabase.from("server_status").select("*").eq("id", 1).maybeSingle(),
        supabase.from("profiles").select("id, display_name, avatar_url, created_at").order("created_at", { ascending: false }).limit(6),
        supabase.from("plugins").select("id, name, slug, published, created_at").order("created_at", { ascending: false }).limit(6),
        supabase.from("discord_bot_action_logs").select("id, action, status, error, created_at").order("created_at", { ascending: false }).limit(8),
        supabase.from("applications").select("id, type, mc_username, created_at").eq("status", "pending").order("created_at").limit(20),
        supabase.from("ban_appeals").select("id, minecraft_username, created_at").eq("status", "pending").order("created_at").limit(20),
        supabase.from("user_reports").select("id, target_type, target_label, reason, created_at").eq("status", "open").order("created_at").limit(20),
        supabase.from("support_tickets").select("id, subject, created_at").eq("status", "open").order("created_at").limit(20),
        supabase.from("contact_messages").select("id, name, subject, created_at").eq("handled", false).order("created_at").limit(20),
      ]);
      setS({
        members: members.count ?? 0, newMembers: newMembers.count ?? 0,
        plugins: plugins.count ?? 0, published: published.count ?? 0, featured: featured.count ?? 0,
        discord: discord.count ?? 0, discordFail: discordFail.count ?? 0,
        online: status.data?.online ?? false, players: status.data?.players_online ?? 0, max: status.data?.players_max ?? 0,
      });
      setNewest(newestP.data ?? []);
      setLatestPlugins(latestPl.data ?? []);
      setDiscordLog(dLog.data ?? []);
      const q: QueueItem[] = [
        ...(apps.data ?? []).map((a: any) => ({ id: a.id, kind: "Application", tab: "applications", title: a.mc_username || "Unknown", sub: String(a.type), created_at: a.created_at })),
        ...(appeals.data ?? []).map((a: any) => ({ id: a.id, kind: "Ban appeal", tab: "ban-appeals", title: a.minecraft_username, sub: "Awaiting review", created_at: a.created_at })),
        ...(reports.data ?? []).map((r: any) => ({ id: r.id, kind: "Report", tab: "reports", title: r.target_label || r.target_type, sub: r.reason, created_at: r.created_at })),
        ...(tickets.data ?? []).map((t: any) => ({ id: t.id, kind: "Ticket", tab: "tickets", title: t.subject, sub: "Open ticket", created_at: t.created_at })),
        ...(contact.data ?? []).map((m: any) => ({ id: m.id, kind: "Contact", tab: "contact", title: m.subject || "Message", sub: m.name, created_at: m.created_at })),
      ].sort((a, b) => a.created_at.localeCompare(b.created_at));
      setQueue(q);
      setLoading(false);
    })();
  }, []);

  const counts = queue.reduce<Record<string, number>>((acc, i) => ((acc[i.kind] = (acc[i.kind] ?? 0) + 1), acc), {});

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard title="Members" value={s.members} icon={Users} description={`+${s.newMembers} this week`} />
        <StatCard title="Plugins" value={s.plugins} icon={Package} color="bg-accent" description={`${s.published} published · ${s.featured} featured`} />
        <StatCard title="Discord actions (7d)" value={s.discord} icon={MessageSquare} description={s.discordFail ? `${s.discordFail} failed` : "All succeeded"} />
        <StatCard title="Pending requests" value={loading ? "…" : queue.length} icon={Inbox} color={queue.length ? "bg-destructive" : "bg-accent"} description={queue.length ? "Need attention" : "Queue is clear"} />
        <StatCard title="Server" value={s.online ? "Online" : "Offline"} icon={Server} color={s.online ? "bg-primary" : "bg-destructive"} description={s.online ? `${s.players} / ${s.max} players` : "currently down"} />
      </div>

      <Card className="p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-semibold">Pending requests</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(counts).map(([k, n]) => <Badge key={k} variant="secondary">{k}: {n}</Badge>)}
          </div>
        </div>
        {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : queue.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing waiting — every request has been handled.</p>
        ) : (
          <ul className="divide-y divide-border">
            {queue.slice(0, 12).map((i) => (
              <li key={i.kind + i.id} className="flex items-center gap-3 py-3">
                <Badge variant="outline" className="w-24 justify-center">{i.kind}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{i.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{i.sub} · {ago(i.created_at)}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => onNavigate(i.tab)}>Review <ArrowRight className="ml-1 h-4 w-4" /></Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between"><h3 className="font-semibold">Newest members</h3>
            <Button size="sm" variant="ghost" onClick={() => onNavigate("users")}>All</Button></div>
          <ul className="space-y-3">
            {newest.map((m) => (
              <li key={m.id} className="flex items-center gap-3">
                <img src={m.avatar_url || `https://mc-heads.net/avatar/${m.id}/32`} alt="" className="h-8 w-8 rounded-full bg-muted object-cover" />
                <span className="flex-1 truncate text-sm">{m.display_name || "Member"}</span>
                <span className="text-xs text-muted-foreground">{ago(m.created_at)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between"><h3 className="font-semibold">Latest plugins</h3>
            <Button size="sm" variant="ghost" onClick={() => onNavigate("plugins")}>All</Button></div>
          <ul className="space-y-3">
            {latestPlugins.map((p) => (
              <li key={p.id} className="flex items-center gap-3">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 truncate text-sm">{p.name}</span>
                <Badge variant={p.published ? "secondary" : "outline"}>{p.published ? "Live" : "Draft"}</Badge>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between"><h3 className="font-semibold">Discord activity</h3>
            <Button size="sm" variant="ghost" onClick={() => onNavigate("bot-dashboard")}>Bot</Button></div>
          {discordLog.length === 0 ? <p className="text-sm text-muted-foreground">No recent bot activity.</p> : (
            <ul className="space-y-3">
              {discordLog.map((d) => (
                <li key={d.id} className="flex items-center gap-3">
                  {d.status === "success" ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <XCircle className="h-4 w-4 text-destructive" />}
                  <span className="flex-1 truncate text-sm">{d.action}</span>
                  <span className="text-xs text-muted-foreground">{ago(d.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
};
