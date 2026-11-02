# WardenMC / Warden Network

The official website for **Warden Network** — a Minecraft community and plugin directory with a server listing, game modes, organizations, community clips and streams, a Discord bot, staff applications, partner listings, player support and an admin panel.

**Version:** rolling release. Changes are dated in the [Changelog](https://warden.rip/changelog) (`changelog_entries`) and `public/release-notes.json`; `public/version.json` carries a per-build stamp written by `scripts/generate-version.ts`. `package.json` carries a tracking version (`5.15.7`) and is not a release tag.

**Live URLs:**

- [warden.rip](https://warden.rip) — primary
- [www.warden.rip](https://www.warden.rip)
- [carnagemc.net](https://carnagemc.net)
- [wardennetwork.lovable.app](https://wardennetwork.lovable.app) — published build

Sitemap is generated from public routes only and always points at `https://warden.rip` (see [Sitemap & SEO](#sitemap--seo)).

---

## Tech Stack

| Layer         | Technology                                                              |
| ------------- | ----------------------------------------------------------------------- |
| Frontend      | React 18 + TypeScript + Vite 5                                          |
| Styling       | Tailwind CSS 3 + shadcn/ui (Radix primitives)                           |
| State / Data  | TanStack Query                                                          |
| Backend       | Lovable Cloud — Auth, Postgres, Storage, Edge Functions, pg_cron        |
| Routing       | React Router DOM (single `src/App.tsx` router)                          |
| Notifications | Sonner + shadcn Toaster + in-app notifications bell                     |
| SEO           | react-helmet-async + generated `public/sitemap.xml`, `robots.txt`, OG   |
| Tests         | Vitest (`src/test/`), plus Playwright checks against the running preview |

---

## Brand & Design

Branded **Warden Network**, shown in the UI as **WARDENMC**. Deep-teal-to-cyan palette (`#005155`–`#0082A2`) with the Warden guardian icon as the logo mark (`src/assets/warden-network-logo.png`, `src/assets/warden-network-icon.png`).

- Dark theme with teal/cyan gradient accents, glassmorphism cards, glow effects
- `font-display` heading typography
- Custom site-wide mouse pointer (`src/components/site/CustomCursor.tsx`), mounted once at app level through a body portal, with theme-token effects and native fallbacks for touch and text editing
- Sidebar scrollbar is hidden on every part of the menu (desktop rail and the phone slide-in sheet)
- Every page that renders the fixed site `Navbar` offsets its content below the bar (`pt-24` or more) so nothing at the top is clicked through to the logo or account controls
- Responsive: sidebar collapses to an icon rail on desktop and a slide-in sheet on phones; the header respects `env(safe-area-inset-top)` for iPhone home-screen installs
- SEO-optimized per page with `react-helmet-async`; branded 404 page

---

## Public Pages

Routes live in `src/App.tsx`; the sidebar grouping lives in `src/components/site/AppSidebar.tsx`; the sitemap list lives in `scripts/generate-sitemap.ts`.

### Home & community

| Page            | Route                          | Notes                                                                                     |
| --------------- | ------------------------------ | ----------------------------------------------------------------------------------------- |
| Home            | `/`                            | Hero, live server status, player count, Discord members, newest members, live/clip content  |
| Community hub   | `/community`                   | Community landing hub                                                                      |
| Members         | `/users` (alias `/members`)    | Public member directory, signups and recently joined                                       |
| Member profile  | `/user/:slug`, `/user/:slug/:tab` | Public profile: avatar, badges, activity tabs                                           |
| Staff           | `/staff`                       | Staff roster                                                                              |
| Partners        | `/partners`, `/partners/:slug` | Partner listings with searchable cards and configurable website + Discord invite links     |
| Posts           | `/posts`, `/post`              | Community post feed and post composer                                                      |
| Search          | `/search`                      | Grouped, shareable site-wide results                                                       |

### Browse

| Page             | Route                                             | Notes                                                   |
| ---------------- | ------------------------------------------------- | ------------------------------------------------------- |
| Servers          | `/servers`                                        | Server directory                                        |
| Server detail    | `/server/:slug` (alias `/servers/:slug`)          | Individual server page                                  |
| Game modes       | `/gamemodes`, `/gamemodes/:slug`                  | Game mode showcase and detail pages                     |
| Plugins          | `/plugins`                                        | Plugin directory with filtering                         |
| Plugin detail    | `/plugin/:slug` (alias `/plugins/:slug`)          | Plugin page with version history and downloads          |
| Plugin settings  | `/plugin/:slug/settings` (alias `/plugins/...`)    | Owner/admin plugin management                           |
| Categories       | `/plugins/categories`                             | Plugin category index                                   |
| Developers       | `/plugins/developers`                             | Plugin developer index                                  |
| Organizations    | `/organizations`                                  | Organization directory with search and creation         |
| Organization     | `/organization/:slug` (alias `/org/:slug`)        | Organization profile: avatar, description, plugins, members |
| Org settings     | `/organization/:slug/settings` (alias `/org/...`) | Owner-only edit + member management                     |

### Streaming & media

| Page    | Route    | Notes                                                                                     |
| ------- | -------- | ----------------------------------------------------------------------------------------- |
| Live    | `/live`  | Stream player/chat for WillNorbury and SpectorDev, with clip recaps filtered to 24h / 7d / 30d |
| Clips   | `/clips` | Community clip uploads with a built-in video player, search, "My clips", shareable `?clip=` links |

### Help & info

| Page          | Route                              | Notes                                                              |
| ------------- | ---------------------------------- | ------------------------------------------------------------------ |
| Support       | `/support`                         | Player Support Centre: category cards, ticket form, replies, My Tickets, published FAQs |
| FAQ           | `/faq`                             | FAQ entries with voting                                             |
| Rules         | `/rules`                           | Five-section community code of conduct                              |
| Punishments   | `/punishments`, `/punishments/:player` | Public ban/mute/warning/kick lookup by username or UUID, with an appeal link to `/support` |
| Status        | `/status`                          | WardenMC status: WardenBot, Minecraft servers/players, incidents    |
| Incident      | `/status/:number`                  | Individual incident detail                                          |
| Unsubscribe   | `/status/unsubscribe`              | Status-alert unsubscribe                                            |
| Changelog     | `/changelog`                       | Dated changelog entries                                             |

### Discord & bot

| Page         | Route           | Notes                                                                 |
| ------------ | --------------- | --------------------------------------------------------------------- |
| Discord      | `/discord`      | Discord invite page (`/server` also lands here)                       |
| Yapin'       | `/yapin` (alias `/yapper`) | Yapin' community page → `https://yapin.gg/invite/wardenmc`   |
| Bot          | `/bot`          | WardenBot invite page, description, links, bot dashboard link         |
| Bot commands | `/bot/commands` | Public command directory                                              |
| Bot status   | `/bot/status`   | WardenBot + Minecraft status and active incidents                     |

### Apply & account

| Page           | Route                              | Notes                                                          |
| -------------- | ---------------------------------- | -------------------------------------------------------------- |
| Apply          | `/apply`, `/apply/:slug`           | Staff/builder/creator applications by type                     |
| My applications| `/applications`, `/applications/:id` | Signed-in submission stages and details (staff notes stay private) |
| Sign in        | `/auth`                            | Email/password, Google, 2FA, device verification               |
| Reset password | `/reset-password`                  | Password reset                                                 |
| Dashboard      | `/dashboard`                       | Signed-in member dashboard (profile, applications, tickets, streaks, uploads) |
| Profile        | `/profile`                         | Profile editor: avatar, appearance/themes, 2FA, links          |
| Cart           | `/cart`                            | Client-side cart: quantities, remove, coupon, totals           |
| Checkout       | `/checkout`                        | Order summary + note → creates a private support ticket staff reply to |
| 404            | `/404`, `*`                        | Branded not-found page                                         |

### Retired public pages

`/store`, `/tiers`, `/news`, `/wiki`, `/gallery`, `/quizzes`, `/leaderboard`, `/events`, `/features`, `/seasons`, `/commands`, `/skripts`, `/modrinth-plugins`, `/release-notes` are **not** routed any more. Their tables and admin tools may still hold data; old links fall through to the 404 page. `src/test/removed-routes.test.ts` lists routes that must stay absent — restoring a route means removing it from that list.

---

## Admin Panel (`/admin`)

Role-gated; staff see an **Admin** button in the navbar. `/admin/*` redirects unknown tabs to the dashboard instead of erroring. Sections are declared once in `src/components/admin/AdminLayout.tsx` (`ADMIN_SECTIONS`) and rendered from `src/pages/Admin.tsx`; `src/test/admin-sections.test.ts` keeps retired tabs resolving to the dashboard.

| Group        | Sections                                                                                             |
| ------------ | ---------------------------------------------------------------------------------------------------- |
| Overview     | Network Overview, Admin Logs, Sign-up Funnel                                                          |
| People       | Network Members, Roles, Permissions, Deleted / Banned Accounts                                        |
| Content      | News, Site Content, Site Pages, Site database, FAQs, Rules, Events, Features, Game Modes, Seasons, Changelog |
| Store        | Store, Order Inbox, Membership Tiers, Player Tiers, Vote Links, Partners, Tab Animations              |
| Infrastructure | Server Status, Servers (Public Status), Alert Settings, Maintenance, Server Panel, Console          |
| Moderation   | Support Tickets, Ban Appeals, Punishments, Reports, Applications, Apply (types)                        |
| Data tools   | LiteBans MySQL (owner-only writes), Site database                                                     |
| Email        | Email Test, Send Email, Live Email Draft, Email Diagnostics, Contact                                   |
| Discord bot  | Bot Dashboard, Management, Commands & Templates                                                       |
| Moderation queues | Community Skripts, Community Servers, Mods, Reviews                                              |

Retired Admin sections (**Wiki**, **Gallery**, **Quizzes**) were removed from the section type, registry, navigation and renderer together; saved records were not deleted.

Owner-only guardrails: LiteBans writes require the owner account with an explicit confirmation, and destructive actions (e.g. account deletion) surface the backend's real rejection reason instead of a generic error.

---

## Authentication, Devices & Roles

- Email/password with email verification, plus **Continue with Google**
- **Two-factor (TOTP)** is required after password sign-in for enrolled accounts; Google sign-in skips that gate. Enrol/manage it in `src/components/profile/TwoFactorCard.tsx`
- **Device verification**: untrusted devices are challenged; a verified device stays trusted for 30 days (`trusted_devices`, `login_verifications`)
- Discord account linking for rank sync (`discord_link_states`, `discord-sync-user-roles`)
- Roles live in `public.user_roles` and are read through `has_role()` — never stored on `profiles`. `src/lib/roles.ts` is the source of truth for the 30 role values; `STAFF_ROLES` marks the staff subset used for admin access
- Staff ranks: Founder, ★, Owner, Management, Discord Manager, Sr/Manager, Dev Team, Head Developer, Developer, Admins/Sr Admin/Admin, Mods/Sr Mod/Mod, Helpers/Sr Helper/Helper, Trainee, Builder, Beta Tester, Partner, Media
- Website ranks: VIP ⭐, Ascendant 🌟, Warden 🛡️, Sentinel ⚔️, Guardian 🔰, plus Member

---

## Database (public schema)

~100 tables in `public`. The main ones:

| Area | Tables |
| ---- | ------ |
| Accounts | `profiles`, `profiles_private`, `user_roles`, `custom_roles`, `user_custom_roles`, `trusted_devices`, `login_verifications`, `account_removal_log` |
| Content | `news`, `site_content`, `site_pages`, `faqs`, `faq_votes`, `faq_vote_counts`, `rule_sections`, `features`, `events`, `seasons`, `changelog_entries`, `posts`, `post_likes`, `issues`, `issue_comments`, `issue_votes` |
| Plugins & mods | `plugins`, `plugin_versions`, `plugin_downloads`, `plugin_favorites`, `mods`, `mod_reviews`, `mod_likes`, `mod_saves`, `admin_skripts`, `user_skripts` |
| Servers | `mc_servers`, `mc_public_servers`, `user_servers`, `server_status`, `server_maps`, `server_panel_settings`, `tab_animations`, `discover_items` |
| Store | `store_categories`, `store_items`, `store_coupons`, `store_wishlists`, `membership_tiers`, `player_tiers`, `vote_links`, `creator_codes`, `user_affiliates` |
| Community | `organizations`, `organization_members`, `organizations_public`, `partners`, `user_follows`, `user_reports`, `item_reviews`, `reviews`, `player_stats`, `user_streaks`, `notifications`, `community_clips`, `gallery_items` |
| Support & moderation | `support_tickets`, `support_ticket_messages`, `applications`, `application_types`, `ban_appeals`, `contact_messages`, `contact_methods`, `discord_bot_action_logs` |
| Discord bot | `discord_custom_commands`, `discord_guild_reply_texts`, `discord_guild_module_settings`, `discord_status_panels`, `discord_apply_settings`, `discord_link_states`, `discord_bot_action_logs` |
| Uptime & email | `uptime_checks`, `uptime_incidents`, `status_subscribers`, `alert_settings`, `email_send_log`, `email_send_state`, `email_template_overrides`, `email_unsubscribe_tokens`, `suppressed_emails`, `allowed_from_addresses`, `news_email_deliveries`, `news_email_opt_outs`, `website_webhook_deliveries`, `funnel_events` |
| Bridge | `mc_console_commands`, `mc_console_logs`, `litebans_mysql_config` |

All application tables are in `public` with RLS enabled. New tables store user IDs as plain UUIDs or reference `public.profiles`.

---

## Storage Buckets

| Bucket              | Public | Limit  | Used for                                                    |
| ------------------- | ------ | ------ | ----------------------------------------------------------- |
| `plugin-jars`       | no     | 100 MB | Plugin `.jar`/zip downloads (served via `plugin-file-url`)   |
| `plugin-screenshots`| yes    | —      | Plugin screenshots **and** member profile photos per user ID |
| `community-clips`   | no     | 50 MB  | Uploaded clips; playback uses short-lived signed URLs         |
| `news-covers`       | yes    | —      | News cover banners                                            |
| `mod-jars`, `skripts`, `user-skripts`, `resource-packs`, `mc-bridge-jars` | no | — | Mod files, skripts, resource packs, bridge jars |

Clip playback requires the storage path to match a listed `community_clips` row whose folder is the uploader's user ID, so unlisted files and other buckets stay blocked. Writes are uploader-only.

---

## Edge Functions

| Group | Functions |
| ----- | --------- |
| Admin | `admin-create-user`, `admin-delete-user`, `admin-update-user-email`, `admin-send-broadcast`, `admin-test-auth-email`, `litebans-mysql-health`, `litebans-mysql-query`, `mc-console-send` |
| Auth & email | `auth-email-hook`, `device-verify`, `send-app-email`, `preview-transactional-email`, `handle-email-events`, `handle-email-subscribe`, `unsubscribe-news`, `email-diagnostics` |
| Discord bot | `discord-interactions` (slash commands), `discord-register-commands`, `discord-bot-action`, `discord-bot-invite`, `discord-bot-test`, `discord-presence`, `discord-supporter-role`, `discord-sync-user-roles`, `discord-link-start`, `discord-link-callback`, `discord-invite`, `discord-modules-api`, `discord-reply-texts-api`, `bot-status` |
| Status & uptime | `uptime-check`, `refresh-server-status`, `server-panel-status`, `twitch-status`, `punishments-lookup` |
| Notifications | `notify-changelog`, `notify-news`, `notify-post`, `notify-new-mod`, `notify-new-report`, `notify-application-discord`, `changelog-discord-post`, `maintenance-notify`, `mcp` |
| Site tools | `generate-business-bio`, `plugin-file-url`, `skript-file-url`, `submit-support`, `website-log-event`, `website-webhook-test`, `og-image` |

Shared helpers live in `supabase/functions/_shared/` (Discord command catalog, reply texts, deferred-reply helpers, moderation log classifier, uptime services).

### Scheduled jobs (pg_cron)

| Job | Schedule | Calls |
| --- | -------- | ----- |
| `refresh-server-status` | every minute | `refresh-server-status` |
| `discord-presence-keepalive` | every minute | `discord-presence` (REST only, 55s hold) |
| `uptime-check-every-5min` | every 5 min | `uptime-check` |
| `discord-status-update` | every 5 min | `discord-bot-action` (`action: status`) |
| `discord-supporter-role-sync` | hourly at :17 | `discord-supporter-role` |

The keepalive is REST-only on purpose: it must never open a gateway session, because minute-by-minute Identify calls exhaust Discord's session-start allowance and got the bot's token reset. Continuous online presence and rotating statuses need one persistent external gateway client, which this project does not host.

---

## WardenBot (Discord)

WardenBot is the site's Discord bot, driven entirely by edge functions (no gateway host):

- Slash commands answer through `discord-interactions`, which acknowledges **privately** before doing network work; private results edit the original message, public results resolve the defer and post a **public** follow-up, deleting the private placeholder only after success
- Per-server custom reply commands live in `discord_custom_commands` (service-role only), registered as guild commands by REST, and are answered only after every built-in and admin-configured command so they can never shadow WardenBot's own commands
- Reply texts come from one shared list: defaults in `supabase/functions/_shared/discord-reply-texts.ts`, global overrides in `site_content` key `discord_command_replies` (Admin → Bot → Reply texts), per-server overrides in `discord_guild_reply_texts` merged last; `src/lib/discord-reply-texts.ts` mirrors the defaults
- Per-server Welcome/Reaction Roles/AutoMod settings live in `discord_guild_module_settings`; AutoMod saves also sync Discord's native Auto Moderation rules so enforcement works without a gateway session
- External dashboards may only edit reply texts via `discord-reply-texts-api` (caller's own Discord OAuth token, verified against Discord that they own/manage that guild) and module settings via `discord-modules-api` (`x-dashboard-secret` + bot-token permission check)
- Status panels are per-channel service-only records with a validated Minecraft address fetched only from the fixed mcsrvstat provider, refreshed by the keepalive
- `/setapply` + `/apply` publish a per-server application URL with a fallback
- Public status (`/bot/status`, `/status`) treats WardenBot as up only while Discord accepts its stored credentials, and skips the service instead of reporting an outage when no token is saved

---

## Key Features

- **Home** — live server status, player count, Discord member count, newest members, live/clip content, feature highlights, latest changelog and reviews
- **Plugin directory** — filtering by loader/version/tag, version history, downloads for signed-in and anonymous visitors, developer and category indexes, owner-only plugin settings
- **Community clips** — upload MP4/WebM/MOV up to 50 MB, built-in player, search, "My clips", shareable links, uploader-only deletion
- **Live streams** — Twitch player, chat and clip recaps with 24h/7d/30d filters
- **Punishments** — public lookup by username or UUID across bans, mutes, warnings and kicks, with an appeal path into Support
- **Player Support Centre** — category cards that prefill supported topics, private tickets and replies, staff inbox in Admin, published FAQs reused rather than duplicated
- **Organizations** — directory, public profile, owner-only settings and member management
- **Applications** — apply by type, staff review in Admin, applicant-facing status page with private reviewer notes
- **Cart & checkout** — client-side cart that turns an order into a private support ticket staff reply to (no live store page right now)
- **Status page** — WardenBot, Minecraft servers and player counts, incident history, subscriber alerts and unsubscribe
- **Changelog** — dated entries that auto-email subscribers through `notify-changelog` and post to Discord

---

## Environment Variables

Configured automatically by Lovable Cloud (never edit `src/integrations/supabase/client.ts` or `.env`):

```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
```

---

## Development

```bash
bun install        # install dependencies
bun run dev        # dev server (predev regenerates public/sitemap.xml)
bun run build      # production build (regenerates sitemap, checks changelog, stamps version)
bun run test       # vitest run
bun run test:watch # vitest watch mode
bun run lint       # eslint
bun run changelog:check
```

`predev`/`prebuild` run `scripts/generate-sitemap.ts`, `scripts/changelog-check.ts` (validates published changelog entries and rewrites `public/release-notes.json` + `public/RELEASE_NOTES.md`; exits non-zero on bad data so `vite build` aborts) and `scripts/generate-version.ts` (stamps `public/version.json`).

---

## Project Structure

```
src/
├── pages/              # Route pages (public + admin)
├── components/
│   ├── admin/          # Admin panel sections
│   ├── dashboard/      # Signed-in dashboard panels
│   ├── profile/        # Profile cards (avatar, 2FA, themes)
│   ├── site/           # Navbar, Footer, AppSidebar, SEO, CustomCursor, gates
│   └── ui/             # shadcn/ui primitives
├── lib/                # auth, roles, permissions, cart, clips, support, themes, reply texts
├── assets/             # Images the site imports as real files
├── integrations/supabase/  # Auto-generated backend client (do not edit)
├── test/               # Vitest suites + route/section guards
└── App.tsx             # Router + providers

supabase/
├── config.toml         # Backend config (auto-generated)
├── migrations/         # Schema history
└── functions/          # Edge functions
    └── _shared/        # Shared command catalog, reply texts, defer helpers

scripts/                # generate-sitemap, changelog-check, generate-version
data/plugins.json       # Committed snapshot of published plugins
mc-bridge-plugin/       # Spigot/Paper plugin bridging console + status to the backend
public/                 # sitemap.xml, robots.txt, manifest, icons, release-notes.json, version.json
```

---

## Sitemap & SEO

`scripts/generate-sitemap.ts` holds the public-route list and writes `public/sitemap.xml` at `https://warden.rip`. Sign-in, profile, admin and other private screens are left out on purpose. Add or remove a public route → update that list, then regenerate (`bun run dev` or `bun run build` does it). Static social metadata lives in `index.html` (`og:title`, `og:description`, `twitter:card`); per-page titles come from `react-helmet-async`.

---

## `data/plugins.json`

A committed snapshot of every **published** row from the `plugins` table so the catalog is visible on GitHub, not only in the live database. Internal storage paths (`jar_path`) are stripped; public download URLs (`download_url`) are kept. It is a manual export — regenerate it when plugins are added, edited or unpublished. The live source of truth remains the `plugins` table.

---

## Conventions

- `AGENTS.md` (project root) holds the architecture rules that must keep holding — read it before changing tables, Discord handlers, storage, Admin sections or routing.
- `roadmap.md` tracks in-flight work.
- Every meaningful change gets a published `changelog_entries` row, which emails subscribers through `notify-changelog`.
- Retired Admin sections and routes are removed from type, registry, navigation and renderer together, with a guard test.
