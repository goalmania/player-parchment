/**
 * Browse other scouts. Lists all profiles + already-shared reports.
 * Send access requests by player ID (shared by the owner offline / via "Condividi link").
 */
import { useEffect, useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PublicPlayer {
  id: string;
  name: string;
  position_code: string;
  club: string;
  age: number | null;
  owner_id: string;
}

interface ProfileLite {
  user_id: string;
  org_type: "agency" | "club";
  org_name: string;
  display_name: string | null;
}

export default function Browse() {
  const { user, loading } = useAuth();
  const [profiles, setProfiles] = useState<ProfileLite[]>([]);
  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState<"all" | "agency" | "club">("all");
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
  const [accessibleIds, setAccessibleIds] = useState<Set<string>>(new Set());
  const [accessiblePlayers, setAccessiblePlayers] = useState<PublicPlayer[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: profs }, { data: reqs }, { data: pls }] = await Promise.all([
        supabase.from("profiles").select("user_id, org_type, org_name, display_name").neq("user_id", user.id),
        supabase.from("access_requests").select("player_id, status").eq("requester_id", user.id),
        supabase.from("players").select("id, name, position_code, club, age, owner_id").neq("owner_id", user.id),
      ]);
      setProfiles((profs as any) || []);
      const reqSet = new Set<string>();
      const accSet = new Set<string>();
      (reqs || []).forEach((r: any) => {
        if (r.status === "pending") reqSet.add(r.player_id);
        if (r.status === "accepted") accSet.add(r.player_id);
      });
      setRequestedIds(reqSet);
      setAccessibleIds(accSet);
      setAccessiblePlayers((pls as any) || []);
    })();
  }, [user]);

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      if (orgFilter !== "all" && p.org_type !== orgFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!p.org_name.toLowerCase().includes(s) && !(p.display_name || "").toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [profiles, search, orgFilter]);

  const requestAccess = async (ownerId: string, orgName: string) => {
    if (!user) return;
    const playerId = prompt(
      `Inserisci l'ID del report di ${orgName} per cui richiedere l'accesso.\n\n(Il proprietario può condividere l'ID dalla pagina del giocatore tramite "Condividi".)`
    );
    if (!playerId?.trim()) return;
    const id = playerId.trim();
    if (requestedIds.has(id) || accessibleIds.has(id)) {
      toast.info("Richiesta già inviata o accesso già concesso.");
      return;
    }
    const { error } = await supabase.from("access_requests").insert({
      player_id: id,
      requester_id: user.id,
      owner_id: ownerId,
      message: `Richiesta accesso al report.`,
    } as any);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Richiesta inviata. Attendi conferma del proprietario.");
      setRequestedIds((s) => new Set([...s, id]));
    }
  };

  if (loading) return <PageShell><div className="container py-20 text-center text-gray-soft">Caricamento…</div></PageShell>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <PageShell>
      <section className="container py-10">
        <div className="section-label mb-3">// ESPLORA</div>
        <h1 className="font-display font-black uppercase text-4xl md:text-5xl mb-2">Altri Scout</h1>
        <p className="text-gray-soft mb-8">
          Sfoglia agenzie e club registrati. Richiedi l'accesso a un report incollando l'ID condiviso dal proprietario.
        </p>

        <div className="flex flex-wrap gap-3 mb-6">
          <input
            className="dm-input flex-1 min-w-[200px]"
            placeholder="Cerca organizzazione…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="dm-input max-w-[180px]" value={orgFilter} onChange={(e) => setOrgFilter(e.target.value as any)}>
            <option value="all">Tutti</option>
            <option value="agency">Solo Agenzie</option>
            <option value="club">Solo Club</option>
          </select>
        </div>

        {accessiblePlayers.length > 0 && (
          <div className="mb-8">
            <div className="section-label mb-3">// REPORT CONDIVISI CON TE</div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border/10 border-hairline">
              {accessiblePlayers.map((p) => (
                <Link
                  key={p.id}
                  to={`/player?id=${p.id}`}
                  className="bg-background p-4 hover:bg-gray-light/40 transition-colors"
                >
                  <div className="font-display font-bold uppercase">{p.name}</div>
                  <div className="text-xs text-gray-soft mt-1">{p.position_code} · {p.club}</div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {filteredProfiles.map((prof) => (
            <div key={prof.user_id} className="dm-card p-5 flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="text-xs font-mono uppercase tracking-[0.18rem] text-accent-lime mb-1">
                  {prof.org_type === "agency" ? "AGENZIA" : "CLUB"}
                </div>
                <div className="font-display font-bold text-xl uppercase">{prof.org_name}</div>
                {prof.display_name && <div className="text-sm text-gray-soft">{prof.display_name}</div>}
              </div>
              <button onClick={() => requestAccess(prof.user_id, prof.org_name)} className="dm-btn-primary !py-1.5 !px-3 text-xs">
                📨 Richiedi un report
              </button>
            </div>
          ))}
          {filteredProfiles.length === 0 && (
            <div className="dm-card p-10 text-center text-gray-soft">Nessun altro scout trovato.</div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
