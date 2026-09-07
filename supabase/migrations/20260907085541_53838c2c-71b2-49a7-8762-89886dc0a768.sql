CREATE OR REPLACE FUNCTION public.grant_membership_rank(_slug text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _role public.app_role;
  _name text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  SELECT name INTO _name
  FROM public.membership_tiers
  WHERE slug = lower(_slug) AND published = true;

  IF _name IS NULL THEN
    RAISE EXCEPTION 'Unknown membership tier';
  END IF;

  IF lower(_slug) NOT IN ('guardian', 'sentinel', 'warden', 'ascendant') THEN
    RETURN NULL;
  END IF;

  _role := lower(_slug)::public.app_role;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, _role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN _name;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_membership_rank(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_membership_rank(text) TO authenticated;