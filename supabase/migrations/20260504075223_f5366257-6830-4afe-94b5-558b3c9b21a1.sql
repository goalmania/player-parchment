-- Funzione SECURITY DEFINER che espone SOLO i campi anagrafici di tutti i giocatori
-- agli utenti autenticati. Le statistiche, valutazioni, verdetti, ecc. NON vengono restituiti.
CREATE OR REPLACE FUNCTION public.list_public_players()
RETURNS TABLE (
  id uuid,
  owner_id uuid,
  name text,
  photo text,
  age integer,
  birth_year integer,
  nationality text,
  flag text,
  club text,
  league text,
  region text,
  position_main text,
  position_code text,
  created_at timestamptz
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
    p.created_at
  FROM public.players p
  ORDER BY p.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.list_public_players() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_public_players() TO authenticated;