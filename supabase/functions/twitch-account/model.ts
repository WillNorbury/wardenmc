const ORIGINS = new Set(["http://localhost:8080", "https://warden.rip", "https://www.warden.rip", "https://carnagemc.net", "https://wardennetwork.lovable.app", "https://id-preview--c9d110ee-1d92-4be5-b8fd-699d505d0940.lovable.app", "https://c9d110ee-1d92-4be5-b8fd-699d505d0940.lovableproject.com"]);
export function isAllowedOrigin(value: unknown): value is string { return typeof value === "string" && ORIGINS.has(value); }
export function twitchProjection(profile: Record<string, unknown>) {
  return { login: String(profile.login ?? ""), displayName: String(profile.display_name ?? ""), avatarUrl: String(profile.profile_image_url ?? "") };
}
