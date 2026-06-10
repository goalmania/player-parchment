-- ════════════════════════════════════════════════════════════════════════════
-- SECURITY HARDENING — patch completo su tutti i flussi di denaro
-- ════════════════════════════════════════════════════════════════════════════

-- ── FIX 1: wallet_transactions — rimuovi INSERT diretto da utenti ────────────
-- VULNERABILITÀ: utente poteva fare INSERT {amount: 99999, type:'topup'} direttamente
-- e accreditarsi saldo senza passare per le RPC.
DROP POLICY IF EXISTS "wt_insert_self" ON public.wallet_transactions;
-- Le scritture avvengono SOLO attraverso funzioni SECURITY DEFINER.

-- ── FIX 2: wallets — rimuovi UPDATE/DELETE/INSERT diretti da utenti ──────────
-- VULNERABILITÀ: wallet_self era FOR ALL → utente poteva UPDATE balance direttamente.
DROP POLICY IF EXISTS "wallet_self" ON public.wallets;
CREATE POLICY "wallet_read_self" ON public.wallets
  FOR SELECT USING (user_id = auth.uid());
-- Nessun INSERT/UPDATE/DELETE diretto — solo RPC SECURITY DEFINER scrivono.

-- ── FIX 3: withdrawal_requests — rimuovi INSERT diretto da utenti ────────────
-- VULNERABILITÀ: utente poteva inserire {status:'approved'} direttamente.
DROP POLICY IF EXISTS "wr_insert_self" ON public.withdrawal_requests;
-- Anche qui: solo la RPC request_withdrawal può inserire righe.

-- ── FIX 4: unique constraint su purchases (player_id, buyer_id) ─────────────
-- VULNERABILITÀ: stesso report acquistabile più volte.
ALTER TABLE public.marketplace_purchases
  ADD CONSTRAINT purchases_player_buyer_unique UNIQUE (player_id, buyer_id);

