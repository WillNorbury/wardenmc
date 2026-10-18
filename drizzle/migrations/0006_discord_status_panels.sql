CREATE TABLE public.discord_status_panels (
 channel_id text PRIMARY KEY CHECK (channel_id ~ '^[0-9]{17,20}$'),
 guild_id text NOT NULL CHECK (guild_id ~ '^[0-9]{17,20}$'),
 message_id text CHECK (message_id ~ '^[0-9]{17,20}$'),
 configured_by text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.discord_status_panels TO service_role;
ALTER TABLE public.discord_status_panels ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.discord_status_panels IS 'Service-only Discord status messages; writes require verified Discord interactions and Manage Server permission.';