// Owner-only MySQL connectivity health check.
// Reports reachability + latency for the configured LiteBans MySQL server,
// or for an explicit host/port passed in the request body.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import mysql from "npm:mysql2@3.11.3/promise";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "POST") {
    return json(405, { error: "method not allowed" });
  }

  // --- Auth: owner only ---
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json(401, { error: "missing bearer token" });

  const supaUrl = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supaUrl, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json(401, { error: "invalid session" });

  const admin = createClient(supaUrl, service);
  const { data: roles } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id);
  if (!(roles ?? []).some((r: any) => r.role === "owner")) {
    return json(403, { error: "owner only" });
  }

  // --- Destination and credentials come only from server-side secrets ---
  // Caller-supplied host/port are intentionally ignored so this endpoint can
  // never be used to probe arbitrary destinations with our credentials.
  const host = Deno.env.get("LITEBANS_MYSQL_HOST");
  const port = Number(Deno.env.get("LITEBANS_MYSQL_PORT") ?? "3306");
  const user = Deno.env.get("LITEBANS_MYSQL_USER");
  const password = Deno.env.get("LITEBANS_MYSQL_PASSWORD");
  const database = Deno.env.get("LITEBANS_MYSQL_DATABASE");

  if (!host || !user || !password || !database) {
    return json(200, { ok: false, status: "not_configured", error: "MySQL connection not configured" });
  }

  const target = `${host}:${port}`;
  const checkedAt = new Date().toISOString();

  // --- 1. Raw TCP reachability ---
  const tcpStart = Date.now();
  let tcpMs: number | null = null;
  let tcpOk = false;
  let tcpError: string | null = null;
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 5000);
    const socket = await Deno.connect({ hostname: host, port, signal: ac.signal } as any);
    clearTimeout(t);
    tcpMs = Date.now() - tcpStart;
    tcpOk = true;
    try { socket.close(); } catch { /* ignore */ }
  } catch (e: any) {
    tcpMs = Date.now() - tcpStart;
    tcpError = String(e?.message ?? e);
  }

  if (!tcpOk) {
    return json(200, {
      ok: false,
      status: "unreachable",
      target,
      host,
      port,
      tcp: { ok: false, latencyMs: tcpMs, error: tcpError },
      handshake: null,
      query: null,
      checkedAt,
      error: `Cannot open a TCP connection to ${target}. The server is offline, firewalled, or not accepting external connections.`,
    });
  }

  // --- 2. MySQL handshake + SELECT 1 ---
  let conn: mysql.Connection | null = null;
  const hsStart = Date.now();
  let handshakeMs: number | null = null;
  try {
    conn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      connectTimeout: 8000,
    });
    handshakeMs = Date.now() - hsStart;

    const qStart = Date.now();
    const [rows] = await conn.query("SELECT 1 AS ok");
    const queryMs = Date.now() - qStart;

    let version: string | null = null;
    try {
      const [v]: any = await conn.query("SELECT VERSION() AS v");
      version = v?.[0]?.v ?? null;
    } catch { /* ignore */ }

    return json(200, {
      ok: true,
      status: "healthy",
      target,
      host,
      port,
      database: database ?? null,
      serverVersion: version,
      tcp: { ok: true, latencyMs: tcpMs },
      handshake: { ok: true, latencyMs: handshakeMs },
      query: { ok: Array.isArray(rows) && rows.length > 0, latencyMs: queryMs },
      totalLatencyMs: (tcpMs ?? 0) + (handshakeMs ?? 0) + queryMs,
      checkedAt,
    });
  } catch (e: any) {
    const code = e?.code ?? null;
    const authIssue = code === "ER_ACCESS_DENIED_ERROR" || code === "ER_DBACCESS_DENIED_ERROR";
    return json(200, {
      ok: false,
      status: authIssue ? "auth_failed" : "handshake_failed",
      target,
      host,
      port,
      tcp: { ok: true, latencyMs: tcpMs },
      handshake: { ok: false, latencyMs: Date.now() - hsStart, error: String(e?.message ?? e) },
      query: null,
      code,
      sqlState: e?.sqlState ?? null,
      checkedAt,
      error: authIssue
        ? `Port ${port} on ${host} is open, but MySQL rejected the credentials.`
        : `Port ${port} on ${host} is open, but the MySQL handshake failed: ${String(e?.message ?? e)}`,
    });
  } finally {
    try { await conn?.end(); } catch { /* ignore */ }
  }
});
