// Live status for the server configured in server_panel_settings.
// Returns players online, ping latency, uptime %, and keeps the /tab "Server"
// animation lines in sync with the current MOTD / IP / player count.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { authenticateCronRequest } from '../_shared/cron-auth.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

type McsrvResp = {
  online?: boolean;
  players?: { online?: number; max?: number; list?: string[] };
  version?: string;
  motd?: { clean?: string[] };
};

const SERVICE_KEY = "mc:panel";
const ANIMATION_NAME = "Server";

function buildLines(opts: {
  motd: string;
  ip: string;
  color: string;
  online: boolean;
  players: number;
  max: number;
}) {
  const color = /^#[0-9a-fA-F]{6}$/.test(opts.color) ? opts.color : "#0082A2";
  const lines: string[] = [];
  if (opts.motd.trim()) lines.push(`<${color}>&l${opts.motd.trim()}`);
  if (opts.ip.trim()) lines.push(`<${color}>&lIP &8• &f${opts.ip.trim()}`);
  lines.push(
    opts.online
      ? `<${color}>&lONLINE &8• &f${opts.players}/${opts.max} players`
      : `<${color}>&lSERVER &8• &fOffline`,
  );
  return lines;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  if (authenticateCronRequest(req)) {
    const userClient = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: identity } = await userClient.auth.getUser();
    if (!identity?.user) return json({ ok: false, error: "Unauthorized" }, 401);
    const { data: roles } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", identity.user.id)
      .in("role", ["admin", "owner"])
      .limit(1);
    if (!roles?.length) return json({ ok: false, error: "Forbidden" }, 403);
  }

  const supabase = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: settings, error } = await supabase
    .from("server_panel_settings")
    .select("id, server_ip, motd, motd_color")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) return json({ ok: false, error: error.message }, 500);
  if (!settings?.server_ip) return json({ ok: false, error: "No server IP configured" }, 400);

  const ip = String(settings.server_ip).trim();
  let online = false;
  let players = 0;
  let max = 0;
  let version: string | null = null;
  let liveMotd: string | null = null;
  let playerList: string[] = [];
  let latencyMs: number | null = null;

  const started = Date.now();
  try {
    const res = await fetch(`https://api.mcsrvstat.us/3/${encodeURIComponent(ip)}`, {
      headers: { "User-Agent": "Warden Network-Status/1.0" },
    });
    latencyMs = Date.now() - started;
    if (res.ok) {
      const s = (await res.json()) as McsrvResp;
      online = !!s.online;
      players = s.players?.online ?? 0;
      max = s.players?.max ?? 0;
      playerList = Array.isArray(s.players?.list) ? s.players.list.filter((name): name is string => typeof name === "string").slice(0, 200) : [];
      version = s.version ?? null;
      const clean = s.motd?.clean;
      liveMotd = Array.isArray(clean) && clean.length ? clean.join(" ").trim() : null;
    }
  } catch {
    latencyMs = Date.now() - started;
  }

  await supabase.from("uptime_checks").insert({
    service_key: SERVICE_KEY,
    is_up: online,
    latency_ms: latencyMs,
  });

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data: checks } = await supabase
    .from("uptime_checks")
    .select("is_up")
    .eq("service_key", SERVICE_KEY)
    .gte("checked_at", since);

  let uptimePct: number | null = null;
  if (checks && checks.length > 0) {
    const up = checks.filter((c: { is_up: boolean }) => c.is_up).length;
    uptimePct = Math.round((up / checks.length) * 10000) / 100;
  }

  // Keep the public /tab "Server" animation in sync with live data
  const motd = liveMotd || String(settings.motd ?? "");
  const lines = buildLines({
    motd,
    ip,
    color: String(settings.motd_color ?? "#0082A2"),
    online,
    players,
    max,
  });

  const { data: existing } = await supabase
    .from("tab_animations")
    .select("id")
    .eq("name", ANIMATION_NAME)
    .is("user_id", null)
    .maybeSingle();

  if (existing) {
    await supabase.from("tab_animations").update({ lines, published: true }).eq("id", existing.id);
  } else {
    await supabase
      .from("tab_animations")
      .insert({ name: ANIMATION_NAME, lines, change_interval: 2500, published: true });
  }

  if (liveMotd && liveMotd !== settings.motd) {
    await supabase.from("server_panel_settings").update({ motd: liveMotd }).eq("id", settings.id);
  }

  return json({
    ok: true,
    ip,
    online,
    players,
    max,
    player_list: playerList,
    version,
    motd,
    latency_ms: latencyMs,
    uptime_pct: uptimePct,
    checked_at: new Date().toISOString(),
    lines,
  });
});
