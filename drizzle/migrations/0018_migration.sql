REVOKE EXECUTE ON FUNCTION public.admin_run_sql(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_streak_leaderboard(_metric text DEFAULT 'login_streak'::text, _limit integer DEFAULT 50)
 RETURNS TABLE(user_id uuid, display_name text, mc_username text, avatar_url text, login_streak integer, login_best integer, total_logins integer, vote_streak integer, vote_best integer, total_votes integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.user_id, p.display_name, p.mc_username, p.avatar_url,
         s.login_streak, s.login_best, s.total_logins,
         s.vote_streak, s.vote_best, s.total_votes
  FROM public.user_streaks s
  LEFT JOIN public.profiles p ON p.id = s.user_id
  ORDER BY (CASE _metric
      WHEN 'login_best' THEN s.login_best
      WHEN 'total_logins' THEN s.total_logins
      WHEN 'vote_streak' THEN s.vote_streak
      WHEN 'vote_best' THEN s.vote_best
      WHEN 'total_votes' THEN s.total_votes
      ELSE s.login_streak END) DESC NULLS LAST
  LIMIT GREATEST(LEAST(COALESCE(_limit, 50), 200), 1);
$function$;