-- 1) Move preferences into profiles_private
ALTER TABLE public.profiles_private
  ADD COLUMN IF NOT EXISTS preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

INSERT INTO public.profiles_private (user_id, preferences)
SELECT p.id, COALESCE(p.preferences, '{}'::jsonb)
FROM public.profiles p
ON CONFLICT (user_id) DO UPDATE
  SET preferences = COALESCE(EXCLUDED.preferences, '{}'::jsonb);

ALTER TABLE public.profiles DROP COLUMN preferences;

CREATE OR REPLACE FUNCTION public.get_my_private_profile()
RETURNS TABLE(preferences jsonb, discord_id text, discord_username text, discord_avatar text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(pp.preferences, '{}'::jsonb), pp.discord_id, pp.discord_username, pp.discord_avatar
  FROM public.profiles p
  LEFT JOIN public.profiles_private pp ON pp.user_id = p.id
  WHERE p.id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.set_my_preferences(_prefs jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  INSERT INTO public.profiles_private (user_id, preferences)
  VALUES (auth.uid(), COALESCE(_prefs, '{}'::jsonb))
  ON CONFLICT (user_id) DO UPDATE SET preferences = COALESCE(_prefs, '{}'::jsonb);
END;
$function$;

REVOKE ALL ON FUNCTION public.set_my_preferences(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_preferences(jsonb) TO authenticated;

-- 2) Organizations: no direct anon reads; public data via a curated view
DROP POLICY IF EXISTS "Organizations viewable by everyone" ON public.organizations;
REVOKE ALL ON public.organizations FROM anon;

CREATE OR REPLACE VIEW public.organizations_public AS
SELECT id, slug, name, description, avatar_url, created_at, updated_at
FROM public.organizations;

GRANT SELECT ON public.organizations_public TO anon, authenticated;