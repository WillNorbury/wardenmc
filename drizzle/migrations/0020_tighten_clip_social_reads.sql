DROP POLICY "Anyone can view clip likes" ON public.clip_likes;
REVOKE SELECT ON public.clip_likes FROM anon;
CREATE POLICY "Members view own likes" ON public.clip_likes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE OR REPLACE FUNCTION public.get_clip_like_count(_clip_id uuid) RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT count(*)::int FROM public.clip_likes WHERE clip_id = _clip_id $$;
REVOKE ALL ON FUNCTION public.get_clip_like_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_clip_like_count(uuid) TO anon, authenticated;
DROP POLICY "Anyone can view clip comments" ON public.clip_comments;
CREATE POLICY "View comments on visible clips" ON public.clip_comments FOR SELECT USING (EXISTS (SELECT 1 FROM public.community_clips c WHERE c.id = clip_comments.clip_id));