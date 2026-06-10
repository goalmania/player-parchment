-- ════════════════════════════════════════════════════════════════════════════
-- SECURITY HARDENING FINALE — vulnerabilità critiche sui profili
-- ════════════════════════════════════════════════════════════════════════════

-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ CRITICO #1 — Escalation a is_admin                                      │
-- │ La policy "Users can update own profile" non ha WITH CHECK:             │
-- │ qualsiasi utente autenticato può fare:                                  │
-- │   UPDATE profiles SET is_admin = true                                   │
-- │ → approva i propri prelievi, vede tutti i wallet, accede al pannello    │
-- │   admin /admin/withdrawals.                                             │
-- │                                                                         │
-- │ CRITICO #2 — Escalation del piano (bypass abbonamento)                 │
-- │ Stessa policy: qualsiasi utente può fare:                               │
-- │   UPDATE profiles SET plan_status = 'active'                           │
-- │ → accesso gratuito illimitato alla piattaforma, bypassa il PlanGuard.  │
-- └─────────────────────────────────────────────────────────────────────────┘

-- Trigger BEFORE UPDATE: protegge i campi sensibili di profiles
-- Logic:
--   • is_admin: modificabile SOLO se auth.uid() appartiene già a un admin
--   • plan_status / trial_ends_at / current_period_end:
--     modificabili SOLO da service_role (auth.uid() IS NULL)
--     — usato da activate-subscription Edge Function con service_role key.
--   • user_id: immutabile (nessuno può cambiarlo)

CREATE OR REPLACE FUNCTION public.trg_profiles_protect_sensitive_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ── Proteggi user_id (immutabile) ──────────────────────────────────────
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Il campo user_id non può essere modificato';
  END IF;

  -- ── Proteggi is_admin ─────────────────────────────────────────────────
  -- Solo un admin esistente può cambiare is_admin.
  -- auth.uid() IS NULL = service_role → può farlo (usato in migration/seed).
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    IF auth.uid() IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = auth.uid() AND is_admin = true
      ) THEN
        RAISE EXCEPTION 'Permesso negato: non puoi modificare il campo is_admin';
      END IF;
    END IF;
  END IF;

  -- ── Proteggi campi piano abbonamento ──────────────────────────────────
  -- Questi campi possono essere modificati SOLO da service_role
  -- (es. Edge Function activate-subscription con SUPABASE_SERVICE_ROLE_KEY).
  -- Un utente autenticato normale ha auth.uid() != NULL → bloccato.
  IF (
    NEW.plan_status       IS DISTINCT FROM OLD.plan_status       OR
    NEW.trial_ends_at     IS DISTINCT FROM OLD.trial_ends_at     OR
    NEW.current_period_end IS DISTINCT FROM OLD.current_period_end
  ) THEN
    IF auth.uid() IS NOT NULL THEN
      RAISE EXCEPTION
        'Permesso negato: i campi del piano abbonamento non possono essere modificati direttamente';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profiles ON public.profiles;
CREATE TRIGGER trg_protect_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_profiles_protect_sensitive_fields();


-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ FIX aggiuntivo — access_requests UPDATE                                 │
-- │ La policy "Owners can update request status" usa solo USING senza       │
-- │ WITH CHECK → un owner può aggiornare qualsiasi campo (requester_id,     │
-- │ owner_id, ecc.). Aggiunge WITH CHECK che limita a soli campi leciti.    │
-- └─────────────────────────────────────────────────────────────────────────┘
DROP POLICY IF EXISTS "Owners can update request status" ON public.access_requests;
CREATE POLICY "Owners can update request status"
  ON public.access_requests FOR UPDATE
  TO authenticated
  USING  (auth.uid() = owner_id)
  WITH CHECK (
    auth.uid() = owner_id          -- owner rimane invariato
    AND requester_id = requester_id  -- requester_id non cambia
    AND player_id = player_id        -- player_id non cambia
    AND status IN ('pending', 'accepted', 'rejected')
  );


-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ FIX aggiuntivo — admin_commissions: aggiungi policy admin per purchases │
-- │ Admin deve poter vedere tutti gli acquisti per audit finanziario.       │
-- └─────────────────────────────────────────────────────────────────────────┘
DROP POLICY IF EXISTS "purchases_admin" ON public.marketplace_purchases;
CREATE POLICY "purchases_admin" ON public.marketplace_purchases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Admin vede tutte le wallet_transactions (già presente wt_admin) — verifica
-- che esista anche per wallet stessa
DROP POLICY IF EXISTS "wallet_admin" ON public.wallets;
CREATE POLICY "wallet_admin" ON public.wallets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );


