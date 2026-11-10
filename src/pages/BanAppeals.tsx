import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Gavel, Send, Loader2, RefreshCw, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { SEO } from "@/components/site/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export default function BanAppeals() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const appeals = useQuery({
    queryKey: ["my-ban-appeals", user?.id], enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from("ban_appeals").select("id,minecraft_username,ban_reason,appeal_text,status,admin_response,created_at").eq("user_id", user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const text = (key: string) => String(values.get(key) ?? "").trim();
    if (!text("minecraft_username") || !text("appeal_text")) { setError("Enter your Minecraft username and appeal details."); return; }
    setBusy(true); setError("");
    try {
      const { error } = await supabase.from("ban_appeals").insert({
        user_id: user?.id ?? null,
        minecraft_username: text("minecraft_username"),
        discord_tag: text("discord_tag") || null,
        email: text("email") || null,
        ban_reason: text("ban_reason") || null,
        appeal_text: text("appeal_text"),
        status: "pending",
      });
      if (error) throw error;
      form.reset(); setSent(true);
      if (user) await appeals.refetch();
    } catch { setError("Your appeal could not be submitted. Please try again."); }
    finally { setBusy(false); }
  }
  return <div className="flex min-h-screen flex-col bg-background">
    <Navbar /><SEO title="Ban Appeals — Warden Network" description="Submit a ban appeal to the Warden Network team and follow staff responses." path="/ban-appeals" />
    <main className="container max-w-5xl flex-1 pb-16 pt-28 sm:pt-32">
      <header className="border-b border-border pb-8"><Gavel className="mb-4 h-9 w-9 text-primary" /><p className="text-sm font-semibold text-primary">WARDEN NETWORK</p><h1 className="mt-3 font-display text-5xl sm:text-6xl">Ban Appeals</h1><p className="mt-4 max-w-2xl text-muted-foreground">Ask the team to review your ban. Include what happened and why you believe it should be reconsidered.</p></header>
      <div className="mt-9 grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.7fr)]">
        <section className="min-w-0"><h2 className="mb-6 text-xl font-semibold">Submit an appeal</h2>
          {sent ? <div role="status" className="space-y-4 border-y border-border py-8"><CheckCircle2 className="h-8 w-8 text-primary" /><h3 className="text-xl font-semibold">Appeal submitted</h3><p className="text-muted-foreground">Your appeal is awaiting staff review.</p><Button variant="outline" onClick={() => setSent(false)}>Back to appeal form</Button></div> : <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2"><Label htmlFor="appeal-username">Minecraft username</Label><Input id="appeal-username" name="minecraft_username" required maxLength={64} /></div>
            <div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="appeal-discord">Discord username (optional)</Label><Input id="appeal-discord" name="discord_tag" maxLength={64} /></div><div className="space-y-2"><Label htmlFor="appeal-email">Contact email (optional)</Label><Input id="appeal-email" name="email" type="email" maxLength={255} defaultValue={user?.email ?? ""} /></div></div>
            <div className="space-y-2"><Label htmlFor="appeal-reason">Ban reason (optional)</Label><Textarea id="appeal-reason" name="ban_reason" maxLength={1000} rows={2} /></div>
            <div className="space-y-2"><Label htmlFor="appeal-details">Your appeal</Label><Textarea id="appeal-details" name="appeal_text" required maxLength={5000} rows={7} /><p className="text-xs text-muted-foreground">Include any relevant evidence links. Never share passwords or sign-in codes.</p></div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={busy}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Submit appeal</Button>
          </form>}
        </section>
        <aside className="min-w-0 md:border-l md:border-border md:pl-8"><div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">My appeals</h2>{user && <Button size="icon" variant="ghost" aria-label="Refresh appeals" onClick={() => appeals.refetch()}><RefreshCw className="h-4 w-4" /></Button>}</div>
          {!user ? <><p className="text-sm text-muted-foreground">Sign in before submitting to track your appeal and read staff responses here.</p><Button asChild variant="outline" className="mt-4"><Link to="/auth?redirect=/ban-appeals">Sign in</Link></Button></> : appeals.isPending ? <Loader2 aria-label="Loading appeals" className="h-5 w-5 animate-spin" /> : appeals.isError ? <p role="alert" className="text-sm text-destructive">Your appeals could not load. Try refreshing.</p> : !appeals.data?.length ? <p className="text-sm text-muted-foreground">No appeals yet.</p> : <div className="space-y-6">{appeals.data.map((appeal) => <article key={appeal.id} className="border-b border-border pb-5"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="break-words font-semibold">{appeal.minecraft_username}</h3><Badge variant="secondary">{appeal.status}</Badge></div><p className="mt-2 text-xs text-muted-foreground">{new Date(appeal.created_at).toLocaleDateString()}</p><p className="mt-3 whitespace-pre-wrap break-words text-sm text-muted-foreground">{appeal.appeal_text}</p>{appeal.admin_response && <div className="mt-4 border-l-2 border-primary pl-3"><p className="text-xs font-semibold text-primary">Staff response</p><p className="mt-2 whitespace-pre-wrap break-words text-sm">{appeal.admin_response}</p></div>}</article>)}</div>}
        </aside>
      </div>
    </main><Footer />
  </div>;
}