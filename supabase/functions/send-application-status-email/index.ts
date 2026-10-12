import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { marked } from 'npm:marked@12'
import { SITE_URL } from '../_shared/site-urls.ts'

function applyVars(input: string, data: Record<string, string>): string {
  return input.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) => data[k] ?? '')
}

function wrapHtml(inner: string, accent: string) {
  return `<!doctype html><html><body style="background:#ffffff;font-family:Inter,Arial,sans-serif;margin:0;padding:0;">
  <div style="max-width:560px;margin:0 auto;padding:24px 28px;color:hsl(20,25%,15%);font-size:14px;line-height:1.6;border-top:4px solid ${accent};">
  ${inner}
  <p style="font-size:12px;color:#999;margin:24px 0 0;">— Warden Network Staff</p>
  </div></body></html>`
}

// Admin-only edge function: looks up an applicant's email from auth.users using
// the service role, then enqueues the `application-status` email via the
// shared send-app-email function.

interface RequestBody {
  applicationId: string
  status: 'approved' | 'rejected' | 'pending' | 'reviewed'
  reviewerNotes?: string | null
  dashboardUrl?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  // Validate caller JWT and role
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) {
    return json({ error: 'Missing Authorization header' }, 401)
  }
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userData.user) {
    return json({ error: 'Not authenticated' }, 401)
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: isAdminRow, error: roleErr } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', userData.user.id)
    .in('role', ['admin', 'owner'])
    .limit(1)
    .maybeSingle()
  if (roleErr) return json({ error: roleErr.message }, 500)
  if (!isAdminRow) return json({ error: 'Forbidden' }, 403)

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }
  if (!body.applicationId || !body.status) {
    return json({ error: 'applicationId and status are required' }, 400)
  }

  const { data: app, error: appErr } = await admin
    .from('applications')
    .select('id, user_id, mc_username, type')
    .eq('id', body.applicationId)
    .maybeSingle()
  if (appErr) return json({ error: appErr.message }, 500)
  if (!app) return json({ error: 'Application not found' }, 404)
  if (!app.user_id) return json({ error: 'Application has no user_id', skipped: true }, 200)

  const { data: userLookup, error: lookupErr } = await admin.auth.admin.getUserById(app.user_id)
  if (lookupErr) return json({ error: lookupErr.message }, 500)
  const recipientEmail = userLookup.user?.email
  if (!recipientEmail) {
    return json({ error: 'Applicant has no email on file', skipped: true }, 200)
  }

  const templateData = {
    mcUsername: app.mc_username ?? '',
    applicationType: app.type ?? '',
    status: body.status,
    reviewerNotes: body.reviewerNotes ?? '',
    dashboardUrl: body.dashboardUrl || SITE_URL,
  }

  // Look up admin-editable override for this status variant
  const { data: override } = await admin
    .from('email_template_overrides')
    .select('subject, body_markdown, enabled')
    .eq('template_name', 'application-status')
    .eq('variant', body.status)
    .maybeSingle()

  let subjectOverride: string | undefined
  let bodyHtmlOverride: string | undefined
  let bodyTextOverride: string | undefined
  if (override?.enabled && override.subject && override.body_markdown) {
    const vars: Record<string, string> = {
      mcUsername: String(templateData.mcUsername),
      applicationType: String(templateData.applicationType),
      status: String(templateData.status),
      reviewerNotes: String(templateData.reviewerNotes),
      dashboardUrl: String(templateData.dashboardUrl),
    }
    subjectOverride = applyVars(override.subject, vars)
    const md = applyVars(override.body_markdown, vars)
    const accent = body.status === 'approved' ? 'hsl(160,84%,39%)' : body.status === 'rejected' ? 'hsl(0,75%,55%)' : body.status === 'reviewed' ? 'hsl(200,90%,55%)' : 'hsl(22,100%,55%)'
    bodyHtmlOverride = wrapHtml(await marked.parse(md), accent)
    bodyTextOverride = md
  }

  const { data: invokeData, error: invokeErr } = await admin.functions.invoke(
    'send-app-email',
    {
      body: {
        templateName: 'application-status',
        recipientEmail,
        idempotencyKey: `application-${app.id}-${body.status}`,
        from: 'Warden Network Applications <applications@warden.rip>',
        templateData,
        subjectOverride,
        bodyHtmlOverride,
        bodyTextOverride,
      },
    },
  )
  if (invokeErr) return json({ error: invokeErr.message }, 500)

  return json({ ok: true, recipientEmail, result: invokeData }, 200)
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
