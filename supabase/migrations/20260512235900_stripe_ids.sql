-- =====================================================
-- Aggiungi campi Stripe a profiles per webhook e portale
-- =====================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end   BOOLEAN NOT NULL DEFAULT false;

-- Indice per lookup rapido via stripe_customer_id (usato dal webhook)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_customer_id_idx
  ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- =====================================================
-- Funzione schedulata: marca come 'expired' gli abbonamenti
-- con current_period_end scaduto e plan_status = 'active'
-- (belt-and-suspenders rispetto al webhook Stripe)
-- =====================================================

CREATE OR REPLACE FUNCTION public.expire_stale_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET plan_status = 'expired'
  WHERE plan_status = 'active'
    AND current_period_end IS NOT NULL
    AND current_period_end < now() - interval '1 hour';
END;
$$;

-- Se hai pg_cron disponibile su Supabase Pro, decommenta:
-- SELECT cron.schedule('expire-subscriptions', '0 * * * *', 'SELECT public.expire_stale_subscriptions()');
