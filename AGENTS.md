# Project architecture

- Profile photo uploads use the existing public `plugin-screenshots` media bucket under each authenticated user ID; storage ownership rules already restrict writes to that folder, and public profile images need public URLs.
- WebM selections become a still PNG frame before upload because profile photos throughout the app are rendered as images.
- Organization membership management policies use `is_org_owner(org_id)` rather than directly reading `organizations`, so ownership checks remain valid when organization table permissions are restricted.
