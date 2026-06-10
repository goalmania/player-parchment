/**
 * Marketplace pubblico a pagamento.
 * Mostra SOLO dati anagrafici (nome, cognome, nazionalità, età).
 * L'osservatore che ha listato il report fissa un prezzo; DMScout
 * trattiene il 10% su ogni transazione.
 * Prezzo = 0 → accesso gratuito immediato.
 */
import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, Navigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { POSITION_CODES, POSITION_LABEL } from "@/lib/types";

const DEFAULT_LEAGUES = [
  "Serie A", "Serie B", "Serie C", "Serie D",
  "Eccellenza", "Promozione", "Prima Categoria", "Seconda Categoria",
  "Primavera 1", "Primavera 2", "Under 19", "Under 17", "Under 15",
  "Premier League", "Championship", "League One", "League Two",
  "La Liga", "Segunda División", "Bundesliga", "2. Bundesliga",
  "Ligue 1", "Ligue 2", "Eredivisie", "Primeira Liga",
  "MLS", "Belgian Pro League", "Süper Lig", "Ekstraklasa",
  "Super League Greece", "Allsvenskan", "Eliteserien",
];

const AGE_BUCKETS: { value: string; label: string; min: number; max: number }[] = [
  { value: "u17", label: "U17 (≤16)", min: 0, max: 16 },
  { value: "u19", label: "U19 (17-18)", min: 17, max: 18 },
  { value: "u21", label: "U21 (19-20)", min: 19, max: 20 },
  { value: "u23", label: "U23 (21-22)", min: 21, max: 22 },
  { value: "senior", label: "Senior (23-29)", min: 23, max: 29 },
  { value: "veteran", label: "Veterani (30+)", min: 30, max: 99 },
];

interface PublicPlayer {
  id: string;
  owner_id: string;
  name: string;
  photo: string | null;
  age: number | null;
  birth_year: number | null;
  nationality: string | null;
  flag: string | null;
  club: string | null;
  league: string | null;
  region: string | null;
  position_main: string | null;
  position_code: string | null;
  created_at: string;
  marketplace_price: number | null;
  marketplace_active: boolean | null;
  marketplace_listing_id: string | null;
}

interface OwnerInfo {
  user_id: string;
  org_name: string;
  org_type: "agency" | "club";
  display_name: string | null;
}

function PriceTag({ price }: { price: number }) {
  if (price === 0) return (
    <span className="px-2 py-0.5 bg-accent-lime/20 text-accent-lime font-mono text-[10px] uppercase tracking-[0.1rem]">
      GRATIS
    </span>
  );
  return (
    <span className="px-2 py-0.5 bg-orange-400/20 text-orange-400 font-mono text-[10px] uppercase tracking-[0.1rem]">
      €{price.toFixed(2)}
    </span>
  );
}

