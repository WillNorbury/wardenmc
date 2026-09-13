import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Inbox, RefreshCw, Search, ExternalLink } from "lucide-react";

type OrderStatus = "open" | "in_progress" | "waiting_user" | "closed";

type OrderRow = {
  id: string;
  subject: string;
  body: string | null;
  status: OrderStatus;
  user_id: string;
  created_at: string;
  updated_at: string | null;
};

const STATUS_META: Record<OrderStatus, { label: string; className: string }> = {
  open: { label: "Awaiting payment", className: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  in_progress: { label: "Payment received", className: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  waiting_user: { label: "Waiting on customer", className: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  closed: { label: "Fulfilled", className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
};

const STATUS_ORDER: OrderStatus[] = ["open", "in_progress", "waiting_user", "closed"];

const parseTotal = (subject: string) => {
  const m = subject.match(/\(([^()]+)\)\s*$/);
  return m ? m[1].trim() : "—";
};

const parseItems = (body: string | null) => {
  if (!body) return [] as string[];
  const lines = body.split("\n");
  const start = lines.findIndex((l) => l.trim() === "Items:");
  if (start === -1) return [];
  const out: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) break;
    out.push(line.replace(/^[-•]\s*/, ""));
  }
  return out;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export function OrdersAdminSection() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("support_tickets")
      .select("id,subject,body,status,user_id,created_at,updated_at")
      .eq("category", "Store & Payments")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const rows = (data ?? []) as OrderRow[];
    setOrders(rows);

    const ids = Array.from(new Set(rows.map((r) => r.user_id))).filter(Boolean);
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,display_name,mc_username")
        .in("id", ids);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => {
        map[p.id] = p.display_name || p.mc_username || p.id.slice(0, 8);
      });
      setNames(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id: string, status: OrderStatus) => {
    const prev = orders;
    setOrders((o) => o.map((r) => (r.id === id ? { ...r, status } : r)));
    const { error } = await supabase.from("support_tickets").update({ status }).eq("id", id);
    if (error) {
      setOrders(prev);
      toast.error(error.message);
      return;
    }
    toast.success(`Marked as ${STATUS_META[status].label.toLowerCase()}`);
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    STATUS_ORDER.forEach((s) => (c[s] = 0));
    orders.forEach((o) => (c[o.status] = (c[o.status] ?? 0) + 1));
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return orders.filter((o) => {
      if (filter !== "all" && o.status !== filter) return false;
      if (!needle) return true;
      const buyer = (names[o.user_id] ?? "").toLowerCase();
      return (
        o.subject.toLowerCase().includes(needle) ||
        buyer.includes(needle) ||
        (o.body ?? "").toLowerCase().includes(needle) ||
        o.id.toLowerCase().includes(needle)
      );
    });
  }, [orders, filter, q, names]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold">
            <Inbox className="h-6 w-6 text-primary" />
            Order Inbox
          </h2>
          <p className="text-sm text-muted-foreground">
            Every store order and where it stands — no email chasing needed.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {(["all", ...STATUS_ORDER] as const).map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key as OrderStatus | "all")}
            className={`rounded-lg border p-3 text-left transition ${
              filter === key ? "border-primary bg-primary/10" : "border-border/60 hover:border-primary/50"
            }`}
          >
            <div className="text-xl font-bold">{counts[key] ?? 0}</div>
            <div className="text-xs text-muted-foreground">
              {key === "all" ? "All orders" : STATUS_META[key as OrderStatus].label}
            </div>
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by buyer, item or order reference"
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="space-y-3 p-6 text-center">
            <p className="text-sm text-muted-foreground">Could not load orders: {error}</p>
            <Button onClick={load} size="sm">
              Try again
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {orders.length === 0 ? "No store orders yet." : "No orders match this filter."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => {
            const meta = STATUS_META[o.status];
            const items = parseItems(o.body);
            const expanded = openId === o.id;
            return (
              <Card key={o.id} className="overflow-hidden">
                <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-3">
                  <div className="min-w-0">
                    <CardTitle className="text-base">
                      {names[o.user_id] ?? "Unknown member"}
                    </CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {fmtDate(o.created_at)} · Ref {o.id.slice(0, 8)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-bold">{parseTotal(o.subject)}</span>
                    <Badge variant="outline" className={meta.className}>
                      {meta.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {(expanded ? items : items.slice(0, 2)).map((line, i) => (
                      <li key={i}>• {line}</li>
                    ))}
                    {!expanded && items.length > 2 && (
                      <li className="text-xs">+{items.length - 2} more</li>
                    )}
                  </ul>

                  {expanded && o.body && (
                    <pre className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                      {o.body}
                    </pre>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={o.status}
                      onValueChange={(v) => updateStatus(o.id, v as OrderStatus)}
                    >
                      <SelectTrigger className="h-9 w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_ORDER.map((s) => (
                          <SelectItem key={s} value={s}>
                            {STATUS_META[s].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setOpenId(expanded ? null : o.id)}
                    >
                      {expanded ? "Hide details" : "View details"}
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={`/admin?tab=tickets`}>
                        Open conversation <ExternalLink className="ml-1 h-3.5 w-3.5" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default OrdersAdminSection;
