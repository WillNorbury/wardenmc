import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { EmailAPIError } from 'npm:@lovable.dev/email-js@0.1.0'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const SITE_BASE = 'https://warden.rip'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const nameOf = (p: { display_name?: string | null; mc_username?: string | null } | null) =>
  p?.display_name?.trim() || p?.mc_username?.trim() || 'there'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !serviceKey) return json({ error: 'Server configuration error' }, 500)

  const authHeader = req.headers.get('Authorization') ?? ''
  const userClient = createClient(
    url,
    Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data: userData } = await userClient.auth.getUser()
  const caller = userData?.user
  if (!caller) return json({ error: 'Unauthorized' }, 401)

  const body = await req.json().catch(() => ({}))
  const postId = typeof body?.postId === 'string' ? body.postId : ''
  if (!postId) return json({ error: 'postId is required' }, 400)

  const admin = createClient(url, serviceKey)

  const { data: post, error: postErr } = await admin
    .from('posts')
    .select('id,user_id,content,reply_to,created_at')
    .eq('id', postId)
    .maybeSingle()
  if (postErr) return json({ error: postErr.message }, 500)
  if (!post) return json({ error: 'Post not found' }, 404)
  if (post.user_id !== caller.id) return json({ error: 'Forbidden' }, 403)

  const results: Record<string, unknown> = {}

  const profileOf = async (id: string) => {
    const { data } = await admin
      .from('profiles')
      .select('id,display_name,mc_username')
      .eq('id', id)
      .maybeSingle()
    return data as { display_name: string | null; mc_username: string | null } | null
  }
  const emailOf = async (id: string) => {
    const { data } = await admin.auth.admin.getUserById(id)
    return data?.user?.email ?? null
  }

  const send = async (key: string, template: string, to: string, data: Record<string, unknown>, idem: string) => {
    try {
      const r = await sendTemplateEmail(template, to, { templateData: data, idempotencyKey: idem })
      results[key] = r
    } catch (e) {
      const msg = e instanceof EmailAPIError ? `${e.code}: ${e.message}` : String(e)
      console.error('notify-post send failed', key, msg)
      results[key] = { sent: false, error: msg }
    }
  }

  const authorProfile = await profileOf(post.user_id)
  const authorEmail = await emailOf(post.user_id)

  // Confirmation to the author that their post is published
  if (authorEmail) {
    await send('author', 'post-published', authorEmail, {
      authorName: nameOf(authorProfile),
      content: post.content,
      postUrl: `${SITE_BASE}/posts`,
    }, `post-published-${post.id}`)
  }

  // Notify the parent post's author about the reply
  if (post.reply_to) {
    const { data: parent } = await admin
      .from('posts')
      .select('id,user_id,content')
      .eq('id', post.reply_to)
      .maybeSingle()
    if (parent && parent.user_id !== post.user_id) {
      const parentEmail = await emailOf(parent.user_id)
      if (parentEmail) {
        const parentProfile = await profileOf(parent.user_id)
        await send('parent', 'post-reply', parentEmail, {
          recipientName: nameOf(parentProfile),
          replierName: nameOf(authorProfile),
          reply: post.content,
          originalContent: parent.content,
          postUrl: `${SITE_BASE}/posts`,
        }, `post-reply-${post.id}`)
      }
    }
  }

  return json({ ok: true, results })
})
