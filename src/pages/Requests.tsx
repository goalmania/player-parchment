import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RequestRow {
  id: string;
  player_id: string;
  requester_id: string;
  owner_id: string;
  status: "pending" | "accepted" | "rejected";
  message: string | null;
  created_at: string;
  // joined
  player_name?: string;
  requester_name?: string;
  owner_name?: string;
}

export default function Requests() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<"incoming" | "outgoing">("incoming");
  const [incoming, setIncoming] = useState<RequestRow[]>([]);
  const [outgoing, setOutgoing] = useState<RequestRow[]>([]);

  const load = async () => {
    if (!user) return;
    const { data: inReq } = await supabase
      .from("access_requests").select("*").eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    const { data: outReq } = await supabase
      .from("access_requests").select("*").eq("requester_id", user.id)
      .order("created_at", { ascending: false });

    const allUserIds = new Set<string>();
    const allPlayerIds = new Set<string>();
    (inReq || []).forEach((r: any) => { allUserIds.add(r.requester_id); allPlayerIds.add(r.player_id); });
    (outReq || []).forEach((r: any) => { allUserIds.add(r.owner_id); allPlayerIds.add(r.player_id); });

    const [{ data: profs }, { data: pls }] = await Promise.all([
      supabase.from("profiles").select("user_id, org_name, display_name").in("user_id", Array.from(allUserIds)),
      supabase.from("players").select("id, name").in("id", Array.from(allPlayerIds)),
    ]);
    const profMap = new Map((profs || []).map((p: any) => [p.user_id, p]));
    const playerMap = new Map((pls || []).map((p: any) => [p.id, p]));

    const enrich = (r: any, side: "incoming" | "outgoing"): RequestRow => ({
      ...r,
      player_name: playerMap.get(r.player_id)?.name || "Report sconosciuto",
      requester_name: profMap.get(r.requester_id)?.org_name,
      owner_name: profMap.get(r.owner_id)?.org_name,
    });
    setIncoming((inReq || []).map((r: any) => enrich(r, "incoming")));
    setOutgoing((outReq || []).map((r: any) => enrich(r, "outgoing")));
  };

  useEffect(() => { load(); }, [user]);

  const respond = async (id: string, status: "accepted" | "rejected") => {
    const { error } = await supabase.from("access_requests").update({ status } as any).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "accepted" ? "Richiesta accettata" : "Richiesta rifiutata");
    load();
  };

  const cancel = async (id: string) => {
    const { error } = await supabase.from("access_requests").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Richiesta annullata");
    load();
  };

  if (loading) return <PageShell><div className="container py-20 text-center text-gray-soft">Caricamento…</div></PageShell>;
  if (!user) return <Navigate to="/auth" replace />;

  const list = tab === "incoming" ? incoming : outgoing;

  return (
    <PageShell>
      <section className="container py-10 max-w-4xl">
        <div className="section-label mb-3">// RICHIESTE</div>
        <h1 className="font-display font-black uppercase text-4xl md:text-5xl mb-2">Accessi ai Report</h1>
        <p className="text-gray-soft mb-8">Gestisci le richieste di condivisione tra agenzie e club.</p>

        <div className="flex gap-2 border-hairline-b mb-6">
          {(["incoming", "outgoing"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 font-display font-bold uppercase tracking-[0.12rem] text-sm ${
                tab === t ? "border-b-2 border-accent text-accent-lime" : "text-gray-soft"
              }`}
            >
              {t === "incoming" ? `In Arrivo (${incoming.filter((r) => r.status === "pending").length})` : `Inviate (${outgoing.length})`}
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <div className="dm-card p-10 text-center text-gray-soft">Nessuna richiesta {tab === "incoming" ? "in arrivo" : "inviata"}.</div>
        ) : (
          <div className="space-y-3">
            {list.map((r) => {
              const sCol = r.status === "accepted" ? "hsl(var(--accent))" :
                            r.status === "rejected" ? "hsl(var(--red))" : "hsl(var(--orange))";
              return (
                <div key={r.id} className="dm-card p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-display font-bold uppercase">
                      {r.player_name}
                    </div>
                    <div className="text-xs text-gray-soft">
                      {tab === "incoming"
                        ? `Da: ${r.requester_name || "Sconosciuto"}`
                        : `A: ${r.owner_name || "Sconosciuto"}`}
                      {" · "}{new Date(r.created_at).toLocaleDateString("it-IT")}
                    </div>
                    {r.message && <div className="text-sm mt-1 text-foreground/80">"{r.message}"</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs uppercase tracking-[0.12rem]" style={{ color: sCol }}>
                      {r.status === "pending" ? "IN ATTESA" : r.status === "accepted" ? "ACCETTATA" : "RIFIUTATA"}
                    </span>
                    {tab === "incoming" && r.status === "pending" && (
                      <>
                        <button onClick={() => respond(r.id, "accepted")} className="dm-btn-primary !py-1 !px-3 text-xs">Accetta</button>
                        <button onClick={() => respond(r.id, "rejected")} className="dm-btn-outline !py-1 !px-3 text-xs">Rifiuta</button>
                      </>
                    )}
                    {tab === "incoming" && r.status === "accepted" && (
                      <Link to={`/player?id=${r.player_id}`} className="dm-btn-outline !py-1 !px-3 text-xs">Vai al report →</Link>
                    )}
                    {tab === "outgoing" && r.status === "pending" && (
                      <button onClick={() => cancel(r.id)} className="dm-btn-outline !py-1 !px-3 text-xs">Annulla</button>
                    )}
                    {tab === "outgoing" && r.status === "accepted" && (
                      <Link to={`/player?id=${r.player_id}`} className="dm-btn-primary !py-1 !px-3 text-xs">Apri report →</Link>
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
