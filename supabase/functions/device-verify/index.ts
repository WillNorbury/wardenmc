import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const DAY = 24 * 60 * 60 * 1000
const REMEMBER_MS = 30 * DAY
const SESSION_MS = 12 * 60 * 60 * 1000
const CODE_TTL_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 5

async function sha256(input: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function clientIp(req: Request) {
  const fwd = req.headers.get('x-forwarded-for') ?? ''
  return (fwd.split(',')[0] || req.headers.get('cf-connecting-ip') || '').trim() || null
}

function describeDevice(ua: string | null) {
  if (!ua) return 'Unknown device'
  const browser =
    /Edg\//.test(ua) ? 'Edge'
    : /OPR\/|Opera/.test(ua) ? 'Opera'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) ? 'Safari'
    : 'Browser'
  const os =
    /Windows/.test(ua) ? 'Windows'
    : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
    : /Android/.test(ua) ? 'Android'
    : /iPhone|iPad|iOS/.test(ua) ? 'iOS'
    : /Linux/.test(ua) ? 'Linux'
    : 'Unknown OS'
  return `${browser} on ${os}`
}

function maskEmail(email: string) {
  const [name, domain] = email.split('@')
  if (!domain) return email
  const head = name.slice(0, 2)
  return `${head}${'*'.repeat(Math.max(name.length - 2, 1))}@${domain}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const authHeader = req.headers.get('Authorization') ?? ''
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userErr } = await userClient.auth.getUser()
  const user = userData?.user
  if (userErr || !user) return json(401, { error: 'unauthorized' })

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    return json(400, { error: 'invalid_json' })
  }

  const action = String(body.action ?? 'check')
  const deviceId = typeof body.device_id === 'string' ? body.device_id.slice(0, 100) : ''
  if (!deviceId) return json(400, { error: 'device_id required' })

  const ip = clientIp(req)
  const ua = req.headers.get('user-agent')
  const admin = createClient(supabaseUrl, serviceKey)

  /** Returns true only when a code was actually emailed to the user. */
  const issueCode = async (): Promise<boolean> => {
    // Cryptographically secure 8-digit code (not Math.random)
    const buf = new Uint32Array(2)
    crypto.getRandomValues(buf)
    const n = (buf[0] * 4294967296 + buf[1]) % 90000000
    const code = String(10000000 + n)
    await admin.from('login_verifications').insert({
      user_id: user.id,
      device_id: deviceId,
      code_hash: await sha256(code),
      ip,
      user_agent: ua,
      expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    })
    if (!user.email) return false
    try {
      const res = await sendTemplateEmail('login-verification', user.email, {
        templateData: { code, ip: ip ?? undefined, device: describeDevice(ua) },
      })
      return res.sent === true
    } catch (e) {
      console.error('failed to send verification email', e)
      return false
    }
  }

  try {
    if (action === 'check' || action === 'resend') {
      const { data: device } = await admin
        .from('trusted_devices')
        .select('*')
        .eq('user_id', user.id)
        .eq('device_id', deviceId)
        .maybeSingle()

      const trusted =
        !!device &&
        new Date(device.trusted_until).getTime() > Date.now() &&
        (!device.ip || !ip || device.ip === ip)

      if (trusted && action === 'check') {
        await admin
          .from('trusted_devices')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', device!.id)
        return json(200, { required: false })
      }

      const emailed = await issueCode()
      if (!emailed) {
        // Email delivery is unavailable (unverified sender domain, suppressed
        // recipient, ...). Never lock the member out over a mail failure —
        // trust the device for the session length instead.
        console.error('device-verify: verification email not delivered, failing open')
        await admin.from('trusted_devices').upsert(
          {
            user_id: user.id,
            device_id: deviceId,
            ip,
            user_agent: ua,
            trusted_until: new Date(Date.now() + SESSION_MS).toISOString(),
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,device_id' },
        )
        return json(200, { required: false, email_unavailable: true })
      }
      return json(200, {
        required: true,
        reason: device ? 'new_network' : 'new_device',
        email: user.email ? maskEmail(user.email) : null,
      })
    }

    if (action === 'confirm') {
      const code = String(body.code ?? '').trim()
      const remember = body.remember === true
      if (!/^\d{6}$/.test(code)) return json(400, { ok: false, error: 'invalid_code_format' })

      const { data: rows } = await admin
        .from('login_verifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('device_id', deviceId)
        .is('consumed_at', null)
        .order('created_at', { ascending: false })
        .limit(1)

      const row = rows?.[0]
      if (!row) return json(400, { ok: false, error: 'no_pending_code' })
      if (new Date(row.expires_at).getTime() < Date.now())
        return json(400, { ok: false, error: 'expired' })
      if (row.attempts >= MAX_ATTEMPTS) return json(429, { ok: false, error: 'too_many_attempts' })

      if ((await sha256(code)) !== row.code_hash) {
        await admin
          .from('login_verifications')
          .update({ attempts: row.attempts + 1 })
          .eq('id', row.id)
        return json(400, {
          ok: false,
          error: 'incorrect',
          attemptsLeft: Math.max(MAX_ATTEMPTS - (row.attempts + 1), 0),
        })
      }

      await admin
        .from('login_verifications')
        .update({ consumed_at: new Date().toISOString() })
        .eq('id', row.id)

      const trustedUntil = new Date(Date.now() + (remember ? REMEMBER_MS : SESSION_MS)).toISOString()
      await admin.from('trusted_devices').upsert(
        {
          user_id: user.id,
          device_id: deviceId,
          ip,
          user_agent: ua,
          trusted_until: trustedUntil,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,device_id' },
      )

      return json(200, { ok: true, trustedUntil, remembered: remember })
    }

    return json(400, { error: 'unknown_action' })
  } catch (e: any) {
    console.error('device-verify error', e)
    return json(500, { error: String(e?.message ?? e) })
  }
})
