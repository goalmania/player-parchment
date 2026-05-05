/**
 * Pagina dedicata ai giocatori a cui il proprietario ha CONCESSO l'accesso
 * ("accettato"). Mostra cosa è stato sbloccato (statistiche, valutazioni,
 * verdetto) e consente di aprire direttamente il report completo.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Player } from "@/lib/types";

interface OwnerInfo {
  user_id: string;
  org_name: string;
  org_type: "agency" | "club";
  display_name: string | null;
}

export default function Unlocked() {
  const { user, loading } = useAuth();
  const [players, setPlayers] = useState<Player[]>([]);
  const [owners, setOwners] = useState<Record<string, OwnerInfo>>({});
  const [loadingData, setLoadingData] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadingData(true);
      // 1. richieste accettate dove sono il richiedente
      const { data: reqs, error: e1 } = await supabase
        .from("access_requests")
        .select("player_id, owner_id, updated_at")
        .eq("requester_id", user.id)
        .eq("status", "accepted");
      if (e1) { toast.error(e1.message); setLoadingData(false); return; }
      const ids = (reqs || []).map((r: any) => r.player_id);
      if (ids.length === 0) {
        setPlayers([]); setOwners({}); setLoadingData(false); return;
      }
      // 2. report completi (RLS lo consente grazie a has_player_access)
      const [{ data: pls }, { data: profs }] = await Promise.all([
        supabase.from("players").select("*").in("id", ids),
        supabase.from("profiles").select("user_id, org_name, org_type, display_name")
          .in("user_id", (reqs || []).map((r: any) => r.owner_id)),
      ]);
      setPlayers(((pls as any) || []) as Player[]);
      const map: Record<string, OwnerInfo> = {};
      (profs || []).forEach((p: any) => { map[p.user_id] = p; });
      setOwners(map);
      setLoadingData(false);
    })();
  }, [user]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return players;
    return players.filter((p) => {
      const owner = owners[p.owner_id as any];
      const hay = [p.name, p.club, p.league, p.position_main, p.position_code, p.nationality, owner?.org_name]
        .filter(Boolean).join(" ").toLowerCase();
      return hay.includes(s);
    });
  }, [players, owners, search]);

  if (loading) return <PageShell><div className="container py-20 text-center text-gray-soft">Caricamento…</div></PageShell>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <PageShell>
      <section className="container py-10">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <div className="section-label mb-3">// SBLOCCATI</div>
            <h1 className="font-display font-black uppercase text-4xl md:text-5xl mb-2">Report sbloccati</h1>
            <p className="text-gray-soft max-w-2xl">
              Giocatori per cui hai ottenuto l'accesso completo dai proprietari. Statistiche, valutazioni
              e verdetto sono ora visibili: apri il report direttamente da qui.
            </p>
          </div>
          <div className="flex gap-2 whitespace-nowrap">
            <Link to="/marketplace" className="dm-btn-outline">← Marketplace</Link>
            <Link to="/requests" className="dm-btn-outline">📨 Richieste</Link>
          </div>
        </div>

        <input
          className="dm-input mb-6 max-w-md"
          placeholder="Cerca tra i tuoi report sbloccati…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loadingData ? (
          <div className="dm-card p-10 text-center text-gray-soft">Caricamento…</div>
        ) : filtered.length === 0 ? (
          <div className="dm-card p-10 text-center text-gray-soft">
            Nessun report sbloccato. Vai nel <Link to="/marketplace" className="text-accent-lime underline">Marketplace</Link> per richiedere accessi.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((p) => {
              const owner = owners[p.owner_id as any];
              const overall = (p.ratings as any)?.overall;
              const verdict = p.verdict_type;
              const vCol = verdict === "buy" ? "hsl(var(--accent))" :
                           verdict === "pass" ? "hsl(var(--red))" : "hsl(var(--orange))";
              const statsCount = p.stats ? Object.keys(p.stats).length : 0;
              const mStatsCount = p.stats ? Object.keys(p.stats).filter((k) => k.startsWith("m_")).length : 0;
              return (
                <div key={p.id} className="dm-card p-4 flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    {p.photo ? (
                      <img src={p.photo} alt={p.name} className="w-14 h-14 object-cover border-hairline" />
                    ) : (
                      <div className="w-14 h-14 bg-gray-light/30 flex items-center justify-center text-2xl">{p.flag || "👤"}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-bold uppercase truncate">{p.name}</div>
                      <div className="text-xs text-gray-soft truncate">
                        {p.position_code || "—"} · {p.club || "Svincolato"} · {p.league || "—"}
                      </div>
                      <div className="text-[10px] font-mono uppercase tracking-[0.12rem] text-gray-soft mt-1">
                        {p.age ? `${p.age} anni` : ""}{p.nationality ? ` · ${p.nationality}` : ""}
                      </div>
                    </div>
                    {typeof overall === "number" && (
                      <div className="text-right">
                        <div className="font-display font-black text-2xl text-accent-lime">{overall.toFixed(1)}</div>
                        <div className="text-[10px] font-mono uppercase tracking-[0.12rem] text-gray-soft">overall</div>
                      </div>
                    )}
                  </div>

                  <div className="text-[10px] font-mono uppercase tracking-[0.12rem] text-gray-soft border-hairline-t pt-2">
                    Sbloccato — Proprietario: <span className="text-foreground">{owner?.org_name || "—"}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="border-hairline p-2">
                      <div className="font-mono text-[9px] uppercase text-gray-soft">Statistiche</div>
                      <div className="font-display font-bold">{statsCount - mStatsCount}</div>
                    </div>
                    <div className="border-hairline p-2">
                      <div className="font-mono text-[9px] uppercase text-gray-soft">Ultima part.</div>
                      <div className="font-display font-bold">{mStatsCount}</div>
                    </div>
                    <div className="border-hairline p-2">
                      <div className="font-mono text-[9px] uppercase text-gray-soft">Verdetto</div>
                      <div className="font-display font-bold uppercase" style={{ color: vCol }}>
                        {verdict || "—"}
                      </div>
                    </div>
                  </div>

                  <Link to={`/player?id=${p.id}`} className="dm-btn-primary w-full text-center !py-1.5 text-xs">
                    ✓ Apri report completo →
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </PageShell>
  );
}
