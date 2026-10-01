GRANT SELECT ON public.organizations TO authenticated;

ALTER POLICY "Org owners manage members" ON public.organization_members
  USING (public.is_org_owner(org_id))
  WITH CHECK (public.is_org_owner(org_id));

ALTER POLICY "Members can view their org memberships" ON public.organization_members
  USING (user_id = auth.uid() OR public.is_org_owner(org_id) OR public.is_org_member(org_id, auth.uid()));