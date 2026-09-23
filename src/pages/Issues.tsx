import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import Particles from "@/components/site/Particles";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { z } from "zod";
import {
  Bug, Plus, ChevronUp, MessageSquare, Search,
} from "lucide-react";
import {
  createIssue, fetchIssues, toggleIssueVote,
  ISSUE_CATEGORIES, ISSUE_STATUS_META, ISSUE_TITLE_MAX, ISSUE_BODY_MAX,
  type Issue, type IssueStatus,
} from "@/lib/issues";
import { relativeTime } from "@/lib/posts";
import VerifiedBadge from "@/components/site/VerifiedBadge";

const schema = z.object({
  title: z.string().trim().min(5, "Give your issue a clear title (min 5 characters)").max(ISSUE_TITLE_MAX),
  description: z.string().trim().min(10, "Please describe the issue (min 10 characters)").max(ISSUE_BODY_MAX),
  category: z.string().min(1),
});

const FILTERS: { key: "all" | IssueStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "investigating", label: "Investigating" },
  { key: "fixed", label: "Fixed" },
  { key: "wont_fix", label: "Won't fix" },
];

const Issues = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<"all" | IssueStatus>("all");
  const [q, setQ] = useState("");

  useEffect(() => { document.title = "Issues — Warden Network"; }, []);

  const load = async () => {
    setLoading(true);
    try {
      setIssues(await fetchIssues(user?.id ?? null));
    } catch (e: any) {
      toast.error(e.message ?? "Could not load issues");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return issues
      .filter((i) => (filter === "all" ? true : i.status === filter))
      .filter((i) => !term || i.title.toLowerCase().includes(term) || i.description.toLowerCase().includes(term));
  }, [issues, filter, q]);

  const vote = async (issue: Issue) => {
    if (!user) { nav("/auth?redirect=/issues"); return; }
    setIssues((prev) => prev.map((i) => i.id === issue.id
      ? { ...i, votedByMe: !i.votedByMe, votes: i.votes + (i.votedByMe ? -1 : 1) }
      : i));
    try {
      await toggleIssueVote(issue.id, user.id, issue.votedByMe);
    } catch (e: any) {
      toast.error(e.message ?? "Vote failed");
      load();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="relative pt-28 pb-10 overflow-hidden">
          <Particles count={18} />
          <div className="absolute inset-0 bg-grid opacity-[0.08]" />
          <div className="container relative">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <Badge variant="secondary" className="mb-3 text-primary border-primary/40">
                  <Bug className="h-3 w-3 mr-1" /> Issue Tracker
                </Badge>
                <h1 className="font-display text-3xl md:text-5xl font-black">
                  Report an <span className="text-gradient">Issue</span>
                </h1>
                <p className="text-muted-foreground mt-2 text-sm max-w-xl">
                  Found a bug or have an idea? Post it here, upvote what matters to you, and follow along as we fix it.
                </p>
              </div>
              <Button
                className="glow"
                onClick={() => (user ? setCreating((v) => !v) : nav("/auth?redirect=/issues"))}
              >
                <Plus className="h-4 w-4 mr-1" /> New Issue
              </Button>
            </div>
          </div>
        </section>

        <div className="container pb-16 space-y-6">
          {creating && user && (
            <NewIssueForm
              userId={user.id}
              onCancel={() => setCreating(false)}
              onCreated={(id) => { setCreating(false); nav(`/issues/${id}`); }}
            />
          )}

          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <Button
                  key={f.key}
                  size="sm"
                  variant={filter === f.key ? "default" : "outline"}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
            <div className="relative ml-auto w-full sm:w-72">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search issues…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>

          {loading ? (
            <Card className="p-10 text-center text-muted-foreground">Loading…</Card>
          ) : shown.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">
              <Bug className="h-10 w-10 mx-auto mb-3 text-primary/60" />
              <p>No issues here yet. Be the first to report one.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {shown.map((i) => {
                const sm = ISSUE_STATUS_META[i.status];
                return (
                  <Card key={i.id} className="p-4 flex gap-4 hover:border-primary/40 transition">
                    <button
                      onClick={() => vote(i)}
                      className={`shrink-0 w-14 rounded-lg border flex flex-col items-center justify-center py-2 transition ${
                        i.votedByMe ? "border-primary/60 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                      aria-label="Upvote issue"
                    >
                      <ChevronUp className="h-4 w-4" />
                      <span className="text-sm font-bold">{i.votes}</span>
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Link to={`/issues/${i.id}`} className="font-semibold hover:text-primary truncate">
                          {i.title}
                        </Link>
                        <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${sm.className}`}>
                          {sm.label}
                        </span>
                        <Badge variant="outline" className="text-[10px]">{i.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{i.description}</p>
                      <div className="text-xs text-muted-foreground mt-2 flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1">
                          {i.author?.display_name ?? "Member"}
                          {i.author?.verified && <VerifiedBadge />}
                        </span>
                        <span>{relativeTime(i.created_at)}</span>
                        <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {i.comments}</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

const NewIssueForm = ({ userId, onCancel, onCreated }: { userId: string; onCancel: () => void; onCreated: (id: string) => void }) => {
  const [form, setForm] = useState({ title: "", description: "", category: "Bug" });
  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setSending(true);
    try {
      const id = await createIssue({
        userId,
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
      });
      toast.success("Issue posted");
      onCreated(id);
    } catch (e: any) {
      toast.error(e.message ?? "Could not post issue");
    }
    setSending(false);
  };

  return (
    <Card className="p-6 md:p-7 border-primary/30">
      <h2 className="font-display text-2xl font-bold mb-1">New Issue</h2>
      <p className="text-sm text-muted-foreground mb-5">Describe what happened and how to reproduce it.</p>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="title">Title *</Label>
          <Input id="title" maxLength={ISSUE_TITLE_MAX} value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Short summary of the problem" />
        </div>
        <div>
          <Label>Category</Label>
          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ISSUE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="description">Details *</Label>
          <Textarea id="description" rows={7} maxLength={ISSUE_BODY_MAX} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What did you expect, what happened instead, and how can we reproduce it?" />
          <p className="text-xs text-muted-foreground mt-1">{form.description.length}/{ISSUE_BODY_MAX}</p>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={sending} className="glow">{sending ? "Posting…" : "Post issue"}</Button>
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
};

export default Issues;
