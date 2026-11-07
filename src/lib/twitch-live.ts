// Checks which linked Twitch channels are currently live, via the twitch-status
// edge function (mode=live). Only logins saved on member profiles are honoured.
export async function fetchLiveTwitchLogins(logins: (string | null | undefined)[]): Promise<Set<string>> {
  const unique = [...new Set(logins.map((l) => (l ?? "").trim().toLowerCase()).filter(Boolean))].slice(0, 50);
  if (unique.length === 0) return new Set();
  try {
    const base = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const res = await fetch(`${base}/functions/v1/twitch-status?mode=live&logins=${encodeURIComponent(unique.join(","))}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return new Set();
    const data = await res.json();
    return new Set((data?.live ?? []) as string[]);
  } catch {
    return new Set();
  }
}