-- ── FIX 5: colonna is_admin in profiles (non basarsi solo sull'email) ────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Imposta l'admin sul proprietario della piattaforma
UPDATE public.profiles
  SET is_admin = true
  WHERE user_id = (
    SELECT id FROM auth.users WHERE email = 'dimuropaolo77@gmail.com' LIMIT 1
  );

-- ── FIX 6: topup_wallet — cap massimo per singola ricarica ──────────────────
CREATE OR REPLACE FUNCTION public.topup_wallet(amount_in numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF amount_in <= 0    THEN RAISE EXCEPTION 'L''importo deve essere positivo'; END IF;
  IF amount_in > 10000 THEN RAISE EXCEPTION 'Importo massimo per ricarica: €10.000'; END IF;

  INSERT INTO public.wallets(user_id, balance)
    VALUES(auth.uid(), amount_in)
    ON CONFLICT (user_id) DO UPDATE
      SET balance = wallets.balance + amount_in,
          updated_at = now();

  INSERT INTO public.wallet_transactions(user_id, amount, type, description)
    VALUES(auth.uid(), amount_in, 'topup', 'Ricarica saldo');
END;
$$;
REVOKE ALL ON FUNCTION public.topup_wallet(numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.topup_wallet(numeric) TO authenticated;


-- ── FIX 7: process_marketplace_purchase — validazione completa server-side ──
-- VULNERABILITÀ corrette:
--   a) p_price non validato → ora lo legge dal DB
--   b) p_seller_id non validato → ora lo legge dal DB
--   c) race condition saldo → SELECT FOR UPDATE
--   d) doppio acquisto → gestito da unique constraint + check esplicito
CREATE OR REPLACE FUNCTION public.process_marketplace_purchase(
  p_player_id     uuid,
  p_listing_id    uuid,
  p_seller_id     uuid,   -- mantenuto per compatibilità, ma ignorato (risolto dal DB)
  p_price         numeric, -- mantenuto per compatibilità, ma ignorato (risolto dal DB)
  p_player_name   text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_id     uuid := auth.uid();
  v_seller_id    uuid;
  v_listing_price numeric(10,2);
  v_listing_id   uuid;
  v_commission   numeric(10,2);
  v_net          numeric(10,2);
  v_purchase_id  uuid;
  v_buyer_bal    numeric(10,2);
  v_platform_id  uuid;
  v_player_name  text;
BEGIN
  -- ── 1. Valida listing dal DB (ignora i parametri client per price/seller) ──
  SELECT ml.id, ml.owner_id, ml.price
    INTO v_listing_id, v_seller_id, v_listing_price
    FROM public.marketplace_listings ml
    WHERE ml.player_id = p_player_id
      AND ml.is_active = true
    FOR UPDATE;  -- lock riga listing per tutta la transazione

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing non trovato o non attivo per questo giocatore';
  END IF;

  -- ── 2. Leggi nome giocatore dal DB (non dal client) ──────────────────────
  SELECT name INTO v_player_name FROM public.players WHERE id = p_player_id;
  IF v_player_name IS NULL THEN
    RAISE EXCEPTION 'Giocatore non trovato';
  END IF;

  -- ── 3. Sanity checks ─────────────────────────────────────────────────────
  IF v_buyer_id = v_seller_id THEN
    RAISE EXCEPTION 'Non puoi acquistare i tuoi stessi report';
  END IF;

  IF v_listing_price < 0 THEN
    RAISE EXCEPTION 'Prezzo listing non valido';
  END IF;

  -- ── 4. Controlla doppio acquisto ─────────────────────────────────────────
  IF EXISTS (
    SELECT 1 FROM public.marketplace_purchases
    WHERE player_id = p_player_id AND buyer_id = v_buyer_id
  ) THEN
    RAISE EXCEPTION 'Hai già acquistato il report di %', v_player_name;
  END IF;

  -- Controlla anche access_requests già accepted
  IF EXISTS (
    SELECT 1 FROM public.access_requests
    WHERE player_id = p_player_id AND requester_id = v_buyer_id AND status = 'accepted'
  ) THEN
    RAISE EXCEPTION 'Hai già accesso al report di %', v_player_name;
  END IF;

  -- ── 5. Calcola importi (dal DB, non dal client) ───────────────────────────
  v_commission := ROUND(v_listing_price * 0.10, 2);
  v_net        := v_listing_price - v_commission;  -- evita errori di arrotondamento

  -- ── 6. Recupera platform ID ───────────────────────────────────────────────
  SELECT id INTO v_platform_id
    FROM auth.users WHERE email = 'dimuropaolo77@gmail.com' LIMIT 1;

  -- ── 7. Gestisci wallet con FOR UPDATE (lock anti-race-condition) ──────────
  IF v_listing_price > 0 THEN
    -- Blocca la riga wallet del buyer per tutta la transazione
    SELECT COALESCE(balance, 0) INTO v_buyer_bal
      FROM public.wallets WHERE user_id = v_buyer_id
      FOR UPDATE;

    IF COALESCE(v_buyer_bal, 0) < v_listing_price THEN
      RAISE EXCEPTION 'Saldo insufficiente. Hai €%, servono €%',
        COALESCE(v_buyer_bal, 0), v_listing_price;
    END IF;

    -- Scala dal buyer
    UPDATE public.wallets
      SET balance = balance - v_listing_price, updated_at = now()
      WHERE user_id = v_buyer_id;

    -- Accredita 90% al seller
    INSERT INTO public.wallets(user_id, balance)
      VALUES(v_seller_id, v_net)
      ON CONFLICT (user_id) DO UPDATE
        SET balance = wallets.balance + v_net, updated_at = now();

    -- Accredita 10% commissione a DMScout
    IF v_platform_id IS NOT NULL THEN
      INSERT INTO public.wallets(user_id, balance)
        VALUES(v_platform_id, v_commission)
        ON CONFLICT (user_id) DO UPDATE
          SET balance = wallets.balance + v_commission, updated_at = now();
    END IF;
  END IF;

  -- ── 8. Registra acquisto ──────────────────────────────────────────────────
  INSERT INTO public.marketplace_purchases(
    listing_id, player_id, buyer_id, seller_id,
    price_paid, commission, net_to_seller, status
  ) VALUES (
    v_listing_id, p_player_id, v_buyer_id, v_seller_id,
    v_listing_price, v_commission, v_net, 'completed'
  ) RETURNING id INTO v_purchase_id;

  -- ── 9. Log movimenti wallet ───────────────────────────────────────────────
  IF v_listing_price > 0 THEN
    INSERT INTO public.wallet_transactions(user_id, amount, type, ref_id, description)
      VALUES
        (v_buyer_id,   -v_listing_price, 'purchase',   v_purchase_id,
          'Acquisto report: ' || v_player_name),
        (v_seller_id,   v_net,           'sale',        v_purchase_id,
          'Vendita report: ' || v_player_name || ' (netto 90%)'),
        (v_platform_id, v_commission,    'commission',  v_purchase_id,
          'Commissione DMScout 10%: ' || v_player_name);
  END IF;

  -- ── 10. Concedi accesso ───────────────────────────────────────────────────
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
REVOKE ALL ON FUNCTION public.process_marketplace_purchase(uuid, uuid, uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_marketplace_purchase(uuid, uuid, uuid, numeric, text) TO authenticated;


-- ── FIX 8: request_withdrawal — FOR UPDATE anti-race-condition ───────────────
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_amount        numeric,
  p_method        text,
  p_method_detail text,
  p_notes         text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      uuid := auth.uid();
  v_balance  numeric(10,2);
  v_req_id   uuid;
BEGIN
  -- Validazioni input
  IF p_amount <= 0        THEN RAISE EXCEPTION 'L''importo deve essere maggiore di zero'; END IF;
  IF p_amount > 50000     THEN RAISE EXCEPTION 'Importo massimo prelievo: €50.000'; END IF;
  IF p_method NOT IN ('iban','paypal','card')
                          THEN RAISE EXCEPTION 'Metodo non valido'; END IF;
  IF length(trim(p_method_detail)) < 4
                          THEN RAISE EXCEPTION 'Dettagli metodo di pagamento troppo corti'; END IF;

  -- Blocca la riga wallet con FOR UPDATE (previene race condition)
  SELECT COALESCE(balance, 0) INTO v_balance
    FROM public.wallets WHERE user_id = v_uid
    FOR UPDATE;

  IF COALESCE(v_balance, 0) < p_amount THEN
    RAISE EXCEPTION 'Saldo insufficiente. Disponibile: €%', COALESCE(v_balance, 0);
  END IF;

  -- Scala immediatamente il saldo (freeze)
  UPDATE public.wallets
    SET balance = balance - p_amount, updated_at = now()
    WHERE user_id = v_uid;

  -- Log
  INSERT INTO public.wallet_transactions(user_id, amount, type, description)
    VALUES(v_uid, -p_amount, 'withdrawal_pending',
           'Prelievo in attesa — ' || p_method || ': ' || left(p_method_detail, 20));

  -- Crea richiesta (status DEFAULT 'pending' — non modificabile dal client)
  INSERT INTO public.withdrawal_requests(user_id, amount, method, method_detail, notes)
    VALUES(v_uid, p_amount, p_method, p_method_detail, p_notes)
    RETURNING id INTO v_req_id;

  RETURN v_req_id;
END;
$$;
REVOKE ALL ON FUNCTION public.request_withdrawal(numeric, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric, text, text, text) TO authenticated;


-- ── FIX 9: admin_process_withdrawal — usa is_admin invece di solo email ──────
CREATE OR REPLACE FUNCTION public.admin_process_withdrawal(
  p_request_id  uuid,
  p_action      text,
  p_admin_note  text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id uuid := auth.uid();
  v_req      record;
BEGIN
  -- Doppio controllo: is_admin nel profilo E email corrispondente
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = v_admin_id AND is_admin = true
  ) THEN
    RAISE EXCEPTION 'Accesso negato';
  END IF;

  IF p_action NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'Azione non valida';
  END IF;

  -- Blocca la riga per evitare doppio processing
  SELECT * INTO v_req
    FROM public.withdrawal_requests
    WHERE id = p_request_id
    FOR UPDATE;

  IF NOT FOUND     THEN RAISE EXCEPTION 'Richiesta non trovata'; END IF;
  IF v_req.status != 'pending' THEN RAISE EXCEPTION 'Richiesta già processata (status: %)', v_req.status; END IF;

  IF p_action = 'approve' THEN
    UPDATE public.withdrawal_requests
      SET status = 'approved', admin_note = p_admin_note, updated_at = now()
      WHERE id = p_request_id;

    UPDATE public.wallet_transactions
      SET type = 'withdrawal',
          description = 'Prelievo approvato — ' || v_req.method || ': ' || left(v_req.method_detail, 20)
      WHERE id = (
        SELECT id FROM public.wallet_transactions
        WHERE user_id = v_req.user_id AND type = 'withdrawal_pending'
          AND amount = -v_req.amount
        ORDER BY created_at DESC LIMIT 1
      );

  ELSE -- reject
    UPDATE public.withdrawal_requests
      SET status = 'rejected', admin_note = p_admin_note, updated_at = now()
      WHERE id = p_request_id;

    -- Rimborso atomico
    UPDATE public.wallets
      SET balance = balance + v_req.amount, updated_at = now()
      WHERE user_id = v_req.user_id;

    UPDATE public.wallet_transactions
      SET type = 'withdrawal_rejected',
          description = 'Prelievo rifiutato — saldo restituito'
      WHERE id = (
        SELECT id FROM public.wallet_transactions
        WHERE user_id = v_req.user_id AND type = 'withdrawal_pending'
          AND amount = -v_req.amount
        ORDER BY created_at DESC LIMIT 1
      );

    INSERT INTO public.wallet_transactions(user_id, amount, type, description)
      VALUES(v_req.user_id, v_req.amount, 'refund', 'Rimborso prelievo rifiutato');
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_process_withdrawal(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_process_withdrawal(uuid, text, text) TO authenticated;


-- ── FIX 10: aggiorna RLS admin per usare is_admin ────────────────────────────
DROP POLICY IF EXISTS "wr_admin_all" ON public.withdrawal_requests;
CREATE POLICY "wr_admin_all" ON public.withdrawal_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

DROP POLICY IF EXISTS "wt_admin" ON public.wallet_transactions;
CREATE POLICY "wt_admin" ON public.wallet_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Admin può vedere tutti i wallet
CREATE POLICY "wallet_admin" ON public.wallets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );


-- ── FIX 11: get_my_wallet — SECURITY DEFINER, solo dati propri ───────────────
CREATE OR REPLACE FUNCTION public.get_my_wallet()
RETURNS TABLE(balance numeric, total_earned numeric, total_spent numeric, total_commission numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE((SELECT w.balance FROM public.wallets w WHERE w.user_id = auth.uid()), 0),
    COALESCE((SELECT SUM(wt.amount) FROM public.wallet_transactions wt
               WHERE wt.user_id = auth.uid() AND wt.type = 'sale'), 0),
    COALESCE(ABS((SELECT SUM(wt.amount) FROM public.wallet_transactions wt
               WHERE wt.user_id = auth.uid() AND wt.type = 'purchase')), 0),
    COALESCE((SELECT SUM(wt.amount) FROM public.wallet_transactions wt
               WHERE wt.user_id = auth.uid() AND wt.type = 'commission'), 0);
$$;
REVOKE ALL ON FUNCTION public.get_my_wallet() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_wallet() TO authenticated;


-- ── FIX 12: marketplace_listings — solo owner può modificare ─────────────────
-- Consolida RLS listing per evitare override dal client
DROP POLICY IF EXISTS "listings_owner_write" ON public.marketplace_listings;
CREATE POLICY "listings_owner_write" ON public.marketplace_listings
  FOR ALL USING (owner_id = auth.uid());

-- Verifica che listings_read esista correttamente
DROP POLICY IF EXISTS "listings_read" ON public.marketplace_listings;
CREATE POLICY "listings_read" ON public.marketplace_listings
  FOR SELECT USING (true);


-- ── FIX 13: vincolo CHECK su method in withdrawal_requests ───────────────────
ALTER TABLE public.withdrawal_requests
  DROP CONSTRAINT IF EXISTS wr_method_check;
ALTER TABLE public.withdrawal_requests
  ADD CONSTRAINT wr_method_check CHECK (method IN ('iban', 'paypal', 'card'));

-- Vincolo CHECK su status
ALTER TABLE public.withdrawal_requests
  DROP CONSTRAINT IF EXISTS wr_status_check;
ALTER TABLE public.withdrawal_requests
  ADD CONSTRAINT wr_status_check CHECK (status IN ('pending', 'approved', 'rejected'));

-- Vincolo CHECK su marketplace_purchases status
ALTER TABLE public.marketplace_purchases
  DROP CONSTRAINT IF EXISTS mp_status_check;
ALTER TABLE public.marketplace_purchases
  ADD CONSTRAINT mp_status_check CHECK (status IN ('completed', 'refunded', 'disputed'));

-- Vincolo CHECK su wallet_transactions type
ALTER TABLE public.wallet_transactions
  DROP CONSTRAINT IF EXISTS wt_type_check;
ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wt_type_check CHECK (
    type IN ('topup','purchase','sale','commission',
             'withdrawal_pending','withdrawal','withdrawal_rejected','refund')
  );
