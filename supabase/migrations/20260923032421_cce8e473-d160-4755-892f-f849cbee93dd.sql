ALTER TABLE public.player_stats DROP CONSTRAINT IF EXISTS player_stats_player_uuid_key;
CREATE UNIQUE INDEX IF NOT EXISTS player_stats_server_player_uuid_key
  ON public.player_stats (server_id, player_uuid);