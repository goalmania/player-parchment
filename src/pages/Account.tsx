import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { hasLegacyLocalData, migrateLocalToCloud, exportJSON, importJSON, getPlayers } from "@/lib/storage";
import { toast } from "sonner";

interface WalletData {
  balance: number;
  total_earned: number;
  total_spent: number;
  total_commission: number;
}

interface WalletTx {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
}

const TOPUP_OPTIONS = [5, 10, 20, 50, 100];

export default function Account() {
  const { user, profile, loading, refreshProfile, signOut } = useAuth();
  const [orgName, setOrgName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasLegacy, setHasLegacy] = useState(false);
  const [count, setCount] = useState(0);

  // Wallet
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [txs, setTxs] = useState<WalletTx[]>([]);
  const [topupAmt, setTopupAmt] = useState<number>(10);
  const [topupBusy, setTopupBusy] = useState(false);
  const [showTxs, setShowTxs] = useState(false);

  // Prelievo
  const [withdrawAmt, setWithdrawAmt] = useState<string>("");
  const [withdrawMethod, setWithdrawMethod] = useState<"iban" | "paypal" | "card">("iban");
  const [withdrawDetail, setWithdrawDetail] = useState("");
  const [withdrawNotes, setWithdrawNotes] = useState("");
  const [withdrawBusy, setWithdrawBusy] = useState(false);
  const [myWithdrawals, setMyWithdrawals] = useState<any[]>([]);
  const [showWithdrawals, setShowWithdrawals] = useState(false);

  useEffect(() => {
    if (profile) {
      setOrgName(profile.org_name);
      setDisplayName(profile.display_name || "");
    }
    setHasLegacy(hasLegacyLocalData());
    setCount(getPlayers().length);
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    loadWallet();
  }, [user]);

  const loadWallet = async () => {
    const { data } = await supabase.rpc("get_my_wallet" as any);
    if (data && (data as any)[0]) setWallet((data as any)[0]);
  };

  const loadTxs = async () => {
    const { data } = await supabase
      .from("wallet_transactions" as any)
      .select("id, amount, type, description, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    setTxs((data || []) as WalletTx[]);
  };

  const loadMyWithdrawals = async () => {
    const { data } = await supabase
      .from("withdrawal_requests" as any)
      .select("id, amount, method, method_detail, status, admin_note, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    setMyWithdrawals(data || []);
  };

  const handleWithdraw = async () => {
    const amt = parseFloat(withdrawAmt);
    if (!amt || amt <= 0) { toast.error("Inserisci un importo valido"); return; }
    if (!withdrawDetail.trim()) { toast.error("Inserisci i dettagli del metodo di pagamento"); return; }
    setWithdrawBusy(true);
    const { error } = await supabase.rpc("request_withdrawal" as any, {
      p_amount: amt,
      p_method: withdrawMethod,
      p_method_detail: withdrawDetail.trim(),
      p_notes: withdrawNotes.trim() || null,
    } as any);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Richiesta di prelievo di €${amt.toFixed(2)} inviata! Riceverai i fondi entro 1-3 giorni lavorativi.`);
      setWithdrawAmt("");
      setWithdrawDetail("");
      setWithdrawNotes("");
      await loadWallet();
      if (showWithdrawals) await loadMyWithdrawals();
    }
    setWithdrawBusy(false);
  };

  const handleTopup = async () => {
    if (!topupAmt || topupAmt <= 0) return;
    setTopupBusy(true);
    const { error } = await supabase.rpc("topup_wallet" as any, { amount_in: topupAmt } as any);
    if (error) { toast.error(error.message); }
    else {
      toast.success(`€${topupAmt.toFixed(2)} aggiunti al tuo saldo!`);
      await loadWallet();
      if (showTxs) await loadTxs();
    }
    setTopupBusy(false);
  };

  if (loading) return <PageShell><div className="container py-20 text-center text-gray-soft">Caricamento…</div></PageShell>;
  if (!user) return <Navigate to="/auth" replace />;

  const save = async () => {
    if (!profile) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ org_name: orgName.trim(), display_name: displayName.trim() || null })
        .eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success("Profilo aggiornato");
    } catch (e: any) {
      toast.error(e?.message || "Errore");
    } finally {
      setBusy(false);
    }
  };

  const migrate = async () => {
    setBusy(true);
    try {
      const n = await migrateLocalToCloud();
      toast.success(`Importati ${n} giocatori dal database locale`);
      setHasLegacy(false);
      setCount(getPlayers().length);
    } catch (e: any) {
      toast.error(e?.message || "Errore importazione");
    } finally {
      setBusy(false);
    }
  };

  const onImport = async (file: File) => {
    setBusy(true);
    try {
      const n = await importJSON(file);
      toast.success(`Importati ${n} giocatori`);
      setCount(getPlayers().length);
    } catch (e: any) {
      toast.error(e?.message || "Errore");
    } finally { setBusy(false); }
  };

  return (
    <PageShell>
      <section className="container py-10 max-w-3xl">
        <div className="section-label mb-3">// ACCOUNT</div>
        <h1 className="font-display font-black uppercase text-4xl md:text-5xl mb-2">Il Tuo Profilo</h1>
        <p className="text-gray-soft mb-8">Gestisci la tua organizzazione, i tuoi dati e le impostazioni.</p>

        <div className="dm-card p-6 mb-6">
          <div className="section-label mb-4">// PROFILO</div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-mono uppercase tracking-[0.12rem] text-gray-soft mb-1 block">Email</label>
              <div className="font-display font-semibold">{user.email}</div>
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-[0.12rem] text-gray-soft mb-1 block">Tipo</label>
              <div className="font-display font-semibold uppercase">
                {profile?.org_type === "agency" ? "Agenzia" : profile?.org_type === "club" ? "Club" : "—"}
              </div>
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-[0.12rem] text-gray-soft mb-1 block">Nome organizzazione</label>
              <input className="dm-input" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-mono uppercase tracking-[0.12rem] text-gray-soft mb-1 block">Nome visualizzato</label>
              <input className="dm-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={save} disabled={busy} className="dm-btn-primary">Salva</button>
            <button onClick={signOut} className="dm-btn-outline">Esci</button>
          </div>
        </div>

        <div className="dm-card p-6 mb-6">
          <div className="section-label mb-4">// DATABASE</div>
          <p className="text-gray-soft mb-4">
            Hai <strong className="text-foreground">{count}</strong> giocatori nel tuo database personale.
          </p>

          {hasLegacy && (
            <div className="border-hairline p-4 bg-accent-lime/10 mb-4">
              <div className="font-display font-bold uppercase mb-2">📦 Dati locali rilevati</div>
              <p className="text-sm text-gray-soft mb-3">Hai dati salvati localmente da una versione precedente. Importali nel tuo account per non perderli.</p>
              <button onClick={migrate} disabled={busy} className="dm-btn-primary !py-2 !px-4 text-sm">
                Importa dati locali nel mio account
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button onClick={exportJSON} className="dm-btn-outline">↓ Esporta JSON</button>
            <label className="dm-btn-outline cursor-pointer">
              ↑ Importa JSON
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ""; }}
              />
            </label>
            <Link to="/database" className="dm-btn-outline">Vai al Database →</Link>
          </div>
        </div>

        {/* ── WALLET ─────────────────────────────────────────────────────── */}
        <div className="dm-card p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="section-label">// WALLET · SALDO</div>
            {wallet && (
              <div className="font-display font-black text-3xl text-accent-lime">
                €{wallet.balance.toFixed(2)}
              </div>
            )}
          </div>

          {wallet && (
            <div className="grid grid-cols-3 gap-px bg-border/10 border-hairline mb-5 text-center text-xs">
              <div className="bg-background py-3">
                <div className="font-mono text-[9px] uppercase text-gray-soft mb-1">Guadagnato</div>
                <div className="font-display font-bold text-accent-lime">€{wallet.total_earned.toFixed(2)}</div>
              </div>
              <div className="bg-background py-3">
                <div className="font-mono text-[9px] uppercase text-gray-soft mb-1">Speso</div>
                <div className="font-display font-bold text-red-400">€{wallet.total_spent.toFixed(2)}</div>
              </div>
              <div className="bg-background py-3">
                <div className="font-mono text-[9px] uppercase text-gray-soft mb-1">Commissioni DMScout</div>
                <div className="font-display font-bold text-gray-soft">€{wallet.total_commission.toFixed(2)}</div>
              </div>
            </div>
          )}

          {/* Ricarica simulata */}
          <div className="border-hairline p-4 mb-4">
            <div className="text-[10px] font-mono uppercase tracking-[0.12rem] text-gray-soft mb-3">
              Ricarica saldo (simulata — demo)
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {TOPUP_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setTopupAmt(n)}
                  className={`px-3 py-1.5 text-xs font-mono border-hairline ${
                    topupAmt === n ? "bg-accent-lime/20 text-accent-lime border-accent-lime" : "text-gray-soft"
                  }`}
                >
                  €{n}
                </button>
              ))}
              <input
                type="number"
                min="1"
                step="1"
                value={topupAmt}
                onChange={(e) => setTopupAmt(parseFloat(e.target.value))}
                className="dm-input w-24 text-sm"
                placeholder="Altro"
              />
            </div>
            <button
              onClick={handleTopup}
              disabled={topupBusy}
              className="dm-btn-primary !py-2 !px-5 text-sm"
            >
              {topupBusy ? "Elaborazione…" : `+ Aggiungi €${topupAmt?.toFixed(2) ?? "0.00"} al saldo`}
            </button>
          </div>

          {/* Movimenti */}
          <button
            onClick={async () => {
              if (!showTxs) await loadTxs();
              setShowTxs((v) => !v);
            }}
            className="text-xs font-mono uppercase tracking-[0.1rem] text-gray-soft hover:text-foreground"
          >
            {showTxs ? "▲ Nascondi movimenti" : "▼ Vedi movimenti recenti"}
          </button>

          {showTxs && (
            <div className="mt-3 border-hairline divide-y divide-border/20">
              {txs.length === 0 ? (
                <div className="py-3 text-xs text-gray-soft text-center">Nessun movimento</div>
              ) : txs.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2 text-xs">
                  <div>
                    <span className={`mr-2 font-mono text-[9px] uppercase px-1.5 py-0.5 ${
                      t.type === "topup" ? "bg-accent-lime/20 text-accent-lime" :
                      t.type === "sale" ? "bg-accent-lime/20 text-accent-lime" :
                      t.type === "commission" ? "bg-orange-400/20 text-orange-400" :
                      "bg-red-400/20 text-red-400"
                    }`}>{t.type}</span>
                    <span className="text-gray-soft">{t.description || "—"}</span>
                  </div>
                  <div className={`font-display font-bold ml-4 whitespace-nowrap ${t.amount >= 0 ? "text-accent-lime" : "text-red-400"}`}>
                    {t.amount >= 0 ? "+" : ""}€{Math.abs(t.amount).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/purchases" className="dm-btn-outline text-sm">💳 I miei acquisti</Link>
            <Link to="/marketplace" className="dm-btn-outline text-sm">🛒 Marketplace</Link>
          </div>
        </div>

        {/* ── PRELIEVO ────────────────────────────────────────────────────── */}
        <div className="dm-card p-6 mb-6">
          <div className="section-label mb-2">// PRELIEVO SALDO</div>
          <p className="text-gray-soft text-sm mb-5">
            Sposta il tuo saldo verso IBAN, PayPal o carta. Il saldo viene bloccato immediatamente;
            il pagamento viene elaborato da DMScout entro <strong className="text-foreground">1–3 giorni lavorativi</strong>.
          </p>

          {/* Metodo */}
          <div className="flex gap-0 border-hairline w-fit mb-4">
            {(["iban", "paypal", "card"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setWithdrawMethod(m); setWithdrawDetail(""); }}
                className={`px-4 py-2 text-xs font-mono uppercase tracking-[0.1rem] ${
                  withdrawMethod === m ? "bg-accent-lime/20 text-accent-lime" : "text-gray-soft hover:text-foreground"
                }`}
              >
                {m === "iban" ? "🏦 IBAN" : m === "paypal" ? "🅿 PayPal" : "💳 Carta"}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-[10px] font-mono uppercase tracking-[0.12rem] text-gray-soft mb-1 block">
                {withdrawMethod === "iban" ? "IBAN (es. IT60 X054 2811 1010 0000 0123 456)" :
                 withdrawMethod === "paypal" ? "Email PayPal" : "Numero carta (ultime 4 cifre)"}
              </label>
              <input
                className="dm-input w-full"
                value={withdrawDetail}
                onChange={(e) => setWithdrawDetail(e.target.value)}
                placeholder={
                  withdrawMethod === "iban" ? "IT60 X054 2811 1010 0000 0123 456" :
                  withdrawMethod === "paypal" ? "email@esempio.com" : "1234"
                }
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-[0.12rem] text-gray-soft mb-1 block">
                Importo (€) — Saldo: €{wallet?.balance.toFixed(2) ?? "0.00"}
              </label>
              <input
                type="number"
                min="1"
                step="0.50"
                max={wallet?.balance ?? 0}
                className="dm-input w-full"
                value={withdrawAmt}
                onChange={(e) => setWithdrawAmt(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="text-[10px] font-mono uppercase tracking-[0.12rem] text-gray-soft mb-1 block">
              Note (opzionale)
            </label>
            <input
              className="dm-input w-full"
              value={withdrawNotes}
              onChange={(e) => setWithdrawNotes(e.target.value)}
              placeholder="Es. intestatario conto, ragione sociale…"
            />
          </div>

          <button
            onClick={handleWithdraw}
            disabled={withdrawBusy || !withdrawAmt || parseFloat(withdrawAmt) <= 0}
            className="dm-btn-primary !py-2 !px-6"
          >
            {withdrawBusy ? "Invio richiesta…" : `↑ Preleva €${parseFloat(withdrawAmt || "0").toFixed(2)}`}
          </button>

          {/* Storico prelievi */}
          <div className="mt-5">
            <button
              onClick={async () => {
                if (!showWithdrawals) await loadMyWithdrawals();
                setShowWithdrawals((v) => !v);
              }}
              className="text-xs font-mono uppercase tracking-[0.1rem] text-gray-soft hover:text-foreground"
            >
              {showWithdrawals ? "▲ Nascondi storico prelievi" : "▼ Vedi storico prelievi"}
            </button>

            {showWithdrawals && (
              <div className="mt-3 border-hairline divide-y divide-border/20">
                {myWithdrawals.length === 0 ? (
                  <div className="py-3 text-xs text-gray-soft text-center">Nessuna richiesta ancora</div>
                ) : myWithdrawals.map((w: any) => (
                  <div key={w.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`font-mono text-[9px] uppercase px-1.5 py-0.5 ${
                          w.status === "approved" ? "bg-accent-lime/20 text-accent-lime" :
                          w.status === "rejected" ? "bg-red-400/20 text-red-400" :
                          "bg-orange-400/20 text-orange-400"
                        }`}>{w.status === "approved" ? "✓ Approvato" : w.status === "rejected" ? "✕ Rifiutato" : "⏳ In attesa"}</span>
                        <span className="text-gray-soft">{w.method.toUpperCase()} · {w.method_detail}</span>
                      </div>
                      {w.admin_note && <div className="text-gray-soft italic">{w.admin_note}</div>}
                      <div className="text-gray-soft">{new Date(w.created_at).toLocaleDateString("it-IT")}</div>
                    </div>
                    <div className="font-display font-bold whitespace-nowrap text-red-400">
                      -€{parseFloat(w.amount).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="dm-card p-6">
          <div className="section-label mb-4">// COLLABORAZIONI</div>
          <p className="text-gray-soft mb-4">Gestisci le richieste di accesso ai report tra organizzazioni.</p>
          <div className="flex flex-wrap gap-3">
            <Link to="/requests" className="dm-btn-outline">📨 Richieste accesso</Link>
            <Link to="/browse" className="dm-btn-outline">🔍 Esplora altri scout</Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
