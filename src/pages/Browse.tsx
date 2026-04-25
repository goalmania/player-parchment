/**
 * Browse other scouts' player databases.
 * Lists all profiles + their public player names so the user can request access.
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
        // Players visible to me thanks to RLS (own + accepted requests). Filter out my own.
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

  if (loading) return <PageShell><div className="container py-20 text-center text-gray-soft">Caricamento…</div></PageShell>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <PageShell>
      <section className="container py-10">
        <div className="section-label mb-3">// ESPLORA</div>
        <h1 className="font-display font-black uppercase text-4xl md:text-5xl mb-2">Altri Scout</h1>
        <p className="text-gray-soft mb-8">
          Sfoglia agenzie e club. Trova un report che ti interessa e richiedi l'accesso al proprietario.
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
              {accessiblePlayers.filter((p) => accessibleIds.has(p.id)).map((p) => (
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

        <div className="space-y-6">
          {filteredProfiles.map((prof) => (
            <ProfileBlock
              key={prof.user_id}
              profile={prof}
              requestedIds={requestedIds}
              accessibleIds={accessibleIds}
              onRequested={(pid) => setRequestedIds((s) => new Set([...s, pid]))}
            />
          ))}
          {filteredProfiles.length === 0 && (
            <div className="dm-card p-10 text-center text-gray-soft">Nessun altro scout trovato.</div>
          )}
        </div>
      </section>
    </PageShell>
  );
}

function ProfileBlock({
  profile,
  requestedIds,
  accessibleIds,
  onRequested,
}: {
  profile: ProfileLite;
  requestedIds: Set<string>;
  accessibleIds: Set<string>;
  onRequested: (id: string) => void;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [players, setPlayers] = useState<PublicPlayer[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (players.length > 0 || loading) return;
    setLoading(true);
    // Note: RLS will only return players this user has access to (own + accepted).
    // To list other scouts' player names we need a public view OR rely on the player owner sharing.
    // For now we surface accepted-access players; pending requests show as "in attesa".
    // In future: add a "public_players_index" view. For MVP, scout requests by name.
    setLoading(false);
  };

  const requestByName = async () => {
    const playerName = prompt("Nome del giocatore di cui richiedere il report:");
    if (!playerName?.trim() || !user) return;
    // Look up player by owner + name (server-side check; user can't read other players directly)
    const { data, error } = await supabase
      .from("players")
      .select("id, name")
      .eq("owner_id", profile.user_id)
      .ilike("name", `%${playerName.trim()}%`)
      .limit(5);

    // We can't actually read other people's players via RLS; this is a UX placeholder.
    // Insert request blindly using a known UUID flow won't work. So instead we rely on
    // an RPC. For MVP we let the user paste a player ID shared by the owner offline.
    if (error || !data || data.length === 0) {
      const playerId = prompt("Non trovato direttamente. Incolla l'ID del report (richiedibile al proprietario):");
      if (!playerId) return;
      const { error: insErr } = await supabase.from("access_requests").insert({
        player_id: playerId.trim(),
        requester_id: user.id,
        owner_id: profile.user_id,
        message: `Richiesta accesso a "${playerName}"`,
      } as any);
      if (insErr) toast.error(insErr.message);
      else { toast.success("Richiesta inviata"); onRequested(playerId.trim()); }
      return;
    }

    // (RLS will block this normally — kept for future when a public index exists)
    const target = data[0];
    const { error: insErr } = await supabase.from("access_requests").insert({
      player_id: target.id,
      requester_id: user.id,
      owner_id: profile.user_id,
      message: `Richiesta accesso a "${target.name}"`,
    } as any);
    if (insErr) toast.error(insErr.message);
    else { toast.success("Richiesta inviata"); onRequested(target.id); }
  };

  return (
    <div className="dm-card p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs font-mono uppercase tracking-[0.18rem] text-accent-lime mb-1">
            {profile.org_type === "agency" ? "AGENZIA" : "CLUB"}
          </div>
          <div className="font-display font-bold text-xl uppercase">{profile.org_name}</div>
          {profile.display_name && <div className="text-sm text-gray-soft">{profile.display_name}</div>}
        </div>
        <div className="flex gap-2">
          <button onClick={requestByName} className="dm-btn-primary !py-1.5 !px-3 text-xs">
            📨 Richiedi un report
          </button>
        </div>
      </div>
    </div>
  );
}
