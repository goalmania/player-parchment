/**
 * POST /functions/v1/activate-subscription
 *
 * Chiamato da dmfootballservices.it quando un utente acquista o rinnova
 * un abbonamento DM Scout.
 * Protetto da ADMIN_SECRET_KEY (header: Authorization: Bearer <key>).
 *
 * Body:
 *   email              string  — email utente
 *   current_period_end string  — ISO date scadenza (opzionale, null = no scadenza)
 *
 * Response 200: { ok: true, user_id, plan_status }
 * Response 404: { error: "Nessun utente trovato per questa email" }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // ── Auth ─────────────────────────────────────────────────────
  const adminKey = Deno.env.get('ADMIN_SECRET_KEY')
  if (!adminKey) {
    return new Response(JSON.stringify({ error: 'ADMIN_SECRET_KEY non configurata' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader
  if (token !== adminKey) {
    return new Response(JSON.stringify({ error: 'Non autorizzato' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // ── Body ─────────────────────────────────────────────────────
  let body: { email: string; current_period_end?: string | null }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'JSON non valido' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { email, current_period_end } = body
  const emailNorm = email?.toLowerCase().trim()
  if (!emailNorm) {
    return new Response(JSON.stringify({ error: 'Campo obbligatorio: email' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // ── Client admin ─────────────────────────────────────────────
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const db = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ── Trova utente per email ────────────────────────────────────
  const { data: { users }, error: listErr } = await db.auth.admin.listUsers()
  if (listErr) {
    return new Response(JSON.stringify({ error: listErr.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  const authUser = users.find(u => u.email === emailNorm)
  if (!authUser) {
    return new Response(JSON.stringify({ error: 'Nessun utente trovato per questa email.' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // ── Aggiorna profilo ──────────────────────────────────────────
  const updatePayload: Record<string, unknown> = {
    plan_status: 'active',
    updated_at: new Date().toISOString(),
  }
  if (current_period_end) {
    updatePayload.current_period_end = current_period_end
  }

  const { error: updateErr } = await db
    .from('profiles')
    .update(updatePayload)
    .eq('user_id', authUser.id)

  if (updateErr) {
    return new Response(JSON.stringify({ error: updateErr.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(
    JSON.stringify({ ok: true, user_id: authUser.id, plan_status: 'active' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})
