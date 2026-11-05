DROP POLICY IF EXISTS "Public clip playback" ON storage.objects;
CREATE POLICY "Members read own clip videos" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'community-clips' AND (storage.foldername(name))[1] = (auth.uid())::text);