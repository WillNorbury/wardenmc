# WardenMC Plugin Directory Revamp

## Goal
Turn the existing plugin area into a polished discovery ecosystem while preserving the current WardenMC shell, authentication, dashboard management, backend, and plugin detail pages.

## Pages

### `/plugins`
- Replace the current command-deck layout with a restrained dark marketplace layout using existing cyan tokens and orange as a secondary accent.
- Add the requested hero copy and live plugin, download, developer, and category totals.
- Add a large search and complete desktop/mobile filter experience for category, Minecraft version, platform, and verification.
- Support Featured, Most Downloads, Recently Updated, Newest, Highest Rated, and A–Z sorting.
- Read and write the selected category through `?category=` so category pages deep-link into a filtered directory.
- Add three featured cards, a paginated 12-item plugin grid, loading/error/empty states, and a category preview.
- Make favorites work for signed-in users and prompt signed-out visitors to sign in.

### `/plugins/categories`
- Add the requested category directory with real published-plugin counts.
- Include concise category descriptions, a popular-categories strip ranked by live counts, and links back to `/plugins?category=...`.
- Normalize existing free-form plugin categories into the closest requested display category without altering stored plugin records.

### `/plugins/developers`
- Build the developer directory from published plugins joined to their existing owner profiles.
- Add live plugin count, download total, average rating, verified status, avatar/bio, search, and all requested sorting modes.
- Link developers to the existing `/user/:slug` profile route; no new profile or dashboard route will be created.

## Shared Components and Data
- Add focused shared plugin-directory components: `PluginCard`, `FeaturedPluginCard`, `PluginFilters`, `PluginSearch`, `PluginBadge`, `PluginStats`, `CategoryCard`, `DeveloperCard`, and `RatingDisplay`.
- Add a shared typed data loader that combines published plugins with existing profiles, staff/verified roles, download counts, favorites, and review ratings.
- Treat a plugin as verified when its owner profile is verified or its owner has a staff role. Preserve featured from the existing plugin record.
- Since the current schema has no plugin status column, show `Featured` and `Verified` from real data and default other published listings to `Unverified`; do not invent Beta or Archived state.
- Keep canonical card/detail links at `/plugins/<slug-or-short-id>` while retaining the legacy detail route untouched.

## Integration and Validation
- Register only `/plugins/categories` and `/plugins/developers` before the existing dynamic `/plugins/:slug` route.
- Add both pages to the in-app site index and generated sitemap source if applicable.
- Preserve `/dashboard` as the only plugin submission and management experience.
- Verify search, URL category filtering, all sort/filter combinations, favorites, empty states, pagination, developer links, and the unchanged plugin detail page.
- Test desktop, tablet, and mobile layouts, including the mobile filter drawer and stable card sizing.
- Run focused type checks/tests and browser checks.
- Publish a changelog entry and invoke its subscriber notification after the implementation is verified, per project policy.
