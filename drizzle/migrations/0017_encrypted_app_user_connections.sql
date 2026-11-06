CREATE TABLE public.app_user_connections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, connector_id text NOT NULL,
 connection_key_ciphertext text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id, connector_id)
);
GRANT ALL ON public.app_user_connections TO service_role;
REVOKE ALL ON public.app_user_connections FROM anon, authenticated;
ALTER TABLE public.app_user_connections ENABLE ROW LEVEL SECURITY;