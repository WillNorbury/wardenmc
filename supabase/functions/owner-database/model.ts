export const OWNER_ID = "a9ff5e2f-cad4-4805-9acd-095065d18179";
export const MAX_ROWS = 200;
export const QUERY_TIMEOUT_MS = 5000;
const TABLES = new Set(["profiles", "community_clips", "clip_comments", "clip_likes", "changelog_entries", "ban_appeals", "support_tickets"]);
const PROFILE_COLUMNS = new Set(["id", "mc_username", "display_name", "avatar_url", "bio", "created_at", "twitch_login"]);
const PROFILE_WRITES = new Set(["display_name", "avatar_url", "bio", "twitch_login"]);
export function assertOwner(userId: string | undefined) {
  if (userId !== OWNER_ID) throw new Error("Forbidden — this tool is locked to the site owner account.");
}
type Node = Record<string, any>;
type Scalar = string | number | boolean | null;
export type DataQuery = {
  kind: "select" | "insert" | "update" | "delete";
  table: string;
  columns: string[];
  filters: { column: string; op: "eq" | "neq" | "gt" | "gte" | "lt" | "lte"; value: Scalar }[];
  order: { column: string; ascending: boolean }[];
  limit: number;
  rows: Record<string, Scalar>[];
};
const fail = (): never => { throw new Error("Unsupported query. Use a single simple SELECT, INSERT, UPDATE or DELETE on an allowed application table; structure and permission changes are blocked."); };
function identifier(value: any): string {
  const text = typeof value === "string" ? value : value?.expr?.value ?? value?.value;
  if (typeof text !== "string" || !/^[a-z_][a-z0-9_]*$/.test(text)) return fail();
  return text;
}
function column(node: Node): string {
  if (node?.type !== "column_ref" || node.table || node.collate) return fail();
  return identifier(node.column);
}
function scalar(node: Node): Scalar {
  if (["single_quote_string", "string", "number", "bool"].includes(node?.type) && ["string", "number", "boolean"].includes(typeof node.value)) return node.value;
  if (node?.type === "null") return null;
  return fail();
}
export function compileDataQuery(parsed: unknown): DataQuery {
  const list = Array.isArray(parsed) ? parsed : [parsed];
  if (list.length !== 1 || !list[0] || typeof list[0] !== "object") return fail();
  const ast = list[0] as Node;
  if (!["select", "insert", "update", "delete"].includes(ast.type)) return fail();
  const tables = ast.type === "select" || ast.type === "delete" ? ast.from : ast.table;
  if (!Array.isArray(tables) || tables.length !== 1) return fail();
  const target = tables[0];
  if (target.db && target.db !== "public" || target.as || target.expr || target.join) return fail();
  const table = identifier(target.table);
  if (!TABLES.has(table)) return fail();
  if (ast.with || ast.options || ast.groupby || ast.having || ast.window || ast._next || ast.set_op || ast.returning || ast.conflict || ast.partition || ast.distinct?.type || ast.into?.position || ast.type === "update" && ast.from) return fail();
  const query: DataQuery = { kind: ast.type, table, columns: [], filters: [], order: [], limit: MAX_ROWS, rows: [] };
  function filters(node: Node | null) {
    if (!node) return;
    if (node.type !== "binary_expr") return fail();
    if (node.operator === "AND") { filters(node.left); filters(node.right); return; }
    const ops: Record<string, DataQuery["filters"][number]["op"]> = { "=": "eq", "!=": "neq", "<>": "neq", ">": "gt", ">=": "gte", "<": "lt", "<=": "lte" };
    const op = ops[node.operator];
    if (!op) return fail();
    const value = scalar(node.right);
    if (value === null) return fail();
    query.filters.push({ column: column(node.left), op, value });
  }
  filters(ast.where);
  if (ast.type === "select") {
    query.columns = ast.columns.map((c: Node) => {
      if (c.as) return fail();
      return c.expr?.type === "column_ref" && c.expr.column === "*" && !c.expr.table ? "*" : column(c.expr);
    });
    if (ast.limit?.value?.length) {
      if (ast.limit.value?.length !== 1 || ast.limit.value[0].type !== "number") return fail();
      const limit = ast.limit.value[0].value;
      if (!Number.isInteger(limit) || limit < 1) return fail();
      query.limit = Math.min(limit, MAX_ROWS);
    }
    query.order = (ast.orderby ?? []).map((o: Node) => {
      if (o.nulls || o.type && !["ASC", "DESC"].includes(o.type)) return fail();
      return { column: column(o.expr), ascending: o.type !== "DESC" };
    });
  } else if (ast.type === "insert") {
    if (table === "profiles" || ast.values?.type !== "values" || !Array.isArray(ast.columns)) return fail();
    const columns = ast.columns.map(identifier);
    if (new Set(columns).size !== columns.length || ast.values.values.length > MAX_ROWS) return fail();
    query.rows = ast.values.values.map((row: Node) => {
      if (row.type !== "expr_list" || row.value.length !== columns.length) return fail();
      return Object.fromEntries(columns.map((c: string, i: number) => [c, scalar(row.value[i])]));
    });
  } else {
    // Require a unique row ID equality for writes: no unbounded bulk edits/deletes.
    if (!query.filters.some(f => f.column === "id" && f.op === "eq" && typeof f.value === "string")) return fail();
    if (ast.type === "delete" && table === "profiles") return fail();
    if (ast.type === "update") {
      const pairs = ast.set.map((s: Node) => [column(s), scalar(s.value)]);
      if (new Set(pairs.map((p: [string, Scalar]) => p[0])).size !== pairs.length) return fail();
      query.rows = [Object.fromEntries(pairs)];
    }
  }
  if (table === "profiles") {
    if (query.columns.includes("*")) query.columns = [...PROFILE_COLUMNS];
    if ([...query.columns, ...query.filters.map(f => f.column), ...query.order.map(o => o.column)].some(c => !PROFILE_COLUMNS.has(c))) return fail();
    if (query.rows.some(row => Object.keys(row).some(c => !PROFILE_WRITES.has(c)))) return fail();
  }
  return query;
}