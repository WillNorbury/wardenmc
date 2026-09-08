DROP POLICY IF EXISTS "Vote links are publicly readable" ON public.vote_links;

CREATE POLICY "Enabled vote links are publicly readable"
ON public.vote_links
FOR SELECT
TO anon, authenticated
USING (
  enabled = true
  OR private.has_role(auth.uid(), 'admin'::app_role)
  OR private.has_role(auth.uid(), 'owner'::app_role)
);

REVOKE INSERT, UPDATE, DELETE ON public.vote_links FROM anon;

REVOKE SELECT (preferences) ON public.profiles FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon;