/**
 * Pannello admin prelievi — visibile SOLO a dimuropaolo77@gmail.com.
 * Mostra tutte le richieste di prelievo in attesa e permette di
 * approvarle o rifiutarle con una nota.
 */
import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ADMIN_EMAIL = "dimuropaolo77@gmail.com";

interface WithdrawalRow {
  id: string;
  user_id: string;
  amount: number;
  method: string;
  method_detail: string;
  notes: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  user_email?: string;
  org_name?: string;
}

const STATUS_FILTER = ["all", "pending", "approved", "rejected"] as const;

export default function AdminWithdrawals() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<WithdrawalRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_FILTER[number]>("pending");
  const [actionNote, setActionNote] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  const load = async () => {
    setLoadingData(true);
    const { data: wreqs, error } = await supabase
      .from("withdrawal_requests" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { toast.error(error.message); setLoadingData(false); return; }

    const userIds = [...new Set((wreqs || []).map((r: any) => r.user_id))];
    const [{ data: users }, { data: profs }] = await Promise.all([
      supabase.from("profiles").select("user_id, org_name").in("user_id", userIds),
      // email non disponibile da profiles — usiamo solo org_name
      Promise.resolve({ data: [] }),
    ]);
    const profMap = new Map((users || []).map((p: any) => [p.user_id, p]));

    setRows(((wreqs || []) as any[]).map((r) => ({
      ...r,
      org_name: profMap.get(r.user_id)?.org_name || "—",
    })));
    setLoadingData(false);
  };

  useEffect(() => { if (user?.email === ADMIN_EMAIL) load(); }, [user]);

  const process = async (id: string, action: "approve" | "reject") => {
    setProcessing(id);
    const { error } = await supabase.rpc("admin_process_withdrawal" as any, {
      p_request_id: id,
      p_action: action,
      p_admin_note: actionNote[id]?.trim() || null,
    } as any);
    if (error) { toast.error(error.message); }
    else {
      toast.success(action === "approve" ? "Prelievo approvato ✓" : "Prelievo rifiutato — saldo rimborsato");
      await load();
    }
    setProcessing(null);
  };

  if (loading) return <PageShell><div className="container py-20 text-center text-gray-soft">Caricamento…</div></PageShell>;
  if (!user || user.email !== ADMIN_EMAIL) return <Navigate to="/" replace />;

  const filtered = statusFilter === "all" ? rows : rows.filter((r) => r.status === statusFilter);
  const pending = rows.filter((r) => r.status === "pending");
  const totalPending = pending.reduce((s, r) => s + r.amount, 0);

  return (
    <PageShell>
      <section className="container py-10">
        <div className="section-label mb-3">// ADMIN · DMSCOUT</div>
        <h1 className="font-display font-black uppercase text-4xl md:text-5xl mb-2">Richieste di Prelievo</h1>
        <p className="text-gray-soft mb-8">Gestisci i prelievi richiesti dagli scout. Approva per confermare il pagamento, rifiuta per restituire il saldo.</p>

        {/* Riepilogo */}
        <div className="grid sm:grid-cols-3 gap-px bg-border/10 border-hairline mb-8">
          <div className="bg-background p-4">
            <div className="text-[10px] font-mono uppercase text-gray-soft mb-1">In attesa</div>
            <div className="font-display font-black text-3xl text-orange-400">{pending.length}</div>
          </div>
          <div className="bg-background p-4">
            <div className="text-[10px] font-mono uppercase text-gray-soft mb-1">Da pagare</div>
            <div className="font-display font-black text-3xl text-orange-400">€{totalPending.toFixed(2)}</div>
          </div>
          <div className="bg-background p-4">
            <div className="text-[10px] font-mono uppercase text-gray-soft mb-1">Totale richieste</div>
            <div className="font-display font-black text-3xl">{rows.length}</div>
          </div>
        </div>

        {/* Filtro stato */}
        <div className="flex gap-0 border-hairline w-fit mb-6">
          {STATUS_FILTER.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 text-xs font-mono uppercase tracking-[0.1rem] ${
                statusFilter === s ? "bg-accent-lime/20 text-accent-lime" : "text-gray-soft hover:text-foreground"
              }`}
            >
              {s === "all" ? "Tutti" : s === "pending" ? `In attesa (${pending.length})` : s === "approved" ? "Approvati" : "Rifiutati"}
            </button>
          ))}
        </div>

        {loadingData ? (
          <div className="dm-card p-10 text-center text-gray-soft">Caricamento…</div>
        ) : filtered.length === 0 ? (
          <div className="dm-card p-10 text-center text-gray-soft">Nessuna richiesta.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => (
              <div key={r.id} className="dm-card p-5">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <span className={`font-mono text-[9px] uppercase px-2 py-0.5 ${
                        r.status === "approved" ? "bg-accent-lime/20 text-accent-lime" :
                        r.status === "rejected" ? "bg-red-400/20 text-red-400" :
                        "bg-orange-400/20 text-orange-400"
                      }`}>
                        {r.status === "approved" ? "✓ Approvato" : r.status === "rejected" ? "✕ Rifiutato" : "⏳ In attesa"}
                      </span>
                      <span className="font-display font-bold uppercase">{r.org_name}</span>
                      <span className="text-xs text-gray-soft">{new Date(r.created_at).toLocaleString("it-IT")}</span>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-3 text-sm mb-3">
                      <div>
                        <span className="text-[9px] font-mono uppercase text-gray-soft block mb-0.5">Metodo</span>
                        <span className="font-semibold uppercase">{r.method}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-mono uppercase text-gray-soft block mb-0.5">Dettagli pagamento</span>
                        <span className="font-mono text-xs break-all">{r.method_detail}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-mono uppercase text-gray-soft block mb-0.5">Importo</span>
                        <span className="font-display font-black text-xl text-foreground">€{parseFloat(r.amount as any).toFixed(2)}</span>
                      </div>
                    </div>

                    {r.notes && (
                      <div className="text-xs text-gray-soft italic mb-2">Note utente: {r.notes}</div>
                    )}
                    {r.admin_note && (
                      <div className="text-xs text-accent-lime/80">Nota admin: {r.admin_note}</div>
                    )}
                  </div>
                </div>

                {r.status === "pending" && (
                  <div className="mt-4 pt-4 border-hairline-t flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-[9px] font-mono uppercase text-gray-soft block mb-1">
                        Nota (opzionale — visibile all'utente)
                      </label>
                      <input
                        className="dm-input w-full text-sm"
                        placeholder="Es. Pagamento inviato via bonifico..."
                        value={actionNote[r.id] || ""}
                        onChange={(e) => setActionNote((n) => ({ ...n, [r.id]: e.target.value }))}
                      />
                    </div>
                    <button
                      onClick={() => process(r.id, "approve")}
                      disabled={processing === r.id}
                      className="dm-btn-primary !py-2 !px-5"
                    >
                      {processing === r.id ? "…" : "✓ Approva"}
                    </button>
                    <button
                      onClick={() => process(r.id, "reject")}
                      disabled={processing === r.id}
                      className="dm-btn-outline !py-2 !px-5 !text-red-400 !border-red-400/40"
                    >
                      ✕ Rifiuta
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}
