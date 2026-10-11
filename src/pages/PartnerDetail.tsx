import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { SEO } from "@/components/site/SEO";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { partnerSlug, fetchPartnerStatus, PartnerStatus } from "@/lib/partnerSlug";

type Partner = {
  id: string;
  label: string;
  url: string;
  description: string | null;
  icon: string | null;
};

const PartnerDetail = () => {
  const { slug = "" } = useParams();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<PartnerStatus>({ online: false, loading: true });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("partners")
        .select("id,label,url,description,icon")
        .eq("is_active", true);
      const match = (data ?? []).find((p: Partner) => partnerSlug(p.label) === slug) ?? null;
      setPartner(match as Partner | null);
      setLoading(false);
    })();
  }, [slug]);

  useEffect(() => {
    if (!partner) return;
    fetchPartnerStatus(partner.url).then((d) => setStatus({ ...d, loading: false }));
  }, [partner]);

  const copyIp = async () => {
    if (!partner) return;
    try {
      await navigator.clipboard.writeText(partner.url);
      toast.success(`Copied IP: ${partner.url}`);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <>
      <SEO
        title={`${partner?.label ?? "Partner"} — Warden Network`}
        description={partner?.description ?? "Partner Minecraft server."}
      />
      <Navbar />
      <main className="min-h-[calc(100vh-8rem)] px-4 py-10 bg-background">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/partners"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" /> All partners
          </Link>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
            </div>
          ) : !partner ? (
            <div className="text-center py-20 text-muted-foreground">Partner not found.</div>
          ) : (
            <div
              className="rounded-md p-6 sm:p-8"
              style={{
                background: "linear-gradient(180deg, hsl(240 8% 10%), hsl(240 10% 6%))",
                border: "3px solid hsl(240 6% 22%)",
                boxShadow: "inset 0 0 0 2px hsl(240 6% 14%)",
              }}
            >
              <div className="flex items-center gap-4 mb-6">
                <div
                  className="h-16 w-16 rounded-[3px] flex items-center justify-center text-3xl shrink-0"
                  style={{
                    background: "linear-gradient(180deg, hsl(240 6% 20%), hsl(240 8% 12%))",
                    boxShadow:
                      "inset 1px 1px 0 hsl(240 6% 30%), inset -1px -1px 0 hsl(240 10% 4%)",
                  }}
                >
                  {partner.icon ?? "⚔️"}
                </div>
                <div className="min-w-0 flex-1">
                  <h1
                    className="text-primary text-lg sm:text-xl truncate"
                    style={{ fontFamily: '"Press Start 2P", "VT323", ui-monospace, monospace' }}
                  >
                    {partner.label}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    {status.loading ? (
                      <span className="text-xs text-muted-foreground">Checking status…</span>
                    ) : status.online ? (
                      <>
                        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                        <span className="text-xs text-emerald-400">
                          Online{status.players ? ` · ${status.players.online}/${status.players.max} players` : ""}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        <span className="text-xs text-red-400">Offline</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                    Server IP
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 rounded-[3px] bg-background/40 border border-border/40 font-mono text-sm truncate">
                      {partner.url}
                    </code>
                    <Button size="sm" onClick={copyIp} variant="secondary">
                      <Copy className="h-4 w-4 mr-1" /> Copy
                    </Button>
                  </div>
                </div>

                {status.version && (
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                      Version
                    </div>
                    <div className="text-sm">{status.version}</div>
                  </div>
                )}

                {status.motd && (
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                      MOTD
                    </div>
                    <div className="text-sm text-muted-foreground italic">{status.motd}</div>
                  </div>
                )}

                {partner.description && (
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">
                      About
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {partner.description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default PartnerDetail;
