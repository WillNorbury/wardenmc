ALTER POLICY "Public clip playback" ON storage.objects USING (
  bucket_id = 'community-clips'
  AND EXISTS (
    SELECT 1 FROM public.community_clips AS clip
    WHERE clip.storage_path = storage.objects.name
      AND split_part(storage.objects.name, '/', 1) = clip.user_id::text
  )
);
COMMENT ON POLICY "Public clip playback" ON storage.objects IS 'Public playback is intentional only for website-listed community clips whose storage folder matches the metadata uploader; unlisted files are not readable.';