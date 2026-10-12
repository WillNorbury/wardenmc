import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { GlassCard, PageHero } from "@/components/site/ui-kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ClipboardCheck, CheckCircle2, Clock, Eye, XCircle } from "lucide-react";

type App = {
  id: string;
  type: string;
  status: "pending" | "approved" | "rejected" | "reviewed";
  mc_username: string;
  created_at: string;
  reviewed_at: string | null;
  why: string;
};

const STATUS = {
  pending: { label: "Pending review", icon: Clock, text: "Your application is in the queue. Staff will review it soon." },
  reviewed: { label: "Under review", icon: Eye, text: "Staff have looked at your application and are making a decision." },
  approved: { label: "Approved", icon: CheckCircle2, text: "Congratulations — you've been accepted! Watch Discord or your email for next steps." },
  rejected: { label: "Not accepted", icon: XCircle, text: "Your application wasn't accepted this time. You're welcome to apply again later." },
} as const;

const STEPS: App["status"][] = ["pending", "reviewed"];

const fmt = (d: string) => new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
const typeLabel = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export default function ApplicationStatus() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth() as any;
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    let q = supabase
      .from("applications")
      .select("id, type, status, mc_username, created_at, reviewed_at, why")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (id) q = q.eq("id", id);
    q.then(({ data }) => { setApps((data as App[]) ?? []); setLoading(false); });
  }, [user, authLoading, id]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1">
        <PageHero
          eyebrow={<><ClipboardCheck className="h-3 w-3 mr-1" /> Applications</>}
          title="Application"
          highlight="Status"
          description="Track where your applications are in the review process."
        />
        <section className="container max-w-3xl pb-20 space-y-4">
          {loading || authLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : !user ? (
            <GlassCard className="p-6 text-center space-y-3">
              <p className="text-muted-foreground">Sign in to see your applications.</p>
              <Button asChild><Link to="/auth">Sign in</Link></Button>
            </GlassCard>
          ) : apps.length === 0 ? (
            <GlassCard className="p-6 text-center space-y-3">
              <p className="text-muted-foreground">{id ? "We couldn't find that application on your account." : "You haven't applied for anything yet."}</p>
              <Button asChild><Link to="/apply">Apply now</Link></Button>
            </GlassCard>
          ) : (
            apps.map((a) => {
              const s = STATUS[a.status] ?? STATUS.pending;
              const Icon = s.icon;
              const done = a.status === "approved" || a.status === "rejected";
              const stepIdx = done ? 2 : STEPS.indexOf(a.status);
              return (
                <GlassCard key={a.id} className="p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="font-display text-2xl tracking-wide">{typeLabel(a.type)} application</h2>
                      <p className="text-sm text-muted-foreground">As {a.mc_username} · submitted {fmt(a.created_at)}</p>
                    </div>
                    <Badge variant={a.status === "rejected" ? "destructive" : "secondary"} className="gap-1">
                      <Icon className="h-3 w-3" /> {s.label}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {["Submitted", "In review", "Decision"].map((label, i) => (
                      <div key={label} className="space-y-1">
                        <div className={`h-1.5 rounded-full ${i <= stepIdx ? "bg-primary" : "bg-muted"}`} />
                        <p className={`text-xs ${i <= stepIdx ? "text-foreground" : "text-muted-foreground"}`}>{label}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm">{s.text}</p>
                  {a.reviewed_at && <p className="text-xs text-muted-foreground">Last updated {fmt(a.reviewed_at)}</p>}
                  {!id && (
                    <Button asChild variant="outline" size="sm"><Link to={`/applications/${a.id}`}>View details</Link></Button>
                  )}
                  {id && (
                    <div className="border-t border-border pt-4">
                      <p className="text-xs uppercase text-muted-foreground mb-1">Why you applied</p>
                      <p className="text-sm whitespace-pre-wrap">{a.why}</p>
                    </div>
                  )}
                </GlassCard>
              );
            })
          )}
          {id && user && (
            <Button asChild variant="ghost"><Link to="/applications">All my applications</Link></Button>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
