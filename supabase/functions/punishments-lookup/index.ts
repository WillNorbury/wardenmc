// LiteBans punishments lookup proxy
// Queries the network MySQL database and returns bans/mutes/kicks/warnings for a player.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import mysql from 'npm:mysql2@3.11.5/promise'

const RAW_PREFIX = (Deno.env.get('LITEBANS_TABLE_PREFIX') ?? 'litebans_').replace(/[^a-zA-Z0-9_]/g, '')
const PREFIX = RAW_PREFIX.endsWith('_') || RAW_PREFIX === '' ? RAW_PREFIX : RAW_PREFIX + '_'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// Connection settings come from the litebans_mysql_config table (owner-editable
// in the admin panel) with env secrets as fallback. Cached per isolate.
type MysqlCfg = { host: string; port: number; user: string; password: string; database: string }
let cfgCache: MysqlCfg | null = null
async function loadMysqlConfig(): Promise<MysqlCfg | null> {
  if (cfgCache) return cfgCache
  let row: any = null
  try {
    if (SUPABASE_URL && SUPABASE_SERVICE) {
      const { createClient } = await import('npm:@supabase/supabase-js@2')
      const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE)
      const { data } = await admin
        .from('litebans_mysql_config')
        .select('host, port, database, username, password')
        .eq('id', true)
        .maybeSingle()
      row = data
    }
  } catch (e) { console.error('config load failed', e) }
  const host = row?.host ?? Deno.env.get('LITEBANS_MYSQL_HOST') ?? ''
  const user = row?.username ?? Deno.env.get('LITEBANS_MYSQL_USER') ?? ''
  const database = row?.database ?? Deno.env.get('LITEBANS_MYSQL_DATABASE') ?? ''
  if (!host || !user || !database) return null
  cfgCache = {
    host,
    port: Number(row?.port ?? Deno.env.get('LITEBANS_MYSQL_PORT') ?? '3306'),
    user,
    password: row?.password ?? Deno.env.get('LITEBANS_MYSQL_PASSWORD') ?? '',
    database,
  }
  return cfgCache
}

async function connect(): Promise<mysql.Connection> {
  const cfg = await loadMysqlConfig()
  if (!cfg) throw new Error('MySQL not configured')
  return mysql.createConnection({
    host: cfg.host, port: cfg.port, user: cfg.user, password: cfg.password,
    database: cfg.database, connectTimeout: 8000,
  })
}

const UUID_RE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i
const NAME_RE = /^[a-zA-Z0-9_]{2,16}$/

function dashUuid(u: string) {
  const s = u.replace(/-/g, '').toLowerCase()
  if (s.length !== 32) return u.toLowerCase()
  return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`
}
function stripUuid(u: string) { return u.replace(/-/g, '').toLowerCase() }

async function resolveUsername(name: string): Promise<{ uuid: string; name: string } | null> {
  try {
    const r = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(name)}`)
    if (!r.ok) return null
    const j = await r.json()
    if (!j?.id) return null
    return { uuid: dashUuid(j.id), name: j.name ?? name }
  } catch { return null }
}

