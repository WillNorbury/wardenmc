CREATE TABLE public.discord_apply_settings (
  guild_id TEXT PRIMARY KEY,
  apply_url TEXT NOT NULL,
  configured_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.discord_apply_settings TO service_role;
ALTER TABLE public.discord_apply_settings ENABLE ROW LEVEL SECURITY;