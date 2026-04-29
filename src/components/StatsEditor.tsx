import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { STATS_GROUPS, STATS_MATCH_GROUPS } from "@/lib/types";
import type { PlayerStats } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  value: PlayerStats;
  source?: string;
  season?: string;
  onChange: (stats: PlayerStats, meta: { source?: string; season?: string }) => void;
}

export default function StatsEditor({ value, source, season, onChange }: Props) {
  const [importInput, setImportInput] = useState("");
  const [importing, setImporting] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const setField = (k: keyof PlayerStats, v: string) => {
    const next: PlayerStats = { ...value };
    if (v === "") delete next[k];
    else (next as any)[k] = parseFloat(v);
    onChange(next, { source, season });
  };

  const runImport = async () => {
    if (!importInput.trim()) return;
    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("import-stats", {
        body: { input: importInput.trim() },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const merged: PlayerStats = { ...value, ...((data as any).stats || {}) };
      onChange(merged, {
        source: (data as any).source || source,
        season: (data as any).season || season,
      });
      toast.success("Statistiche importate ✓");
      setImportInput("");
      setShowImport(false);
    } catch (e: any) {
      toast.error(e?.message || "Importazione fallita");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <label className="block">
          <span className="text-[0.6rem] font-mono uppercase tracking-[0.12rem] text-gray-soft mb-1.5 block">Stagione</span>
          <input
            className="dm-input"
            placeholder="2024/25"
            value={season || ""}
            onChange={(e) => onChange(value, { source, season: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="text-[0.6rem] font-mono uppercase tracking-[0.12rem] text-gray-soft mb-1.5 block">Fonte</span>
          <input
            className="dm-input"
            placeholder="Transfermarkt / FBref / manuale"
            value={source || ""}
            onChange={(e) => onChange(value, { source: e.target.value, season })}
          />
        </label>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => setShowImport((s) => !s)}
            className="dm-btn-outline w-full"
          >
            {showImport ? "✕ Chiudi import" : "⚡ Importa da URL/testo"}
          </button>
        </div>
      </div>

      {showImport && (
        <div className="border-hairline p-4 bg-gradient-to-br from-accent-lime/10 to-transparent space-y-3">
          <div className="font-display font-bold uppercase text-sm">Import statistiche AI</div>
          <p className="text-xs text-gray-soft">
            Incolla l'URL della pagina del giocatore (Transfermarkt, FBref, Sofascore, WhoScored…)
            <strong className="text-foreground"> oppure</strong> il testo copiato dalla scheda. L'AI estrae i numeri e compila i campi.
          </p>
          <textarea
            className="dm-input min-h-[120px] font-mono text-xs"
            placeholder="https://fbref.com/it/giocatori/..  oppure  incolla qui il testo della scheda statistiche"
            value={importInput}
            onChange={(e) => setImportInput(e.target.value)}
          />
          <div className="flex gap-2">
            <button type="button" onClick={runImport} disabled={importing || !importInput.trim()} className="dm-btn-primary disabled:opacity-50">
              {importing ? "Estrazione…" : "Estrai statistiche"}
            </button>
            <button type="button" onClick={() => setImportInput("")} className="dm-btn-outline" disabled={importing}>Pulisci</button>
          </div>
        </div>
      )}

      {STATS_GROUPS.map((group) => (
        <div key={group.key}>
          <div className="section-label mb-3">// {group.label.toUpperCase()}</div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {group.fields.map(({ k, label, unit }) => (
              <label key={k as string} className="block">
                <span className="text-[0.6rem] font-mono uppercase tracking-[0.12rem] text-gray-soft mb-1 block">
                  {label}{unit ? ` (${unit})` : ""}
                </span>
                <input
                  type="number"
                  step="any"
                  className="dm-input"
                  value={value[k] ?? ""}
                  onChange={(e) => setField(k, e.target.value)}
                />
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
