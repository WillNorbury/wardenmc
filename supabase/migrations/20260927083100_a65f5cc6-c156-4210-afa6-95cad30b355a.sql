CREATE TABLE public.user_affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  affiliate_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, affiliate_id),
  CHECK (owner_id <> affiliate_id)
);
GRANT SELECT ON public.user_affiliates TO anon;
GRANT SELECT, INSERT, DELETE ON public.user_affiliates TO authenticated;
GRANT ALL ON public.user_affiliates TO service_role;
ALTER TABLE public.user_affiliates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliates are public" ON public.user_affiliates FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Owners add affiliates" ON public.user_affiliates FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners or affiliates remove" ON public.user_affiliates FOR DELETE TO authenticated USING (auth.uid() = owner_id OR auth.uid() = affiliate_id);