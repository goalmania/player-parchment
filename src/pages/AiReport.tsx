import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { supabase } from "@/integrations/supabase/client";
import { savePlayer, setAiDraft } from "@/lib/storage";
import type { Player } from "@/lib/types";
import { TagPill, VerdictBadge } from "@/components/PlayerCard";
import Stars from "@/components/Stars";
import { toast } from "sonner";

const EXAMPLES = [
  "Ho osservato Luca Mancini, centrocampista del Bari Under 19, classe 2006. Alto 178cm, piede destro. È una mezzala offensiva che si inserisce bene senza palla. Fisicamente è ancora acerbo ma tecnicamente superiore alla categoria. Ottima visione di gioco, buona qualità nel primo tocco. Difensivamente non contribuisce molto. Lo valuto un profilo da Serie D con potenziale per la C. Valore attuale intorno ai 40-60 mila euro. Consiglio di monitorarlo. Ho fatto 2 osservazioni video.",
  "Marco Vella, portiere classe 2002 dell'ASD Locri, Eccellenza Calabria. 190cm, piede destro. Ottimo nelle uscite alte e nella distribuzione coi piedi. Riflessi nella media, comunica molto con la difesa. Profilo affidabile, da Serie D adesso, Serie C in 12 mesi. Costo basso, intorno ai 30k. Verdetto: BUY. 4 osservazioni dal vivo.",
];

export default function AiReport() {
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [club, setClub] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<Partial<Player> | null>(null);
  const [openExamples, setOpenExamples] = useState(false);
  const navigate = useNavigate();

  const generate = async () => {
    if (!text.trim()) { toast.error("Scrivi prima le tue osservazioni"); return; }
    if (!name.trim()) { toast.error("Indica il nome del giocatore"); return; }
    setLoading(true); setError(""); setPreview(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-report", {
        body: { text, name, club },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPreview({ ...data.player, raw_report: text });
    } catch (e: any) {
      setError(e?.message || "Errore durante l'analisi");
    } finally {
      setLoading(false);
    }
  };

  const saveDirect = async () => {
    if (!preview) return;
    try {
      const saved = await savePlayer(preview as Player);
      toast.success("Report salvato");
      navigate(`/player?id=${saved.id}`);
    } catch (e: any) {
      toast.error(e?.message || "Salvataggio fallito");
    }
  };
  const editFirst = () => {
    if (!preview) return;
    setAiDraft(preview);
    navigate("/add-report");
  };

  return (
    <PageShell>
      <section className="container py-10 max-w-4xl">
        <div className="section-label mb-3">// GENERATORE REPORT AI</div>
        <h1 className="font-display font-black uppercase text-4xl md:text-5xl mb-2">Da Testo a Scheda</h1>
        <p className="text-gray-soft mb-8">Scrivi liberamente le tue osservazioni. L'AI estrarrà e compilerà tutti i campi del report automaticamente.</p>

        <div className="grid md:grid-cols-2 gap-3 mb-3">
          <input className="dm-input" placeholder="Nome giocatore *" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="dm-input" placeholder="Club (opzionale)" value={club} onChange={(e) => setClub(e.target.value)} />
        </div>

        <textarea
          className="dm-input"
          style={{ minHeight: 300 }}
          placeholder="Esempio: Ho osservato Luca Mancini, centrocampista del Bari U19, classe 2006…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button onClick={generate} disabled={loading} className="dm-btn-primary">
            {loading ? (<><span className="pulse-dot" /> Analisi in corso…</>) : "⚡ Genera Report"}
          </button>
          <button onClick={() => setOpenExamples((o) => !o)} className="text-sm text-gray-soft hover:text-foreground">
            {openExamples ? "Nascondi esempi" : "Mostra esempi"}
          </button>
        </div>

        {openExamples && (
          <div className="mt-4 space-y-3">
            {EXAMPLES.map((ex, i) => (
              <div key={i} className="border-hairline p-4 bg-gray-light/40">
                <div className="text-xs text-gray-soft mb-2 font-mono">Esempio {i + 1}</div>
                <p className="text-sm text-foreground/90 mb-3">{ex}</p>
                <button onClick={() => setText(ex)} className="dm-btn-outline !py-1 !px-3 text-xs">Usa questo</button>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-6 p-4 border" style={{ borderColor: "hsl(var(--red))", background: "hsl(var(--red) / 0.08)" }}>
            <div className="font-mono text-xs uppercase tracking-[0.18rem] text-red-soft mb-1">Errore</div>
            <div className="text-sm">{error}</div>
          </div>
        )}

        {preview && (
          <div className="mt-10 dm-card p-6 space-y-6">
            <div className="section-label">// ANTEPRIMA REPORT GENERATO</div>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display font-black uppercase text-3xl">{preview.name}</h2>
                <div className="text-gray-soft text-sm">{preview.flag} {preview.nationality} · {preview.club} · {preview.league}</div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {preview.tags?.map((t) => <TagPill key={t} tag={t} />)}
                  {preview.verdict_type && <VerdictBadge type={preview.verdict_type as any} />}
                </div>
              </div>
              <div className="text-right">
                <div className="section-label">// OVERALL</div>
                <div className="font-mono text-4xl text-accent-lime">{preview.ratings?.overall?.toFixed(1)}</div>
              </div>
            </div>

            <div className="grid md:grid-cols-4 gap-px bg-border/10 border-hairline">
              {[["Tecnica", preview.ratings?.technical], ["Tattica", preview.ratings?.tactical], ["Fisico", preview.ratings?.physical], ["Mentalità", preview.ratings?.mental]].map(([k, v]) => (
                <div key={k as string} className="bg-background p-3">
                  <div className="text-[0.6rem] font-mono uppercase tracking-[0.12rem] text-gray-soft mb-1">{k}</div>
                  <div className="font-mono text-xl text-accent-lime">{(v as number)?.toFixed?.(1) || "—"}</div>
                </div>
              ))}
            </div>

            {preview.stars && (
              <div className="grid md:grid-cols-2 gap-3">
                {Object.entries(preview.stars).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between border-hairline-b py-2">
                    <span className="text-sm font-display font-semibold uppercase">{k}</span>
                    <Stars value={v as number} />
                  </div>
                ))}
              </div>
            )}

            {preview.summary && <p className="text-foreground/90">{preview.summary}</p>}

            {preview.verdict && (
              <div className="p-4" style={{ borderLeft: "4px solid hsl(var(--accent))", background: "hsl(var(--accent) / 0.08)" }}>
                <div className="font-mono text-xs uppercase tracking-[0.18rem] text-accent-lime mb-1">Verdetto: {preview.verdict_type?.toUpperCase()}</div>
                <p>{preview.verdict}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-3 pt-4 border-hairline-t">
              <button onClick={saveDirect} className="dm-btn-primary">✓ Salva come Report</button>
              <button onClick={editFirst} className="dm-btn-outline">✏ Modifica prima di salvare</button>
            </div>
          </div>
        )}
      </section>
    </PageShell>
  );
}
