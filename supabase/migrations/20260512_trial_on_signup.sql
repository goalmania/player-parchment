-- =====================================================
-- Aggiorna handle_new_user: ogni nuova registrazione
-- ottiene automaticamente 7 giorni di prova gratuita
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    org_type,
    org_name,
    display_name,
    plan_status,
    trial_ends_at
  )
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'org_type')::public.org_type, 'agency'),
    COALESCE(NEW.raw_user_meta_data->>'org_name', 'Mia Organizzazione'),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    'trial',
    now() + interval '7 days'
  )
  ON CONFLICT (user_id) DO UPDATE
    SET plan_status   = EXCLUDED.plan_status,
        trial_ends_at = EXCLUDED.trial_ends_at;
  RETURN NEW;
END;
$$;
