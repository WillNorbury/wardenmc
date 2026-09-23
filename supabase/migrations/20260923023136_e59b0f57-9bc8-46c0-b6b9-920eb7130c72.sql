
CREATE TABLE public.issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'Other',
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT issues_status_check CHECK (status IN ('open','investigating','fixed','wont_fix','duplicate'))
);

GRANT SELECT ON public.issues TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.issues TO authenticated;
GRANT ALL ON public.issues TO service_role;

ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Issues are public" ON public.issues FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users create own issues" ON public.issues FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own issues" ON public.issues FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own issues" ON public.issues FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Staff manage issues" ON public.issues FOR ALL TO authenticated USING (public.is_staff_user(auth.uid())) WITH CHECK (public.is_staff_user(auth.uid()));

CREATE TRIGGER issues_set_updated_at BEFORE UPDATE ON public.issues FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.issue_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.issue_comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.issue_comments TO authenticated;
GRANT ALL ON public.issue_comments TO service_role;

ALTER TABLE public.issue_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Issue comments are public" ON public.issue_comments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users create own issue comments" ON public.issue_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own issue comments" ON public.issue_comments FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own issue comments" ON public.issue_comments FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Staff manage issue comments" ON public.issue_comments FOR ALL TO authenticated USING (public.is_staff_user(auth.uid())) WITH CHECK (public.is_staff_user(auth.uid()));

CREATE TRIGGER issue_comments_set_updated_at BEFORE UPDATE ON public.issue_comments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.issue_votes (
  issue_id uuid NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (issue_id, user_id)
);

GRANT SELECT ON public.issue_votes TO anon;
GRANT SELECT, INSERT, DELETE ON public.issue_votes TO authenticated;
GRANT ALL ON public.issue_votes TO service_role;

ALTER TABLE public.issue_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Issue votes are public" ON public.issue_votes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users vote for themselves" ON public.issue_votes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users remove own vote" ON public.issue_votes FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX issues_created_idx ON public.issues (created_at DESC);
CREATE INDEX issue_comments_issue_idx ON public.issue_comments (issue_id, created_at);
