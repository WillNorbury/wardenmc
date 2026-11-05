REVOKE EXECUTE ON FUNCTION public.grant_membership_rank(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_membership_rank(text) TO service_role;