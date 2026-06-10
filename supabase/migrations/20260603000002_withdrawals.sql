-- ────────────────────────────────────────────────────────────────────────────
-- WITHDRAWAL REQUESTS — richieste di prelievo saldo verso conto/carta
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount        numeric(10,2) NOT NULL CHECK (amount > 0),
  method        text NOT NULL,           -- 'iban' | 'paypal' | 'card'
  method_detail text NOT NULL,           -- IBAN oscurato / email PayPal / ultime 4 cifre carta
  notes         text,                    -- note utente
  status        text NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  admin_note    text,                    -- nota dell'admin su approvazione/rifiuto
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Utente vede solo le proprie richieste
CREATE POLICY "wr_self" ON public.withdrawal_requests
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "wr_insert_self" ON public.withdrawal_requests
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admin vede e modifica tutto
CREATE POLICY "wr_admin_all" ON public.withdrawal_requests
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM auth.users WHERE email = 'dimuropaolo77@gmail.com'
    )
  );

-- ── RPC: richiedi prelievo (blocca saldo) ─────────────────────────────────
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
  v_uid     uuid := auth.uid();
  v_balance numeric(10,2);
  v_req_id  uuid;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'L''importo deve essere maggiore di zero';
  END IF;

  -- Controlla saldo disponibile
  SELECT COALESCE(balance, 0) INTO v_balance
    FROM public.wallets WHERE user_id = v_uid;
  IF v_balance IS NULL OR v_balance < p_amount THEN
    RAISE EXCEPTION 'Saldo insufficiente. Disponibile: €%', COALESCE(v_balance, 0);
  END IF;

  -- Blocca subito il saldo (previene doppi prelievi)
  UPDATE public.wallets
    SET balance = balance - p_amount, updated_at = now()
    WHERE user_id = v_uid;

  -- Registra movimento come "in attesa"
  INSERT INTO public.wallet_transactions(user_id, amount, type, description)
    VALUES(v_uid, -p_amount, 'withdrawal_pending',
           'Prelievo in attesa — ' || p_method || ': ' || p_method_detail);

  -- Crea richiesta
  INSERT INTO public.withdrawal_requests(user_id, amount, method, method_detail, notes)
    VALUES(v_uid, p_amount, p_method, p_method_detail, p_notes)
    RETURNING id INTO v_req_id;

  RETURN v_req_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_withdrawal(numeric, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric, text, text, text) TO authenticated;


-- ── RPC: admin approva/rifiuta prelievo ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_process_withdrawal(
  p_request_id  uuid,
  p_action      text,   -- 'approve' | 'reject'
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
  -- Solo admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = v_admin_id AND email = 'dimuropaolo77@gmail.com'
  ) THEN
    RAISE EXCEPTION 'Accesso negato';
  END IF;

  SELECT * INTO v_req FROM public.withdrawal_requests WHERE id = p_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Richiesta non trovata'; END IF;
  IF v_req.status != 'pending' THEN RAISE EXCEPTION 'Richiesta già processata'; END IF;

  IF p_action = 'approve' THEN
    UPDATE public.withdrawal_requests
      SET status = 'approved', admin_note = p_admin_note, updated_at = now()
      WHERE id = p_request_id;
    -- Il saldo era già scalato: aggiorna solo il log (prende il più recente con subquery)
    UPDATE public.wallet_transactions
      SET type = 'withdrawal',
          description = 'Prelievo approvato — ' || v_req.method || ': ' || v_req.method_detail
      WHERE id = (
        SELECT id FROM public.wallet_transactions
        WHERE user_id = v_req.user_id AND type = 'withdrawal_pending'
          AND amount = -v_req.amount
        ORDER BY created_at DESC LIMIT 1
      );

  ELSIF p_action = 'reject' THEN
    UPDATE public.withdrawal_requests
      SET status = 'rejected', admin_note = p_admin_note, updated_at = now()
      WHERE id = p_request_id;
    -- Rimborsa il saldo
    UPDATE public.wallets
      SET balance = balance + v_req.amount, updated_at = now()
      WHERE user_id = v_req.user_id;
    -- Aggiorna log
    UPDATE public.wallet_transactions
      SET type = 'withdrawal_rejected', description = 'Prelievo rifiutato — rimborsato'
      WHERE id = (
        SELECT id FROM public.wallet_transactions
        WHERE user_id = v_req.user_id AND type = 'withdrawal_pending'
          AND amount = -v_req.amount
        ORDER BY created_at DESC LIMIT 1
      );
    -- Accredita di nuovo
    INSERT INTO public.wallet_transactions(user_id, amount, type, description)
      VALUES(v_req.user_id, v_req.amount, 'refund', 'Rimborso prelievo rifiutato');
  ELSE
    RAISE EXCEPTION 'Azione non valida: usa approve o reject';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_process_withdrawal(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_process_withdrawal(uuid, text, text) TO authenticated;
