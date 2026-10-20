// REST-only maintenance for Discord status panels. Never Identify here:
// short-lived gateway sessions exhaust Discord's session-start allowance.
// Continuous online presence requires a persistent external gateway client.
import { createClient } from 'npm:@supabase/supabase-js@2.108.2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { syncStatusPanels } from '../_shared/discord-status.ts'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
    const admin = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
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

    // Keep existing panels fresh without connecting to the Discord gateway.
    await syncStatusPanels(admin)
    const { error } = await admin.from('site_content').upsert(
      { key: 'wardenbot_presence', value: { at: null, text: null, connectionMode: 'rest_only' } },
      { onConflict: 'key' },
    )
    if (error) throw new Error('Could not update bot connection status')
    return json({ ok: true, online: false, connectionMode: 'rest_only', panelsRefreshed: true })
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
