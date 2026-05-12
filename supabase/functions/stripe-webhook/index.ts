/**
 * POST /functions/v1/stripe-webhook
 *
 * Gestisce gli eventi Stripe per DM Scout e Clubis.
 * Aggiorna automaticamente plan_status e current_period_end in profiles.
 *
 * Variabili d'ambiente richieste:
 *   STRIPE_SECRET_KEY        — chiave segreta Stripe (sk_live_...)
 *   STRIPE_WEBHOOK_SECRET    — secret del webhook Stripe (whsec_...)
 *   SUPABASE_URL             — URL Supabase (iniettato automaticamente)
 *   SUPABASE_SERVICE_ROLE_KEY — service role key (iniettato automaticamente)
 *
 * Registra questo endpoint in Stripe Dashboard → Developers → Webhooks
 * con gli eventi: checkout.session.completed, invoice.paid,
 * customer.subscription.updated, customer.subscription.deleted,
 * invoice.payment_failed
 */

// @ts-ignore — esm.sh nel runtime Deno
import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const stripeKey     = Deno.env.get('STRIPE_SECRET_KEY')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  if (!stripeKey || !webhookSecret) {
    return json({ error: 'Variabili Stripe non configurate' }, 500)
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2024-06-20' })
  const body      = await req.text()
  const signature = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Webhook signature invalid:', msg)
    return json({ error: `Webhook error: ${msg}` }, 400)
  }

  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  // ── Helpers ───────────────────────────────────────────────────────────────

  async function updateByCustomer(customerId: string, updates: Record<string, unknown>) {
    const { error } = await db
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('stripe_customer_id', customerId)
    if (error) console.error('updateByCustomer error:', error.message)
    return error
  }

  async function updateByEmail(email: string, updates: Record<string, unknown>) {
    // listUsers potrebbe essere lento su basi grandi; ok per ora
    const { data: { users }, error } = await db.auth.admin.listUsers({ perPage: 1000 })
    if (error) { console.error('listUsers error:', error.message); return }
    const authUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (!authUser) { console.warn('updateByEmail: nessun utente per', email); return }
    const { error: upErr } = await db
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('user_id', authUser.id)
    if (upErr) console.error('updateByEmail update error:', upErr.message)
  }

  async function activateFromSession(
    customerId: string,
    subscriptionId: string,
    email: string | null | undefined,
    currentPeriodEnd: string,
  ) {
    const payload = {
      plan_status:           'active',
      stripe_customer_id:    customerId,
      stripe_subscription_id: subscriptionId,
      current_period_end:    currentPeriodEnd,
      cancel_at_period_end:  false,
    }
    const err = await updateByCustomer(customerId, payload)
    // Se il profilo non ha ancora stripe_customer_id, cerca per email
    if (err && email) await updateByEmail(email, payload)
  }

  // ── Event handling ────────────────────────────────────────────────────────

  switch (event.type) {

    // Utente ha completato il checkout (prima sottoscrizione o upgrade)
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode !== 'subscription') break

      const customerId     = session.customer as string
      const subscriptionId = session.subscription as string
      const email          = session.customer_email ?? session.customer_details?.email

      const sub = await stripe.subscriptions.retrieve(subscriptionId)
      const periodEnd = new Date(sub.current_period_end * 1000).toISOString()

      await activateFromSession(customerId, subscriptionId, email, periodEnd)
      console.log('checkout.session.completed → attivato', email ?? customerId)
      break
    }

    // Fattura pagata = rinnovo automatico riuscito
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice
      const customerId     = invoice.customer as string
      const subscriptionId = (invoice.subscription as string | null) ?? ''
      if (!subscriptionId) break

      const sub = await stripe.subscriptions.retrieve(subscriptionId)
      const periodEnd = new Date(sub.current_period_end * 1000).toISOString()

      await updateByCustomer(customerId, {
        plan_status:          'active',
        current_period_end:   periodEnd,
        cancel_at_period_end: false,
      })
      console.log('invoice.paid → rinnovato', customerId, 'fino a', periodEnd)
      break
    }

    // Abbonamento aggiornato (es. annullamento futuro, cambio piano)
    case 'customer.subscription.updated': {
      const sub        = event.data.object as Stripe.Subscription
      const customerId = sub.customer as string
      const periodEnd  = new Date(sub.current_period_end * 1000).toISOString()

      if (sub.status === 'active' || sub.status === 'trialing') {
        await updateByCustomer(customerId, {
          plan_status:          'active',
          current_period_end:   periodEnd,
          cancel_at_period_end: sub.cancel_at_period_end ?? false,
        })
      } else if (['canceled', 'unpaid', 'past_due', 'incomplete_expired'].includes(sub.status)) {
        await updateByCustomer(customerId, {
          plan_status:          'expired',
          cancel_at_period_end: false,
        })
      }
      console.log(`customer.subscription.updated → ${sub.status}`, customerId)
      break
    }

    // Abbonamento cancellato definitivamente
    case 'customer.subscription.deleted': {
      const sub        = event.data.object as Stripe.Subscription
      const customerId = sub.customer as string
      await updateByCustomer(customerId, {
        plan_status:           'expired',
        stripe_subscription_id: null,
        cancel_at_period_end:  false,
      })
      console.log('customer.subscription.deleted → expired', customerId)
      break
    }

    // Pagamento fallito: Stripe riproverà; non espiriamo subito
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      console.warn('invoice.payment_failed per customer', invoice.customer, '— Stripe riproverà')
      break
    }

    default:
      console.log(`Evento ignorato: ${event.type}`)
  }

  return json({ received: true }, 200)
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}
