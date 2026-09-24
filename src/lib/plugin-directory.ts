import { supabase } from "@/integrations/supabase/client";
import { isStaffRole } from "@/lib/roles";
import { userProfilePath } from "@/lib/userSlug";

export const PLUGIN_CATEGORIES = [
  "Administration",
  "Economy",
  "Gameplay",
  "Moderation",
  "Utility",
  "Performance",
  "Chat",
  "Cosmetics",
  "Integration",
  "Networking",
  "Developer Tools",
  "Other",
] as const;

export const PLUGIN_PLATFORMS = ["Paper", "Spigot", "Purpur", "Folia", "Velocity", "BungeeCord"] as const;

export const CATEGORY_DESCRIPTIONS: Record<(typeof PLUGIN_CATEGORIES)[number], string> = {
  Administration: "Server management, configuration, permissions, and staff workflows.",
  Economy: "Currencies, shops, trading, rewards, and player economies.",
  Gameplay: "New mechanics, game modes, progression, and player experiences.",
  Moderation: "Tools for players, chat, punishments, reports, and server security.",
  Utility: "Practical tools that simplify everyday server operations.",
  Performance: "Optimization, diagnostics, monitoring, and stability tools.",
  Chat: "Messaging, channels, formatting, and community communication.",
  Cosmetics: "Visual effects, collectibles, menus, and player customization.",
  Integration: "Connections to Discord, websites, APIs, and external services.",
  Networking: "Proxy, cross-server, and multi-network infrastructure.",
  "Developer Tools": "Libraries, APIs, hooks, and utilities for plugin developers.",
  Other: "Specialized plugins that do not fit a single category.",
};

const CATEGORY_ALIASES: Record<string, (typeof PLUGIN_CATEGORIES)[number]> = {
  administration: "Administration",
  admin: "Administration",
  "admin tools": "Administration",
  management: "Administration",
  economy: "Economy",
  gameplay: "Gameplay",
  gamemode: "Gameplay",
  "gamemode, staff": "Gameplay",
  adventure: "Gameplay",
  minigame: "Gameplay",
  "game mechanics": "Gameplay",
  mobs: "Gameplay",
  magic: "Gameplay",
  equipment: "Gameplay",
  transportation: "Gameplay",
  moderation: "Moderation",
  reporting: "Moderation",
  utility: "Utility",
  storage: "Utility",
  performance: "Performance",
  optimization: "Performance",
  chat: "Chat",
  messaging: "Chat",
  social: "Chat",
  cosmetics: "Cosmetics",
  integration: "Integration",
  networking: "Networking",
  proxy: "Networking",
  library: "Developer Tools",
  "developer tools": "Developer Tools",
};

export type PluginStatus = "verified" | "featured" | "beta" | "archived" | "unverified";

export type PluginCreator = {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  bio: string | null;
  verified: boolean;
  profilePath: string | null;
  updatedAt: string;
};

export type PluginDirectoryItem = {
  id: string;
  shortId: string;
  slug: string;
  name: string;
  description: string;
  icon: string | null;
  developer: PluginCreator;
  category: (typeof PLUGIN_CATEGORIES)[number];
  sourceCategory: string | null;
  tags: string[];
  versions: string[];
  platforms: string[];
  downloads: number;
  rating: number;
  reviews: number;
  favorites: number;
  status: PluginStatus;
  featured: boolean;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
};

export type PluginDeveloper = PluginCreator & {
  pluginCount: number;
  downloads: number;
  rating: number;
  reviewCount: number;
  recentlyActiveAt: string;
};

type RawPlugin = {
  id: string;
  short_id: string;
  slug: string | null;
  name: string;
  description: string | null;
  author: string | null;
  user_id: string | null;
  org_id: string | null;
  icon_url: string | null;
  category: string | null;
  tags: string[];
  platform: string | null;
  platforms: string[] | null;
  mc_versions: string[] | null;
  featured: boolean;
  created_at: string;
  updated_at: string;
};

type RawOrg = {
  id: string;
  name: string | null;
  slug: string | null;
  description: string | null;
  avatar_url: string | null;
  updated_at: string | null;
};

type RawProfile = {
  id: string;
  display_name: string | null;
  mc_username: string | null;
  avatar_url: string | null;
  bio: string | null;
  verified: boolean;
  updated_at: string;
};

export const normalizePluginCategory = (category: string | null) => {
  const value = (category ?? "").trim().toLowerCase();
  if (!value) return "Other" as const;
  return CATEGORY_ALIASES[value] ?? "Other";
};

export const normalizePlatform = (platform: string) => {
  const value = platform.trim().toLowerCase();
  if (value === "bungee" || value === "bungeecord") return "BungeeCord";
  return value.charAt(0).toUpperCase() + value.slice(1);
};

export const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat("en", { notation: value >= 1000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);

export const formatRelativeDate = (iso: string) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
};

