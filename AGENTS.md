# Project architecture
- Discord status panels are service-only per-channel records; signed Manage Server interactions configure them, and the existing uptime check refreshes their messages without a separate polling job.
- Support uses the existing private ticket and message tables and Admin ticket inbox; a dedicated authenticated submission function validates, saves and sends one fixed owner notification, while database triggers validate and rate-limit all insert paths.
- Profile appearance previews never write browser storage; only successful preference saves commit them, and profile exit restores saved appearance. Palette tokens live in global CSS and are hydrated from private account preferences on sign-in.
- Personal themes store validated hex colors in private preferences; the theme color module converts them into root CSS tokens and computes contrasting foregrounds, never accepting user CSS.
- Discord rules messages and slash-command replies share one formatter and read published website rule sections, so both channels stay consistent.

- Profile photo uploads use the existing public `plugin-screenshots` media bucket under each authenticated user ID; storage ownership rules already restrict writes to that folder, and public profile images need public URLs.
- WebM selections become a still PNG frame before upload because profile photos throughout the app are rendered as images.
- Organization membership management policies use `is_org_owner(org_id)` rather than directly reading `organizations`, so ownership checks remain valid when organization table permissions are restricted.
- Server-side notifiers call `send-app-email` with the project's own key, and that function trusts an exact match of it as well as a `service_role` JWT claim, because newer API keys are not JWTs and the JWT-only check silently rejected every bulk send.
- WardenBot's "online" presence is kept by the `discord-presence` edge function: it opens a ~55s gateway session with a custom status, and the pg_cron job `discord-presence-keepalive` calls it every minute (with a 60s pg_net timeout — shorter timeouts abort the held session), so overlapping sessions keep the bot green. Status text lives in `PRESENCE_TEXT` in that function.
- Images the site displays are imported from `src/assets` as real files, not Lovable CDN pointer JSON, because the preview server answers `/__l5e/assets-v1/...` with the app HTML instead of the image.
