// Owner-only: enqueue a console command for a Minecraft server.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401)

  const sb = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } })
  const { data: u } = await sb.auth.getUser()
  if (!u?.user) return json({ error: 'unauthorized' }, 401)

  // Owner check via existing helper exposed in public
  const admin = createClient(SUPABASE_URL, SERVICE_KEY)
  const { data: roles } = await admin
    .from('user_roles').select('role').eq('user_id', u.user.id)
  const isOwner = (roles ?? []).some((r: any) => r.role === 'owner')
  if (!isOwner) return json({ error: 'forbidden' }, 403)

  let body: any = {}
  try { body = await req.json() } catch {}
  const serverId = String(body?.server_id ?? '').trim()
  const command = String(body?.command ?? '').trim()
  if (!serverId) return json({ error: 'missing server_id' }, 400)
  if (!command || command.length > 1000) return json({ error: 'invalid command' }, 400)

  // Verify the server exists, is enabled, and belongs to the caller
  const { data: srv } = await admin
    .from('mc_servers').select('id, enabled, created_by').eq('id', serverId).maybeSingle()
  if (!srv) return json({ error: 'server not found' }, 404)
  if (srv.created_by !== u.user.id) return json({ error: 'forbidden' }, 403)
  if (!srv.enabled) return json({ error: 'server disabled' }, 400)

  // Rate limit: max 30 commands/min per server
  const since = new Date(Date.now() - 60_000).toISOString()
  const { count } = await admin
    .from('mc_console_commands')
    .select('id', { head: true, count: 'exact' })
    .eq('server_id', serverId)
    .gte('created_at', since)
  if ((count ?? 0) >= 30) return json({ error: 'rate limit exceeded (30/min)' }, 429)

  const { data: row, error } = await admin
    .from('mc_console_commands')
    .insert({ server_id: serverId, command, issued_by: u.user.id })
    .select('id, created_at')
    .single()
  if (error) return json({ error: error.message }, 500)

  return json({ ok: true, id: row.id, created_at: row.created_at })
})
