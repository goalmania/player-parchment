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

  // Leggi stripe_customer_id dal profilo
  const { data: profile, error: profErr } = await db
    .from('profiles')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profErr) return json({ error: profErr.message }, 500)

  if (!profile?.stripe_customer_id) {
    return json({ error: 'Nessun abbonamento Stripe trovato per questo account.' }, 404)
  }

  const body = await req.json().catch(() => ({}))
  const returnUrl: string = body.return_url ?? `${Deno.env.get('APP_URL') ?? 'https://app.dmscout.it'}/account`

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  if (!stripeKey) return json({ error: 'STRIPE_SECRET_KEY non configurata' }, 500)

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' })

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer:   profile.stripe_customer_id,
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
