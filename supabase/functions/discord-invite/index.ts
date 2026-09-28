const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function extractCodeFromUrl(input: string): string | null {
  if (!input) return null;
  const patterns = [
    /discord\.gg\/([a-zA-Z0-9-]+)/i,
    /discord\.com\/invite\/([a-zA-Z0-9-]+)/i,
    /discordapp\.com\/invite\/([a-zA-Z0-9-]+)/i,
  ];
  for (const p of patterns) {
    const m = input.match(p);
    if (m) return m[1];
  }
  return null;
}

const ALLOWED_FETCH_HOSTS = new Set([
  "discord.gg",
  "discord.com",
  "www.discord.com",
  "discordapp.com",
  "www.discordapp.com",
]);

// Reject loopback/private/link-local/reserved targets so this function can't
// be used to probe internal networks (SSRF guard).
function isPrivateIp(ip: string): boolean {
  const v4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 0 || a === 10 || a === 127 || a >= 224) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 192 && b === 0) return true;
    return false;
  }
  const v6 = ip.toLowerCase();
  return (
    v6 === "::1" ||
    v6 === "::" ||
    v6.startsWith("fe80:") ||
    v6.startsWith("fc") ||
    v6.startsWith("fd") ||
    v6.startsWith("::ffff:")
  );
}

async function resolvesToPublicHost(hostname: string): Promise<boolean> {
  try {
    const ips = await Deno.resolveDns(hostname, "A");
    if (!ips.length) return false;
    return !ips.some(isPrivateIp);
  } catch {
    return false;
  }
}

// Follow redirects hop by hop (max 4), validating every hop resolves to a
// public IP. Returns the final URL or null.
async function resolveVanity(start: URL): Promise<string | null> {
  let current = start.toString();
  for (let hop = 0; hop < 4; hop++) {
    const u = new URL(current);
    if (u.protocol !== "https:") return null;
    if (!ALLOWED_FETCH_HOSTS.has(u.hostname.toLowerCase())) return null;
    if (!(await resolvesToPublicHost(u.hostname))) return null;
    const r = await fetch(current, {
      redirect: "manual",
      headers: { "User-Agent": "Warden Network-Site/1.0" },
    });
    await r.body?.cancel();
    if (r.status >= 300 && r.status < 400) {
      const loc = r.headers.get("location");
      if (!loc) return null;
      current = new URL(loc, u).toString();
      continue;
    }
    return current;
  }
  return null;
}

async function extractCode(input: string): Promise<string | null> {
  if (!input) return null;
  const trimmed = input.trim();
  const direct = extractCodeFromUrl(trimmed);
  if (direct) return direct;
  // Vanity/redirect URL — follow redirects hop-by-hop with SSRF guards, and
  // only accept the code if the FINAL resolved URL lands on a Discord host.
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "https:") return null;
      if (!ALLOWED_FETCH_HOSTS.has(parsed.hostname.toLowerCase())) return null;
      const finalUrl = await resolveVanity(parsed);
      if (!finalUrl) return null;
      const final = new URL(finalUrl);
      if (!ALLOWED_FETCH_HOSTS.has(final.hostname)) return null;
      const code = extractCodeFromUrl(finalUrl);
      if (code) return code;
    } catch (_) { /* ignore */ }
    return null;
  }
  // Already a bare code
  if (/^[a-zA-Z0-9-]+$/.test(trimmed)) return trimmed;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const raw = url.searchParams.get("invite") ?? url.searchParams.get("code") ?? "";
    const fallbacks: string[] = [];
    const resolved = await extractCode(raw);
    const candidates = [resolved, ...fallbacks].filter(Boolean) as string[];

    let lastError = "No valid invite resolved";
    for (const code of candidates) {
      try {
        const r = await fetch(
          `https://discord.com/api/v10/invites/${encodeURIComponent(code)}?with_counts=true&with_expiration=true`,
          { headers: { "User-Agent": "Warden Network-Site/1.0" } },
        );
        const j = await r.json().catch(() => null);
        if (!r.ok) {
          lastError = j?.message ? `${j.message} (${code})` : `Discord ${r.status} for ${code}`;
          continue;
        }
        if (j && typeof j.approximate_member_count === "number") {
          return json({
            ok: true,
            code,
            approximate_member_count: j.approximate_member_count,
            approximate_presence_count: j.approximate_presence_count ?? null,
            guild: j.guild ? { id: j.guild.id, name: j.guild.name, icon: j.guild.icon } : null,
          });
        }
      } catch (e) { lastError = (e as Error).message; }
    }

    // Always return 200 so the SDK doesn't throw; clients check `ok`.
    return json({ ok: false, error: lastError });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message });
  }
});
