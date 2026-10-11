import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { SEO } from "@/components/site/SEO";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { partnerSlug, fetchPartnerStatus, PartnerStatus } from "@/lib/partnerSlug";


type Partner = {
  id: string;
  label: string;
  url: string;
  description: string | null;
  icon: string | null;
};

const COLS = 9;
const ROWS = 6;
const ICONS = ["🔮", "💎", "🧿", "🌸", "⚔️", "🛡️", "🔥", "⭐", "🍎", "🗝️", "🏹", "🧪"];

const Partners = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<Partner | null>(null);
  const [query, setQuery] = useState("");
  const [statuses, setStatuses] = useState<Record<string, PartnerStatus>>({});


  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("id,label,url,description,icon")
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

  const goToPartner = (p: Partner) => navigate(`/partners/${partnerSlug(p.label)}`);

  const slots: (Partner | null)[] = Array.from({ length: COLS * ROWS }, () => null);
  filtered.forEach((p, i) => {
    const target = COLS + 1 + i;
    if (target < slots.length) slots[target] = p;
  });

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
    <>
      <SEO title="Partners — Warden Network" description="Our partner Minecraft servers and communities." />
      <Navbar />
      <main className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-10 bg-background">
        <div className="w-full max-w-3xl">
          <div
            className="relative rounded-md p-4 sm:p-6 shadow-2xl"
            style={{
              background: "linear-gradient(180deg, hsl(240 8% 10%), hsl(240 10% 6%))",
              border: "3px solid hsl(240 6% 22%)",
              boxShadow: "inset 0 0 0 2px hsl(240 6% 14%), 0 20px 60px -20px hsl(0 0% 0% / 0.8)",
              imageRendering: "pixelated",
            }}
          >
            <div className="mb-4 px-2 py-2 flex items-center justify-between border-b border-border/40 gap-3">
              <h1
                className="text-muted-foreground tracking-[0.3em] text-xs sm:text-sm uppercase select-none whitespace-nowrap"
                style={{ fontFamily: '"Press Start 2P", "VT323", ui-monospace, monospace' }}
              >
                Server Selector
              </h1>
              <span className="text-[10px] text-muted-foreground/60 tracking-widest">
                {filtered.length}/{rows.length}
              </span>
            </div>

            <div className="mb-3 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or IP…"
                className="pl-8 h-9 bg-background/40 border-border/40"
              />
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
              </div>
            ) : (
              <div
                className="grid gap-1.5 sm:gap-2"
                style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
              >
                {slots.map((p, i) => {
                  const filled = !!p;
                  const st = p ? statuses[p.id] : undefined;
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={!filled}
                      onClick={() => p && goToPartner(p)}
                      onMouseEnter={() => setHovered(p)}
                      onMouseLeave={() => setHovered(null)}
                      onFocus={() => setHovered(p)}
                      onBlur={() => setHovered(null)}
                      aria-label={p ? `Open ${p.label}` : "Empty slot"}
                      className={`relative aspect-square rounded-[3px] transition-all ${
                        filled
                          ? "hover:scale-105 hover:z-10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                          : "cursor-default"
                      }`}
                      style={{
                        background: "linear-gradient(180deg, hsl(240 6% 20%), hsl(240 8% 12%))",
                        boxShadow:
                          "inset 1px 1px 0 hsl(240 6% 30%), inset -1px -1px 0 hsl(240 10% 4%)",
                      }}
                    >
                      {filled && (
                        <>
                          <span
                            className="absolute inset-0 flex items-center justify-center text-lg sm:text-2xl select-none drop-shadow-[0_0_6px_rgba(255,120,220,0.5)]"
                            style={{ imageRendering: "pixelated" }}
                          >
                            {ICONS[i % ICONS.length]}
                          </span>
                          <span className="absolute top-1 right-1">
                            <StatusDot st={st} />
                          </span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div
              className="mt-4 min-h-[64px] px-3 py-2 rounded-[3px] border border-border/40 flex items-center gap-3"
              style={{ background: "hsl(240 10% 8%)" }}
            >
              {hovered ? (
                <>
                  <div
                    className="h-10 w-10 flex items-center justify-center rounded-[3px] shrink-0 text-xl"
                    style={{
                      background: "linear-gradient(180deg, hsl(240 6% 20%), hsl(240 8% 12%))",
                      boxShadow: "inset 1px 1px 0 hsl(240 6% 30%), inset -1px -1px 0 hsl(240 10% 4%)",
                    }}
                  >
                    {ICONS[rows.findIndex((r) => r.id === hovered.id) % ICONS.length]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      className="text-primary text-sm truncate flex items-center gap-2"
                      style={{ fontFamily: '"Press Start 2P", "VT323", ui-monospace, monospace' }}
                    >
                      <StatusDot st={statuses[hovered.id]} />
                      {hovered.label}
                    </div>
                    <div className="text-xs text-muted-foreground truncate font-mono">
                      {hovered.url}
                    </div>
                    {statuses[hovered.id] && !statuses[hovered.id].loading && (
                      <div className="text-[11px] text-muted-foreground/80 truncate">
                        {statuses[hovered.id].online
                          ? `Online${statuses[hovered.id].players ? ` · ${statuses[hovered.id].players!.online}/${statuses[hovered.id].players!.max} players` : ""}`
                          : "Offline"}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground/60 uppercase tracking-widest hidden sm:inline">
                    Click to open
                  </span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground/60 tracking-widest uppercase">
                  {rows.length === 0
                    ? "No partners yet"
                    : filtered.length === 0
                    ? "No matches"
                    : "Hover a slot to inspect · Click to open"}
                </span>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Partners;
