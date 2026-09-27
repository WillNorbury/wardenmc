DROP POLICY IF EXISTS "Org owners can attach plugins" ON public.plugins;
CREATE POLICY "Org owners can attach plugins" ON public.plugins FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR (org_id IS NOT NULL AND public.is_org_owner(org_id)))
WITH CHECK (auth.uid() = user_id OR (org_id IS NOT NULL AND public.is_org_owner(org_id)));