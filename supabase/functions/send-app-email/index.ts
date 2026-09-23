import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { EmailAPIError } from 'npm:@lovable.dev/email-js@0.1.0'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

// Sends an app email through Lovable's managed email API.
// Suppression, retries, rate limits and unsubscribe are handled by Lovable.
//
// Auth note: verify_jwt = true in config.toml, so Supabase's gateway validates
// the caller's JWT before the request reaches this code.

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing required environment variables')
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let templateName: string
  let recipientEmail: string
  let idempotencyKey: string
  let templateData: Record<string, any> = {}
  let fromOverride: string | undefined
  let subjectOverride: string | undefined
  let bodyHtmlOverride: string | undefined
  let bodyTextOverride: string | undefined

  try {
    const body = await req.json()
    templateName = body.templateName || body.template_name
    recipientEmail = body.recipientEmail || body.recipient_email
    idempotencyKey = body.idempotencyKey || body.idempotency_key || crypto.randomUUID()
    if (body.templateData && typeof body.templateData === 'object') {
      templateData = body.templateData
    }
    if (typeof body.from === 'string' && body.from.trim()) fromOverride = body.from.trim()
    if (typeof body.subjectOverride === 'string' && body.subjectOverride.trim()) {
      subjectOverride = body.subjectOverride.trim()
    }
    if (typeof body.bodyHtmlOverride === 'string' && body.bodyHtmlOverride.trim()) {
      bodyHtmlOverride = body.bodyHtmlOverride
    }
    if (typeof body.bodyTextOverride === 'string' && body.bodyTextOverride.trim()) {
      bodyTextOverride = body.bodyTextOverride
    }
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!templateName) {
    return new Response(JSON.stringify({ error: 'templateName is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // ---------------------------------------------------------------------
  // Authorization.
  // Internal (service-role) callers and staff may send anything.
  // Everyone else may only trigger a small set of transactional templates.
  // Client-supplied subject/body/from overrides are ignored for them, and
  // the recipient is derived server-side (account email, fixed staff inbox,
  // or the contact address on a verified ban appeal row).
  // ---------------------------------------------------------------------
  const SELF_TEMPLATES = new Set([
    'order-confirmation',
    'application-received',
  ])
  // Templates that always go to the site's own staff inbox — the client
  // never chooses the recipient for these.
  const STAFF_INBOX_TEMPLATES = new Set([
    'ban-appeal-admin',
    'application-admin',
    'report-admin',
  ])
  // Ban appeals may be filed without an account, so these two are reachable
  // by anonymous callers, but only when a matching appeal row exists.
  const APPEAL_TEMPLATES = new Set([
    'ban-appeal-received',
    'ban-appeal-admin',
  ])
  // Server-side From addresses, so callers never need to pass `from`.
  const TEMPLATE_FROM: Record<string, string> = {
    'application-received': 'Warden Network Applications <applications@warden.rip>',
    'application-admin': 'Warden Network Applications <applications@warden.rip>',
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (!token) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let callerRole = ''
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    callerRole = typeof payload?.role === 'string' ? payload.role : ''
  } catch {
    callerRole = ''
  }

  const forbidden = () =>
    new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  // Confirms an appeal matching the supplied details was really filed here.
  const findRecentAppeal = async (username: unknown) => {
    if (typeof username !== 'string' || !username.trim()) return null
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('ban_appeals')
      .select('id, email, minecraft_username, created_at')
      .eq('minecraft_username', username.trim())
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return data ?? null
  }

  if (callerRole !== 'service_role') {
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData } = await userClient.auth.getUser()
    const caller = userData?.user

    const { data: isAdmin } = caller
      ? await userClient.rpc('is_current_user_admin')
      : { data: false }

    if (!isAdmin) {
      // Untrusted caller: never honour client-supplied content overrides.
      subjectOverride = undefined
      bodyHtmlOverride = undefined
      bodyTextOverride = undefined
      fromOverride = TEMPLATE_FROM[templateName]

      if (APPEAL_TEMPLATES.has(templateName)) {
        const appeal = await findRecentAppeal(templateData?.minecraftUsername)
        if (!appeal) return forbidden()
        recipientEmail = templateName === 'ban-appeal-admin' ? '' : (appeal.email ?? '')
        if (!recipientEmail && templateName === 'ban-appeal-received') return forbidden()
      } else if (!caller) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      } else if (STAFF_INBOX_TEMPLATES.has(templateName)) {
        // Fixed internal recipient — ignore anything the client supplied.
        recipientEmail = ''
      } else if (SELF_TEMPLATES.has(templateName)) {
        if (!caller.email) return forbidden()
        recipientEmail = caller.email
      } else {
        return forbidden()
      }
    }
  }

  const log = async (status: string, errorMessage?: string) => {
    const { error } = await supabase.from('email_send_log').insert({
      template_name: templateName,
      recipient_email: recipientEmail ?? '',
      status,
      error_message: errorMessage ?? null,
    })
    if (error) console.error('Failed to write email_send_log row', error)
  }

  try {
    const result = await sendTemplateEmail(templateName, recipientEmail, {
      templateData,
      idempotencyKey,
      from: fromOverride,
      subjectOverride,
      htmlOverride: bodyHtmlOverride,
      textOverride: bodyTextOverride,
    })

    if (!result.sent) {
      await log('suppressed')
      console.log('Email suppressed', { templateName })
      return new Response(
        JSON.stringify({ success: false, reason: 'email_suppressed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    await log('sent')
    return new Response(JSON.stringify({ success: true, sent: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const code = error instanceof EmailAPIError ? error.code : undefined
    console.error('Failed to send app email', { templateName, code, message })
    await log('failed', message.slice(0, 500))

    const notFound = message.includes('not found. Available:')
    return new Response(JSON.stringify({ error: message, code }), {
      status: notFound ? 404 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
