-- Organizations: hide owner identity from the public directory
REVOKE SELECT ON public.organizations FROM anon, authenticated;
GRANT SELECT (id, slug, name, description, avatar_url, created_at, updated_at) ON public.organizations TO anon, authenticated;

-- Profiles: only explicitly public columns are readable; future columns stay private by default
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (id, display_name, avatar_url, mc_username, bio, verified, created_at, updated_at) ON public.profiles TO anon, authenticated;
