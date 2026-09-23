-- Funnel events: constrain what anonymous visitors can write
DROP POLICY IF EXISTS "Anyone can record funnel events" ON public.funnel_events;
CREATE POLICY "Anyone can record funnel events"
ON public.funnel_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  event IN ('signup_view','signup_complete')
  AND session_id IS NOT NULL
  AND char_length(session_id) BETWEEN 1 AND 64
);

-- Issue votes: stop exposing who voted; counts via function, own votes only
DROP POLICY IF EXISTS "Issue votes are public" ON public.issue_votes;
CREATE POLICY "Users read own issue votes"
ON public.issue_votes
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

REVOKE SELECT ON public.issue_votes FROM anon;

CREATE OR REPLACE FUNCTION public.get_issue_vote_counts(_issue_ids uuid[] DEFAULT NULL)
RETURNS TABLE(issue_id uuid, votes bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT v.issue_id, count(*)::bigint
  FROM public.issue_votes v
  WHERE _issue_ids IS NULL OR v.issue_id = ANY(_issue_ids)
  GROUP BY v.issue_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_issue_vote_counts(uuid[]) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_issue_comment_counts(_issue_ids uuid[] DEFAULT NULL)
RETURNS TABLE(issue_id uuid, comments bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.issue_id, count(*)::bigint
  FROM public.issue_comments c
  WHERE _issue_ids IS NULL OR c.issue_id = ANY(_issue_ids)
  GROUP BY c.issue_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_issue_comment_counts(uuid[]) TO anon, authenticated;