export async function loadPluginDirectory(userId?: string | null) {
  const { data, error } = await supabase
    .from("plugins")
    .select("id, short_id, slug, name, description, author, user_id, org_id, icon_url, category, tags, platform, platforms, mc_versions, featured, created_at, updated_at")
    .eq("published", true)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  const rows = (data ?? []) as RawPlugin[];
  const pluginIds = rows.map((plugin) => plugin.id);
  const userIds = [...new Set(rows.map((plugin) => plugin.user_id).filter((id): id is string => Boolean(id)))];
  const orgIds = [...new Set(rows.map((plugin) => plugin.org_id).filter((id): id is string => Boolean(id)))];

  const [orgsResult, profilesResult, downloadsResult, favoritesResult, myFavoritesResult, rolesResult, ...reviewResults] = await Promise.all([
    orgIds.length
      ? supabase.from("organizations_public").select("id, name, slug, description, avatar_url, updated_at").in("id", orgIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length
      ? supabase.from("profiles").select("id, display_name, mc_username, avatar_url, bio, verified, updated_at").in("id", userIds)
      : Promise.resolve({ data: [], error: null }),
    pluginIds.length
      ? supabase.rpc("get_plugin_download_counts", { _plugin_ids: pluginIds })
      : Promise.resolve({ data: [], error: null }),
    pluginIds.length
      ? supabase.rpc("get_plugin_favorite_counts", { _plugin_ids: pluginIds })
      : Promise.resolve({ data: [], error: null }),
    userId && pluginIds.length
      ? supabase.from("plugin_favorites").select("plugin_id").eq("user_id", userId).in("plugin_id", pluginIds)
      : Promise.resolve({ data: [], error: null }),
    userIds.length
      ? supabase.from("user_roles").select("user_id, role").in("user_id", userIds)
      : Promise.resolve({ data: [], error: null }),
    ...pluginIds.map((pluginId) => supabase.rpc("get_public_item_reviews", { _target_type: "plugin", _target_id: pluginId })),
  ]);

  const profiles = new Map(((profilesResult.data ?? []) as RawProfile[]).map((profile) => [profile.id, profile]));
  const staffIds = new Set(
    ((rolesResult.data ?? []) as { user_id: string; role: string }[])
      .filter((row) => isStaffRole(row.role))
      .map((row) => row.user_id),
  );
  const downloadMap = new Map(
    ((downloadsResult.data ?? []) as { plugin_id: string; total: number }[]).map((row) => [row.plugin_id, Number(row.total) || 0]),
  );
  const favoriteMap = new Map(
    ((favoritesResult.data ?? []) as { plugin_id: string; total: number }[]).map((row) => [row.plugin_id, Number(row.total) || 0]),
  );
  const myFavorites = new Set(((myFavoritesResult.data ?? []) as { plugin_id: string }[]).map((row) => row.plugin_id));

  const items = rows.map((row, index): PluginDirectoryItem => {
    const profile = row.user_id ? profiles.get(row.user_id) : undefined;
    const reviewRows = (reviewResults[index]?.data ?? []) as { rating: number }[];
    const reviewTotal = reviewRows.reduce((sum, review) => sum + Number(review.rating), 0);
    const verified = Boolean(profile?.verified || (row.user_id && staffIds.has(row.user_id)));
    const developerName = profile?.display_name || profile?.mc_username || row.author || "WardenMC Community";
    const platforms = [...new Set((row.platforms?.length ? row.platforms : row.platform ? [row.platform] : []).map(normalizePlatform))];
    const developer: PluginCreator = {
      id: row.user_id ?? `author:${developerName.toLowerCase()}`,
      username: profile?.mc_username || profile?.display_name || developerName,
      displayName: developerName,
      avatar: profile?.avatar_url ?? null,
      bio: profile?.bio ?? null,
      verified,
      profilePath: profile ? userProfilePath(profile) : null,
      updatedAt: profile?.updated_at ?? row.updated_at,
    };

    return {
      id: row.id,
      shortId: row.short_id,
      slug: row.slug ?? row.short_id,
      name: row.name,
      description: row.description ?? "No description has been provided yet.",
      icon: row.icon_url,
      developer,
      category: normalizePluginCategory(row.category),
      sourceCategory: row.category,
      tags: row.tags ?? [],
      versions: row.mc_versions ?? [],
      platforms,
      downloads: downloadMap.get(row.id) ?? 0,
      rating: reviewRows.length ? reviewTotal / reviewRows.length : 0,
      reviews: reviewRows.length,
      favorites: favoriteMap.get(row.id) ?? 0,
      status: row.featured ? "featured" : verified ? "verified" : "unverified",
      featured: row.featured,
      verified,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      isFavorite: myFavorites.has(row.id),
    };
  });

  return items;
}

export const buildDevelopers = (plugins: PluginDirectoryItem[]): PluginDeveloper[] => {
  const grouped = new Map<string, PluginDeveloper>();
  for (const plugin of plugins) {
    const existing = grouped.get(plugin.developer.id);
    if (!existing) {
      grouped.set(plugin.developer.id, {
        ...plugin.developer,
        pluginCount: 1,
        downloads: plugin.downloads,
        rating: plugin.rating,
        reviewCount: plugin.reviews,
        recentlyActiveAt: plugin.updatedAt,
      });
      continue;
    }
    const combinedReviews = existing.reviewCount + plugin.reviews;
    existing.rating = combinedReviews
      ? ((existing.rating * existing.reviewCount) + (plugin.rating * plugin.reviews)) / combinedReviews
      : 0;
    existing.reviewCount = combinedReviews;
    existing.pluginCount += 1;
    existing.downloads += plugin.downloads;
    if (new Date(plugin.updatedAt) > new Date(existing.recentlyActiveAt)) existing.recentlyActiveAt = plugin.updatedAt;
  }
  return [...grouped.values()];
};