async function requireAdmin(req: Request): Promise<{ ok: true; userId: string; userName: string } | { ok: false; resp: Response }> {
  const auth = req.headers.get('Authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return { ok: false, resp: json({ error: 'unauthorized' }, 401) }
  try {
    const { createClient } = await import('npm:@supabase/supabase-js@2')
    const sb = createClient(SUPABASE_URL, SUPABASE_ANON, { global: { headers: { Authorization: auth } } })
    const { data: u } = await sb.auth.getUser()
    if (!u?.user) return { ok: false, resp: json({ error: 'unauthorized' }, 401) }
    const { data: isAdmin } = await sb.rpc('is_current_user_admin')
    if (!isAdmin) return { ok: false, resp: json({ error: 'forbidden' }, 403) }
    const name = (u.user.user_metadata?.display_name as string | undefined)
      ?? (u.user.email?.split('@')[0]) ?? 'Web Admin'
    return { ok: true, userId: u.user.id, userName: name }
  } catch (e) {
    return { ok: false, resp: json({ error: 'auth failed: ' + (e as Error).message }, 500) }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Admin POST actions: { action: "list" | "unban" | "unmute", ... }
  if (req.method === 'POST') {
    let body: any = {}
    try { body = await req.json() } catch {}
    const action = body?.action as string | undefined

    if (action === 'list' || action === 'unban' || action === 'unmute') {
      const gate = await requireAdmin(req)
      if (!gate.ok) return gate.resp
      if (!(await loadMysqlConfig())) return json({ error: 'MySQL not configured' }, 500)

      const conn = await connect()
      try {
        if (action === 'list') {
          const type = ['bans','mutes','warnings','kicks'].includes(body?.type) ? body.type : 'bans'
          const limit = Math.min(Math.max(Number(body?.limit ?? 100), 1), 500)
          const fromMs = body?.from ? Date.parse(body.from) : null
          const toMs = body?.to ? Date.parse(body.to) : null
          const playerQ = (body?.player ?? '').toString().trim()
          const activeOnly = body?.active_only === true

          const where: string[] = []
          const params: any[] = []
          if (fromMs && Number.isFinite(fromMs)) { where.push('time >= ?'); params.push(fromMs) }
          if (toMs && Number.isFinite(toMs)) { where.push('time <= ?'); params.push(toMs) }
          if (activeOnly && (type === 'bans' || type === 'mutes')) where.push('active = 1')
          if (playerQ) {
            if (UUID_RE.test(playerQ)) {
              const d = dashUuid(playerQ); const u = stripUuid(playerQ)
              where.push('uuid IN (?, ?)'); params.push(d, u)
            } else if (NAME_RE.test(playerQ)) {
              const resolved = await resolveUsername(playerQ)
              if (resolved) {
                where.push('uuid IN (?, ?)'); params.push(resolved.uuid, stripUuid(resolved.uuid))
              } else {
                where.push('1=0')
              }
            }
          }
          const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : ''
          let rows: any[] = []
          try {
            const [r] = await conn.query(
              `SELECT id, uuid, reason, banned_by_name, banned_by_uuid, removed_by_name, removed_by_reason, removed_by_date,
                      time, until, active, ipban, server_scope
               FROM \`${PREFIX}${type}\` ${whereSql} ORDER BY time DESC LIMIT ${limit}`,
              params,
            )
            rows = r as any[]
          } catch {
            const [r] = await conn.query(
              `SELECT id, uuid, reason, banned_by_name, banned_by_uuid, time, until, active
               FROM \`${PREFIX}${type}\` ${whereSql} ORDER BY time DESC LIMIT ${limit}`,
              params,
            )
            rows = r as any[]
          }
          // Resolve usernames from history for display
          const uuids = Array.from(new Set(rows.map(r => r.uuid).filter(Boolean)))
          const nameMap = new Map<string, string>()
          if (uuids.length) {
            try {
              const placeholders = uuids.map(() => '?').join(',')
              const [h] = await conn.query(
                `SELECT uuid, name, MAX(date) AS d FROM \`${PREFIX}history\`
                 WHERE uuid IN (${placeholders}) GROUP BY uuid, name`,
                uuids,
              )
              for (const r of h as any[]) {
                if (!nameMap.has(r.uuid)) nameMap.set(r.uuid, r.name)
              }
            } catch {}
          }
          return json({
            type,
            count: rows.length,
            items: rows.map((r) => ({ ...normalize(r), username: nameMap.get(r.uuid) ?? null })),
          })
        }

        // Unban / unmute
        const type = action === 'unmute' ? 'mutes' : 'bans'
        const id = Number(body?.id)
        if (!Number.isFinite(id) || id <= 0) return json({ error: 'invalid id' }, 400)
        const silent = body?.silent !== false // default silent
        const reason = (body?.reason ?? (silent ? '#silent web-console' : 'web-console')).toString().slice(0, 255)
        const removedBy = (body?.removed_by ?? gate.userName).toString().slice(0, 64)

        // Mark inactive and stamp removal fields. LiteBans plugin reads removed_by_* on next check.
        // Prefix reason with #silent so any LiteBans listener treats it as suppressed broadcast.
        const finalReason = silent && !reason.startsWith('#silent') ? `#silent ${reason}` : reason
        const [res] = await conn.query(
          `UPDATE \`${PREFIX}${type}\`
             SET active = 0,
                 removed_by_name = ?,
                 removed_by_reason = ?,
                 removed_by_date = ?
           WHERE id = ? AND active = 1`,
          [removedBy, finalReason, Date.now(), id],
        ) as any
        const affected = res?.affectedRows ?? 0
        if (!affected) return json({ error: 'no active punishment with that id' }, 404)
        return json({ ok: true, type, id, silent, removed_by: removedBy })
      } finally {
        await conn.end()
      }
    }
    return json({ error: 'unknown action' }, 400)
  }

  try {
    const url = new URL(req.url)
    const player = (url.searchParams.get('player') ?? '').trim()
    const recentDays = Number(url.searchParams.get('recent_days') ?? '0')
    const debug = url.searchParams.get('debug') === '1'

    const cfg0 = await loadMysqlConfig()
    if (!cfg0) {
      return json({ error: 'MySQL not configured' }, 500)
    }

    // Debug mode: list every table in the connected DB with row counts.
    // Internal schema details — admin/owner only.
    if (debug) {
      const gate = await requireAdmin(req)
      if (!gate.ok) return gate.resp
      const conn = await connect()
      const [tbls] = await conn.query(
        `SELECT table_name AS name FROM information_schema.tables WHERE table_schema = ?`,
        [cfg0.database],
      )
      const tables: Array<{ name: string; rows: number | string }> = []
      for (const t of tbls as any[]) {
        const name = t.name ?? t.NAME ?? t.TABLE_NAME
        try {
          const [c] = await conn.query(`SELECT COUNT(*) AS n FROM \`${name}\``)
          tables.push({ name, rows: Number((c as any[])[0].n) })
        } catch (e) {
          tables.push({ name, rows: `error: ${(e as Error).message}` })
        }
      }
      await conn.end()
      return json({
        database: cfg0.database,
        configured_prefix: PREFIX,
        host: cfg0.host,
        port: cfg0.port,
        tables,
      })
    }


    // Recent mode: bulk network-wide punishment history — admin/owner only.
    if (recentDays > 0) {
      const gate = await requireAdmin(req)
      if (!gate.ok) return gate.resp
      const conn = await connect()
      const sinceMs = Date.now() - recentDays * 86400_000
      const kinds: Array<'bans'|'mutes'|'warnings'|'kicks'> = ['bans','mutes','warnings','kicks']
      const out: Record<string, any[]> = {}
      for (const k of kinds) {
        try {
          const [rows] = await conn.query(
            `SELECT id, uuid, reason, banned_by_name, banned_by_uuid, removed_by_name, removed_by_reason, removed_by_date,
                    time, until, active, ipban, server_scope
             FROM \`${PREFIX}${k}\` WHERE time >= ? ORDER BY time DESC LIMIT 500`,
            [sinceMs],
          )
          out[k] = (rows as any[]).map(normalize)
        } catch (e) {
          try {
            const [rows] = await conn.query(
              `SELECT id, uuid, reason, banned_by_name, banned_by_uuid, time, until, active
               FROM \`${PREFIX}${k}\` WHERE time >= ? ORDER BY time DESC LIMIT 500`,
              [sinceMs],
            )
            out[k] = (rows as any[]).map(normalize)
          } catch (e2) { out[k] = []; console.error(`recent ${k} failed`, e2) }
        }
      }
      await conn.end()
      return json({
        recent_days: recentDays,
        counts: Object.fromEntries(kinds.map(k => [k, out[k]?.length ?? 0])),
        ...out,
      })
    }

    if (!player) return json({ error: 'Missing player' }, 400)

    let uuidDashed: string | null = null
    let username: string | null = null

    if (UUID_RE.test(player)) {
      uuidDashed = dashUuid(player)
    } else if (NAME_RE.test(player)) {
      const resolved = await resolveUsername(player)
      if (resolved) {
        uuidDashed = resolved.uuid
        username = resolved.name
      }
    } else {
      return json({ error: 'Invalid player identifier' }, 400)
    }

    const conn = await connect()

    // Fallback: resolve name -> UUID via LiteBans history if Mojang failed
    if (!uuidDashed && NAME_RE.test(player)) {
      try {
        const [rows] = await conn.query(
          `SELECT uuid, name, MAX(date) AS d FROM \`${PREFIX}history\`
           WHERE LOWER(name) = LOWER(?) GROUP BY uuid, name ORDER BY d DESC LIMIT 1`,
          [player],
        )
        const r = (rows as any[])[0]
        if (r?.uuid) {
          uuidDashed = dashUuid(r.uuid)
          username = r.name ?? player
        }
      } catch {}
      if (!uuidDashed) {
        await conn.end()
        return json({ error: 'Player not found', player }, 404)
      }
    }

    const undashed = stripUuid(uuidDashed!)
    const variants = [uuidDashed, undashed]

    const select = (kind: string) => `
      SELECT id, uuid, reason, banned_by_name, banned_by_uuid, removed_by_name, removed_by_reason, removed_by_date,
             time, until, active, ipban, ipban_wildcard, server_scope, server_origin
      FROM \`${PREFIX}${kind}\`
      WHERE uuid IN (?, ?)
      ORDER BY time DESC
      LIMIT 200
    `
    const kinds: Array<'bans'|'mutes'|'warnings'|'kicks'> = ['bans','mutes','warnings','kicks']
    const result: Record<string, any[]> = {}
    for (const k of kinds) {
      try {
        const [rows] = await conn.query(select(k), variants)
        result[k] = (rows as any[]).map(normalize)
      } catch (e) {
        // Kicks/warnings tables may not have all columns; retry minimal
        try {
          const [rows] = await conn.query(
            `SELECT id, uuid, reason, banned_by_name, banned_by_uuid, time, until, active
             FROM \`${PREFIX}${k}\` WHERE uuid IN (?, ?) ORDER BY time DESC LIMIT 200`,
            variants,
          )
          result[k] = (rows as any[]).map(normalize)
        } catch (e2) {
          result[k] = []
          console.error(`query ${k} failed`, e2)
        }
      }
    }

    // Last known username from history if present
    if (!username) {
      try {
        const [rows] = await conn.query(
          `SELECT name FROM \`${PREFIX}history\` WHERE uuid IN (?, ?) ORDER BY date DESC LIMIT 1`,
          variants,
        )
        const r = (rows as any[])[0]
        if (r?.name) username = r.name
      } catch {}
    }

    await conn.end()
    return json({
      player: { uuid: uuidDashed, username },
      counts: Object.fromEntries(kinds.map(k => [k, result[k]?.length ?? 0])),
      ...result,
    })
  } catch (e) {
    const msg = (e as Error).message ?? 'lookup failed'
    console.error('punishments-lookup error', e)
    // Punishment DB unreachable (server offline / firewall): degrade gracefully
    // instead of a 500 so the page can render a friendly notice.
    const offline = /ECONNREFUSED|ETIMEDOUT|EHOSTUNREACH|ENOTFOUND|connect|timeout/i.test(msg)
    if (offline) {
      return json({
        unavailable: true,
        error: 'Punishment database is currently unreachable. Please try again later.',
        player: { uuid: null, username: null },
        counts: { bans: 0, mutes: 0, kicks: 0, warnings: 0 },
        bans: [], mutes: [], kicks: [], warnings: [],
      })
    }
    return json({ error: msg }, 500)
  }

})

function normalize(r: any) {
  const toIso = (v: any) => {
    if (v === null || v === undefined) return null
    const n = typeof v === 'bigint' ? Number(v) : Number(v)
    if (!Number.isFinite(n) || n <= 0) return null
    // JS Date valid range is roughly ±8.64e15 ms from epoch
    if (n > 8.64e15) return null
    try { return new Date(n).toISOString() } catch { return null }
  }
  return {
    id: r.id,
    uuid: r.uuid,
    reason: r.reason,
    issued_by: r.banned_by_name,
    issued_by_uuid: r.banned_by_uuid,
    removed_by: r.removed_by_name ?? null,
    removed_reason: r.removed_by_reason ?? null,
    removed_at: toIso(r.removed_by_date),
    issued_at: toIso(r.time),
    expires_at: r.until && Number(r.until) > 0 ? toIso(r.until) : null,
    permanent: !r.until || Number(r.until) <= 0,
    active: Number(r.active) === 1 || r.active === true || r.active === '1',
    ip_ban: Number(r.ipban) === 1 || r.ipban === true || r.ipban === '1',
    server: r.server_scope ?? null,
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
