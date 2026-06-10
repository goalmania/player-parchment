-- ────────────────────────────────────────────────────────────────────────────
-- WALLET SYSTEM — saldi per utente + trasferimento atomico acquisti
-- ────────────────────────────────────────────────────────────────────────────

-- 1. Wallet: un saldo per ogni utente
CREATE TABLE IF NOT EXISTS public.wallets (
  user_id  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance  numeric(10,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Ogni utente vede solo il proprio saldo
CREATE POLICY "wallet_self" ON public.wallets
  FOR ALL USING (user_id = auth.uid());

-- 2. Registro movimenti
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  amount      numeric(10,2) NOT NULL,  -- positivo = entrata, negativo = uscita
  type        text NOT NULL,           -- 'topup' | 'purchase' | 'sale' | 'commission'
  ref_id      uuid,                    -- marketplace_purchases.id
  description text,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wt_self" ON public.wallet_transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "wt_insert_self" ON public.wallet_transactions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admin (dimuropaolo77@gmail.com) vede tutto
CREATE POLICY "wt_admin" ON public.wallet_transactions
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE email = 'dimuropaolo77@gmail.com'
    )
  );

-- ── RPC: ricarica simulata ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.topup_wallet(amount_in numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF amount_in <= 0 THEN
    RAISE EXCEPTION 'L''importo deve essere positivo';
  END IF;
  -- Crea wallet se non esiste
  INSERT INTO public.wallets(user_id, balance)
    VALUES(auth.uid(), amount_in)
    ON CONFLICT (user_id) DO UPDATE
      SET balance = wallets.balance + amount_in,
          updated_at = now();
  -- Registra movimento
  INSERT INTO public.wallet_transactions(user_id, amount, type, description)
    VALUES(auth.uid(), amount_in, 'topup', 'Ricarica saldo');
END;
$$;

REVOKE ALL ON FUNCTION public.topup_wallet(numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.topup_wallet(numeric) TO authenticated;


-- ── RPC: acquisto atomico con trasferimento wallet ───────────────────────────
-- Restituisce l'UUID del purchase creato oppure lancia eccezione.
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
  v_buyer_id     uuid := auth.uid();
  v_commission   numeric(10,2);
  v_net          numeric(10,2);
  v_purchase_id  uuid;
  v_buyer_bal    numeric(10,2);
  v_platform_id  uuid;
BEGIN
  -- Recupera ID owner piattaforma (dimuropaolo77@gmail.com)
  SELECT id INTO v_platform_id
    FROM auth.users WHERE email = 'dimuropaolo77@gmail.com' LIMIT 1;

  -- Blocca se stesso non può comprare i propri report
  IF v_buyer_id = p_seller_id THEN
    RAISE EXCEPTION 'Non puoi acquistare i tuoi stessi report';
  END IF;

  -- Calcola importi
  v_commission := ROUND(p_price * 0.10, 2);
  v_net        := ROUND(p_price * 0.90, 2);

  -- Se prezzo > 0 gestisci wallet
  IF p_price > 0 THEN
    -- Controlla saldo buyer
    SELECT COALESCE(balance, 0) INTO v_buyer_bal
      FROM public.wallets WHERE user_id = v_buyer_id;
    IF v_buyer_bal IS NULL OR v_buyer_bal < p_price THEN
      RAISE EXCEPTION 'Saldo insufficiente. Hai €%, servono €%',
        COALESCE(v_buyer_bal, 0), p_price;
    END IF;

    -- Scala dal buyer
    UPDATE public.wallets SET balance = balance - p_price, updated_at = now()
      WHERE user_id = v_buyer_id;

    -- Accredita 90% al seller
    INSERT INTO public.wallets(user_id, balance)
      VALUES(p_seller_id, v_net)
      ON CONFLICT (user_id) DO UPDATE
        SET balance = wallets.balance + v_net, updated_at = now();

    -- Accredita 10% commissione a DMScout (platform owner)
    IF v_platform_id IS NOT NULL THEN
      INSERT INTO public.wallets(user_id, balance)
        VALUES(v_platform_id, v_commission)
        ON CONFLICT (user_id) DO UPDATE
          SET balance = wallets.balance + v_commission, updated_at = now();
    END IF;
  END IF;

  -- Registra acquisto
  INSERT INTO public.marketplace_purchases(
    listing_id, player_id, buyer_id, seller_id,
    price_paid, commission, net_to_seller, status
  ) VALUES (
    p_listing_id, p_player_id, v_buyer_id, p_seller_id,
    p_price, v_commission, v_net, 'completed'
  ) RETURNING id INTO v_purchase_id;

  -- Movimenti wallet (log)
  IF p_price > 0 THEN
    INSERT INTO public.wallet_transactions(user_id, amount, type, ref_id, description)
      VALUES
        (v_buyer_id,      -p_price,     'purchase',   v_purchase_id,
          'Acquisto report: ' || p_player_name),
        (p_seller_id,      v_net,       'sale',        v_purchase_id,
          'Vendita report: ' || p_player_name || ' (netto 90%)'),
        (v_platform_id,    v_commission,'commission',  v_purchase_id,
          'Commissione DMScout 10%: ' || p_player_name);
  END IF;

  -- Concedi accesso via access_requests
  INSERT INTO public.access_requests(player_id, requester_id, owner_id, message, status)
    VALUES(
      p_player_id, v_buyer_id, p_seller_id,
      CASE WHEN p_price = 0
        THEN 'Accesso gratuito: ' || p_player_name
        ELSE 'Acquisto €' || p_price || ': ' || p_player_name
      END,
      'accepted'
    )
    ON CONFLICT DO NOTHING;

  RETURN v_purchase_id;
END;
$$;

REVOKE ALL ON FUNCTION public.process_marketplace_purchase(uuid, uuid, uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_marketplace_purchase(uuid, uuid, uuid, numeric, text) TO authenticated;


-- ── Funzione: leggi saldo corrente ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_my_wallet()
RETURNS TABLE(balance numeric, total_earned numeric, total_spent numeric, total_commission numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE((SELECT w.balance FROM public.wallets w WHERE w.user_id = auth.uid()), 0) AS balance,
    COALESCE((SELECT SUM(wt.amount) FROM public.wallet_transactions wt
               WHERE wt.user_id = auth.uid() AND wt.type = 'sale'), 0) AS total_earned,
    COALESCE(ABS((SELECT SUM(wt.amount) FROM public.wallet_transactions wt
               WHERE wt.user_id = auth.uid() AND wt.type = 'purchase')), 0) AS total_spent,
    COALESCE((SELECT SUM(wt.amount) FROM public.wallet_transactions wt
               WHERE wt.user_id = auth.uid() AND wt.type = 'commission'), 0) AS total_commission;
$$;

REVOKE ALL ON FUNCTION public.get_my_wallet() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_wallet() TO authenticated;
