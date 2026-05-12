# Variabili d'ambiente Supabase — Guida setup

Hai **due** progetti Supabase separati:

| Prodotto   | Project ID                   | Dashboard URL |
|------------|------------------------------|---------------|
| **DM Scout** | `cruhgitpzvesoreluvqn`     | https://supabase.com/dashboard/project/cruhgitpzvesoreluvqn/settings/functions |
| **Clubis**   | `hmsdmpvstqpfuwkslpnc`     | https://supabase.com/dashboard/project/hmsdmpvstqpfuwkslpnc/settings/functions |

Le Edge Functions (`stripe-webhook`, `stripe-portal`, `activate-subscription`) vanno
deployate su **entrambi** i progetti se Clubis usa la stessa architettura.

---

## DM Scout — `cruhgitpzvesoreluvqn`

Vai su **Project Settings → Edge Functions → Secrets** e aggiungi:

```
STRIPE_SECRET_KEY       = sk_live_...          (Stripe Dashboard → API keys)
STRIPE_WEBHOOK_SECRET   = whsec_...            (Stripe Dashboard → Webhooks → endpoint DM Scout)
ADMIN_SECRET_KEY        = <tua_chiave_segreta> (stringa random, stessa usata da dmfootballservices.it)
APP_URL                 = https://app.dmscout.it
```

### Webhook Stripe da registrare
Vai su **Stripe Dashboard → Developers → Webhooks → Add endpoint**:

- **Endpoint URL**: `https://cruhgitpzvesoreluvqn.supabase.co/functions/v1/stripe-webhook`
- **Events to listen**:
  - `checkout.session.completed`
  - `invoice.paid`
  - `invoice.payment_failed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`

Copia il **Signing secret** (`whsec_...`) e incollalo come `STRIPE_WEBHOOK_SECRET`.

### Deploy Edge Functions DM Scout
```bash
supabase link --project-ref cruhgitpzvesoreluvqn
supabase functions deploy stripe-webhook
supabase functions deploy stripe-portal
supabase functions deploy activate-subscription
```

### Migrazione DB DM Scout
```bash
supabase db push --project-ref cruhgitpzvesoreluvqn
```
Applica `20260512_stripe_ids.sql` (aggiunge `stripe_customer_id`, `stripe_subscription_id`, `cancel_at_period_end`).

---

## Clubis — `hmsdmpvstqpfuwkslpnc`

Vai su **Project Settings → Edge Functions → Secrets** e aggiungi
(usa le credenziali Stripe del **conto Clubis**, non DM Scout):

```
STRIPE_SECRET_KEY       = sk_live_...          (Stripe account Clubis)
STRIPE_WEBHOOK_SECRET   = whsec_...            (Stripe Webhooks → endpoint Clubis)
ADMIN_SECRET_KEY        = <tua_chiave_segreta>
APP_URL                 = https://app.clubis.it   (o il dominio reale di Clubis)
```

### Webhook Stripe da registrare (Clubis)
- **Endpoint URL**: `https://hmsdmpvstqpfuwkslpnc.supabase.co/functions/v1/stripe-webhook`
- **Events**: stessi di DM Scout sopra

### Deploy Edge Functions Clubis
```bash
supabase link --project-ref hmsdmpvstqpfuwkslpnc
supabase functions deploy stripe-webhook
supabase functions deploy stripe-portal
supabase functions deploy activate-subscription
```

### Migrazione DB Clubis
Applica gli stessi file di migration su Clubis:
```bash
supabase db push --project-ref hmsdmpvstqpfuwkslpnc
```

---

## Portale clienti Stripe — configurazione

Per abilitare il pulsante "Gestisci abbonamento" nell'Account page, devi configurare
il **Customer Portal** in Stripe per entrambi gli account:

1. Vai su **Stripe Dashboard → Billing → Customer portal → Settings**
2. Abilita: modifica metodo di pagamento, visualizza fatture, cancella abbonamento
3. Aggiungi il dominio dell'app come URL di ritorno consentito

---

## Variabili frontend (`.env`)

```bash
# DM Scout
VITE_STRIPE_LINK_DMSCOUT_MONTHLY=https://buy.stripe.com/dRmdRb8Yg5Ml1QSaU04wM0c
VITE_STRIPE_LINK_DMSCOUT_ANNUAL=https://buy.stripe.com/cNi5kFb6o5MldzA8LS4wM0d

# Clubis — sostituisci con i link reali dal tuo account Stripe Clubis
VITE_STRIPE_LINK_CLUBIS_MONTHLY=https://buy.stripe.com/TODO_clubis_monthly
VITE_STRIPE_LINK_CLUBIS_ANNUAL=https://buy.stripe.com/TODO_clubis_annual
```

---

## Flusso completo rinnovo automatico

```
Utente paga su Stripe
       │
       ▼
Stripe invia evento "invoice.paid"
       │
       ▼
stripe-webhook riceve l'evento
       │
       ▼
Verifica firma (STRIPE_WEBHOOK_SECRET)
       │
       ▼
Aggiorna profiles:
  plan_status = 'active'
  current_period_end = <nuova data rinnovo>
       │
       ▼
Al prossimo accesso, PlanGuard controlla
current_period_end → accesso consentito ✓
```
