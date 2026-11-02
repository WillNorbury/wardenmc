import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Shield, Loader2, RefreshCw } from "lucide-react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { SEO } from "@/components/site/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

const kinds = ["bans", "mutes", "warnings", "kicks"] as const;
type Kind = typeof kinds[number];
type Punishment = {
  id: number; reason: string | null; issued_by: string | null;
  issued_at: string | null; expires_at: string | null; permanent: boolean;
  active: boolean; removed_at: string | null;
};
type History = Record<Kind, Punishment[]> & {
  player: { username: string | null; uuid: string | null };
  unavailable?: boolean; error?: string;
};
const date = (value: string | null) => value ? new Date(value).toLocaleString() : "—";

export default function Punishments() {
  const { player = "" } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState(player);
  const [kind, setKind] = useState<Kind>("bans");
  useEffect(() => setSearch(player), [player]);
  const { data, error, isFetching, refetch } = useQuery({
    queryKey: ["public-punishments", player],
    enabled: Boolean(player),
    retry: false,
    queryFn: async () => {
      const response = await supabase.functions.invoke<History>(`punishments-lookup?player=${encodeURIComponent(player)}`, { method: "GET" });
      if (response.error) {
        let message = "Couldn't load this player's punishments. Please try again.";
        if (response.error.context instanceof Response) {
          const body = await response.error.context.json().catch(() => null);
          if (body?.error === "Player not found") message = "Player not found.";
          if (body?.error === "Invalid player identifier") message = "Enter a valid Minecraft username or UUID.";
        }
        throw new Error(message);
      }
      if (!response.data) throw new Error("No response received. Please try again.");
      return response.data;
    },
  });
  const items = data?.[kind] ?? [];
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO title="Punishments — Warden Network" description="Minecraft player bans, mutes, warnings and kicks on Warden Network." path={player ? `/punishments/${encodeURIComponent(player)}` : "/punishments"} />
      <Navbar />
      <main className="container max-w-5xl pt-28 pb-16 space-y-8">
        <header className="border-b border-border pb-6">
          <Shield className="h-8 w-8 text-primary mb-3" />
          <h1 className="font-display text-3xl font-bold">Punishments</h1>
        </header>
        <form className="flex flex-col sm:flex-row gap-3" onSubmit={(event) => {
          event.preventDefault();
          if (search.trim()) navigate(`/punishments/${encodeURIComponent(search.trim())}`);
        }}>
          <Input aria-label="Minecraft username or UUID" placeholder="Minecraft username or UUID" value={search} onChange={(event) => setSearch(event.target.value)} className="flex-1" maxLength={36} required />
          <Button type="submit" disabled={isFetching || !search.trim()}>{isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}Search</Button>
        </form>
        {!player && <p className="text-muted-foreground">Player punishment history</p>}
        {isFetching && <p role="status" className="text-muted-foreground">Loading punishments…</p>}
        {(error || data?.unavailable) && <div role="alert" className="space-y-3 border-l-2 border-destructive pl-4">
          <p>{error?.message ?? "Punishment records are temporarily unavailable. Please try again later."}</p>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}><RefreshCw className="h-4 w-4" />Try again</Button>
        </div>}
        {data && !data.unavailable && !isFetching && !error && <section className="space-y-5">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <h2 className="font-display text-xl font-semibold break-all">{data.player.username ?? player}</h2>
            <Button asChild variant="outline" size="sm"><Link to="/support">Appeal a punishment</Link></Button>
          </div>
          <Tabs value={kind} onValueChange={(value) => setKind(value as Kind)}>
            <TabsList className="grid grid-cols-4 w-full h-auto">
              {kinds.map((value) => <TabsTrigger key={value} value={value} className="capitalize px-1 py-2 text-xs sm:text-sm">{value} ({data[value]?.length ?? 0})</TabsTrigger>)}
            </TabsList>
          </Tabs>
          {items.length === 0 ? <p className="py-8 text-center text-muted-foreground">No {kind} recorded for this player.</p> : <div className="divide-y divide-border border-y border-border">
            {items.map((item) => <article key={item.id} className="py-5 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-xs text-muted-foreground">#{item.id}</span>
                <Badge variant={item.active ? "destructive" : "secondary"}>{kind === "kicks" || kind === "warnings" ? "Recorded" : item.active ? "Active" : item.removed_at ? "Removed" : "Expired"}</Badge>
                <p className="font-medium break-words min-w-0">{item.reason ?? "No reason provided"}</p>
              </div>
              <dl className="grid sm:grid-cols-3 gap-3 text-sm">
                <div><dt className="text-muted-foreground">Issued by</dt><dd className="break-words">{item.issued_by ?? "—"}</dd></div>
                <div><dt className="text-muted-foreground">Issued</dt><dd>{date(item.issued_at)}</dd></div>
                {(kind === "bans" || kind === "mutes") && <div><dt className="text-muted-foreground">Expires</dt><dd>{item.permanent ? "Permanent" : date(item.expires_at)}</dd></div>}
              </dl>
            </article>)}
          </div>}
        </section>}
      </main>
      <Footer />
    </div>
  );
}