/**
 * Marketplace pubblico: tutti i giocatori inseriti dagli scout DM Scout.
 * Mostra SOLO dati anagrafici. Per vedere il report completo serve richiedere
 * l'autorizzazione al proprietario tramite "Richiedi accesso".
 */
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
}

interface OwnerInfo {
  user_id: string;
  org_name: string;
  org_type: "agency" | "club";
  display_name: string | null;
}

export default function Marketplace() {
  const { user, loading } = useAuth();
  const [players, setPlayers] = useState<PublicPlayer[]>([]);
  const [owners, setOwners] = useState<Record<string, OwnerInfo>>({});
  const [requested, setRequested] = useState<Set<string>>(new Set());
  const [accessible, setAccessible] = useState<Set<string>>(new Set());
  const [loadingData, setLoadingData] = useState(true);

  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState<string>("all");
  const [leagueFilter, setLeagueFilter] = useState<string>("all");
  const [orgFilter, setOrgFilter] = useState<"all" | "agency" | "club">("all");
  const [accessFilter, setAccessFilter] = useState<"all" | "available" | "mine" | "requested" | "accepted">("all");

  const load = async () => {
    if (!user) return;
    setLoadingData(true);
    const [{ data: pls, error: e1 }, { data: profs }, { data: reqs }] = await Promise.all([
      supabase.rpc("list_public_players"),
      supabase.from("profiles").select("user_id, org_name, org_type, display_name"),
      supabase.from("access_requests").select("player_id, status").eq("requester_id", user.id),
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
    setLoadingData(false);
  };

  useEffect(() => { load(); }, [user]);

  const requestAccess = async (player: PublicPlayer) => {
    if (!user) return;
    if (player.owner_id === user.id) return;
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
    const set = new Set<string>();
    players.forEach((p) => p.position_code && set.add(p.position_code));
    return Array.from(set).sort();
  }, [players]);

  const leagues = useMemo(() => {
    const set = new Set<string>();
    players.forEach((p) => p.league && set.add(p.league));
    return Array.from(set).sort();
  }, [players]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return players.filter((p) => {
      const owner = owners[p.owner_id];
      if (orgFilter !== "all" && owner?.org_type !== orgFilter) return false;
      if (posFilter !== "all" && p.position_code !== posFilter) return false;
      if (leagueFilter !== "all" && p.league !== leagueFilter) return false;
      if (accessFilter === "mine" && p.owner_id !== user?.id) return false;
      if (accessFilter === "available" && (p.owner_id === user?.id || accessible.has(p.id))) return false;
      if (accessFilter === "requested" && !requested.has(p.id)) return false;
      if (accessFilter === "accepted" && !accessible.has(p.id)) return false;
      if (s) {
        const hay = [
          p.name, p.club, p.league, p.region, p.nationality, p.position_main, p.position_code,
          owner?.org_name, owner?.display_name,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [players, owners, search, orgFilter, posFilter, leagueFilter, accessFilter, accessible, requested, user]);

  if (loading) return <PageShell><div className="container py-20 text-center text-gray-soft">Caricamento…</div></PageShell>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <PageShell>
      <section className="container py-10">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <div className="section-label mb-3">// MARKETPLACE</div>
            <h1 className="font-display font-black uppercase text-4xl md:text-5xl mb-2">Tutti i giocatori</h1>
            <p className="text-gray-soft max-w-2xl">
              Tutti i report inseriti dagli scout su DM Scout. Vedi solo i dati anagrafici:
              richiedi l'accesso al proprietario per sbloccare statistiche, valutazioni e verdetto.
            </p>
          </div>
          <Link to="/requests" className="dm-btn-outline whitespace-nowrap">📨 Le mie richieste →</Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2 mb-6">
          <input
            className="dm-input lg:col-span-2"
            placeholder="Cerca per nome, club, lega, ruolo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="dm-input" value={posFilter} onChange={(e) => setPosFilter(e.target.value)}>
            <option value="all">Tutti i ruoli</option>
            {positions.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className="dm-input" value={leagueFilter} onChange={(e) => setLeagueFilter(e.target.value)}>
            <option value="all">Tutti i campionati</option>
            {leagues.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <select className="dm-input" value={accessFilter} onChange={(e) => setAccessFilter(e.target.value as any)}>
            <option value="all">Tutti</option>
            <option value="available">Da richiedere</option>
            <option value="requested">Richiesti</option>
            <option value="accepted">Accessibili</option>
            <option value="mine">I miei</option>
          </select>
        </div>
        <div className="flex gap-2 mb-6 text-xs">
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
              const isAccepted = accessible.has(p.id);
              const isRequested = requested.has(p.id);
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
                      <div className="text-xs text-gray-soft truncate">
                        {p.position_code || "—"} · {p.club || "Svincolato"}
                      </div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.12rem] text-gray-soft mt-1">
                        {p.age ? `${p.age} anni` : ""}{p.nationality ? ` · ${p.nationality}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.12rem] text-gray-soft">
                    {p.league || "—"}{p.region ? ` · ${p.region}` : ""}
                  </div>
                  <div className="text-xs text-gray-soft">
                    Proprietario: <span className="text-foreground">{owner?.org_name || "—"}</span>
                    {owner?.org_type && (
                      <span className="ml-1 text-accent-lime">[{owner.org_type === "agency" ? "Agenzia" : "Club"}]</span>
                    )}
                  </div>
                  <div className="mt-auto pt-2 border-hairline-t">
                    {isMine ? (
                      <Link to={`/player?id=${p.id}`} className="dm-btn-outline w-full text-center !py-1.5 text-xs">
                        Apri (tuo report) →
                      </Link>
                    ) : isAccepted ? (
                      <Link to={`/player?id=${p.id}`} className="dm-btn-primary w-full text-center !py-1.5 text-xs">
                        ✓ Apri report completo →
                      </Link>
                    ) : isRequested ? (
                      <button disabled className="dm-btn-outline w-full !py-1.5 text-xs opacity-60 cursor-not-allowed">
                        ⏳ In attesa di risposta
                      </button>
                    ) : (
                      <button onClick={() => requestAccess(p)} className="dm-btn-primary w-full !py-1.5 text-xs">
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
