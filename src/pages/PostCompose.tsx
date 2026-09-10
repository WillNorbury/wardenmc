import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { VerifiedBadge } from "@/components/site/VerifiedBadge";
import { createPost, POST_MAX } from "@/lib/posts";

type Me = { display_name: string | null; avatar_url: string | null; mc_username: string | null; verified: boolean };

const PostCompose = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const nav = useNavigate();
  const [me, setMe] = useState<Me | null>(null);
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    document.title = "New post — Warden Network";
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name,avatar_url,mc_username,verified")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setMe((data as Me) ?? null));
  }, [user]);

  const submit = async () => {
    if (!user || !content.trim()) return;
    setSending(true);
    try {
      await createPost({ userId: user.id, content, imageUrl });
      toast({ title: "Posted!" });
      nav("/posts");
    } catch (e: any) {
      toast({ title: "Could not post", description: e?.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const name = me?.display_name || me?.mc_username || "You";
  const avatar = me?.avatar_url || (me?.mc_username ? `https://mc-heads.net/avatar/${me.mc_username}/128` : undefined);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 container max-w-2xl pt-28 pb-16">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
          <Link to="/posts">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to posts
          </Link>
        </Button>

        <h1 className="font-display text-3xl md:text-4xl font-black mb-6">New post</h1>

        {loading ? null : !user ? (
          <Card className="p-10 text-center">
            <p className="font-semibold mb-1">Sign in to post</p>
            <p className="text-muted-foreground text-sm mb-4">You need an account to share a post.</p>
            <Button asChild>
              <Link to="/auth">Sign in</Link>
            </Button>
          </Card>
        ) : (
          <Card className="p-4">
            <div className="flex gap-3">
              <Avatar className="h-10 w-10 shrink-0">
                {avatar && <AvatarImage src={avatar} alt={`${name} avatar`} />}
                <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-1.5 text-sm font-semibold">
                  {name}
                  {me?.verified && <VerifiedBadge />}
                </div>
                <Textarea
                  autoFocus
                  value={content}
                  maxLength={POST_MAX}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What's happening?"
                  className="min-h-32 text-base border-0 focus-visible:ring-0 px-0 resize-none"
                />
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Image URL (optional)"
                />
                {imageUrl.trim() && (
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="max-h-72 w-full rounded-lg border border-border object-cover"
                  />
                )}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">
                    {content.length}/{POST_MAX}
                  </span>
                  <Button onClick={submit} disabled={sending || !content.trim()}>
                    <Send className="h-4 w-4 mr-2" /> Post
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default PostCompose;
