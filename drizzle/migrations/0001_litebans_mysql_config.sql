CREATE TABLE public.litebans_mysql_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  host text,
  port integer NOT NULL DEFAULT 3306,
  username text,
  password text,
  database_name text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.litebans_mysql_config TO authenticated;
GRANT ALL ON public.litebans_mysql_config TO service_role;

ALTER TABLE public.litebans_mysql_config ENABLE ROW LEVEL SECURITY;

-- Locked to a single account (WillNorbury).
CREATE POLICY "litebans config owner account only"
ON public.litebans_mysql_config
FOR ALL
TO authenticated
USING (auth.uid() = 'a9ff5e2f-cad4-4805-9acd-095065d18179'::uuid)
WITH CHECK (auth.uid() = 'a9ff5e2f-cad4-4805-9acd-095065d18179'::uuid);