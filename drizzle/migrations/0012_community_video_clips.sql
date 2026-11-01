CREATE TABLE public.community_clips (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 120),
 description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 1000),
 storage_path text NOT NULL UNIQUE,
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT clip_owner_path CHECK (split_part(storage_path, '/', 1) = user_id::text),
 CONSTRAINT clip_video_extension CHECK (storage_path ~ '\.(mp4|webm|mov)$')
);
GRANT SELECT ON public.community_clips TO anon;
GRANT SELECT, INSERT, DELETE ON public.community_clips TO authenticated;
GRANT ALL ON public.community_clips TO service_role;
ALTER TABLE public.community_clips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view clips" ON public.community_clips FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Members upload own clips" ON public.community_clips FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Members delete own clips" ON public.community_clips FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX community_clips_created_at_idx ON public.community_clips (created_at DESC);
CREATE POLICY "Public clip playback" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'community-clips');
CREATE POLICY "Members upload own clip videos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'community-clips' AND (storage.foldername(name))[1] = auth.uid()::text AND lower(storage.extension(name)) IN ('mp4', 'webm', 'mov'));
CREATE POLICY "Members delete own clip videos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'community-clips' AND (storage.foldername(name))[1] = auth.uid()::text);