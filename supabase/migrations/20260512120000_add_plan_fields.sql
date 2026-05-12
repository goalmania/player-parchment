-- =====================================================
-- PIANO / ABBONAMENTO — campi aggiunti a profiles
-- =====================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_status TEXT NOT NULL DEFAULT 'inactive'
    CHECK (plan_status IN ('trial','active','expired','inactive')),
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

-- =====================================================
-- TRIAL REGISTRATIONS — anti-abuso: una prova per email
-- =====================================================

CREATE TABLE IF NOT EXISTS public.trial_registrations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT NOT NULL UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trial_registrations ENABLE ROW LEVEL SECURITY;

-- Solo service_role può scrivere/leggere (nessuna policy pubblica)
