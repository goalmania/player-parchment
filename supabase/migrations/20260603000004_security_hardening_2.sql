-- ════════════════════════════════════════════════════════════════════════════
-- SECURITY HARDENING v2 — vulnerabilità residue su flussi di denaro
-- ════════════════════════════════════════════════════════════════════════════

-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ FIX 1 — CRITICO                                                         │
-- │ access_requests INSERT senza check su status:                           │
-- │ utente poteva fare INSERT {status:'accepted'} e accedere a qualsiasi    │
-- │ report GRATIS, bypassando completamente il marketplace a pagamento.     │
-- └─────────────────────────────────────────────────────────────────────────┘
DROP POLICY IF EXISTS "Users can create requests as themselves" ON public.access_requests;
CREATE POLICY "Users can create requests as themselves"
  ON public.access_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = requester_id
    AND status = 'pending'          -- solo 'pending' permesso in INSERT diretto
  );
-- Le funzioni SECURITY DEFINER (process_marketplace_purchase) girano come
-- postgres (superuser) → bypassano RLS e possono inserire status='accepted'.


-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ FIX 2 — ALTO                                                            │
-- │ marketplace_purchases: INSERT diretto bypassa wallet.                  │
-- │ Rimuovi la policy — solo la RPC process_marketplace_purchase può        │
-- │ inserire righe (gira come SECURITY DEFINER → bypassa RLS).             │
-- └─────────────────────────────────────────────────────────────────────────┘
DROP POLICY IF EXISTS "purchases_insert" ON public.marketplace_purchases;
-- Nessuna policy INSERT = nessun utente normale può inserire direttamente.


-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ FIX 3 — ALTO                                                            │
-- │ marketplace_listings: qualsiasi utente poteva creare una listing per    │
-- │ un giocatore altrui (owner_id = proprio uid, player di altri).         │
-- │ Aggiungo FK + trigger che verifica listing.owner_id = player.owner_id. │
-- └─────────────────────────────────────────────────────────────────────────┘

-- FK mancante su owner_id
ALTER TABLE public.marketplace_listings
  ADD CONSTRAINT ml_owner_fk FOREIGN KEY (owner_id)
    REFERENCES auth.users(id) ON DELETE CASCADE;

-- Trigger: impedisce di listare un giocatore altrui
CREATE OR REPLACE FUNCTION public.trg_listing_owner_must_match_player()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.players
    WHERE id = NEW.player_id AND owner_id = NEW.owner_id
  ) THEN
    RAISE EXCEPTION 'Non puoi pubblicare nel marketplace un giocatore che non è tuo';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_listing_owner_check ON public.marketplace_listings;
CREATE TRIGGER trg_listing_owner_check
  BEFORE INSERT OR UPDATE ON public.marketplace_listings
  FOR EACH ROW EXECUTE FUNCTION public.trg_listing_owner_must_match_player();


-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ FIX 4 — MEDIO                                                           │
-- │ marketplace_listings: nessun cap prezzo → listing da €999.999.         │
-- └─────────────────────────────────────────────────────────────────────────┘
ALTER TABLE public.marketplace_listings
  DROP CONSTRAINT IF EXISTS ml_price_cap;
ALTER TABLE public.marketplace_listings
  ADD CONSTRAINT ml_price_cap CHECK (price >= 0 AND price <= 9999.99);


-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ FIX 5 — MEDIO                                                           │
-- │ marketplace_purchases: nessun CHECK buyer_id != seller_id a DB level.  │
-- └─────────────────────────────────────────────────────────────────────────┘
ALTER TABLE public.marketplace_purchases
  DROP CONSTRAINT IF EXISTS mp_buyer_ne_seller;
ALTER TABLE public.marketplace_purchases
  ADD CONSTRAINT mp_buyer_ne_seller CHECK (buyer_id <> seller_id);

-- Valori negativi non ammessi su price_paid/commission/net_to_seller
ALTER TABLE public.marketplace_purchases
  DROP CONSTRAINT IF EXISTS mp_amounts_positive;
ALTER TABLE public.marketplace_purchases
  ADD CONSTRAINT mp_amounts_positive
    CHECK (price_paid >= 0 AND commission >= 0 AND net_to_seller >= 0);


-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ FIX 6 — MEDIO                                                           │
-- │ process_marketplace_purchase: commissione sparisce silenziosamente se   │
-- │ platform_id è NULL. Ora registra su tabella admin_commissions come      │
-- │ fallback e solleva warning nel log.                                     │
-- └─────────────────────────────────────────────────────────────────────────┘
CREATE TABLE IF NOT EXISTS public.admin_commissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES public.marketplace_purchases(id),
  amount      numeric(10,2) NOT NULL CHECK (amount >= 0),
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','credited','failed')),
  note        text,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE public.admin_commissions ENABLE ROW LEVEL SECURITY;
