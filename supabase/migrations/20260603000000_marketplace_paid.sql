-- ────────────────────────────────────────────────────────────────────────────
-- MARKETPLACE PAGAMENTI
-- ────────────────────────────────────────────────────────────────────────────

-- 1. Listing: uno per giocatore, impostato dall'owner
CREATE TABLE IF NOT EXISTS public.marketplace_listings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  owner_id    uuid NOT NULL,
  price       numeric(10,2) NOT NULL DEFAULT 0.00 CHECK (price >= 0),
  is_active   boolean NOT NULL DEFAULT true,
  description text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(player_id)
);

-- 2. Acquisti: ogni acquisto registra prezzo pagato e commissione DMScout
CREATE TABLE IF NOT EXISTS public.marketplace_purchases (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id    uuid REFERENCES public.marketplace_listings(id),
  player_id     uuid NOT NULL REFERENCES public.players(id),
  buyer_id      uuid NOT NULL,
  seller_id     uuid NOT NULL,
  price_paid    numeric(10,2) NOT NULL DEFAULT 0.00,
  commission    numeric(10,2) NOT NULL DEFAULT 0.00,  -- 10% di price_paid
  net_to_seller numeric(10,2) NOT NULL DEFAULT 0.00,  -- 90% di price_paid
  status        text NOT NULL DEFAULT 'completed',
  created_at    timestamptz DEFAULT now()
);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.marketplace_listings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_purchases  ENABLE ROW LEVEL SECURITY;

-- Tutti gli utenti autenticati possono leggere listing attivi
CREATE POLICY "listings_read" ON public.marketplace_listings
  FOR SELECT USING (true);

-- Solo l'owner può inserire/aggiornare/eliminare la sua listing
CREATE POLICY "listings_owner_write" ON public.marketplace_listings
  FOR ALL USING (owner_id = auth.uid());

-- Acquirente e venditore vedono i propri acquisti
CREATE POLICY "purchases_read" ON public.marketplace_purchases
  FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid());

-- Solo il buyer può inserire un acquisto a proprio nome
CREATE POLICY "purchases_insert" ON public.marketplace_purchases
  FOR INSERT WITH CHECK (buyer_id = auth.uid());

-- ── Funzione aggiornata list_public_players con campo prezzo ─────────────────
DROP FUNCTION IF EXISTS public.list_public_players();
CREATE OR REPLACE FUNCTION public.list_public_players()
RETURNS TABLE (
  id              uuid,
  owner_id        uuid,
  name            text,
  photo           text,
  age             integer,
  birth_year      integer,
  nationality     text,
  flag            text,
  club            text,
  league          text,
  region          text,
  position_main   text,
  position_code   text,
  created_at      timestamptz,
  marketplace_price     numeric,
  marketplace_active    boolean,
  marketplace_listing_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.owner_id,
    p.name,
    p.photo,
    p.age,
    p.birth_year,
    p.nationality,
    p.flag,
    p.club,
    p.league,
    p.region,
    p.position_main,
    p.position_code,
    p.created_at,
    ml.price             AS marketplace_price,
    ml.is_active         AS marketplace_active,
    ml.id                AS marketplace_listing_id
  FROM public.players p
  LEFT JOIN public.marketplace_listings ml ON ml.player_id = p.id
  ORDER BY p.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.list_public_players() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_public_players() TO authenticated;
