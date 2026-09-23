import { createClient } from 'npm:@supabase/supabase-js@2.108.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_BASE = 'https://www.warden.rip'
const CHANNEL_ID = '1522474298332287037'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 80)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })
  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const botToken = Deno.env.get('DISCORD_BOT_TOKEN')
    if (!botToken) return json({ ok: false, error: 'DISCORD_BOT_TOKEN not set' }, 500)

    const body = await req.json().catch(() => ({}))
    const entryId: string | undefined = body?.entryId
    if (!entryId) return json({ ok: false, error: 'entryId required' }, 400)

    // --- Caller authentication: staff session or internal service-role call ---
    const ANON_KEY =
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
    if (!token) return json({ ok: false, error: 'Unauthorized' }, 401)

    let callerRole = ''
    try {
      callerRole = JSON.parse(
        atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
      )?.role ?? ''
    } catch {
      callerRole = ''
    }

    if (callerRole !== 'service_role') {
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
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
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
    const { data: entry, error } = await admin
      .from('changelog_entries')
      .select('id, title, content, category, version, entry_date, published, discord_posted_at')
      .eq('id', entryId)
      .maybeSingle()
    if (error || !entry) return json({ ok: false, error: 'Entry not found' }, 404)
    if (!entry.published) return json({ ok: true, skipped: 'not published' })
    if (entry.discord_posted_at) return json({ ok: true, skipped: 'already posted' })

    const plain = (entry.content || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
    const description = plain.length > 1800 ? plain.slice(0, 1800) + '…' : plain
    const fields: { name: string; value: string; inline?: boolean }[] = []
    if (entry.category) fields.push({ name: 'Category', value: String(entry.category), inline: true })
    if (entry.version) fields.push({ name: 'Version', value: String(entry.version), inline: true })

    const resp = await fetch(`https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '📝 **New changelog entry**',
        embeds: [{
          title: (entry.title || 'Changelog update').slice(0, 256),
          url: `${SITE_BASE}/changelog/${slugify(entry.title || '')}`,
          description,
          color: 0xef4444,
          timestamp: new Date(entry.entry_date ?? Date.now()).toISOString(),
          footer: { text: 'Warden Network Changelog' },
          fields,
        }],
        allowed_mentions: { parse: [] },
      }),
    })

    if (!resp.ok) {
      const t = await resp.text().catch(() => '')
      console.error('Discord post failed', resp.status, t)
      return json({ ok: false, status: resp.status, error: t.slice(0, 500) }, 502)
    }

    await admin.from('changelog_entries').update({ discord_posted_at: new Date().toISOString() }).eq('id', entry.id)
    return json({ ok: true })
  } catch (e) {
    console.error(e)
    return json({ ok: false, error: (e as Error).message }, 500)
  }
})
