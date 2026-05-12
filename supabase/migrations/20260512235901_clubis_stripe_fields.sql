-- =====================================================
-- Clubis: aggiungi cancel_at_period_end a clubs
-- (stripe_customer_id, stripe_subscription_id, plan_status,
--  trial_ends_at, current_period_end esistono già)
-- =====================================================

ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false;

-- Indice per lookup rapido dal webhook Stripe
CREATE UNIQUE INDEX IF NOT EXISTS clubs_stripe_customer_id_idx
  ON public.clubs (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- Funzione schedulata: marca come 'inactive' i club con abbonamento scaduto
CREATE OR REPLACE FUNCTION public.expire_stale_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.clubs
  SET plan_status = 'inactive'
  WHERE plan_status = 'active'
    AND current_period_end IS NOT NULL
    AND current_period_end < now() - interval '1 hour';
END;
$$;
