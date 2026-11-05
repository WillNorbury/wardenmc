import type { PluginDirectoryItem } from "@/lib/plugin-directory";

/** Popularity score used for "Trending" — downloads plus weighted favourites and reviews. */
export const popularity = (p: Pick<PluginDirectoryItem, "downloads" | "favorites" | "reviews">) =>
  p.downloads + p.favorites * 5 + p.reviews * 3;

/**
 * Recommend plugins the viewer hasn't favourited yet, preferring categories they
 * have favourited. Falls back to the most popular plugins when there's no signal.
 */
export function recommendPlugins(plugins: PluginDirectoryItem[], limit = 6) {
  const liked = plugins.filter((p) => p.isFavorite);
  const cats = new Set(liked.map((p) => p.category));
  const pool = plugins.filter((p) => !p.isFavorite);
  const byPop = [...pool].sort((a, b) => popularity(b) - popularity(a));
  if (!cats.size) return { personalised: false, items: byPop.slice(0, limit) };
  const matched = byPop.filter((p) => cats.has(p.category));
  const rest = byPop.filter((p) => !cats.has(p.category));
  return { personalised: matched.length > 0, items: [...matched, ...rest].slice(0, limit) };
}
