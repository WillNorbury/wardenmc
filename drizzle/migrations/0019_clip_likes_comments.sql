CREATE TABLE public.clip_likes (clip_id uuid NOT NULL REFERENCES public.community_clips(id) ON DELETE CASCADE, user_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (clip_id, user_id));
GRANT SELECT ON public.clip_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.clip_likes TO authenticated;
GRANT ALL ON public.clip_likes TO service_role;
ALTER TABLE public.clip_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view clip likes" ON public.clip_likes FOR SELECT USING (true);
CREATE POLICY "Members like as themselves" ON public.clip_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members unlike their own" ON public.clip_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.clip_comments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), clip_id uuid NOT NULL REFERENCES public.community_clips(id) ON DELETE CASCADE, user_id uuid NOT NULL, body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 500), created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX clip_comments_clip_idx ON public.clip_comments(clip_id, created_at);
GRANT SELECT ON public.clip_comments TO anon;
GRANT SELECT, INSERT, DELETE ON public.clip_comments TO authenticated;
GRANT ALL ON public.clip_comments TO service_role;
ALTER TABLE public.clip_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view clip comments" ON public.clip_comments FOR SELECT USING (true);
CREATE POLICY "Members comment as themselves" ON public.clip_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Members delete own comments" ON public.clip_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);