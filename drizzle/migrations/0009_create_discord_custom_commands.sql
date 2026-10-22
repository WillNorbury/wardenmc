CREATE TABLE public.discord_custom_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  name text NOT NULL,
  response text NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guild_id, name)
);
GRANT ALL ON public.discord_custom_commands TO service_role;
ALTER TABLE public.discord_custom_commands ENABLE ROW LEVEL SECURITY;