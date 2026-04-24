import { useState } from "react";
import type { Observation } from "@/lib/types";

interface Props {
  onAdd: (obs: Observation) => void;
  defaultRatings?: Observation["ratings"];
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Inline form to append a new observation to a player's timeline.
 * Compact — fits on the player page below the existing timeline.
 */
export default function ObservationForm({ onAdd, defaultRatings }: Props) {
  const [date, setDate] = useState<string>(today());
  const [type, setType] = useState<string>("Dal vivo");
  const [note, setNote] = useState<string>("");
  const [r, setR] = useState({
    technical: defaultRatings?.technical ?? 7,
    tactical: defaultRatings?.tactical ?? 7,
    physical: defaultRatings?.physical ?? 7,
    mental: defaultRatings?.mental ?? 7,
  });

  const overall = +(((r.technical + r.tactical + r.physical + r.mental) / 4)).toFixed(1);

  const submit = () => {
    if (!note.trim()) return;
    const obs: Observation = {
      date,
      overall,
      ratings: { ...r },
      note: note.trim(),
      type,
    };
    onAdd(obs);
    setNote("");
  };

  const num = (label: string, key: keyof typeof r) => (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="font-display font-semibold uppercase tracking-[0.1rem] text-xs w-24">{label}</span>
      <input
        type="number" min={0} max={10} step={0.1}
        value={r[key]}
        onChange={(e) => setR({ ...r, [key]: Math.max(0, Math.min(10, parseFloat(e.target.value) || 0)) })}
        className="w-20 bg-gray-light border-hairline px-2 py-1 font-mono text-sm text-right"
      />
    </label>
  );

  return (
    <div className="bg-gray-light/40 border-hairline p-4 space-y-3">
      <div className="grid sm:grid-cols-3 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[0.65rem] font-mono uppercase tracking-[0.12rem] text-gray-soft">Data</span>
          <input
            type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="bg-background border-hairline px-2 py-1.5 font-mono text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[0.65rem] font-mono uppercase tracking-[0.12rem] text-gray-soft">Tipo osservazione</span>
          <select
            value={type} onChange={(e) => setType(e.target.value)}
            className="bg-background border-hairline px-2 py-1.5 font-mono text-sm"
          >
            <option>Dal vivo</option>
            <option>Video</option>
            <option>Video + Dal vivo</option>
            <option>Match Report</option>
          </select>
        </label>
        <div className="flex items-end justify-end">
          <div className="text-right">
            <div className="text-[0.65rem] font-mono uppercase tracking-[0.12rem] text-gray-soft mb-0.5">Overall calcolato</div>
            <div className="font-mono text-2xl text-accent-lime leading-none">{overall.toFixed(1)}</div>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
        {num("Tecnica", "technical")}
        {num("Tattica", "tactical")}
        {num("Fisico", "physical")}
        {num("Mentalità", "mental")}
      </div>

      <textarea
        placeholder="Note dell'osservazione…"
        value={note} onChange={(e) => setNote(e.target.value)}
        rows={3}
        className="w-full bg-background border-hairline px-3 py-2 text-sm"
      />

      <div className="flex justify-end">
        <button
          onClick={submit}
          disabled={!note.trim()}
          className="dm-btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >+ Aggiungi osservazione</button>
      </div>
    </div>
  );
}
