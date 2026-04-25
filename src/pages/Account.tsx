import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { hasLegacyLocalData, migrateLocalToCloud, exportJSON, importJSON, getPlayers } from "@/lib/storage";
import { toast } from "sonner";

export default function Account() {
  const { user, profile, loading, refreshProfile, signOut } = useAuth();
  const [orgName, setOrgName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
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
