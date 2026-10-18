// Rotating custom-status lines for WardenBot's Discord presence.
// Admins save a list of lines in site_content key `discord_presence_texts`
// ({ texts: string[] }); the keepalive runs every minute and shows the next
// line each minute, so the member-list status cycles through them.

export const PRESENCE_TEXTS_KEY = 'discord_presence_texts'
export const MAX_PRESENCE_TEXTS = 10
export const MAX_PRESENCE_TEXT_LEN = 128

export const DEFAULT_PRESENCE_TEXTS = ['🛡️ Protecting warden.rip | /help']

// Validates and normalizes a raw saved value into a clean list of lines.
export function normalizePresenceTexts(raw: unknown): string[] {
  const list = (raw as { texts?: unknown } | null)?.texts
  if (!Array.isArray(list)) return []
  const clean = list
    .filter((t): t is string => typeof t === 'string')
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && t.length <= MAX_PRESENCE_TEXT_LEN)
  return clean.slice(0, MAX_PRESENCE_TEXTS)
}

// Picks the line to show right now: rotates one step per minute.
export function pickPresenceText(texts: string[], nowMs: number): string {
  const valid = normalizePresenceTexts({ texts })
  const lines = valid.length ? valid : DEFAULT_PRESENCE_TEXTS
  const minute = Math.floor(nowMs / 60000)
  return lines[minute % lines.length]
}
