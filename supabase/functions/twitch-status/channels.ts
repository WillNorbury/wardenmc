// Only channels presented by the website may use the public Twitch lookup.
const allowedLogins = new Set([
  "will_norbury", "spectordev", "kidgamerprottv",
  "kaicenat", "ibai", "ninja",
]);

export function isAllowedTwitchLogin(login: string): boolean {
  return allowedLogins.has(login.trim().toLowerCase());
}