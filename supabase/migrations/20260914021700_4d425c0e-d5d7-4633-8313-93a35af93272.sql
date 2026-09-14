
-- 1) posts / post_likes: authenticated-only reads
DROP POLICY "Posts are publicly readable" ON public.posts;
CREATE POLICY "Posts readable by signed-in users" ON public.posts FOR SELECT TO authenticated USING (true);
DROP POLICY "Likes are publicly readable" ON public.post_likes;
CREATE POLICY "Likes readable by signed-in users" ON public.post_likes FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.posts FROM anon;
REVOKE SELECT ON public.post_likes FROM anon;

-- 2) organizations: expose only public directory columns
DROP POLICY "Organizations viewable by signed-in users" ON public.organizations;
CREATE POLICY "Public organization directory readable" ON public.organizations FOR SELECT TO public USING (true);
REVOKE SELECT ON public.organizations FROM anon, authenticated;
GRANT SELECT (id, slug, name, description, avatar_url, created_at, updated_at) ON public.organizations TO anon, authenticated;

-- 3) views: run with caller permissions
ALTER VIEW public.organizations_public SET (security_invoker = on);
ALTER VIEW public.faq_vote_counts SET (security_invoker = on);
