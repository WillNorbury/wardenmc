import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { SEO } from "@/components/site/SEO";
import { GlassCard, PageHero, Reveal } from "@/components/site/ui-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Handshake, Search, Users, ArrowRight, Globe } from "lucide-react";
import { toast } from "sonner";
import { partnerSlug, fetchPartnerStatus, PartnerStatus } from "@/lib/partnerSlug";

type Partner = {
  id: string;
  label: string;
  url: string;
  description: string | null;
  icon: string | null;
  website_url: string | null;
  discord_url: string | null;
};

const Partners = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statuses, setStatuses] = useState<Record<string, PartnerStatus>>({});

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("id,label,url,description,icon,website_url,discord_url")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) toast.error(error.message);
      else setRows((data ?? []) as Partner[]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    rows.forEach((p) => {
      setStatuses((s) => (s[p.id] ? s : { ...s, [p.id]: { online: false, loading: true } }));
      fetchPartnerStatus(p.url).then((data) => {
        if (cancelled) return;
        setStatuses((s) => ({ ...s, [p.id]: { ...data, loading: false } }));
      });
    });
    return () => {
      cancelled = true;
    };
  }, [rows]);

  const filtered = rows.filter((p) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return p.label.toLowerCase().includes(q) || p.url.toLowerCase().includes(q);
  });

  const onlineCount = rows.filter((p) => statuses[p.id]?.online).length;

  const StatusDot = ({ st }: { st?: PartnerStatus }) => {
    if (!st || st.loading)
      return <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-pulse" />;
    return (
      <span
        className={`h-2 w-2 rounded-full ${st.online ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" : "bg-red-500"}`}
      />
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO title="Partners — Warden Network" description="Our partner Minecraft servers and communities." />
      <Navbar />
      <main className="flex-1">
        <PageHero
          eyebrow={<><Handshake className="h-3 w-3 mr-1" /> Partners</>}
          title="Our"
          highlight="Partners"
          description="The servers and communities we officially work with. Check who's online and pay them a visit."
        >
          {!loading && rows.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="border-primary/30">
                {rows.length} partner{rows.length === 1 ? "" : "s"}
              </Badge>
              <Badge variant="secondary" className="border-primary/30">
                {onlineCount} online now
              </Badge>
            </div>
          )}
        </PageHero>

        <div className="container pb-24 max-w-[1400px]">
          <div className="mb-6 relative max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or address…"
              className="pl-8 h-10 bg-card/60 border-border/40"
            />
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-2xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <GlassCard className="p-12 text-center">
              <p className="text-muted-foreground">
                {rows.length === 0 ? "No partners to show yet." : "No partners match your search."}
              </p>
            </GlassCard>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((p, i) => {
                const st = statuses[p.id];
                return (
                  <Reveal key={p.id} delay={i * 45}>
                    <GlassCard interactive className="h-full">
                      <button
                        type="button"
                        onClick={() => navigate(`/partners/${partnerSlug(p.label)}`)}
                        className="w-full h-full p-5 text-left flex flex-col gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
                            {p.icon ? (
                              <img src={p.icon} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Globe className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold truncate flex items-center gap-2">
                              <StatusDot st={st} />
                              {p.label}
                            </p>
                            <p className="text-xs text-muted-foreground truncate font-mono">{p.url}</p>
                          </div>
                        </div>
                        {p.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                        )}
                        <div className="mt-auto flex items-center justify-between text-xs">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            {st && !st.loading
                              ? st.online
                                ? `${st.players ? `${st.players.online}/${st.players.max}` : "Online"}`
                                : "Offline"
                              : "Checking…"}
                          </span>
                          <span className="text-primary flex items-center gap-1">
                            View <ArrowRight className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      </button>
                    </GlassCard>
                  </Reveal>
                );
              })}
            </div>
          )}

          <Reveal delay={120}>
            <GlassCard className="mt-10 p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-xl md:text-2xl tracking-tight">
                  Run a Minecraft server?
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Become a WardenMC Partner and get listed here, plus a partner role and perks.
                </p>
              </div>
              <Button asChild className="shrink-0">
                <Link to="/apply">Apply for partnership</Link>
              </Button>
            </GlassCard>
          </Reveal>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Partners;
