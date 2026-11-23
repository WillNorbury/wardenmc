CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid, _user_id uuid)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE org_id = _org_id AND user_id = _user_id
  ) AND (
    _user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.organization_members WHERE org_id = _org_id AND user_id = auth.uid())
  );
$$;

DROP POLICY IF EXISTS "Anon can insert anonymous vote" ON public.faq_votes;

CREATE OR REPLACE FUNCTION public.protect_profile_verified()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.verified IS DISTINCT FROM OLD.verified
     AND auth.uid() IS NOT NULL
     AND NOT (private.has_role(auth.uid(), 'admin'::app_role) OR private.has_role(auth.uid(), 'owner'::app_role)) THEN
    NEW.verified := OLD.verified;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.protect_profile_verified() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_profile_verified ON public.profiles;
CREATE TRIGGER trg_protect_profile_verified BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_verified();