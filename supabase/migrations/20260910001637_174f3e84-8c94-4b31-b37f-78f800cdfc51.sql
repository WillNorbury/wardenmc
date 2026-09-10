REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.organizations FROM anon;
REVOKE SELECT ON public.organizations FROM anon;
GRANT SELECT (id, name, slug, description, avatar_url, created_at, updated_at) ON public.organizations TO anon;

REVOKE SELECT ON public.organizations FROM authenticated;
GRANT SELECT (id, name, slug, description, avatar_url, created_at, updated_at, owner_id) ON public.organizations TO authenticated;

REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.profiles FROM anon;