-- Solo admin può leggere
CREATE POLICY "commissions_admin" ON public.admin_commissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_admin = true)
  );

-- Ricrea process_marketplace_purchase con fallback commissione
CREATE OR REPLACE FUNCTION public.process_marketplace_purchase(
  p_player_id     uuid,
  p_listing_id    uuid,
  p_seller_id     uuid,
  p_price         numeric,
  p_player_name   text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_id      uuid := auth.uid();
  v_seller_id     uuid;
  v_listing_price numeric(10,2);
  v_listing_id    uuid;
  v_commission    numeric(10,2);
  v_net           numeric(10,2);
  v_purchase_id   uuid;
  v_buyer_bal     numeric(10,2);
  v_platform_id   uuid;
  v_player_name   text;
BEGIN
  -- ── 1. Valida listing dal DB ────────────────────────────────────────────
  SELECT ml.id, ml.owner_id, ml.price
    INTO v_listing_id, v_seller_id, v_listing_price
    FROM public.marketplace_listings ml
    WHERE ml.player_id = p_player_id AND ml.is_active = true
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing non trovato o non attivo';
  END IF;

  -- ── 2. Nome giocatore dal DB ────────────────────────────────────────────
  SELECT name INTO v_player_name FROM public.players WHERE id = p_player_id;
  IF v_player_name IS NULL THEN RAISE EXCEPTION 'Giocatore non trovato'; END IF;

  -- ── 3. Sanity checks ────────────────────────────────────────────────────
  IF v_buyer_id = v_seller_id THEN
    RAISE EXCEPTION 'Non puoi acquistare i tuoi stessi report';
  END IF;
  IF v_listing_price < 0 OR v_listing_price > 9999.99 THEN
    RAISE EXCEPTION 'Prezzo listing non valido';
  END IF;

  -- ── 4. Anti-doppio acquisto ─────────────────────────────────────────────
  IF EXISTS (
    SELECT 1 FROM public.marketplace_purchases
    WHERE player_id = p_player_id AND buyer_id = v_buyer_id
  ) THEN
    RAISE EXCEPTION 'Hai già acquistato il report di %', v_player_name;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.access_requests
    WHERE player_id = p_player_id AND requester_id = v_buyer_id AND status = 'accepted'
  ) THEN
    RAISE EXCEPTION 'Hai già accesso al report di %', v_player_name;
  END IF;

  -- ── 5. Calcola importi ──────────────────────────────────────────────────
  v_commission := ROUND(v_listing_price * 0.10, 2);
  v_net        := v_listing_price - v_commission;

  -- ── 6. Platform ID con fallback ─────────────────────────────────────────
  SELECT id INTO v_platform_id
    FROM auth.users WHERE email = 'dimuropaolo77@gmail.com' LIMIT 1;

  -- ── 7. Wallet con FOR UPDATE ────────────────────────────────────────────
  IF v_listing_price > 0 THEN
    SELECT COALESCE(balance, 0) INTO v_buyer_bal
      FROM public.wallets WHERE user_id = v_buyer_id
      FOR UPDATE;

    IF COALESCE(v_buyer_bal, 0) < v_listing_price THEN
      RAISE EXCEPTION 'Saldo insufficiente. Hai €%, servono €%',
        COALESCE(v_buyer_bal, 0), v_listing_price;
    END IF;

    -- Scala buyer
    UPDATE public.wallets
      SET balance = balance - v_listing_price, updated_at = now()
      WHERE user_id = v_buyer_id;

    -- Accredita seller 90%
    INSERT INTO public.wallets(user_id, balance) VALUES(v_seller_id, v_net)
      ON CONFLICT (user_id) DO UPDATE
        SET balance = wallets.balance + v_net, updated_at = now();

    -- Accredita commissione 10%
    IF v_platform_id IS NOT NULL THEN
      INSERT INTO public.wallets(user_id, balance) VALUES(v_platform_id, v_commission)
        ON CONFLICT (user_id) DO UPDATE
          SET balance = wallets.balance + v_commission, updated_at = now();
    END IF;
  END IF;

  -- ── 8. Registra acquisto ────────────────────────────────────────────────
  INSERT INTO public.marketplace_purchases(
    listing_id, player_id, buyer_id, seller_id,
    price_paid, commission, net_to_seller, status
  ) VALUES (
    v_listing_id, p_player_id, v_buyer_id, v_seller_id,
    v_listing_price, v_commission, v_net, 'completed'
  ) RETURNING id INTO v_purchase_id;

  -- ── 9. Log wallet ───────────────────────────────────────────────────────
  IF v_listing_price > 0 THEN
    INSERT INTO public.wallet_transactions(user_id, amount, type, ref_id, description) VALUES
      (v_buyer_id,   -v_listing_price, 'purchase',   v_purchase_id, 'Acquisto report: ' || v_player_name),
      (v_seller_id,   v_net,           'sale',        v_purchase_id, 'Vendita report: ' || v_player_name || ' (netto 90%)');

    IF v_platform_id IS NOT NULL THEN
      INSERT INTO public.wallet_transactions(user_id, amount, type, ref_id, description)
        VALUES (v_platform_id, v_commission, 'commission', v_purchase_id, 'Commissione DMScout 10%: ' || v_player_name);
    ELSE
      -- Fallback: salva commissione in tabella admin per recupero manuale
      INSERT INTO public.admin_commissions(purchase_id, amount, status, note)
        VALUES (v_purchase_id, v_commission, 'pending', 'Platform user non trovato — commissione da accreditare manualmente');
    END IF;
  END IF;

  -- ── 10. Accesso ─────────────────────────────────────────────────────────
  INSERT INTO public.access_requests(player_id, requester_id, owner_id, message, status)
    VALUES(
      p_player_id, v_buyer_id, v_seller_id,
      CASE WHEN v_listing_price = 0
        THEN 'Accesso gratuito: ' || v_player_name
        ELSE 'Acquisto €' || v_listing_price || ': ' || v_player_name
      END,
      'accepted'
    )
    ON CONFLICT DO NOTHING;

  RETURN v_purchase_id;
