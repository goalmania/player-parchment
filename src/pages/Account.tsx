import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { hasLegacyLocalData, migrateLocalToCloud, exportJSON, importJSON, getPlayers } from "@/lib/storage";
import { toast } from "sonner";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
}

function trialDaysLeft(trialEndsAt: string | null | undefined): number {
  if (!trialEndsAt) return 0;
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

export default function Account() {
  const { user, profile, loading, refreshProfile, signOut } = useAuth();
  const [orgName, setOrgName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [portalBusy, setPortalBusy] = useState(false);
  const [hasLegacy, setHasLegacy] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (profile) {
      setOrgName(profile.org_name);
      setDisplayName(profile.display_name || "");
    }
    setHasLegacy(hasLegacyLocalData());
    setCount(getPlayers().length);
  }, [profile]);

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

  const openPortal = async () => {
    if (!user) return;
    setPortalBusy(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("Sessione non trovata");
      const res = await supabase.functions.invoke("stripe-portal", {
        body: { return_url: window.location.href },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.error) throw new Error(res.error.message);
      const { url } = res.data as { url: string };
      window.location.href = url;
    } catch (e: any) {
      toast.error(e?.message || "Errore apertura portale Stripe");
    } finally {
      setPortalBusy(false);
    }
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

        {/* ── Abbonamento ───────────────────────────────────────────── */}
        <div className="dm-card p-6 mb-6">
          <div className="section-label mb-4">// ABBONAMENTO</div>
          {(() => {
            const status       = profile?.plan_status ?? "inactive";
            const trialEnd     = profile?.trial_ends_at;
            const periodEnd    = profile?.current_period_end;
            const daysLeft     = trialDaysLeft(trialEnd);
            const cancelAtEnd  = (profile as any)?.cancel_at_period_end ?? false;

            const badge = (label: string, color: string) => (
              <span style={{
                display: "inline-block",
                padding: "2px 10px",
                borderRadius: 20,
                fontSize: 11,
                fontFamily: "'Barlow Condensed', sans-serif",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                background: color,
                color: "hsl(var(--black))",
              }}>{label}</span>
            );

            if (status === "trial") return (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  {badge("Prova Gratuita", "hsl(var(--accent))")}
                  <span className="text-sm text-gray-soft">
                    {daysLeft > 0
                      ? <><strong className="text-foreground">{daysLeft} giorn{daysLeft === 1 ? "o" : "i"}</strong> rimanenti (scade il {formatDate(trialEnd)})</>
                      : "Periodo di prova scaduto"}
                  </span>
                </div>
                {daysLeft > 0 && (
                  <div className="border-hairline p-4 bg-accent-lime/5 mb-4 text-sm text-gray-soft">
                    Hai ancora <strong className="text-foreground">{daysLeft} giorn{daysLeft === 1 ? "o" : "i"}</strong> di prova gratuita.
                    Attiva un abbonamento per non perdere l'accesso al tuo database.
                  </div>
                )}
                <div className="flex flex-wrap gap-3">
                  <a
                    href={`${import.meta.env.VITE_STRIPE_LINK_DMSCOUT_MONTHLY ?? "#"}?prefilled_email=${encodeURIComponent(user?.email ?? "")}`}
                    target="_blank" rel="noopener noreferrer"
                    className="dm-btn-primary"
                  >Abbonati Mensile — €49/mese →</a>
                  <a
                    href={`${import.meta.env.VITE_STRIPE_LINK_DMSCOUT_ANNUAL ?? "#"}?prefilled_email=${encodeURIComponent(user?.email ?? "")}`}
                    target="_blank" rel="noopener noreferrer"
                    className="dm-btn-outline"
                  >Abbonati Annuale — €499/anno (−15%) →</a>
                </div>
              </div>
            );

            if (status === "active") return (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  {badge("Attivo", "hsl(var(--accent))")}
                  {cancelAtEnd
                    ? <span className="text-sm text-yellow-400">Cancellazione programmata al {formatDate(periodEnd)}</span>
                    : periodEnd
                      ? <span className="text-sm text-gray-soft">Rinnovo automatico il <strong className="text-foreground">{formatDate(periodEnd)}</strong></span>
                      : null}
                </div>
                <p className="text-sm text-gray-soft mb-4">
                  Il tuo abbonamento si rinnova automaticamente. Puoi gestire
                  metodo di pagamento, fatture e cancellazione dal portale Stripe.
                </p>
                <button
                  onClick={openPortal}
                  disabled={portalBusy}
                  className="dm-btn-outline"
                >
                  {portalBusy ? "Apertura portale…" : "Gestisci abbonamento →"}
                </button>
              </div>
            );

            if (status === "expired") return (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  {badge("Scaduto", "rgba(255,68,68,0.8)")}
                  {periodEnd && <span className="text-sm text-gray-soft">Scaduto il {formatDate(periodEnd)}</span>}
                </div>
                <p className="text-sm text-gray-soft mb-4">Il tuo abbonamento è scaduto. Rinnova per accedere a tutti i tuoi dati.</p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href={`${import.meta.env.VITE_STRIPE_LINK_DMSCOUT_MONTHLY ?? "#"}?prefilled_email=${encodeURIComponent(user?.email ?? "")}`}
                    target="_blank" rel="noopener noreferrer"
                    className="dm-btn-primary"
                  >Rinnova abbonamento →</a>
                </div>
              </div>
            );

            // inactive
            return (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  {badge("Nessun piano", "hsl(var(--gray))")}
                </div>
                <p className="text-sm text-gray-soft mb-4">Nessun abbonamento attivo. Inizia la prova gratuita di 7 giorni o abbonati direttamente.</p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href={`${import.meta.env.VITE_STRIPE_LINK_DMSCOUT_MONTHLY ?? "#"}?prefilled_email=${encodeURIComponent(user?.email ?? "")}`}
                    target="_blank" rel="noopener noreferrer"
                    className="dm-btn-primary"
                  >Abbonati →</a>
                </div>
              </div>
            );
          })()}
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
