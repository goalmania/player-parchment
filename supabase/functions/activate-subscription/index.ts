/**
 * POST /functions/v1/activate-subscription
 *
 * Chiamato da dmfootballservices.it o Clubis quando un utente acquista
 * o rinnova un abbonamento manualmente (es. pagamento offline, promo, etc.).
 * Per i pagamenti Stripe automatici usa invece il webhook stripe-webhook.
 *
 * Protetto da ADMIN_SECRET_KEY (header: Authorization: Bearer <key>).
 *
 * Body:
 *   email                string  — email utente (obbligatorio)
 *   current_period_end   string  — ISO date scadenza (opzionale)
 *   stripe_customer_id   string  — ID cliente Stripe (opzionale)
 *   stripe_subscription_id string — ID sottoscrizione Stripe (opzionale)
 *   product              string  — 'dmscout' | 'clubis' (default: 'dmscout')
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

  // ── Auth ─────────────────────────────────────────────────────────────────
  const adminKey = Deno.env.get('ADMIN_SECRET_KEY')
  if (!adminKey) {
    return json({ error: 'ADMIN_SECRET_KEY non configurata' }, 500)
  }
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader
  if (token !== adminKey) {
    return json({ error: 'Non autorizzato' }, 401)
  }

  // ── Body ──────────────────────────────────────────────────────────────────
  let body: {
    email: string
    current_period_end?: string | null
    stripe_customer_id?: string | null
    stripe_subscription_id?: string | null
    product?: 'dmscout' | 'clubis'
  }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'JSON non valido' }, 400)
  }

  const { email, current_period_end, stripe_customer_id, stripe_subscription_id } = body
  const emailNorm = email?.toLowerCase().trim()
  if (!emailNorm) {
    return json({ error: 'Campo obbligatorio: email' }, 400)
  }

  // ── Client admin ──────────────────────────────────────────────────────────
  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  // ── Trova utente per email ────────────────────────────────────────────────
  const { data: { users }, error: listErr } = await db.auth.admin.listUsers({ perPage: 1000 })
  if (listErr) return json({ error: listErr.message }, 500)

  const authUser = users.find(u => u.email === emailNorm)
  if (!authUser) {
    return json({ error: 'Nessun utente trovato per questa email.' }, 404)
  }

  // ── Aggiorna profilo ──────────────────────────────────────────────────────
  const updatePayload: Record<string, unknown> = {
    plan_status: 'active',
    cancel_at_period_end: false,
    updated_at: new Date().toISOString(),
  }
  if (current_period_end)    updatePayload.current_period_end    = current_period_end
  if (stripe_customer_id)    updatePayload.stripe_customer_id    = stripe_customer_id
  if (stripe_subscription_id) updatePayload.stripe_subscription_id = stripe_subscription_id

  // DM Scout usa 'profiles' (user_id), Clubis usa 'clubs' (owner_id o simile)
  const TABLE      = Deno.env.get('SUBSCRIPTION_TABLE')      ?? 'profiles'
  const USER_FIELD = Deno.env.get('SUBSCRIPTION_USER_FIELD') ?? 'user_id'

  const { error: updateErr } = await db
    .from(TABLE)
    .update(updatePayload)
    .eq(USER_FIELD, authUser.id)

  if (updateErr) return json({ error: updateErr.message }, 500)

  return json({ ok: true, user_id: authUser.id, plan_status: 'active' }, 200)
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}
