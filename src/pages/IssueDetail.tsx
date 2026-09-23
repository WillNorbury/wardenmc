import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import Particles from "@/components/site/Particles";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { ChevronLeft, ChevronUp, Send, Trash2 } from "lucide-react";
import {
  fetchIssue, fetchIssueComments, addIssueComment, toggleIssueVote,
  setIssueStatus, deleteIssue, ISSUE_STATUS_META, ISSUE_BODY_MAX,
  type Issue, type IssueComment, type IssueStatus,
} from "@/lib/issues";
import { relativeTime } from "@/lib/posts";
import VerifiedBadge from "@/components/site/VerifiedBadge";

const STATUSES: IssueStatus[] = ["open", "investigating", "fixed", "wont_fix", "duplicate"];

const IssueDetail = () => {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const nav = useNavigate();
  const [issue, setIssue] = useState<Issue | null>(null);
  const [comments, setComments] = useState<IssueComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [i, c] = await Promise.all([fetchIssue(id, user?.id ?? null), fetchIssueComments(id)]);
      setIssue(i);
      setComments(c);
      if (i) document.title = `${i.title} — Issues — Warden Network`;
    } catch (e: any) {
      toast.error(e.message ?? "Could not load issue");
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id, user?.id]);

  const vote = async () => {
    if (!user) { nav(`/auth?redirect=/issues/${id}`); return; }
    if (!issue) return;
    setIssue({ ...issue, votedByMe: !issue.votedByMe, votes: issue.votes + (issue.votedByMe ? -1 : 1) });
    try { await toggleIssueVote(issue.id, user.id, issue.votedByMe); }
    catch (e: any) { toast.error(e.message ?? "Vote failed"); load(); }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !issue) return;
    const body = reply.trim();
    if (!body) return;
    setSending(true);
    try {
      await addIssueComment(issue.id, user.id, body);
      setReply("");
      setComments(await fetchIssueComments(issue.id));
    } catch (e: any) {
      toast.error(e.message ?? "Could not post comment");
    }
    setSending(false);
  };

  const changeStatus = async (status: IssueStatus) => {
    if (!issue) return;
    try {
      await setIssueStatus(issue.id, status);
      setIssue({ ...issue, status });
      toast.success("Status updated");
    } catch (e: any) { toast.error(e.message ?? "Could not update status"); }
  };

  const remove = async () => {
    if (!issue) return;
    try {
      await deleteIssue(issue.id);
      toast.success("Issue deleted");
      nav("/issues");
    } catch (e: any) { toast.error(e.message ?? "Could not delete issue"); }
  };

  const sm = issue ? ISSUE_STATUS_META[issue.status] : null;
  const mine = !!user && issue?.user_id === user.id;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1">
        <section className="relative pt-28 pb-8 overflow-hidden">
          <Particles count={14} />
          <div className="absolute inset-0 bg-grid opacity-[0.08]" />
          <div className="container relative">
            <Button variant="outline" asChild>
              <Link to="/issues"><ChevronLeft className="h-4 w-4 mr-1" /> All issues</Link>
            </Button>
          </div>
        </section>

        <div className="container pb-16 space-y-5">
          {loading ? (
            <Card className="p-10 text-center text-muted-foreground">Loading…</Card>
          ) : !issue ? (
            <Card className="p-12 text-center text-muted-foreground">This issue no longer exists.</Card>
          ) : (
            <>
              <Card className="p-6 md:p-7 border-primary/20">
                <div className="flex gap-4">
                  <button
                    onClick={vote}
                    className={`shrink-0 w-14 h-16 rounded-lg border flex flex-col items-center justify-center transition ${
                      issue.votedByMe ? "border-primary/60 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                    aria-label="Upvote issue"
                  >
                    <ChevronUp className="h-5 w-5" />
                    <span className="text-sm font-bold">{issue.votes}</span>
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${sm!.className}`}>
                        {sm!.label}
                      </span>
                      <Badge variant="outline" className="text-[10px]">{issue.category}</Badge>
                    </div>
                    <h1 className="font-display text-2xl md:text-3xl font-bold">{issue.title}</h1>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        {issue.author?.display_name ?? "Member"}
                        {issue.author?.verified && <VerifiedBadge />}
                      </span>
                      <span>· {relativeTime(issue.created_at)}</span>
                    </div>
                    <p className="text-sm mt-4 whitespace-pre-wrap break-words">{issue.description}</p>

                    {(isAdmin || mine) && (
                      <div className="flex flex-wrap items-center gap-3 mt-5 pt-4 border-t border-border/60">
                        {isAdmin && (
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Status</Label>
                            <Select value={issue.status} onValueChange={(v: IssueStatus) => changeStatus(v)}>
                              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {STATUSES.map((s) => (
                                  <SelectItem key={s} value={s}>{ISSUE_STATUS_META[s].label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <Button variant="ghost" size="sm" onClick={remove}>
                          <Trash2 className="h-4 w-4 mr-1" /> Delete
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              <Card className="p-6 md:p-7">
                <h2 className="font-display text-lg font-bold mb-4">
                  {comments.length} {comments.length === 1 ? "comment" : "comments"}
                </h2>
                <div className="space-y-3">
                  {comments.map((c) => (
                    <div key={c.id} className="rounded-lg border border-border bg-card/60 p-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-display font-bold uppercase tracking-wider">
                          {c.author?.display_name ?? "Member"}
                        </span>
                        {c.author?.verified && <VerifiedBadge />}
                        <span className="text-[10px] text-muted-foreground">{relativeTime(c.created_at)}</span>
                      </div>
                      <div className="text-sm whitespace-pre-wrap break-words">{c.body}</div>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-sm text-muted-foreground">No comments yet.</p>
                  )}
                </div>

                {user ? (
                  <form onSubmit={send} className="mt-5 pt-5 border-t border-border/60 space-y-3">
                    <Label>Add a comment</Label>
                    <Textarea rows={4} maxLength={ISSUE_BODY_MAX} value={reply}
                      onChange={(e) => setReply(e.target.value)} placeholder="Share more details or a workaround…" />
                    <div className="flex justify-end">
                      <Button type="submit" disabled={sending || !reply.trim()} className="glow">
                        <Send className="h-4 w-4 mr-2" /> {sending ? "Posting…" : "Comment"}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="mt-5 pt-5 border-t border-border/60 text-center">
                    <Button asChild variant="outline"><Link to={`/auth?redirect=/issues/${issue.id}`}>Sign in to comment</Link></Button>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default IssueDetail;
