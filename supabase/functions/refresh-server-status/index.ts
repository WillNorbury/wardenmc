// Polls mcsrvstat.us for each configured server IP and updates public status.
// Called by pg_cron every minute (and manually from admin UI).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { authenticateCronRequest } from "../_shared/cron-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Row = {
  slug: string;
  ip: string | null;
  players_online: number;
  players_max: number;
  online: boolean;
};

type McsrvResp = {
  online: boolean;
  players?: { online?: number; max?: number };
  motd?: { clean?: string[] };
  debug?: { ping?: boolean; query?: boolean };
};

const stripPort = (ip: string) => ip.trim();

async function fetchStatus(ip: string): Promise<McsrvResp | null> {
  try {
    const res = await fetch(`https://api.mcsrvstat.us/3/${encodeURIComponent(stripPort(ip))}`, {
      headers: { "User-Agent": "Warden Network-Status/1.0 (+https://warden.rip)" },
    });
    if (!res.ok) return null;
    return (await res.json()) as McsrvResp;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Only the scheduled job or a signed-in admin/owner may refresh.
  if (authenticateCronRequest(req) !== null) {
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: u } = token ? await supabase.auth.getUser(token) : { data: { user: null } };
    const uid = u?.user?.id;
    let ok = false;
    if (uid) {
      const { data: role } = await supabase.from("user_roles").select("role")
        .eq("user_id", uid).in("role", ["admin", "owner"]).limit(1).maybeSingle();
      ok = !!role;
    }
    if (!ok) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const { data: rows, error } = await supabase
    .from("mc_public_servers")
    .select("slug, ip, players_online, players_max, online")
    .not("ip", "is", null);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: Array<{ slug: string; online: boolean; players: number }> = [];

  for (const r of (rows as Row[]) ?? []) {
    if (!r.ip) continue;
    const s = await fetchStatus(r.ip);
    const online = !!s?.online;
    const players_online = s?.players?.online ?? 0;
    const players_max = s?.players?.max ?? r.players_max ?? 0;
    const motdLines = s?.motd?.clean;
    const motd =
      Array.isArray(motdLines) && motdLines.length ? motdLines.join(" ").trim() : null;

    const patch: Record<string, unknown> = {
      online,
      players_online,
      players_max,
      updated_at: new Date().toISOString(),
    };
    if (motd) patch.motd = motd;

    await supabase.from("mc_public_servers").update(patch).eq("slug", r.slug);

    // Record an uptime check keyed by slug for the 30d uptime %
    await supabase.from("uptime_checks").insert({
      service_key: `mc:${r.slug}`,
      is_up: online,
    });

    // Recompute 30-day uptime %
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const { data: checks } = await supabase
      .from("uptime_checks")
      .select("is_up")
      .eq("service_key", `mc:${r.slug}`)
      .gte("checked_at", since);
    if (checks && checks.length > 0) {
      const up = checks.filter((c: { is_up: boolean }) => c.is_up).length;
      const pct = Math.round((up / checks.length) * 10000) / 100;
      await supabase.from("mc_public_servers").update({ uptime_pct: pct }).eq("slug", r.slug);
    }

    results.push({ slug: r.slug, online, players: players_online });
  }

  return new Response(JSON.stringify({ ok: true, updated: results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
