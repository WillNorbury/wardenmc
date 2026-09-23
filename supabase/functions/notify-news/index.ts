import { createClient } from 'npm:@supabase/supabase-js@2.108.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_BASE = 'https://www.warden.rip'
const FROM = 'Warden Network News <news@warden.rip>'

const enc = new TextEncoder()
const b64url = (buf: ArrayBuffer) => {
  const s = btoa(String.fromCharCode(...new Uint8Array(buf)))
  return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const hmacToken = async (email: string, secret: string) => {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`news:${email}`))
  return b64url(sig)
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const ANON_KEY =
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')!

    const auth = req.headers.get('Authorization') ?? ''
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: auth } },
    })
    const { data: userData } = await userClient.auth.getUser()
    if (!userData?.user) return json({ ok: false, error: 'Unauthorized' }, 401)

    const { data: roleRows } = await userClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .in('role', ['admin', 'owner'])
      .limit(1)
    if (!roleRows || roleRows.length === 0) {
      return json({ ok: false, error: 'Forbidden — admin only' }, 403)
    }

    const body = await req.json().catch(() => ({}))
    const newsId: string | undefined = body?.newsId
    const testEmail: string | undefined =
      typeof body?.testEmail === 'string' && body.testEmail.trim()
        ? body.testEmail.trim().toLowerCase()
        : undefined
    if (!newsId) return json({ ok: false, error: 'newsId required' }, 400)

    if (testEmail) {
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRe.test(testEmail)) {
        return json({ ok: false, error: 'Invalid testEmail' }, 400)
      }
      // Test sends may only go to the requesting admin's own address.
      if (testEmail !== (userData.user.email ?? '').toLowerCase()) {
        return json(
          { ok: false, error: 'Test emails can only be sent to your own account email' },
          403,
        )
      }
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    })

    const { data: entry, error: entryErr } = await admin
      .from('news')
      .select('id, title, slug, content, cover_url, priority, published')
      .eq('id', newsId)
      .maybeSingle()
    if (entryErr || !entry) return json({ ok: false, error: 'News not found' }, 404)
    if (!testEmail && !entry.published) return json({ ok: false, error: 'Not published' }, 400)

    const unsubFnUrl = `${SUPABASE_URL}/functions/v1/unsubscribe-news`

    let list: string[]
    let skippedOptOut = 0
    let skippedSuppressed = 0
    if (testEmail) {
      list = [testEmail]
    } else {
      const recipients = new Set<string>()
      let page = 1
      const perPage = 1000
      while (true) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
        if (error) return json({ ok: false, error: error.message }, 500)
        const users = data?.users ?? []
        for (const u of users) {
          if (u.email && u.email_confirmed_at) recipients.add(u.email.toLowerCase())
        }
        if (users.length < perPage) break
        page += 1
        if (page > 50) break
      }
      const { data: suppressed } = await admin.from('suppressed_emails').select('email')
      for (const row of suppressed ?? []) {
        const e = row?.email ? String(row.email).toLowerCase() : null
        if (e && recipients.delete(e)) skippedSuppressed += 1
      }
      const { data: optOuts } = await admin.from('news_email_opt_outs').select('email')
      for (const row of optOuts ?? []) {
        const e = row?.email ? String(row.email).toLowerCase() : null
        if (e && recipients.delete(e)) skippedOptOut += 1
      }
      list = [...recipients]
    }

    if (list.length === 0) {
      return json({
        ok: true,
        sent: 0,
        total: 0,
        queued: 0,
        skipped_opt_out: skippedOptOut,
        skipped_suppressed: skippedSuppressed,
        message: 'No recipients',
      })
    }

    let queued = 0
    const errors: string[] = []
    for (const email of list) {
      const idempotencyKey = testEmail
        ? `news-${entry.id}-test-${email}-${Date.now()}`
        : `news-${entry.id}-${email}`
      try {
        const token = await hmacToken(email, SERVICE_KEY)
        const newsUnsubscribeUrl =
          `${unsubFnUrl}?email=${encodeURIComponent(email)}&token=${token}`

        const templateData = {
          title: testEmail ? `[TEST] ${entry.title}` : entry.title,
          content: entry.content,
          priority: entry.priority,
          coverUrl: entry.cover_url,
          link: `${SITE_BASE}/news/${entry.slug}`,
          siteName: 'Warden Network',
          newsUnsubscribeUrl,
        }

        const { error } = await admin.functions.invoke('send-app-email', {
          body: {
            templateName: 'news-update',
            recipientEmail: email,
            idempotencyKey,
            from: FROM,
            templateData,
          },
        })
        if (error) {
          errors.push(`${email}: ${error.message}`)
          await admin.from('news_email_deliveries').insert({
            news_id: entry.id,
            recipient_email: email,
            status: 'failed',
            error: error.message,
            message_id: idempotencyKey,
            is_test: !!testEmail,
          })
        } else {
          queued += 1
          await admin.from('news_email_deliveries').insert({
            news_id: entry.id,
            recipient_email: email,
            status: 'queued',
            message_id: idempotencyKey,
            is_test: !!testEmail,
          })
        }
      } catch (e) {
        const msg = (e as Error).message
        errors.push(`${email}: ${msg}`)
        await admin.from('news_email_deliveries').insert({
          news_id: entry.id,
          recipient_email: email,
          status: 'failed',
          error: msg,
          message_id: idempotencyKey,
          is_test: !!testEmail,
        })
      }
    }

    return json({
      ok: true,
      total: list.length,
      queued,
      failed: errors.length,
      skipped_opt_out: skippedOptOut,
      skipped_suppressed: skippedSuppressed,
      errors: errors.slice(0, 10),
    })
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500)
  }
})
