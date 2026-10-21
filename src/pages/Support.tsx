import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, ArrowLeft, RefreshCw, Loader2, MessageSquare, ShieldCheck } from "lucide-react";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { SEO } from "@/components/site/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { supportCategories, supportQuestionSchema, supportReplySchema, ticketStatusLabel } from "@/lib/support";
import { toast } from "sonner";
import { SupportCategories, SupportCentreHeader, SupportFaqs } from "@/components/site/SupportCentreIntro";

const date = (value: string) => new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export default function Support() {
  const { user, loading: authLoading } = useAuth();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get("ticket");
  const cache = useQueryClient();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<string>(supportCategories[0]);
  const [body, setBody] = useState("");
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const tickets = useQuery({
    queryKey: ["support-tickets", user?.id], enabled: !!user, refetchInterval: 30000,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from("support_tickets").select("id, subject, body, category, status, priority, created_at, updated_at").eq("user_id", user.id).order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const selected = tickets.data?.find((ticket) => ticket.id === selectedId);
  const messages = useQuery({
    queryKey: ["support-messages", user?.id, selected?.id], enabled: !!user && !!selected, refetchInterval: 15000,
    queryFn: async () => {
      if (!selected) return [];
      const { data, error } = await supabase.from("support_ticket_messages").select("id, body, is_staff, created_at").eq("ticket_id", selected.id).order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || busy) return;
    const result = supportQuestionSchema.safeParse({ subject, category, body });
    if (!result.success) { setFormError(result.error.issues[0]?.message ?? "Check your question."); return; }
    setBusy(true); setFormError("");
    try {
      const { data, error } = await supabase.functions.invoke("submit-support", { body: result.data });
      if (error || !data?.success) {
        let message = data?.error ?? "Your question could not be sent. Please try again.";
        if (error && "context" in error && error.context instanceof Response) {
          const details = await error.context.json().catch(() => null);
          message = details?.error ?? message;
        }
        throw new Error(message);
      }
      await cache.invalidateQueries({ queryKey: ["support-tickets", user.id] });
      setParams({ ticket: data.id }); setSubject(""); setBody("");
      toast.success("Question sent to the support team.");
    } catch (error) { setFormError(error instanceof Error ? error.message : "Please try again."); }
    finally { setBusy(false); }
  };
  const sendReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !selected || busy) return;
    const parsed = supportReplySchema.safeParse(reply);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from("support_ticket_messages").insert({ ticket_id: selected.id, author_id: user.id, body: parsed.data, is_staff: false });
      if (error) throw error;
      setReply("");
      await Promise.all([cache.invalidateQueries({ queryKey: ["support-messages"] }), cache.invalidateQueries({ queryKey: ["support-tickets"] })]);
      toast.success("Reply sent.");
    } catch { toast.error("Your reply could not be saved. Please refresh and try again."); }
    finally { setBusy(false); }
  };
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar /><SEO title="Player Support Centre — WardenMC" description="Get help, appeal a punishment, report bugs or players, and follow private replies from the WardenMC support team." path="/support" />
      <main className="flex-1 pt-28 sm:pt-24">
        <SupportCentreHeader onCreate={() => { setParams({}); document.getElementById("support-desk")?.scrollIntoView({ block: "start" }); }} />
        <SupportCategories onChoose={(option) => { setCategory(option.topic); setSubject(option.subject); setFormError(""); setParams({}); document.getElementById("support-desk")?.scrollIntoView({ block: "start" }); }} />
        <section id="support-desk" className="container max-w-6xl pt-4 pb-14 scroll-mt-28">
          {authLoading ? <Loader2 className="h-6 w-6 animate-spin" aria-label="Loading account" /> : !user ? (
            <div className="border-y border-border py-9 flex flex-col sm:flex-row sm:items-center justify-between gap-6"><div><h2 className="font-display text-3xl tracking-normal">YOUR SUPPORT DESK</h2><p className="text-muted-foreground mt-2">Sign in to create a ticket and follow your private conversations.</p></div><Button asChild><Link to="/auth?redirect=/support">Sign in to create a ticket</Link></Button></div>
          ) : (
            <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.65fr)]">
              <div className="min-w-0">
                {selectedId ? <>
                  <Button variant="ghost" size="sm" className="mb-5" onClick={() => { setParams({}); setReply(""); }}><ArrowLeft className="h-4 w-4 mr-2" /> New ticket</Button>
                  {tickets.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : tickets.isError ? <p role="alert">Could not load your question. Please refresh.</p> : !selected ? <p>That question wasn’t found on your account.</p> : <>
                    <div className="flex flex-wrap items-start justify-between gap-3"><h2 className="font-display text-3xl break-words min-w-0">{selected.subject}</h2><Badge variant="secondary">{({ open: "Open", in_progress: "In Progress", waiting_user: "Awaiting Response", closed: "Closed" })[selected.status]}</Badge></div>
                    <p className="text-xs text-muted-foreground mt-2">{selected.category} · {date(selected.created_at)} · Priority: {selected.priority}</p>
                    <p className="text-xs text-muted-foreground mt-2 break-all">Ticket ID: {selected.id}</p>
                    <div className="mt-6 border-l-2 border-primary pl-4"><p className="text-xs text-muted-foreground mb-2">Your question</p><p className="whitespace-pre-wrap break-words">{selected.body}</p></div>
                    <div className="mt-6 space-y-5" aria-live="polite">
                      {messages.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : messages.isError ? <p role="alert">Replies couldn’t load. Please refresh.</p> : messages.data?.length === 0 ? <p className="text-sm text-muted-foreground">Awaiting a reply from the team.</p> : messages.data?.map((message) => <div key={message.id} className="border-t border-border pt-4"><div className="flex items-center gap-2 text-sm mb-2">{message.is_staff && <ShieldCheck className="h-4 w-4 text-primary" />}<span>{message.is_staff ? "Support team" : "You"}</span><span className="text-xs text-muted-foreground">{date(message.created_at)}</span></div><p className="whitespace-pre-wrap break-words">{message.body}</p></div>)}
                    </div>
                    {selected.status === "closed" ? <p className="mt-6 text-muted-foreground">This conversation is closed.</p> : <form onSubmit={sendReply} className="mt-8 space-y-3"><Label htmlFor="support-reply">Your reply</Label><Textarea id="support-reply" value={reply} onChange={(e) => setReply(e.target.value)} maxLength={4000} rows={4} required /><Button type="submit" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />} Send reply</Button></form>}
                  </>}
                </> : <>
                  <h2 className="font-display text-3xl mb-6 tracking-normal">CREATE A TICKET</h2>
                  <form onSubmit={submit} className="space-y-5">
                    <div className="space-y-2"><Label htmlFor="support-category">Topic</Label><Select value={category} onValueChange={setCategory}><SelectTrigger id="support-category"><SelectValue /></SelectTrigger><SelectContent>{supportCategories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label htmlFor="support-subject">Subject</Label><Input id="support-subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={150} minLength={3} placeholder="What do you need help with?" required /></div>
                    <div className="space-y-2"><Label htmlFor="support-body">Details & evidence links</Label><Textarea id="support-body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} rows={7} placeholder="Include your Minecraft username, what happened and when. For appeals, explain why the punishment should be reviewed. For reports, include the player name or steps to reproduce the bug. Paste any evidence links here." required /><p className="text-xs text-muted-foreground">Never include passwords or authentication codes.</p></div>
                    {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
                    <Button type="submit" disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />} Create ticket</Button>
                  </form>
                </>}
              </div>
              <aside className="min-w-0 md:border-l md:border-border md:pl-8">
                <div className="flex items-center justify-between gap-3 mb-5"><h2 className="font-display text-2xl tracking-normal">MY TICKETS</h2><Button variant="ghost" size="icon" aria-label="Refresh tickets" onClick={() => { tickets.refetch(); messages.refetch(); }}><RefreshCw className="h-4 w-4" /></Button></div>
                {tickets.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : tickets.isError ? <p role="alert" className="text-sm text-destructive">Questions couldn’t load. Try refreshing.</p> : tickets.data?.length === 0 ? <div className="py-6 text-muted-foreground"><MessageSquare className="h-6 w-6 mb-3" /><p className="text-sm">No questions yet.</p></div> : <div className="space-y-2">{tickets.data?.map((ticket) => <Button key={ticket.id} variant={ticket.id === selectedId ? "secondary" : "ghost"} className="h-auto w-full items-start justify-start py-3 text-left whitespace-normal" onClick={() => { setParams({ ticket: ticket.id }); setReply(""); }}><span className="min-w-0"><span className="block break-words">{ticket.subject}</span><span className="block mt-1 text-xs text-muted-foreground">{ticketStatusLabel[ticket.status]} · {new Date(ticket.created_at).toLocaleDateString()}</span></span></Button>)}</div>}
              </aside>
            </div>
          )}
        </section>
        <SupportFaqs />
      </main><Footer />
    </div>
  );
}