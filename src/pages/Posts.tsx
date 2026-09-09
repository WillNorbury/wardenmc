import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PenSquare, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { PostCard } from "@/components/site/PostCard";
import { createPost, deletePost, fetchPosts, toggleLike, POST_MAX, type Post } from "@/lib/posts";

const Posts = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Post[]>([]);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPosts(await fetchPosts({ viewerId: user?.id ?? null }));
    } catch (e: any) {
      setError(e?.message ?? "Could not load posts.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    document.title = "Posts — Warden Network";
    load();
  }, [load]);

  const openReplies = async (post: Post) => {
    setReplyTo(post);
    setReplyText("");
    setReplies([]);
    try {
      setReplies(await fetchPosts({ replyTo: post.id, viewerId: user?.id ?? null }));
    } catch {
      /* ignore */
    }
  };

  const like = async (post: Post) => {
    if (!user) {
      toast({ title: "Sign in to like posts" });
      return;
    }
    const liked = post.likedByMe;
    const apply = (list: Post[]) =>
      list.map((p) => (p.id === post.id ? { ...p, likedByMe: !liked, likes: p.likes + (liked ? -1 : 1) } : p));
    setPosts(apply);
    setReplies(apply);
    try {
      await toggleLike(post.id, user.id, liked);
    } catch {
      setPosts((l) => l.map((p) => (p.id === post.id ? post : p)));
      toast({ title: "Could not update like", variant: "destructive" });
    }
  };

  const remove = async (post: Post) => {
    try {
      await deletePost(post.id);
      setPosts((l) => l.filter((p) => p.id !== post.id));
      setReplies((l) => l.filter((p) => p.id !== post.id));
      toast({ title: "Post deleted" });
    } catch {
      toast({ title: "Could not delete post", variant: "destructive" });
    }
  };

  const sendReply = async () => {
    if (!user || !replyTo || !replyText.trim()) return;
    setSending(true);
    try {
      await createPost({ userId: user.id, content: replyText, replyTo: replyTo.id });
      setReplyText("");
      setReplies(await fetchPosts({ replyTo: replyTo.id, viewerId: user.id }));
      setPosts((l) => l.map((p) => (p.id === replyTo.id ? { ...p, replies: p.replies + 1 } : p)));
    } catch {
      toast({ title: "Could not post reply", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container max-w-2xl pt-28 pb-16">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="font-display text-3xl md:text-4xl font-black">Posts</h1>
            <p className="text-muted-foreground text-sm">What's happening across Warden Network.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={load} aria-label="Refresh posts">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button asChild>
              <Link to="/post">
                <PenSquare className="h-4 w-4 mr-2" /> New post
              </Link>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <Card key={i} className="p-4">
                <div className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={load}>Try again</Button>
          </Card>
        ) : posts.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="font-semibold mb-1">No posts yet</p>
            <p className="text-muted-foreground text-sm mb-4">Be the first to say something.</p>
            <Button asChild>
              <Link to="/post">Write a post</Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {posts.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                canDelete={!!user && (user.id === p.user_id || isAdmin)}
                onLike={like}
                onReply={openReplies}
                onDelete={remove}
              />
            ))}
          </div>
        )}
      </main>
      <Footer />

      <Dialog open={!!replyTo} onOpenChange={(o) => !o && setReplyTo(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Replies</DialogTitle>
          </DialogHeader>
          {replyTo && <PostCard post={replyTo} />}
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {replies.map((r) => (
              <PostCard
                key={r.id}
                post={r}
                canDelete={!!user && (user.id === r.user_id || isAdmin)}
                onLike={like}
                onDelete={remove}
              />
            ))}
            {replies.length === 0 && <p className="text-sm text-muted-foreground">No replies yet.</p>}
          </div>
          {user ? (
            <div className="space-y-2">
              <Textarea
                value={replyText}
                maxLength={POST_MAX}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Post your reply"
              />
              <div className="flex justify-end">
                <Button onClick={sendReply} disabled={sending || !replyText.trim()}>
                  Reply
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              <Link to="/auth" className="text-primary underline">
                Sign in
              </Link>{" "}
              to reply.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Posts;
