CREATE TABLE public.funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text NOT NULL CHECK (event IN ('signup_view', 'signup_complete')),
  session_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.funnel_events TO anon;
GRANT INSERT, SELECT ON public.funnel_events TO authenticated;
GRANT ALL ON public.funnel_events TO service_role;

ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record funnel events"
  ON public.funnel_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can read funnel events"
  ON public.funnel_events FOR SELECT
  TO authenticated
  USING (public.is_current_user_admin());

CREATE INDEX funnel_events_event_created_idx ON public.funnel_events (event, created_at DESC);