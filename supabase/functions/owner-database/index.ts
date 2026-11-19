import { createClient } from "npm:@supabase/supabase-js@2.108.2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import sqlParser from "npm:node-sql-parser@5.3.13";
import { assertOwner, compileDataQuery, QUERY_TIMEOUT_MS } from "./model.ts";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anon = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key || !anon) return json(503, { error: "Database tool unavailable" });
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json(401, { error: "Sign in required" });
  const auth = createClient(url, anon, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const { data, error } = await auth.auth.getUser();
  if (error || !data.user) return json(401, { error: "Sign in required" });
  try { assertOwner(data.user.id); } catch { return json(403, { error: "Forbidden — owner account only" }); }
  let query;
  try {
    const body = await req.json();
    if (typeof body.sql !== "string" || !body.sql.trim() || body.sql.length > 10000) throw new Error("Invalid query");
    query = compileDataQuery(new sqlParser.Parser().astify(body.sql, { database: "Postgresql" }));
  } catch {
    return json(400, { error: "Unsupported query. Simple data queries only; writes require WHERE id = '…'. Security and structure changes are blocked." });
  }
  const started = Date.now();
  const admin = createClient(url, key, { auth: { persistSession: false } });
  // SQL is never forwarded to the database. Only validated identifiers and literal
  // values reach parameterized Data API operations; no privileged SQL RPC exists.
  let request;
  if (query.kind === "select") request = admin.from(query.table).select(query.columns.join(",")).limit(query.limit);
  else if (query.kind === "insert") request = admin.from(query.table).insert(query.rows, { count: "exact" });
  else if (query.kind === "update") request = admin.from(query.table).update(query.rows[0], { count: "exact" });
  else request = admin.from(query.table).delete({ count: "exact" });
  for (const f of query.filters) request = request.filter(f.column, f.op, f.value);
  for (const o of query.order) request = request.order(o.column, { ascending: o.ascending });
  try {
    const { data: rows, error: queryError, count } = await request.abortSignal(AbortSignal.timeout(QUERY_TIMEOUT_MS));
    console.info(JSON.stringify({ event: "owner_database_query", user_id: data.user.id, table: query.table, operation: query.kind, ok: !queryError, error_code: queryError?.code, duration_ms: Date.now() - started }));
    if (queryError) return json(400, { error: "Data operation failed. Check the table, columns and values; a timed-out write may already have completed." });
    return json(200, query.kind === "select" ? { kind: "rows", rows: rows ?? [] } : { kind: "write", affectedRows: count ?? 0 });
  } catch {
    return json(504, { error: "Request timed out. Check the data before retrying a write." });
  }
});