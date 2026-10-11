import { createClient } from 'npm:@supabase/supabase-js@2.108.2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { getDiscordBotToken } from '../_shared/discord-token.ts'

// Grants the supporter role to members whose Discord custom status
// advertises the server, and removes it from members who stopped.
// Custom statuses are only available over the Discord gateway, so this
// opens a short-lived websocket, requests all members with presences,
// then applies role changes over the REST API.

const SUPPORTER_ROLE_ID = '1558635744006897756'
const STATUS_NEEDLES = [
  'discord.warden.rip',
  'warden.rip/discord',
  'discord.gg/ajffxdt7wc',
  '.gg/ajffxdt7wc',
]
const INTENTS = (1 << 0) | (1 << 1) | (1 << 8) // GUILDS | GUILD_MEMBERS | GUILD_PRESENCES

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

type MemberInfo = { id: string; roles: string[]; statusText: string }

function statusMatches(text: string): boolean {
  const t = text.toLowerCase()
  return STATUS_NEEDLES.some((n) => t.includes(n))
}

// Connects to the Discord gateway and collects every guild member with
// their custom status. Resolves once all member chunks have arrived.
async function fetchMembersWithStatuses(token: string, guildId: string): Promise<MemberInfo[]> {
  return await new Promise((resolve, reject) => {
    const members = new Map<string, MemberInfo>()
    const ws = new WebSocket('wss://gateway.discord.gg/?v=10&encoding=json')
    let heartbeat: number | undefined
    let seq: number | null = null
    let expectedChunks = -1
    let receivedChunks = 0
    const done = () => {
      clearTimeout(timer)
      if (heartbeat) clearInterval(heartbeat)
      try { ws.close() } catch { /* ignore */ }
      resolve([...members.values()])
    }
    const timer = setTimeout(() => {
      try { ws.close() } catch { /* ignore */ }
      if (members.size > 0) resolve([...members.values()])
      else reject(new Error('Timed out waiting for Discord member data'))
    }, 90000)

    ws.onerror = () => {
      clearTimeout(timer)
      reject(new Error('Could not connect to the Discord gateway'))
    }

    ws.onmessage = (ev) => {
      let msg: any
      try { msg = JSON.parse(ev.data) } catch { return }
      if (msg.s != null) seq = msg.s

      if (msg.op === 10) {
        // Hello: start heartbeating and identify.
        const interval = msg.d.heartbeat_interval
        heartbeat = setInterval(() => {
          ws.send(JSON.stringify({ op: 1, d: seq }))
        }, interval)
        ws.send(JSON.stringify({
          op: 2,
          d: {
            token,
            intents: INTENTS,
            properties: { os: 'linux', browser: 'wardenmc-sync', device: 'wardenmc-sync' },
          },
        }))
        return
      }
      if (msg.op === 1) { ws.send(JSON.stringify({ op: 1, d: seq })); return }
      if (msg.op === 11) return
      if (msg.op === 9 || msg.op === 7) {
        clearTimeout(timer)
        reject(new Error('Discord rejected the bot session (check the bot token and gateway intents)'))
        return
      }
      if (msg.op !== 0) return

      if (msg.t === 'READY') {
        // Request the full member list with presences.
        ws.send(JSON.stringify({
          op: 8,
          d: { guild_id: guildId, query: '', limit: 0, presences: true, nonce: 'supporter-sync' },
        }))
        return
      }

      if (msg.t === 'GUILD_MEMBERS_CHUNK' && msg.d?.nonce === 'supporter-sync') {
        const presences = new Map<string, string>()
        for (const p of msg.d.presences ?? []) {
          const custom = (p.activities ?? []).find((a: any) => a.type === 4)
          const text = [custom?.state, custom?.name].filter(Boolean).join(' ')
          if (p.user?.id) presences.set(p.user.id, text ?? '')
        }
        for (const m of msg.d.members ?? []) {
          const id = m.user?.id
          if (!id) continue
          members.set(id, {
            id,
            roles: m.roles ?? [],
            statusText: presences.get(id) ?? '',
          })
        }
        expectedChunks = msg.d.chunk_count
        receivedChunks++
        if (expectedChunks > 0 && receivedChunks >= expectedChunks) done()
      }
    }
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const started = Date.now()
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

    // --- Auth: staff session, or the scheduled job's shared secret ---
    const syncSecret = req.headers.get('x-sync-secret') ?? ''
    const { data: secretSetting } = await admin
      .from('site_content')
      .select('value')
      .eq('key', 'supporter_sync')
      .maybeSingle()
    const expectedSecret = (secretSetting?.value as Record<string, unknown> | null)?.secret
    const isScheduled = !!syncSecret && !!expectedSecret && syncSecret === expectedSecret

    if (!isScheduled) {
      const ANON_KEY = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      const authHeader = req.headers.get('Authorization') ?? ''
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
      if (!token) return json({ ok: false, error: 'Unauthorized' }, 401)
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: userData } = await userClient.auth.getUser()
      if (!userData?.user) return json({ ok: false, error: 'Unauthorized' }, 401)
      const { data: roleRows } = await userClient
        .from('user_roles')
        .select('role')
        .eq('user_id', userData.user.id)
        .in('role', ['admin', 'owner', 'star'])
        .limit(1)
      if (!roleRows || roleRows.length === 0) {
        return json({ ok: false, error: 'Forbidden — staff only' }, 403)
      }
    }

    const botToken = await getDiscordBotToken()
    if (!botToken) return json({ ok: false, error: 'Bot token is not configured' }, 500)

    const { data: cfgRow } = await admin
      .from('site_content')
      .select('value')
      .eq('key', 'discord_bot')
      .maybeSingle()
    const guildId = String((cfgRow?.value as Record<string, unknown> | null)?.guildId ?? '').trim()
    if (!guildId) return json({ ok: false, error: 'Set the Guild ID in the Discord settings first' }, 400)

    const members = await fetchMembersWithStatuses(botToken, guildId)

    const api = (method: string, path: string) =>
      fetch(`https://discord.com/api/v10${path}`, {
        method,
        headers: { Authorization: `Bot ${botToken}` },
      })

    let granted = 0
    let removed = 0
    let matched = 0
    const errors: string[] = []

    for (const m of members) {
      const wants = statusMatches(m.statusText)
      if (wants) matched++
      const has = m.roles.includes(SUPPORTER_ROLE_ID)
      if (wants && !has) {
        const r = await api('PUT', `/guilds/${guildId}/members/${m.id}/roles/${SUPPORTER_ROLE_ID}`)
        if (r.ok) granted++
        else errors.push(`grant ${m.id}: ${r.status}`)
      } else if (!wants && has) {
        const r = await api('DELETE', `/guilds/${guildId}/members/${m.id}/roles/${SUPPORTER_ROLE_ID}`)
        if (r.ok) removed++
        else errors.push(`remove ${m.id}: ${r.status}`)
      }
    }

    const result = { scanned: members.length, matched, granted, removed, errors: errors.slice(0, 5) }
    await admin.from('discord_bot_action_logs').insert({
      action: 'supporter-sync',
      status: errors.length ? 'error' : 'success',
      error: errors.length ? errors.join('; ') : null,
      duration_ms: Date.now() - started,
      request: { guildId },
      response: result,
    })

    return json({ ok: errors.length === 0, ...result })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    try {
      const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
      await admin.from('discord_bot_action_logs').insert({
        action: 'supporter-sync',
        status: 'error',
        error: message,
        duration_ms: Date.now() - started,
        request: {},
      })
    } catch { /* ignore logging failure */ }
    return json({ ok: false, error: message }, 500)
  }
})