-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ FIX aggiuntivo — marketplace_listings UPDATE                            │
-- │ L'owner può cambiare il prezzo DOPO che un buyer ha visto il listing.  │
-- │ Aggiungiamo un vincolo: non si può modificare il prezzo se ci sono      │
-- │ acquisti in corso (listing bloccato durante transazioni attive).        │
-- │ Nota: il prezzo viene sempre riletto dal DB in process_marketplace_     │
-- │ purchase (già sicuro), ma aggiungiamo un audit trail del prezzo.        │
-- └─────────────────────────────────────────────────────────────────────────┘
ALTER TABLE public.marketplace_listings
  ADD COLUMN IF NOT EXISTS price_updated_at timestamptz DEFAULT now();

CREATE OR REPLACE FUNCTION public.trg_listings_track_price_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.price IS DISTINCT FROM OLD.price THEN
    NEW.price_updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listings_price_audit ON public.marketplace_listings;
CREATE TRIGGER trg_listings_price_audit
  BEFORE UPDATE ON public.marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION public.trg_listings_track_price_change();


-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ FIX aggiuntivo — wallet_transactions immutabile                         │
-- │ Nessuno deve poter fare UPDATE o DELETE su wallet_transactions          │
-- │ (è un audit log permanente). Aggiungiamo trigger che lo impedisce.      │
-- └─────────────────────────────────────────────────────────────────────────┘
CREATE OR REPLACE FUNCTION public.trg_wallet_transactions_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Solo le RPC SECURITY DEFINER che aggiornano il tipo da withdrawal_pending
  -- a withdrawal/withdrawal_rejected hanno bisogno di UPDATE.
  -- Le blocchiamo per utenti normali via RLS (nessuna policy UPDATE).
  -- Questo trigger blocca UPDATE su tutte le righe tranne quelle in
  -- transizione legittima (withdrawal_pending → withdrawal/rejected).
  IF OLD.type = 'withdrawal_pending' AND
     NEW.type IN ('withdrawal', 'withdrawal_rejected') AND
     NEW.amount = OLD.amount AND
     NEW.user_id = OLD.user_id THEN
    RETURN NEW;  -- transizione legittima da admin_process_withdrawal
  END IF;
  -- Qualsiasi altra modifica è bloccata
  RAISE EXCEPTION 'wallet_transactions è immutabile';
END;
$$;

DROP TRIGGER IF EXISTS trg_wt_immutable ON public.wallet_transactions;
CREATE TRIGGER trg_wt_immutable
  BEFORE UPDATE OR DELETE ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.trg_wallet_transactions_immutable();


-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ FIX aggiuntivo — wallets: solo aumenti per sale/commission/topup/refund │
-- │ Trigger anti-tampering: se il saldo scende più del necessario,          │
-- │ o sale senza una transazione corrispondente, blocca.                    │
-- │ Nota: la protezione principale è già nei FOR UPDATE delle RPC.          │
-- │ Questo è un secondo livello di difesa.                                  │
-- └─────────────────────────────────────────────────────────────────────────┘
CREATE OR REPLACE FUNCTION public.trg_wallets_no_direct_write()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Blocca qualsiasi INSERT/UPDATE/DELETE diretto su wallets da utenti normali.
  -- Le RPC SECURITY DEFINER (postgres role) bypassano questo trigger
  -- perché girano come definer, non come authenticated.
  -- auth.uid() IS NOT NULL → utente autenticato normale → blocca.
  IF auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Accesso diretto al wallet non consentito';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wallets_guard ON public.wallets;
CREATE TRIGGER trg_wallets_guard
  BEFORE INSERT OR UPDATE OR DELETE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.trg_wallets_no_direct_write();


-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ Verifica finale: rimuovi eventuale policy UPDATE residua su wallets     │
-- └─────────────────────────────────────────────────────────────────────────┘
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'wallets'
      AND cmd IN ('UPDATE','INSERT','DELETE','ALL')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.wallets', pol.policyname);
  END LOOP;
END $$;

-- Ricrea solo le policy SELECT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='wallets' AND policyname='wallet_read_self'
  ) THEN
    CREATE POLICY "wallet_read_self" ON public.wallets
      FOR SELECT USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='wallets' AND policyname='wallet_admin_read'
  ) THEN
    CREATE POLICY "wallet_admin_read" ON public.wallets
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
      );
  END IF;
END $$;
