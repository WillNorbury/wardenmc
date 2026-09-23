// Owner-only endpoint that runs SQL against the LiteBans MySQL database.
// Uses secrets: LITEBANS_MYSQL_HOST, LITEBANS_MYSQL_PORT, LITEBANS_MYSQL_USER,
// LITEBANS_MYSQL_PASSWORD, LITEBANS_MYSQL_DATABASE.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import mysql from "npm:mysql2@3.11.3/promise";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method not allowed" });

  // --- Auth: require owner role ---
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
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
  const isOwner = (roles ?? []).some((r: any) => r.role === "owner");
  if (!isOwner) return json(403, { error: "owner only" });

  // --- Parse body ---
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid json" });
  }
  const sql: string = String(body?.sql ?? "").trim();
  const params: unknown[] = Array.isArray(body?.params) ? body.params : [];
  const allowMulti: boolean = body?.allowMulti === true;
  if (!sql) return json(400, { error: "sql required" });
  if (sql.length > 20000) return json(400, { error: "sql too long" });

  // --- Load MySQL connection from server-side secrets only ---
  const host = Deno.env.get("LITEBANS_MYSQL_HOST");
  const port = Number(Deno.env.get("LITEBANS_MYSQL_PORT") ?? "3306");
  const user = Deno.env.get("LITEBANS_MYSQL_USER");
  const password = Deno.env.get("LITEBANS_MYSQL_PASSWORD");
  const database = Deno.env.get("LITEBANS_MYSQL_DATABASE");
  if (!host || !user || !password || !database) {
    return json(500, { error: "MySQL connection not configured" });
  }

  let conn: mysql.Connection | null = null;
  const started = Date.now();
  try {
    conn = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      connectTimeout: 8000,
      multipleStatements: allowMulti,
      dateStrings: true,
    });
    const [result, fields] = await conn.query(sql, params);
    const durationMs = Date.now() - started;

    // SELECT → array of row objects; write → OkPacket
    if (Array.isArray(result)) {
      const rows = result as any[];
      // If multiStatement returned nested arrays, flatten first result set.
      const first =
        rows.length && Array.isArray(rows[0]) && !(rows[0] as any).length === undefined
          ? rows[0]
          : rows;
      return json(200, {
        ok: true,
        kind: "rows",
        rows: first,
        rowCount: Array.isArray(first) ? first.length : 0,
        fields: (fields as any[])?.map((f) => ({ name: f.name, type: f.type })) ?? [],
        durationMs,
      });
    }
    const ok = result as any;
    return json(200, {
      ok: true,
      kind: "write",
      affectedRows: ok.affectedRows ?? 0,
      changedRows: ok.changedRows ?? 0,
      insertId: ok.insertId ?? 0,
      info: ok.info ?? null,
      durationMs,
    });
  } catch (e: any) {
    const code = e?.code ?? null;
    const unreachable =
      code === "ECONNREFUSED" || code === "ETIMEDOUT" || code === "ENOTFOUND" || code === "EHOSTUNREACH";
    // Return 200 so the client can render a friendly state instead of a thrown 400.
    return json(200, {
      ok: false,
      unavailable: unreachable,
      error: unreachable
        ? `Cannot reach the LiteBans MySQL server (${host}:${port}). Check that the database is online and allows external connections.`
        : String(e?.message ?? e),
      code,
      sqlState: e?.sqlState ?? null,
    });
  } finally {
    try {
      await conn?.end();
    } catch {
      /* ignore */
    }
  }
});
