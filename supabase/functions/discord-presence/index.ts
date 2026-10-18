// Keeps WardenBot showing "online" in Discord 24/7.
// Discord only shows a bot online while it has a live gateway session,
// and serverless functions cannot stay connected forever. This function
// opens a short-lived gateway session that announces an online presence
// (custom status text), holds it for up to ~55 seconds, then exits.
// A pg_cron job calls it every minute, so a fresh session always
// overlaps the previous one and the bot stays green in the member list.
import { createClient } from 'npm:@supabase/supabase-js@2.108.2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { getDiscordBotToken } from '../_shared/discord-token.ts'
import { syncStatusPanels } from '../_shared/discord-status.ts'

const GATEWAY_URL = 'wss://gateway.discord.gg/?v=10&encoding=json'
const INTENTS = 1 << 0 // GUILDS — enough to set presence
const DEFAULT_HOLD_MS = 55000
const MIN_HOLD_MS = 3000
const MAX_HOLD_MS = 55000

// Shown under the bot's name in the member list, like other bots' status lines.
export const PRESENCE_TEXT = '🛡️ Protecting warden.rip | /help'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

// Opens the gateway session, announces presence, heartbeats, and keeps
// the socket open for `holdMs`. Resolves true if presence was announced.
async function holdPresence(token: string, holdMs: number): Promise<boolean> {
  return await new Promise((resolve) => {
    const ws = new WebSocket(GATEWAY_URL)
    let seq: number | null = null
    let heartbeat: number | undefined
    let announced = false
    let settled = false

    const cleanup = (result: boolean) => {
      if (settled) return
      settled = true
      if (heartbeat) clearInterval(heartbeat)
      try { ws.close() } catch { /* ignore */ }
      resolve(result)
    }

    const timer = setTimeout(() => cleanup(announced), holdMs)

    ws.onerror = () => {
      clearTimeout(timer)
      cleanup(announced)
    }
    ws.onclose = () => {
      clearTimeout(timer)
      cleanup(announced)
    }

    ws.onmessage = (ev) => {
      let msg: any
      try { msg = JSON.parse(ev.data) } catch { return }
      if (msg.s != null) seq = msg.s

      if (msg.op === 10) {
        // Hello: start heartbeating, then identify with the presence.
        const interval = msg.d.heartbeat_interval
        heartbeat = setInterval(() => {
          try { ws.send(JSON.stringify({ op: 1, d: seq })) } catch { /* ignore */ }
        }, Math.floor(interval * 0.8))
        ws.send(JSON.stringify({
          op: 2,
          d: {
            token,
            intents: INTENTS,
            properties: { os: 'linux', browser: 'wardenmc-presence', device: 'wardenmc-presence' },
            presence: {
              status: 'online',
              since: null,
              afk: false,
              activities: [{ name: 'Custom Status', type: 4, state: PRESENCE_TEXT }],
            },
          },
        }))
        return
      }
      if (msg.op === 1) {
        try { ws.send(JSON.stringify({ op: 1, d: seq })) } catch { /* ignore */ }
        return
      }
      if (msg.op === 11) return
      if (msg.t === 'READY') {
        announced = true
        return
      }
      if (msg.op === 9 || msg.op === 7) {
        // Invalid session / reconnect requested — let this run end.
        clearTimeout(timer)
        cleanup(announced)
      }
    }
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const admin = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    })

    // --- Auth: the scheduled job's shared secret, or a staff session ---
    const cronSecret = req.headers.get('x-cron-secret') ?? ''
    const isScheduled = !!cronSecret && cronSecret !== '-'
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

    // When called on a schedule, verify the shared secret matches.
    if (isScheduled) {
      const { data: secretSetting } = await admin
        .from('site_content')
        .select('value')
        .eq('key', 'cron_secret')
        .maybeSingle()
      const expected = (secretSetting?.value as Record<string, unknown> | null)?.value
      if (typeof expected !== 'string' || !expected || cronSecret !== expected) {
        return json({ ok: false, error: 'Unauthorized' }, 401)
      }
    }

    const botToken = await getDiscordBotToken()
    if (!botToken) return json({ ok: false, error: 'Bot token is not configured' }, 500)

    // Reuse the authenticated existing keepalive; no new polling schedule.
    try { await syncStatusPanels(admin) }
    catch { console.warn('Status panels could not refresh; will retry next keepalive') }

    let holdMs = DEFAULT_HOLD_MS
    try {
      const body = await req.json()
      const n = Number((body as Record<string, unknown>)?.holdMs)
      if (Number.isFinite(n)) holdMs = Math.min(Math.max(Math.round(n), MIN_HOLD_MS), MAX_HOLD_MS)
    } catch { /* no body — use default hold */ }

    const announced = await holdPresence(botToken, holdMs)
    if (!announced) {
      return json({ ok: false, error: 'Discord gateway session was not established' }, 502)
    }
    return json({ ok: true, presence: PRESENCE_TEXT, heldMs: holdMs })
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
