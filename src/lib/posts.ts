import { supabase } from "@/integrations/supabase/client";

export type PostAuthor = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  mc_username: string | null;
  verified: boolean;
};

export type Post = {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  reply_to: string | null;
  created_at: string;
  author: PostAuthor | null;
  likes: number;
  likedByMe: boolean;
  replies: number;
};

const emptyAuthor = (id: string): PostAuthor => ({
  id,
  display_name: null,
  avatar_url: null,
  mc_username: null,
  verified: false,
});

export async function fetchPosts(opts: { replyTo?: string | null; viewerId?: string | null } = {}) {
  const { replyTo = null, viewerId = null } = opts;

  let query = supabase
    .from("posts")
    .select("id,user_id,content,image_url,reply_to,created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  query = replyTo ? query.eq("reply_to", replyTo) : query.is("reply_to", null);

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as Omit<Post, "author" | "likes" | "likedByMe" | "replies">[];
  const ids = rows.map((r) => r.id);
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));

  const [profilesRes, likesRes, repliesRes] = await Promise.all([
    userIds.length
      ? supabase.from("profiles").select("id,display_name,avatar_url,mc_username,verified").in("id", userIds)
      : Promise.resolve({ data: [], error: null } as any),
    ids.length
      ? supabase.from("post_likes").select("post_id,user_id").in("post_id", ids)
      : Promise.resolve({ data: [], error: null } as any),
    ids.length
      ? supabase.from("posts").select("reply_to").in("reply_to", ids)
      : Promise.resolve({ data: [], error: null } as any),
  ]);

  const profiles = new Map<string, PostAuthor>(
    ((profilesRes.data ?? []) as PostAuthor[]).map((p) => [p.id, { ...p, verified: !!p.verified }]),
  );

  const likeCounts = new Map<string, number>();
  const likedByMe = new Set<string>();
  for (const l of (likesRes.data ?? []) as { post_id: string; user_id: string }[]) {
    likeCounts.set(l.post_id, (likeCounts.get(l.post_id) ?? 0) + 1);
    if (viewerId && l.user_id === viewerId) likedByMe.add(l.post_id);
  }

  const replyCounts = new Map<string, number>();
  for (const r of (repliesRes.data ?? []) as { reply_to: string | null }[]) {
    if (r.reply_to) replyCounts.set(r.reply_to, (replyCounts.get(r.reply_to) ?? 0) + 1);
  }

  return rows.map<Post>((r) => ({
    ...r,
    author: profiles.get(r.user_id) ?? emptyAuthor(r.user_id),
    likes: likeCounts.get(r.id) ?? 0,
    likedByMe: likedByMe.has(r.id),
    replies: replyCounts.get(r.id) ?? 0,
  }));
}

export async function createPost(input: { userId: string; content: string; imageUrl?: string | null; replyTo?: string | null }) {
  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id: input.userId,
      content: input.content.trim(),
      image_url: input.imageUrl?.trim() || null,
      reply_to: input.replyTo ?? null,
    })
    .select("id")
    .maybeSingle();
  if (error) throw error;

  if (data?.id) {
    // Fire-and-forget email notifications (post confirmation + reply alert).
    supabase.functions
      .invoke("notify-post", { body: { postId: data.id } })
      .catch((e) => console.warn("notify-post failed", e));
  }
}

export async function toggleLike(postId: string, userId: string, liked: boolean) {
  if (liked) {
    const { error } = await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: userId });
    if (error) throw error;
  }
}

export async function deletePost(postId: string) {
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw error;
}

export const relativeTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export const POST_MAX = 500;
