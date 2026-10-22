CREATE TABLE public.discord_guild_reply_texts (
  guild_id text PRIMARY KEY,
  replies jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.discord_guild_reply_texts TO service_role;

ALTER TABLE public.discord_guild_reply_texts ENABLE ROW LEVEL SECURITY;