// Dialog di conferma acquisto
function BuyDialog({
  player,
  price,
  onConfirm,
  onCancel,
  loading,
  balance,
}: {
  player: PublicPlayer;
  price: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  balance: number | null;
}) {
  const insufficient = balance !== null && price > 0 && balance < price;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-background border-hairline p-6 max-w-md w-full mx-4 space-y-4">
        <div className="section-label">// ACQUISTO REPORT</div>
        <h2 className="font-display font-black uppercase text-2xl">{player.name}</h2>
        <p className="text-gray-soft text-sm">
          {player.age ? `${player.age} anni` : ""}{player.nationality ? ` · ${player.nationality}` : ""}
        </p>

        {price > 0 ? (
          <div className="border-hairline p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-soft">Prezzo report</span>
              <span>€{price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-dashed border-gray-soft/30 pt-2">
              <span className="text-gray-soft">Di cui commissione DMScout (10%)</span>
              <span className="text-gray-soft">€{(price * 0.1).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-display font-bold uppercase text-base border-t border-hairline pt-2">
              <span>Totale da pagare</span>
              <span className="text-accent-lime">€{price.toFixed(2)}</span>
            </div>
          </div>
        ) : (
          <div className="border-hairline p-4 text-center text-accent-lime font-display font-bold uppercase">
            Report gratuito — nessun addebito
          </div>
        )}

        {price > 0 && balance !== null && (
          <div className={`flex justify-between text-xs px-3 py-2 border-hairline ${insufficient ? "border-red-400/50 bg-red-400/10" : "border-accent-lime/30 bg-accent-lime/5"}`}>
            <span className="text-gray-soft">Il tuo saldo attuale</span>
            <span className={insufficient ? "text-red-400 font-bold" : "text-accent-lime font-bold"}>
              €{balance.toFixed(2)}{insufficient ? " — insufficiente" : ""}
            </span>
          </div>
        )}

        <p className="text-[11px] text-gray-soft">
          {price > 0
            ? "Confermando l'acquisto otterrai accesso immediato al report completo: statistiche, valutazioni e verdetto dello scout."
            : "Confermando otterrai accesso immediato al report completo gratuitamente."}
        </p>

        {insufficient && (
          <Link to="/account" className="block text-center text-xs text-accent-lime underline" onClick={onCancel}>
            → Ricarica il tuo saldo dall'Account
          </Link>
        )}

        <div className="flex gap-2">
          <button onClick={onCancel} className="dm-btn-outline flex-1" disabled={loading}>
            Annulla
          </button>
          <button onClick={onConfirm} className="dm-btn-primary flex-1" disabled={loading || insufficient}>
            {loading ? "Elaborazione…" : price === 0 ? "Ottieni gratis" : `Acquista €${price.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Marketplace() {
  const { user, loading } = useAuth();
  const [players, setPlayers] = useState<PublicPlayer[]>([]);
  const [owners, setOwners] = useState<Record<string, OwnerInfo>>({});
  const [purchased, setPurchased] = useState<Set<string>>(new Set());
  // legacy request-based access (for non-listed players)
  const [requested, setRequested] = useState<Set<string>>(new Set());
  const [accessible, setAccessible] = useState<Set<string>>(new Set());
  const [loadingData, setLoadingData] = useState(true);

  const [buyTarget, setBuyTarget] = useState<PublicPlayer | null>(null);
  const [buyLoading, setBuyLoading] = useState(false);
  const [myBalance, setMyBalance] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState<string>("all");
  const [leagueFilter, setLeagueFilter] = useState<string>("all");
  const [orgFilter, setOrgFilter] = useState<"all" | "agency" | "club">("all");
  const [accessFilter, setAccessFilter] = useState<"all" | "listed" | "free" | "mine" | "purchased">("all");
  const [ageFilter, setAgeFilter] = useState<string>("all");
  const [natFilter, setNatFilter] = useState<string>("all");
  const [clubFilter, setClubFilter] = useState<string>("all");

  const load = async () => {
    if (!user) return;
    setLoadingData(true);
    const [{ data: pls, error: e1 }, { data: profs }, { data: reqs }, { data: purcs }] = await Promise.all([
      supabase.rpc("list_public_players"),
      supabase.from("profiles").select("user_id, org_name, org_type, display_name"),
      supabase.from("access_requests").select("player_id, status").eq("requester_id", user.id),
      supabase.from("marketplace_purchases" as any).select("player_id").eq("buyer_id", user.id),
    ]);
    if (e1) toast.error(e1.message);
    setPlayers(((pls as any) || []) as PublicPlayer[]);

    const map: Record<string, OwnerInfo> = {};
    (profs || []).forEach((p: any) => { map[p.user_id] = p; });
    setOwners(map);

    const req = new Set<string>();
    const acc = new Set<string>();
    (reqs || []).forEach((r: any) => {
      if (r.status === "pending") req.add(r.player_id);
      if (r.status === "accepted") acc.add(r.player_id);
    });
    setRequested(req);
    setAccessible(acc);

    const purch = new Set<string>();
    (purcs || []).forEach((r: any) => purch.add(r.player_id));
    setPurchased(purch);

    setLoadingData(false);
  };

  useEffect(() => { load(); }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase.rpc("get_my_wallet" as any).then(({ data }: any) => {
      if (data && data[0]) setMyBalance(data[0].balance);
    });
  }, [user]);

  // ── Acquisto atomico via RPC ──────────────────────────────────────────────
  const handleBuy = async () => {
    if (!buyTarget || !user) return;
    const price = buyTarget.marketplace_price ?? 0;
    setBuyLoading(true);
    try {
      const { error } = await supabase.rpc("process_marketplace_purchase" as any, {
        p_player_id:   buyTarget.id,
        p_listing_id:  buyTarget.marketplace_listing_id,
        p_seller_id:   buyTarget.owner_id,
        p_price:       price,
        p_player_name: buyTarget.name,
      } as any);
      if (error) throw error;

      setPurchased((s) => new Set([...s, buyTarget.id]));
      setAccessible((s) => new Set([...s, buyTarget.id]));
      toast.success(
        price === 0
          ? `Report di ${buyTarget.name} sbloccato gratuitamente!`
          : `Report di ${buyTarget.name} acquistato per €${price.toFixed(2)}! Il venditore ha ricevuto €${(price * 0.9).toFixed(2)}.`
      );
      setBuyTarget(null);
    } catch (err: any) {
      // Messaggio di saldo insufficiente user-friendly
      const msg: string = err?.message || "";
      if (msg.includes("Saldo insufficiente")) {
        toast.error(`${msg} — Ricarica il saldo dal tuo Account.`);
      } else {
        toast.error(msg || "Errore durante l'acquisto");
      }
    }
    setBuyLoading(false);
  };

  // ── Legacy richiesta accesso (giocatori non listati) ──────────────────────
  const requestAccess = async (player: PublicPlayer) => {
    if (!user || player.owner_id === user.id) return;
    if (requested.has(player.id) || accessible.has(player.id)) {
      toast.info("Richiesta già inviata o accesso già concesso.");
      return;
    }
    const { error } = await supabase.from("access_requests").insert({
      player_id: player.id,
      requester_id: user.id,
      owner_id: player.owner_id,
      message: `Richiesta di visione del report di ${player.name}.`,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success(`Richiesta inviata al proprietario di ${player.name}`);
    setRequested((s) => new Set([...s, player.id]));
  };

  const positions = useMemo(() => {
    const set = new Set<string>(POSITION_CODES as unknown as string[]);
    players.forEach((p) => p.position_code && set.add(p.position_code));
    return Array.from(set).sort();
  }, [players]);

  const leagues = useMemo(() => {
    const set = new Set<string>(DEFAULT_LEAGUES);
    players.forEach((p) => p.league && set.add(p.league));
    return Array.from(set).sort();
  }, [players]);

  const nationalities = useMemo(() => {
    const set = new Set<string>();
    players.forEach((p) => p.nationality && set.add(p.nationality));
    return Array.from(set).sort();
  }, [players]);

  const clubs = useMemo(() => {
    const set = new Set<string>();
    players.forEach((p) => p.club && set.add(p.club));
    return Array.from(set).sort();
  }, [players]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const ageBucket = AGE_BUCKETS.find((b) => b.value === ageFilter);
    return players.filter((p) => {
      const owner = owners[p.owner_id];
      if (orgFilter !== "all" && owner?.org_type !== orgFilter) return false;
      if (posFilter !== "all" && p.position_code !== posFilter) return false;
      if (leagueFilter !== "all" && p.league !== leagueFilter) return false;
      if (natFilter !== "all" && p.nationality !== natFilter) return false;
      if (clubFilter !== "all" && p.club !== clubFilter) return false;
      if (ageBucket) {
        const a = p.age ?? -1;
        if (a < ageBucket.min || a > ageBucket.max) return false;
      }
      if (accessFilter === "mine" && p.owner_id !== user?.id) return false;
      if (accessFilter === "listed" && !p.marketplace_active) return false;
      if (accessFilter === "free" && (p.marketplace_price === null || p.marketplace_price !== 0)) return false;
      if (accessFilter === "purchased" && !purchased.has(p.id)) return false;
      if (s) {
        const hay = [
          p.name, p.club, p.league, p.region, p.nationality, p.position_main, p.position_code,
          owner?.org_name, owner?.display_name,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [players, owners, search, orgFilter, posFilter, leagueFilter, natFilter, clubFilter, ageFilter, accessFilter, purchased, user]);

  const resetFilters = () => {
    setSearch(""); setPosFilter("all"); setLeagueFilter("all"); setOrgFilter("all");
    setAccessFilter("all"); setAgeFilter("all"); setNatFilter("all"); setClubFilter("all");
  };

  if (loading) return <PageShell><div className="container py-20 text-center text-gray-soft">Caricamento…</div></PageShell>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <PageShell>
      {buyTarget && (
        <BuyDialog
          player={buyTarget}
          price={buyTarget.marketplace_price ?? 0}
          onConfirm={handleBuy}
          onCancel={() => setBuyTarget(null)}
          loading={buyLoading}
          balance={myBalance}
        />
      )}

      <section className="container py-10">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <div className="section-label mb-3">// MARKETPLACE</div>
            <h1 className="font-display font-black uppercase text-4xl md:text-5xl mb-2">Report in vendita</h1>
            <p className="text-gray-soft max-w-2xl">
              Report inseriti dagli scout DM Scout. Vedi nome, nazionalità ed età:
              acquista il report per sbloccare statistiche, valutazioni e verdetto.
              DMScout trattiene il 10% su ogni transazione.
            </p>
          </div>
          <div className="flex gap-2 whitespace-nowrap flex-wrap">
            <Link to="/unlocked" className="dm-btn-outline">🔓 Sbloccati</Link>
            <Link to="/purchases" className="dm-btn-outline">💳 Acquisti</Link>
            <Link to="/requests" className="dm-btn-outline">📨 Richieste →</Link>
          </div>
        </div>

        {/* Filtri */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-2">
          <input
            className="dm-input lg:col-span-2"
            placeholder="Cerca per nome, club, lega, ruolo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="dm-input" value={posFilter} onChange={(e) => setPosFilter(e.target.value)}>
            <option value="all">Tutti i ruoli</option>
            {positions.map((p) => (
              <option key={p} value={p}>
                {p}{POSITION_LABEL[p as keyof typeof POSITION_LABEL] ? ` — ${POSITION_LABEL[p as keyof typeof POSITION_LABEL]}` : ""}
              </option>
            ))}
          </select>
          <select className="dm-input" value={leagueFilter} onChange={(e) => setLeagueFilter(e.target.value)}>
            <option value="all">Tutti i campionati</option>
            {leagues.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-6">
          <select className="dm-input" value={ageFilter} onChange={(e) => setAgeFilter(e.target.value)}>
            <option value="all">Tutte le età</option>
            {AGE_BUCKETS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
          <select className="dm-input" value={natFilter} onChange={(e) => setNatFilter(e.target.value)}>
            <option value="all">Tutte le nazionalità</option>
            {nationalities.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <select className="dm-input" value={clubFilter} onChange={(e) => setClubFilter(e.target.value)}>
            <option value="all">Tutti i club</option>
            {clubs.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="dm-input" value={accessFilter} onChange={(e) => setAccessFilter(e.target.value as any)}>
            <option value="all">Stato: tutti</option>
            <option value="listed">Solo in vendita</option>
            <option value="free">Solo gratuiti</option>
            <option value="purchased">Già acquistati</option>
            <option value="mine">I miei</option>
          </select>
        </div>
        <div className="flex gap-2 mb-6 text-xs flex-wrap items-center">
          {(["all", "agency", "club"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setOrgFilter(f)}
              className={`px-3 py-1.5 font-mono uppercase tracking-[0.12rem] border-hairline ${
                orgFilter === f ? "bg-accent-lime/20 text-accent-lime border-accent-lime" : "text-gray-soft"
              }`}
            >
              {f === "all" ? "Tutti" : f === "agency" ? "Agenzie" : "Club"}
            </button>
          ))}
          <button onClick={resetFilters} className="px-3 py-1.5 font-mono uppercase tracking-[0.12rem] border-hairline text-gray-soft hover:text-foreground">
            ✕ Reset
          </button>
          <span className="ml-auto text-gray-soft self-center">{filtered.length} giocatori</span>
        </div>

        {loadingData ? (
          <div className="dm-card p-10 text-center text-gray-soft">Caricamento giocatori…</div>
        ) : filtered.length === 0 ? (
          <div className="dm-card p-10 text-center text-gray-soft">Nessun giocatore corrisponde ai filtri.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-px bg-border/10 border-hairline">
            {filtered.map((p) => {
              const owner = owners[p.owner_id];
              const isMine = p.owner_id === user.id;
              const isPurchased = purchased.has(p.id) || accessible.has(p.id);
              const isRequested = requested.has(p.id);
              const isListed = p.marketplace_active === true && p.marketplace_price !== null;
              const price = p.marketplace_price ?? 0;

              return (
                <div key={p.id} className="bg-background p-4 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    {p.photo ? (
                      <img src={p.photo} alt={p.name} className="w-14 h-14 object-cover border-hairline" />
                    ) : (
                      <div className="w-14 h-14 bg-gray-light/30 flex items-center justify-center text-2xl">
                        {p.flag || "👤"}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-bold uppercase truncate">{p.name}</div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.12rem] text-gray-soft mt-1">
                        {p.age ? `${p.age} anni` : "—"}{p.nationality ? ` · ${p.nationality}` : ""}
                      </div>
                    </div>
                    {isListed && <PriceTag price={price} />}
                  </div>

                  <div className="text-xs text-gray-soft">
                    Scout: <span className="text-foreground">{owner?.org_name || "—"}</span>
                    {owner?.org_type && (
                      <span className="ml-1 text-accent-lime">[{owner.org_type === "agency" ? "Agenzia" : "Club"}]</span>
                    )}
                  </div>

                  <div className="mt-auto pt-2 border-hairline-t">
                    {isMine ? (
                      <Link to={`/player?id=${p.id}`} className="dm-btn-outline w-full text-center !py-1.5 text-xs">
                        Apri (tuo report) →
                      </Link>
                    ) : isPurchased ? (
                      <Link to={`/player?id=${p.id}`} className="dm-btn-primary w-full text-center !py-1.5 text-xs">
                        ✓ Apri report completo →
                      </Link>
                    ) : isListed ? (
                      <button
                        onClick={() => setBuyTarget(p)}
                        className="dm-btn-primary w-full !py-1.5 text-xs"
                      >
                        {price === 0 ? "🔓 Ottieni gratis" : `💳 Acquista ${`€${price.toFixed(2)}`}`}
                      </button>
                    ) : isRequested ? (
                      <button disabled className="dm-btn-outline w-full !py-1.5 text-xs opacity-60 cursor-not-allowed">
                        ⏳ In attesa di risposta
                      </button>
                    ) : (
                      <button onClick={() => requestAccess(p)} className="dm-btn-outline w-full !py-1.5 text-xs">
                        🔒 Richiedi autorizzazione
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </PageShell>
  );
}
