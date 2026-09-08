# Warden Network

The official website for **Warden Network** — a Minecraft server network spanning multiple game modes, plugins, community, and a store with membership ranks.

**Version:** Unversioned rolling release — changes are tracked by date in the [Changelog](/changelog) and `public/release-notes.json` rather than a semver number. `package.json` intentionally stays at `0.0.0`.

**Live URLs:**
- [warden.rip](https://warden.rip) (primary)
- [carnagemc.net](https://carnagemc.net)
- [alsnetwork.fun](https://alsnetwork.fun)
- [xylomc.net](https://xylomc.net)
- [zyphoramc.net](https://zyphoramc.net)
- [wardennetwork.lovable.app](https://wardennetwork.lovable.app)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + shadcn/ui |
| State / Data | TanStack Query |
| Backend | Lovable Cloud — Auth, Database, Storage, Edge Functions |
| Routing | React Router DOM |
| Notifications | Sonner + shadcn Toaster + in-app Notifications bell |
| SEO | react-helmet-async |

---

## Brand

The project is branded **Warden Network**, using a deep-teal-to-cyan palette (`#005155`–`#0082A2`) with the Warden guardian icon as the logo mark. Logo assets live at `src/assets/warden-network-logo.png` (horizontal lockup) and `src/assets/warden-network-icon.png` (standalone mark).

---

## Public Pages

| Page | Route | Description |
|------|-------|-------------|
| **Home** | `/` | Hero, live server status, player count, Discord member count, event countdown, feature highlights, latest news, reviews |
| **News** | `/news` | News/announcement feed with article cards and cover banners |
| **News Article** | `/news/:slug` | Full article view with SEO metadata |
| **Store** | `/store` | Membership tiers, packages, and store categories |
| **Store Category** | `/store/category/:slug` | Filtered store listing |
| **Store Package** | `/store/package/:id` | Individual package detail |
| **Checkout** | `/checkout` | Cart, store-wide sale, coupon, order confirmation |
| **Membership Tiers** | `/tiers` | Rank comparison and purchase |
| **Plugins** | `/plugins` | Server plugins directory with version history |
| **Plugin Detail** | `/plugins/:slug` | Individual plugin page with downloads |
| **Plugin Settings** | `/plugins/:slug/settings` | Owner/admin plugin management |
| **Modrinth Plugins** | `/modrinth-plugins` | Browse Modrinth plugins |
| **Servers** | `/servers` | Server listing |
| **Server Detail** | `/server/:slug` | Individual server page |
| **Skripts** | `/skripts` | Skript listing |
| **Skript Detail** | `/skripts/:id` | Individual skript page |
| **Commands** | `/commands` | Server command reference |
| **Game Modes** | `/gamemodes` | Game mode showcase |
| **Game Mode Detail** | `/gamemodes/:slug` | Individual game mode page |
| **Seasons** | `/seasons` | Server seasons with real data |
| **Leaderboard** | `/leaderboard` | Server leaderboards linking to player profiles |
| **Wiki** | `/wiki` | Wiki hub |
| **Wiki Article** | `/wiki/:slug` | Individual wiki article |
| **Gallery** | `/gallery` | Community screenshot gallery |
| **News/Events** | `/events` | Server events calendar |
| **Features** | `/features` | Server features showcase |
| **Feature Detail** | `/features/:slug` | Individual feature page |
| **Changelog** | `/changelog` | Server update changelog |
| **Changelog Entry** | `/changelog/:slug` | Individual changelog entry |
| **Release Notes** | `/release-notes` | Release notes feed |
| **Status** | `/status` | Uptime status page with incidents |
| **Status Incident** | `/status/:number` | Individual incident detail |
| **Staff** | `/staff` | Staff team roster with roles and bios |
| **Users** | `/users` | Community member listing |
| **User Profile** | `/user/:slug` | Public player profiles |
| **Org Profile** | `/org/:slug` | Organization profile |
| **Org Settings** | `/org/:slug/settings` | Organization settings |
| **Profile** | `/profile` | User profile settings, Discord linking, MC username |
| **Dashboard** | `/dashboard` | User account dashboard with stats |
| **Me — Account** | `/me` | Account settings |
| **Me — Status** | `/me/status` | Order/ticket status |
| **Me — Orders** | `/me/orders` | Order history |
| **Me — Wishlist** | `/me/wishlist` | Saved items |
| **Vote** | `/vote` | Server voting links with streak tracking |
| **Community** | `/community` | Discord integration, community highlights |
| **Discord** | `/discord` | Discord server landing |
| **Discord Bot** | `/bot` | Discord bot features and setup |
| **Punishments** | `/punishments` | Public punishment lookup |
| **Ban Appeals** | `/appeal` | Ban appeal submission |
| **Apply** | `/apply` | Staff/builder/content creator applications |
| **Link Account** | `/link-account` | Discord account linking flow |
| **Partners** | `/partners` | Partner network listing |
| **Partner Detail** | `/partners/:slug` | Individual partner page |
| **Fire Market** | `/fire-market` | In-game market |
| **Quiz** | `/quiz` | Community quizzes |
| **Quiz Take** | `/quiz/:slug` | Take a quiz |
| **Quiz Leaderboard** | `/quiz/:slug/leaderboard` | Quiz leaderboards |
| **Quiz Result** | `/quiz/:slug/result/:attemptId` | Quiz attempt result |
| **Live** | `/live` | Live stream page |
| **Map** | `/map` | Server map |
| **Install** | `/install` | Installation guide |
| **Contact** | `/contact` | Contact form |
| **Trust** | `/trust` | Trust center |
| **FAQ** | `/faq` | Frequently asked questions |
| **Rules** | `/rules` | Server rules (editable by admins) |
| **Support** | `/support` | Support center with ticket creation |
| **Tickets** | `/tickets` | User ticket dashboard |
| **Search** | `/search` | Global site search |
| **Site Index** | `/sitemap` | Full site map / A-Z index |
| **Staff Chat** | `/staffchat` | Staff-only chat |
| **Subscribe** | `/subscribe` | Email newsletter signup |
| **Unsubscribe** | `/unsubscribe` | Email unsubscribe |
| **Privacy** | `/privacy` | Privacy policy |
| **Terms** | `/terms` | Terms of service |
| **Refund** | `/refund` | Refund policy |
| **Auth** | `/auth` | Sign up / Log in |
| **Reset Password** | `/reset-password` | Password reset |
| **Content Pages** | `/guides`, `/how-to-join`, `/about`, `/roadmap`, etc. | CMS-driven content pages |

Retired/legacy URLs (e.g. `/mods`, `/ranks-comparison`, `/glossary`, `/hall-of-fame`) redirect to their nearest real destination to keep old links alive.

---

## Admin Panel (`/admin`)

Role-based access control with 40+ sections. Admin users see an **Admin** button in the navbar.

| Section | Description |
|---------|-------------|
| **Dashboard** | Stats: total users, admins, news posts, live server status |
| **Users** | Create, edit, delete users; promote/demote admins |
| **Roles** | Assign roles to members (staff ranks + membership ranks) |
| **Permissions** | Define what each role can do (owner-only) |
| **News** | Create, edit, publish/unpublish announcements with cover banners |
| **Site Content** | Edit hero text, server IP, Discord URL, popup announcements, alerts |
| **Site Pages** | Manage CMS content pages (guides, about, roadmap, etc.) |
| **Server Status** | Manually override the live status display |
| **Support Tickets** | Triage and reply to user tickets |
| **Admin Logs** | Audit trail of admin role checks |
| **Plugins** | Add, edit, remove server plugins |
| **Changelog** | Publish server updates by date and category |
| **Applications** | Review staff/builder/content creator applications |
| **Apply Types** | Configure application types |
| **Features** | Add, edit, reorder features shown on the home page |
| **Rules** | Edit the rules sections on the public Rules page |
| **FAQs** | Manage FAQ entries (questions, answers, categories) |
| **Events** | Create and manage server events |
| **Seasons** | Manage server seasons |
| **Maintenance** | Toggle maintenance mode and set a custom message |
| **Store** | Manage store packages, categories, sale coupons, and store-wide sales |
| **Membership Tiers** | Create and edit purchasable ranks (Guardian, Sentinel, Warden, Ascendant, etc.) |
| **Player Tiers** | Manage player tier assignments |
| **Vote Links** | Configure server voting links |
| **Partners** | Manage partner network |
| **Game Modes** | Manage game mode showcase |
| **Wiki** | Manage wiki articles |
| **Gallery** | Manage community gallery |
| **Contact** | Review contact submissions |
| **Ban Appeals** | Triage ban appeals |
| **Reports** | Review user reports |
| **Punishments** | View and manage punishments (Litebans MySQL) |
| **Quizzes** | Create and manage community quizzes |
| **Console** | Send console commands to game servers (MC bridge) |
| **MySQL** | Query the Litebans MySQL database |
| **Servers Status** | Monitor all network servers |
| **Server Panel** | Configure server MOTD and settings |
| **Account Removals** | Process account deletion requests |
| **Tab Animations** | Configure homepage tab animations |
| **Skripts** | Moderate community skripts |
| **Email — Test** | Send test auth emails |
| **Email — Send** | Compose and send custom emails |
| **Email — Diagnostics** | Diagnose email delivery issues |
| **Discord Bot — Dashboard** | Bot status and overview (owner-only) |
| **Discord Bot — Management** | Configure commands and bot integration (owner-only) |
| **Discord Bot — Config** | Discord bot configuration (owner-only) |
| **Moderation Tools** | Moderate skripts, servers, mods, and reviews |

---

## Authentication & Roles

- Email/password authentication with email verification
- Google OAuth sign-in/sign-up
- Discord account linking for rank sync
- Role-based access control (`user_roles` table with `has_role()` security definer function)
- Admin protection via RLS policies
- Device verification for sensitive actions

### Roles

The site supports both **staff roles** and **website membership ranks**:

**Staff:** Founder, Owner, Manager, Developer, SrAdmin, Admin, SrMod, Mod, SrHelper, Helper, Builder, Media

**Membership ranks** (purchasable in the store, grant a website badge instantly at checkout): Ascendant 🌟, Warden 🛡️, Sentinel ⚔️, Guardian 🔰, Titan 🗿

---

## Database Tables (Public Schema)

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (display name, MC username, avatar) |
| `user_roles` | Role assignments (staff + membership ranks) |
| `news` | News/announcement posts with cover images |
| `site_content` | Editable site config (hero, server IP, alerts, popup, store sale) |
| `server_status` | Cached server status for admin dashboard |
| `admin_check_logs` | Audit log for admin access checks |
| `plugins` | Server plugins directory |
| `plugin_versions` | Plugin version history with jar files |
| `changelogs` | Server update changelog entries |
| `applications` | Staff/builder/content creator applications |
| `features` | Homepage feature highlights |
| `rules` | Rule sections |
| `faqs` | FAQ entries |
| `events` | Server events |
| `tickets` | Support tickets |
| `mods` | Mod `.jar` files and metadata |
| `membership_tiers` | Purchasable membership ranks |
| `store_packages` | Store packages and categories |
| `store_coupons` | Discount coupons |
| `servers` | Network server definitions |
| `skripts` | Community skripts |
| `gamemodes` | Game mode definitions |
| `seasons` | Server seasons |
| `wiki_articles` | Wiki content |
| `gallery_items` | Community gallery submissions |
| `partners` | Partner network |
| `vote_links` | Server voting links |
| `quizzes` | Community quizzes |
| `punishments` | Punishment records (synced from Litebans) |
| `notifications` | In-app notifications |
| `organizations` | User organizations |

---

## Edge Functions

| Function | Purpose |
|----------|---------|
| `admin-create-user` | Admin user creation |
| `admin-delete-user` | Admin user deletion |
| `admin-send-broadcast` | Broadcast messages to users |
| `admin-test-auth-email` | Test auth email flow |
| `admin-update-user-email` | Admin email update |
| `auth-email-hook` | Auth email customization hook |
| `changelog-discord-post` | Post new changelog to Discord |
| `device-verify` | Device verification flow |
| `discord-bot-action` | Execute Discord bot actions |
| `discord-bot-test` | Test Discord bot connection |
| `discord-interactions` | Discord slash command handler |
| `discord-invite` | Resolve Discord invite URLs to member counts |
| `discord-link-callback` | Discord account linking callback |
| `discord-link-start` | Start Discord account linking |
| `discord-register-commands` | Register Discord slash commands |
| `discord-sync-user-roles` | Sync Discord roles to website |
| `email-diagnostics` | Email delivery diagnostics |
| `handle-email-events` | Process email webhook events |
| `handle-email-subscribe` | Handle email subscriptions |
| `litebans-mysql-health` | Litebans database health check |
| `litebans-mysql-query` | Query Litebans punishments |
| `maintenance-notify` | Broadcast maintenance status |
| `mc-bridge-poll` | Poll MC bridge plugin for server state |
| `mc-console-send` | Send console commands to game server |
| `mcp` | MCP (Model Context Protocol) server |
| `notify-application-discord` | Notify Discord on new application |
| `notify-changelog` | Email changelog subscribers |
| `notify-new-mod` | Notify Discord on new mod upload |
| `notify-new-report` | Notify staff on new report |
| `notify-news` | Email news subscribers |
| `og-image` | Dynamic OG image generation |
| `plugin-file-url` | Generate signed plugin download URLs |
| `preview-transactional-email` | Preview transactional email templates |
| `punishments-lookup` | Public punishment lookup |
| `refresh-server-status` | Refresh cached server status |
| `send-app-email` | Send transactional emails (order confirmation, etc.) |
| `send-application-status-email` | Application status notification email |
| `server-panel-status` | Server panel status check |
| `twitch-status` | Twitch live status |
| `unsubscribe-news` | Unsubscribe from news emails |
| `uptime-check` | Uptime monitoring |
| `website-log-event` | Log website events (auth-gated) |
| `website-webhook-test` | Test webhook integration |

---

## Key Features

### Homepage
- Live server status via [mcsrvstat.us](https://api.mcsrvstat.us) API
- Discord member count polling (via edge function)
- Animated particle background + mouse trail
- IP copy-to-clipboard with visual feedback
- Popup announcements (configurable in admin)
- Online/offline alerts (configurable in admin)
- Event countdown timer
- Animated stat counters
- Player reviews carousel
- Global sale bar (store-wide discounts)

### Store & Membership Ranks
- Store with packages, categories, and coupons
- Store-wide sales (no code needed) with countdown banner
- Membership tiers that grant website ranks instantly at checkout
- Cart drawer with live sale + coupon calculation
- Order confirmation emails with sale breakdown

### Plugins System
- Public `/plugins` page with filtering by loader, MC version, and tags
- Version history with downloads for logged-in and anonymous visitors
- Admin `/admin?tab=plugins` for managing plugins
- Featured/published toggles
- Modrinth integration for browsing external plugins

### Moderation & Infrastructure
- Punishment lookup (Litebans MySQL sync)
- Ban appeals workflow
- Server console bridge (send commands from admin panel)
- Server panel status monitoring
- Maintenance mode with custom message
- Account removal requests

### Discord Integration
- Discord account linking for rank sync
- Discord bot with slash commands
- Member count polling
- Auto-post changelog and news to Discord

### Design
- Dark theme with teal/cyan gradient accents
- Custom `font-display` typography
- Glassmorphism cards + glow effects
- Responsive sidebar navigation on mobile
- SEO-optimized with `react-helmet-async`
- Branded 404 page

---

## Environment Variables

Configured automatically by Lovable Cloud:

```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
```

---

## Development

```bash
# Install dependencies
bun install

# Start dev server
bun run dev

# Build for production
bun run build

# Run tests
bun run test
```

---

## Project Structure

```
src/
├── pages/              # Route pages (public + admin)
├── components/
│   ├── admin/          # Admin panel sections
│   ├── site/           # Shared site components (Navbar, Footer, SEO, etc.)
│   ├── dashboard/      # User dashboard panels
│   └── ui/             # shadcn/ui components
├── lib/                # Hooks, auth, utilities, roles, permissions, cart, store sale
├── integrations/
│   └── supabase/       # Backend client (auto-generated)
└── App.tsx             # Router + providers

supabase/
├── config.toml         # Backend config (auto-generated)
└── functions/          # Edge functions (40+)
    └── _shared/        # Shared utilities across functions

mc-bridge-plugin/       # Spigot/Paper plugin bridging console + status to the backend
```

---

## `data/plugins.json`

A committed snapshot of every **published** row from the `plugins` table, so the plugin catalog is visible directly on GitHub (not only in the live database).

**Shape:**

```json
{
  "generatedAt": "2026-07-01T00:00:00Z",
  "count": 15,
  "plugins": [
    { "id": "...", "slug": "advancedrtp", "name": "AdvancedRTP", "version": "2.0.3", ... }
  ]
}
```

Internal storage paths (`jar_path`) are stripped; public download URLs (`download_url`) are kept.

**How to stay in sync:** the file is a manual export, not live data. Regenerate it whenever plugins are added, edited, or unpublished — ask the assistant *"Regenerate data/plugins.json"* or run the SQL query in the previous version against the backend. The live source of truth remains the `plugins` table at `/plugins` and `/admin?tab=plugins`.

---

## Custom Domains

The project is deployed with multiple custom domains pointing to the same build:
- `warden.rip` (primary)
- `carnagemc.net`
- `alsnetwork.fun`
- `xylomc.net`
- `zyphoramc.net`

---

Built with [Lovable](https://lovable.dev).