END;
$$;
REVOKE ALL ON FUNCTION public.process_marketplace_purchase(uuid,uuid,uuid,numeric,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_marketplace_purchase(uuid,uuid,uuid,numeric,text) TO authenticated;


-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ FIX 7 — MEDIO                                                           │
-- │ topup_wallet: in demo è aperta, ma aggiungiamo un rate-limit semplice: │
-- │ max 5 ricariche al giorno per utente.                                   │
-- └─────────────────────────────────────────────────────────────────────────┘
CREATE OR REPLACE FUNCTION public.topup_wallet(amount_in numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count int;
BEGIN
  IF amount_in <= 0     THEN RAISE EXCEPTION 'L''importo deve essere positivo'; END IF;
  IF amount_in > 10000  THEN RAISE EXCEPTION 'Importo massimo per ricarica: €10.000'; END IF;

  -- Rate-limit: max 5 ricariche nelle ultime 24h
  SELECT COUNT(*) INTO v_count
    FROM public.wallet_transactions
    WHERE user_id = auth.uid()
      AND type = 'topup'
      AND created_at > now() - interval '24 hours';
  IF v_count >= 5 THEN
    RAISE EXCEPTION 'Limite ricariche raggiunto: massimo 5 al giorno';
  END IF;

  INSERT INTO public.wallets(user_id, balance) VALUES(auth.uid(), amount_in)
    ON CONFLICT (user_id) DO UPDATE
      SET balance = wallets.balance + amount_in, updated_at = now();

  INSERT INTO public.wallet_transactions(user_id, amount, type, description)
    VALUES(auth.uid(), amount_in, 'topup', 'Ricarica saldo');
END;
$$;
REVOKE ALL ON FUNCTION public.topup_wallet(numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.topup_wallet(numeric) TO authenticated;


-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ FIX 8 — BASSO                                                           │
-- │ Aggiungi indici per performance e sicurezza delle query critiche.       │
-- └─────────────────────────────────────────────────────────────────────────┘
CREATE INDEX IF NOT EXISTS idx_purchases_player_buyer
  ON public.marketplace_purchases(player_id, buyer_id);

CREATE INDEX IF NOT EXISTS idx_purchases_buyer
  ON public.marketplace_purchases(buyer_id);

CREATE INDEX IF NOT EXISTS idx_purchases_seller
  ON public.marketplace_purchases(seller_id);

CREATE INDEX IF NOT EXISTS idx_wallet_txs_user_type
  ON public.wallet_transactions(user_id, type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_withdrawals_user_status
  ON public.withdrawal_requests(user_id, status);

CREATE INDEX IF NOT EXISTS idx_listings_player
  ON public.marketplace_listings(player_id);
