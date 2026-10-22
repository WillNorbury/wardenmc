CREATE TABLE public.discord_guild_module_settings (
  guild_id TEXT NOT NULL,
  module TEXT NOT NULL CHECK (module IN ('welcome', 'reactionroles', 'automod')),
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (guild_id, module)
);
GRANT ALL ON public.discord_guild_module_settings TO service_role;
ALTER TABLE public.discord_guild_module_settings ENABLE ROW LEVEL SECURITY;