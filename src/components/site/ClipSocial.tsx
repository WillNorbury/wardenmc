import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Loader2, MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const MAX_CLIP_COMMENT = 500;

export function ClipLikeButton({ clipId, compact }: { clipId: string; compact?: boolean }) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    void supabase.rpc("get_clip_like_count", { _clip_id: clipId }).then(({ data }) => { if (live && typeof data === "number") setCount(data); });
    if (user) void supabase.from("clip_likes").select("user_id").eq("clip_id", clipId).eq("user_id", user.id).maybeSingle().then(({ data }) => { if (live) setLiked(!!data); });
    else setLiked(false);
    return () => { live = false; };
  }, [clipId, user]);
  const toggle = async () => {
    if (!user) { toast.error("Sign in to like clips."); return; }
    setBusy(true);
    const { error } = liked
      ? await supabase.from("clip_likes").delete().eq("clip_id", clipId).eq("user_id", user.id)
      : await supabase.from("clip_likes").insert({ clip_id: clipId, user_id: user.id });
    setBusy(false);
    if (error) { toast.error("Could not update your like."); return; }
    setCount(c => c + (liked ? -1 : 1));
    setLiked(!liked);
  };
  return (
    <Button variant={liked ? "default" : "outline"} size="sm" disabled={busy} aria-pressed={liked} aria-label={liked ? "Unlike clip" : "Like clip"} onClick={toggle}>
      <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />{compact ? count : `${count} ${count === 1 ? "like" : "likes"}`}
    </Button>
  );
}

type Comment = { id: string; user_id: string; body: string; created_at: string; name: string; avatar: string | null };

export function ClipComments({ clipId }: { clipId: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const load = useCallback(async () => {
    const { data } = await supabase.from("clip_comments").select("id,user_id,body,created_at").eq("clip_id", clipId).order("created_at", { ascending: true }).limit(200);
    const rows = data ?? [];
    const ids = [...new Set(rows.map(r => r.user_id))];
    const { data: profs } = ids.length ? await supabase.from("profiles").select("id,display_name,mc_username,avatar_url").in("id", ids) : { data: [] };
    const map = new Map((profs ?? []).map(p => [p.id, p]));
    setComments(rows.map(r => { const p = map.get(r.user_id); return { ...r, name: p?.display_name || p?.mc_username || "Member", avatar: p?.avatar_url ?? null }; }));
    setLoading(false);
  }, [clipId]);
  useEffect(() => { setLoading(true); void load(); }, [load]);
  const send = async () => {
    const body = text.trim();
    if (!user || !body) return;
    setSending(true);
    const { error } = await supabase.from("clip_comments").insert({ clip_id: clipId, user_id: user.id, body: body.slice(0, MAX_CLIP_COMMENT) });
    setSending(false);
    if (error) { toast.error("Could not post your comment."); return; }
    setText(""); void load();
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("clip_comments").delete().eq("id", id);
    if (error) { toast.error("Could not delete the comment."); return; }
    setComments(c => c.filter(x => x.id !== id));
  };
  return (
    <section className="border-t border-border px-5 py-4" aria-label="Comments">
      <h3 className="flex items-center gap-2 text-sm font-semibold"><MessageCircle className="h-4 w-4" />Comments ({comments.length})</h3>
      {user ? (
        <div className="mt-3 space-y-2">
          <Textarea value={text} maxLength={MAX_CLIP_COMMENT} onChange={e => setText(e.target.value)} placeholder="Write a comment…" aria-label="Write a comment" rows={2} />
          <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{text.length}/{MAX_CLIP_COMMENT}</span><Button size="sm" disabled={sending || !text.trim()} onClick={send}>{sending && <Loader2 className="h-4 w-4 animate-spin" />}Post</Button></div>
        </div>
      ) : <p className="mt-3 text-sm text-muted-foreground"><Link to="/auth" className="text-primary underline">Sign in</Link> to comment.</p>}
      {loading ? <Loader2 className="mt-4 h-5 w-5 animate-spin text-primary" /> : (
        <ul className="mt-4 space-y-3">
          {comments.map(c => (
            <li key={c.id} className="flex gap-3">
              {c.avatar ? <img src={c.avatar} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" /> : <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{c.name[0]?.toUpperCase()}</div>}
              <div className="min-w-0 flex-1">
                <p className="text-xs"><span className="font-semibold">{c.name}</span> <span className="text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span></p>
                <p className="whitespace-pre-wrap break-words text-sm">{c.body}</p>
              </div>
              {user?.id === c.user_id && <Button variant="ghost" size="icon" aria-label="Delete comment" onClick={() => void remove(c.id)}><Trash2 className="h-4 w-4" /></Button>}
            </li>
          ))}
          {!comments.length && <li className="text-sm text-muted-foreground">No comments yet. Be the first!</li>}
        </ul>
      )}
    </section>
  );
}
