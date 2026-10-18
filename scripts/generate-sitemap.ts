// Runs before `vite dev` and `vite build` (predev/prebuild hooks); writes public/sitemap.xml.

import { writeFileSync } from "fs"
import { resolve } from "path"

const BASE_URL = "https://warden.rip"

interface SitemapEntry {
  path: string
  lastmod?: string
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never"
  priority?: string
}

// Only public pages that exist in src/App.tsx. Sign-in, profile, admin and
// other private screens are left out on purpose.
export const entries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/plugins", changefreq: "daily", priority: "0.9" },
  { path: "/plugins/categories", changefreq: "weekly", priority: "0.7" },
  { path: "/plugins/developers", changefreq: "weekly", priority: "0.7" },
  { path: "/gamemodes", changefreq: "weekly", priority: "0.8" },
  { path: "/posts", changefreq: "daily", priority: "0.7" },
  { path: "/partners", changefreq: "weekly", priority: "0.7" },
  { path: "/staff", changefreq: "monthly", priority: "0.6" },
  { path: "/users", changefreq: "daily", priority: "0.5" },
  { path: "/discord", changefreq: "monthly", priority: "0.6" },
  { path: "/bot", changefreq: "monthly", priority: "0.6" },
  { path: "/rules", changefreq: "monthly", priority: "0.6" },
  { path: "/faq", changefreq: "monthly", priority: "0.6" },
  { path: "/support", changefreq: "monthly", priority: "0.6" },
  { path: "/apply", changefreq: "monthly", priority: "0.6" },
  { path: "/changelog", changefreq: "weekly", priority: "0.6" },
  { path: "/status", changefreq: "hourly", priority: "0.5" },
]

function generateSitemap(entries: SitemapEntry[]) {
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  )

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n")
}

writeFileSync(resolve("public/sitemap.xml"), generateSitemap(entries))
console.log(`sitemap.xml written (${entries.length} entries)`)
