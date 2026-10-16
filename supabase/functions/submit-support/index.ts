import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { z } from 'npm:zod@3.23.8'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const schema = z.object({
  subject: z.string().trim().min(3).max(150),
  category: z.enum(['General question', 'Server help', 'Account help', 'Plugin help', 'Bug report']),
  body: z.string().trim().min(1).max(5000),
}).strict()
const respond = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return respond({ error: 'Method not allowed' }, 405)
  try {
    const authorization = req.headers.get('Authorization') ?? ''
    const client = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', { global: { headers: { Authorization: authorization } } })
    const { data: { user }, error: authError } = await client.auth.getUser()
    if (authError || !user) return respond({ error: 'Please sign in to send a question.' }, 401)
    const parsed = schema.safeParse(await req.json())
    if (!parsed.success) return respond({ error: 'Please check your subject, category and message.' }, 400)
    const { data: ticket, error } = await client.from('support_tickets').insert({ ...parsed.data, user_id: user.id }).select('id').single()
    if (error) return respond({ error: error.message.includes('Too many') ? 'Too many questions. Please try again later.' : 'Your question could not be saved. Please try again.' }, error.message.includes('Too many') ? 429 : 400)
    let notified = false
    try {
      const result = await sendTemplateEmail('support-admin', '', { templateData: parsed.data, idempotencyKey: `support-admin-${ticket.id}` })
      notified = result.sent
    } catch {
      console.warn('Support question saved; owner email could not be queued', { ticketId: ticket.id })
    }
    return respond({ success: true, id: ticket.id, notified })
  } catch {
    return respond({ error: 'Unable to send your question. Please try again.' }, 400)
  }
})