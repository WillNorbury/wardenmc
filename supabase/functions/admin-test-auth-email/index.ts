import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const ANON_KEY = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')
  if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) return new Response('Server configuration error', { status: 500, headers: corsHeaders })

  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) {
    return new Response(JSON.stringify({ error: 'missing_auth' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Verify caller
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: userData, error: userErr } = await userClient.auth.getUser()
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: 'invalid_session' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const caller = userData.user

  const admin = createClient(SUPABASE_URL, SERVICE_KEY)

  // Check admin role
  const { data: roles } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', caller.id)
  const isAdmin = (roles ?? []).some((r: any) => r.role === 'admin' || r.role === 'owner')
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const type = body?.type as 'signup' | 'recovery'
  // The verified account determines the recipient, never a chosen address.
  const email = caller.email?.trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'invalid_email' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  if (type !== 'signup' && type !== 'recovery') {
    return new Response(JSON.stringify({ error: 'invalid_type' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (body?.email !== undefined && (typeof body.email !== 'string' || body.email.trim().toLowerCase() !== email)) {
    return new Response(JSON.stringify({ error: 'Test emails can only be sent to your own account email' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const startedAt = new Date().toISOString()

  try {
    if (type === 'signup') {
      // Try signup confirmation first. If the user already exists, fall back
      // to a magic-link email — both route through auth-email-hook so branding
      // verification still works.
      const randomPw =
        crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '').toUpperCase()
      const { error } = await admin.auth.admin.generateLink({
        type: 'signup',
        email,
        password: randomPw,
      })
      if (error) {
        const msg = error.message?.toLowerCase() ?? ''
        const alreadyExists =
          msg.includes('already been registered') || msg.includes('already registered') || msg.includes('already exists')
        if (!alreadyExists) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        const { error: mlErr } = await admin.auth.admin.generateLink({
          type: 'magiclink',
          email,
        })
        if (mlErr) {
          return new Response(
            JSON.stringify({ error: mlErr.message, hint: 'User exists; magic-link fallback also failed.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }
        return new Response(
          JSON.stringify({
            ok: true,
            type: 'magiclink',
            email,
            triggered_at: startedAt,
            note: 'User already existed — sent a magic-link email instead (same branding/hook).',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
    } else {
      const { error } = await admin.auth.admin.generateLink({
        type: 'recovery',
        email,
      })
      if (error) {
        return new Response(
          JSON.stringify({ error: error.message, hint: 'Recovery requires an existing user.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
    }
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'unknown_error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }

  return new Response(
    JSON.stringify({ ok: true, type, email, triggered_at: startedAt }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
