/**
 * POST /functions/v1/stripe-portal
 *
 * Crea una sessione del portale clienti Stripe per permettere all'utente
 * di gestire il proprio abbonamento (rinnovo, cancellazione, metodo di pagamento).
 *
 * Richiede l'access token JWT Supabase nell'header Authorization.
 *
 * Body (opzionale):
 *   return_url  string  — URL di ritorno dopo il portale (default: /account)
 *
 * Response 200: { url: string }
 * Response 401: non autenticato
 * Response 404: nessun cliente Stripe associato al profilo
 */

// @ts-ignore — esm.sh nel runtime Deno
import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader

  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  // Verifica JWT utente
  const { data: { user }, error: authErr } = await db.auth.getUser(token)
  if (authErr || !user) {
    return json({ error: 'Non autorizzato' }, 401)
  }

  // DM Scout: SUBSCRIPTION_TABLE=profiles, SUBSCRIPTION_USER_FIELD=user_id
  // Clubis:   SUBSCRIPTION_TABLE=clubs, SUBSCRIPTION_LINK_TABLE=utenti,
  //           SUBSCRIPTION_LINK_USER_FIELD=id, SUBSCRIPTION_LINK_FK=club_id
  const TABLE            = Deno.env.get('SUBSCRIPTION_TABLE')            ?? 'profiles'
  const USER_FIELD       = Deno.env.get('SUBSCRIPTION_USER_FIELD')       ?? 'user_id'
  const LINK_TABLE       = Deno.env.get('SUBSCRIPTION_LINK_TABLE')       // opzionale
  const LINK_USER_FIELD  = Deno.env.get('SUBSCRIPTION_LINK_USER_FIELD')  ?? 'id'
  const LINK_FK          = Deno.env.get('SUBSCRIPTION_LINK_FK')          ?? 'club_id'

  let stripeCustomerId: string | null = null

  if (LINK_TABLE) {
    // Clubis: utenti.id → utenti.club_id → clubs.stripe_customer_id
    const { data: link, error: linkErr } = await db
      .from(LINK_TABLE)
      .select(LINK_FK)
      .eq(LINK_USER_FIELD, user.id)
      .maybeSingle()
    if (linkErr) return json({ error: linkErr.message }, 500)
    if (!link) return json({ error: 'Utente non associato a nessun club.' }, 404)

    const { data: sub, error: subErr } = await db
      .from(TABLE)
      .select('stripe_customer_id')
      .eq('id', (link as Record<string, string>)[LINK_FK])
      .maybeSingle()
    if (subErr) return json({ error: subErr.message }, 500)
    stripeCustomerId = sub?.stripe_customer_id ?? null
  } else {
    // DM Scout: profiles.user_id → profiles.stripe_customer_id
    const { data: profile, error: profErr } = await db
      .from(TABLE)
      .select('stripe_customer_id')
      .eq(USER_FIELD, user.id)
      .maybeSingle()
    if (profErr) return json({ error: profErr.message }, 500)
    stripeCustomerId = profile?.stripe_customer_id ?? null
  }

  if (!stripeCustomerId) {
    return json({ error: 'Nessun abbonamento Stripe trovato per questo account.' }, 404)
  }

  const body = await req.json().catch(() => ({}))
  const returnUrl: string = body.return_url ?? `${Deno.env.get('APP_URL') ?? 'https://app.dmscout.it'}/account`

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  if (!stripeKey) return json({ error: 'STRIPE_SECRET_KEY non configurata' }, 500)

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' })

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer:   stripeCustomerId,
      return_url: returnUrl,
    })
    return json({ url: session.url }, 200)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('stripe-portal error:', msg)
    return json({ error: msg }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}
