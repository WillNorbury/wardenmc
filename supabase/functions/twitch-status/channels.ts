// Only channels presented by the website may use the public Twitch lookup.
const allowedLogins = new Set([
  "will_norbury", "spectordev", "kidgamerprottv",
  "kaicenat", "ibai", "ninja", "auronplay", "rubius",
]);

export function isAllowedTwitchLogin(login: string): boolean {
  return allowedLogins.has(login.trim().toLowerCase());
}

// Parse a comma-separated "logins" query value into valid, unique Twitch logins (max 50).
export function parseLiveLogins(raw: string | null): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const login = part.trim().toLowerCase();
    if (/^[a-z0-9_]{2,32}$/.test(login)) seen.add(login);
    if (seen.size >= 50) break;
  }
  return [...seen];
}