-- Run through the database read-query tool. Every case must pass.
WITH clips(storage_path, user_id) AS (
  VALUES ('uploader/video.mp4', 'uploader')
), cases(label, bucket_id, name, expected) AS (
  VALUES
    ('Everyone can watch a listed clip', 'community-clips', 'uploader/video.mp4', true),
    ('Unlisted videos cannot be watched', 'community-clips', 'uploader/hidden.mp4', false),
    ('Other buckets are not granted access', 'private-files', 'uploader/video.mp4', false)
)
SELECT label,
  (bucket_id = 'community-clips' AND EXISTS (
    SELECT 1 FROM clips AS clip
    WHERE clip.storage_path = cases.name
      AND split_part(cases.name, '/', 1) = clip.user_id
  )) = expected AS passed
FROM cases;