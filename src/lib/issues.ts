import { supabase } from "@/integrations/supabase/client";

export type IssueStatus = "open" | "investigating" | "fixed" | "wont_fix" | "duplicate";

export const ISSUE_STATUS_META: Record<IssueStatus, { label: string; className: string }> = {
  open: { label: "Open", className: "bg-primary/15 text-primary border-primary/40" },
  investigating: { label: "Investigating", className: "bg-amber-500/15 text-amber-400 border-amber-500/40" },
  fixed: { label: "Fixed", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40" },
  wont_fix: { label: "Won't fix", className: "bg-destructive/15 text-destructive border-destructive/40" },
  duplicate: { label: "Duplicate", className: "bg-muted text-muted-foreground border-border" },
};

export const ISSUE_CATEGORIES = [
  "Bug",
  "Website",
  "Gameplay",
  "Store & Payments",
  "Feature request",
  "Other",
] as const;

export type IssueAuthor = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  mc_username: string | null;
  verified: boolean;
};

export type Issue = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  status: IssueStatus;
  created_at: string;
  updated_at: string;
  author: IssueAuthor | null;
  votes: number;
  votedByMe: boolean;
  comments: number;
};

export type IssueComment = {
  id: string;
  issue_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author: IssueAuthor | null;
};

const fetchAuthors = async (userIds: string[]) => {
  const ids = Array.from(new Set(userIds));
  if (!ids.length) return new Map<string, IssueAuthor>();
  const { data } = await supabase
    .from("profiles")
    .select("id,display_name,avatar_url,mc_username,verified")
    .in("id", ids);
  return new Map<string, IssueAuthor>(
    ((data ?? []) as IssueAuthor[]).map((p) => [p.id, { ...p, verified: !!p.verified }]),
  );
};

export async function fetchIssues(viewerId?: string | null) {
  const { data, error } = await supabase
    .from("issues")
    .select("id,user_id,title,description,category,status,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;

  const rows = (data ?? []) as Omit<Issue, "author" | "votes" | "votedByMe" | "comments">[];
  const ids = rows.map((r) => r.id);

  const [authors, votesRes, commentsRes] = await Promise.all([
    fetchAuthors(rows.map((r) => r.user_id)),
    ids.length
      ? supabase.from("issue_votes").select("issue_id,user_id").in("issue_id", ids)
      : Promise.resolve({ data: [] } as any),
    ids.length
      ? supabase.from("issue_comments").select("issue_id").in("issue_id", ids)
      : Promise.resolve({ data: [] } as any),
  ]);

  const voteCounts = new Map<string, number>();
  const mine = new Set<string>();
  for (const v of (votesRes.data ?? []) as { issue_id: string; user_id: string }[]) {
    voteCounts.set(v.issue_id, (voteCounts.get(v.issue_id) ?? 0) + 1);
    if (viewerId && v.user_id === viewerId) mine.add(v.issue_id);
  }

  const commentCounts = new Map<string, number>();
  for (const c of (commentsRes.data ?? []) as { issue_id: string }[]) {
    commentCounts.set(c.issue_id, (commentCounts.get(c.issue_id) ?? 0) + 1);
  }

  return rows.map<Issue>((r) => ({
    ...r,
    author: authors.get(r.user_id) ?? null,
    votes: voteCounts.get(r.id) ?? 0,
    votedByMe: mine.has(r.id),
    comments: commentCounts.get(r.id) ?? 0,
  }));
}

export async function fetchIssue(id: string, viewerId?: string | null): Promise<Issue | null> {
  const { data, error } = await supabase
    .from("issues")
    .select("id,user_id,title,description,category,status,created_at,updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const [authors, votesRes, commentsRes] = await Promise.all([
    fetchAuthors([data.user_id]),
    supabase.from("issue_votes").select("issue_id,user_id").eq("issue_id", id),
    supabase.from("issue_comments").select("issue_id").eq("issue_id", id),
  ]);

  const votes = (votesRes.data ?? []) as { user_id: string }[];
  return {
    ...(data as any),
    author: authors.get(data.user_id) ?? null,
    votes: votes.length,
    votedByMe: !!viewerId && votes.some((v) => v.user_id === viewerId),
    comments: (commentsRes.data ?? []).length,
  };
}

export async function fetchIssueComments(issueId: string): Promise<IssueComment[]> {
  const { data, error } = await supabase
    .from("issue_comments")
    .select("id,issue_id,user_id,body,created_at")
    .eq("issue_id", issueId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as Omit<IssueComment, "author">[];
  const authors = await fetchAuthors(rows.map((r) => r.user_id));
  return rows.map((r) => ({ ...r, author: authors.get(r.user_id) ?? null }));
}

export async function createIssue(input: {
  userId: string;
  title: string;
  description: string;
  category: string;
}) {
  const { data, error } = await supabase
    .from("issues")
    .insert({
      user_id: input.userId,
      title: input.title.trim(),
      description: input.description.trim(),
      category: input.category,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function addIssueComment(issueId: string, userId: string, body: string) {
  const { error } = await supabase
    .from("issue_comments")
    .insert({ issue_id: issueId, user_id: userId, body: body.trim() });
  if (error) throw error;
}

export async function toggleIssueVote(issueId: string, userId: string, voted: boolean) {
  if (voted) {
    const { error } = await supabase.from("issue_votes").delete().eq("issue_id", issueId).eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("issue_votes").insert({ issue_id: issueId, user_id: userId });
    if (error) throw error;
  }
}

export async function setIssueStatus(issueId: string, status: IssueStatus) {
  const { error } = await supabase.from("issues").update({ status }).eq("id", issueId);
  if (error) throw error;
}

export async function deleteIssue(issueId: string) {
  const { error } = await supabase.from("issues").delete().eq("id", issueId);
  if (error) throw error;
}

export const ISSUE_TITLE_MAX = 140;
export const ISSUE_BODY_MAX = 4000;
