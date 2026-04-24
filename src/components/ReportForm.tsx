import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ALL_TAGS, FORMATIONS, POSITION_CODES, POSITION_LABEL,
  REGIONS, ROLE_OPTIONS_BY_POSITION,
} from "@/lib/types";
import type { Player, PositionCode } from "@/lib/types";
import { deletePlayer, generateId, nextNum, savePlayer } from "@/lib/storage";
import Stars from "@/components/Stars";
import { toast } from "sonner";

interface Props {
  initial?: Partial<Player>;
  mode: "create" | "edit";
}

const empty: Player = {
  id: "", num: "", name: "", photo: "", age: 20, birth_year: new Date().getFullYear() - 20,
  nationality: "Italia", flag: "🇮🇹", club: "", league: "", region: "Puglia",
  lat: 41.0, lng: 16.5, position_main: POSITION_LABEL.CM, position_code: "CM",
  position_secondary: [], foot: "Destro", height: 180, weight: 75,
  tactical_roles: [],
  ratings: { technical: 6, tactical: 6, physical: 6, mental: 6, overall: 6 },
  skills: { ball_control: 60, passing: 60, dribbling: 60, finishing: 60, defensive_work: 60, tactical_iq: 60, decision_making: 60, aerial: 60, pace: 60, stamina: 60 },
  stars: { technique: 3, athleticism: 3, mentality: 3, potential: 3, market_value: 3 },
  market: { value_min: 20000, value_max: 50000, potential: "Medio", risk: "Medio", timeline: "12 mesi", ready_level: "Serie D" },
  tags: [], verdict_type: "monitor", verdict: "",
  observation_type: "Video + Dal vivo", observation_count: 1,
  date: new Date().toISOString().slice(0, 10),
  strengths: [], weaknesses: [], summary: "", video_url: "", raw_report: "",
};

function calcOverall(r: Player["ratings"]) {
  return +(r.technical * 0.25 + r.tactical * 0.30 + r.physical * 0.20 + r.mental * 0.25).toFixed(2);
}

export default function ReportForm({ initial, mode }: Props) {
  const navigate = useNavigate();
  const [data, setData] = useState<Player>(() => ({ ...empty, ...(initial || {}) } as Player));
  const [strengthInput, setStrengthInput] = useState("");
  const [weakInput, setWeakInput] = useState("");

  useEffect(() => {
    setData((d) => ({ ...d, ratings: { ...d.ratings, overall: calcOverall(d.ratings) } }));
  }, [data.ratings.technical, data.ratings.tactical, data.ratings.physical, data.ratings.mental]);

  const update = <K extends keyof Player>(k: K, v: Player[K]) => setData((d) => ({ ...d, [k]: v }));
  const updateRating = (k: keyof Player["ratings"], v: number) => setData((d) => ({ ...d, ratings: { ...d.ratings, [k]: v } }));
  const updateSkill = (k: keyof Player["skills"], v: number) => setData((d) => ({ ...d, skills: { ...d.skills, [k]: v } }));
  const updateStar = (k: keyof Player["stars"], v: number) => setData((d) => ({ ...d, stars: { ...d.stars, [k]: v } }));
  const updateMarket = (k: keyof Player["market"], v: any) => setData((d) => ({ ...d, market: { ...d.market, [k]: v } }));

  const togglePos = (label: string) => {
    setData((d) => {
      const has = d.position_secondary.includes(label);
      return { ...d, position_secondary: has ? d.position_secondary.filter((x) => x !== label) : [...d.position_secondary, label] };
    });
  };

  const toggleTag = (t: string) => {
    setData((d) => ({ ...d, tags: d.tags.includes(t) ? d.tags.filter((x) => x !== t) : [...d.tags, t] }));
  };

  const onPhoto = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => update("photo", String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const addTacticalRole = () => {
    if (data.tactical_roles.length >= 4) return;
    const opts = ROLE_OPTIONS_BY_POSITION[data.position_code];
    const first = opts[0];
    setData((d) => ({
      ...d,
      tactical_roles: [...d.tactical_roles, { formation: "4-3-3", role: first.label, role_code: first.code, fit_score: 75 }],
    }));
  };
  const removeRole = (i: number) => setData((d) => ({ ...d, tactical_roles: d.tactical_roles.filter((_, idx) => idx !== i) }));
  const updateRole = (i: number, k: string, v: any) => setData((d) => ({
    ...d, tactical_roles: d.tactical_roles.map((r, idx) => idx === i ? { ...r, [k]: v } : r),
  }));

  const submit = () => {
    if (!data.name.trim()) { toast.error("Nome obbligatorio"); return; }
    let id = data.id;
    let num = data.num;
    if (mode === "create" || !id) { id = generateId(data.name); num = num || nextNum(); }
    const saved = savePlayer({ ...data, id, num, ratings: { ...data.ratings, overall: calcOverall(data.ratings) } });
    toast.success(mode === "create" ? "Report salvato" : "Report aggiornato");
    navigate(`/player?id=${saved.id}`);
  };

  const remove = () => {
    if (!data.id) return;
    if (!window.confirm("Sei sicuro? Questa azione è irreversibile.")) return;
    deletePlayer(data.id);
    toast.success("Report eliminato");
    navigate("/database");
  };

  return (
    <div className="space-y-12">
      {/* SECTION A — ANAGRAFICA */}
      <Section label="// A · ANAGRAFICA">
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Nome e Cognome *">
            <input className="dm-input" value={data.name} onChange={(e) => update("name", e.target.value)} />
          </Field>
          <Field label="Club">
            <input className="dm-input" value={data.club} onChange={(e) => update("club", e.target.value)} />
          </Field>
          <Field label="Liga / Campionato">
            <input className="dm-input" value={data.league} onChange={(e) => update("league", e.target.value)} />
          </Field>
          <Field label="Regione">
            <select className="dm-input" value={data.region} onChange={(e) => update("region", e.target.value)}>
              {REGIONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Anno di nascita">
            <input type="number" min={1995} max={2010} className="dm-input"
              value={data.birth_year}
              onChange={(e) => {
                const y = parseInt(e.target.value) || 2000;
                update("birth_year", y);
                update("age", new Date().getFullYear() - y);
              }} />
          </Field>
          <Field label="Nazionalità">
            <input className="dm-input" value={data.nationality} onChange={(e) => update("nationality", e.target.value)} />
          </Field>
          <Field label="Bandiera (emoji)">
            <input className="dm-input" value={data.flag} onChange={(e) => update("flag", e.target.value)} />
          </Field>
          <Field label="Piede">
            <select className="dm-input" value={data.foot} onChange={(e) => update("foot", e.target.value)}>
              <option>Destro</option><option>Sinistro</option><option>Entrambi</option>
            </select>
          </Field>
          <Field label="Altezza (cm)">
            <input type="number" className="dm-input" value={data.height} onChange={(e) => update("height", parseInt(e.target.value) || 0)} />
          </Field>
          <Field label="Peso (kg)">
            <input type="number" className="dm-input" value={data.weight} onChange={(e) => update("weight", parseInt(e.target.value) || 0)} />
          </Field>
          <Field label="Latitudine">
            <input type="number" step="0.01" className="dm-input" value={data.lat} onChange={(e) => update("lat", parseFloat(e.target.value) || 0)} />
          </Field>
          <Field label="Longitudine">
            <input type="number" step="0.01" className="dm-input" value={data.lng} onChange={(e) => update("lng", parseFloat(e.target.value) || 0)} />
          </Field>
          <Field label="Foto giocatore">
            <div className="flex items-center gap-3">
              <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])} className="text-xs text-gray-soft" />
              {data.photo && <img src={data.photo} alt="" className="w-[60px] h-[60px] object-cover border-hairline" />}
            </div>
          </Field>
        </div>
      </Section>

      {/* SECTION B — POSIZIONE */}
      <Section label="// B · POSIZIONE & RUOLI TATTICI">
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Field label="Posizione principale">
            <select
              className="dm-input"
              value={data.position_code}
              onChange={(e) => {
                const code = e.target.value as PositionCode;
                update("position_code", code);
                update("position_main", POSITION_LABEL[code]);
              }}
            >
              {POSITION_CODES.map((c) => <option key={c} value={c}>{POSITION_LABEL[c]} ({c})</option>)}
            </select>
          </Field>
          <Field label="Posizioni secondarie">
            <div className="flex flex-wrap gap-2">
              {POSITION_CODES.map((c) => {
                const lbl = POSITION_LABEL[c];
                const on = data.position_secondary.includes(lbl);
                return (
                  <button key={c} type="button" onClick={() => togglePos(lbl)}
                    className={`tag-pill ${on ? "" : "opacity-50"}`}
                    data-tone={on ? "accent" : undefined}>{c}</button>
                );
              })}
            </div>
          </Field>
        </div>

        <div className="space-y-4">
          {data.tactical_roles.map((r, i) => (
            <div key={i} className="border-hairline p-4 bg-gray-light/40">
              <div className="grid md:grid-cols-[150px_1fr_180px_auto] gap-3 items-end">
                <Field label="Modulo">
                  <select className="dm-input" value={r.formation} onChange={(e) => updateRole(i, "formation", e.target.value)}>
                    {FORMATIONS.map((f) => <option key={f}>{f}</option>)}
                  </select>
                </Field>
                <Field label="Ruolo specifico">
                  <select
                    className="dm-input"
                    value={r.role_code}
                    onChange={(e) => {
                      const opts = ROLE_OPTIONS_BY_POSITION[data.position_code];
                      const opt = opts.find((o) => o.code === e.target.value);
                      updateRole(i, "role_code", e.target.value);
                      if (opt) updateRole(i, "role", opt.label);
                    }}
                  >
                    {ROLE_OPTIONS_BY_POSITION[data.position_code].map((o) => (
                      <option key={o.code} value={o.code}>{o.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label={`Compatibilità ${r.fit_score}%`}>
                  <input type="range" min={0} max={100} value={r.fit_score}
                    onChange={(e) => updateRole(i, "fit_score", parseInt(e.target.value))}
                    className="w-full accent-[hsl(var(--accent))]" />
                </Field>
                <button type="button" onClick={() => removeRole(i)} className="dm-btn-outline !py-1.5 !px-3 text-xs">✕</button>
              </div>
            </div>
          ))}
          {data.tactical_roles.length < 4 && (
            <button type="button" onClick={addTacticalRole} className="dm-btn-outline">+ Aggiungi ruolo tattico</button>
          )}
        </div>
      </Section>

      {/* SECTION C — VALUTAZIONI */}
      <Section label="// C · VALUTAZIONI (0-10)">
        <div className="grid md:grid-cols-2 gap-6">
          {(["technical","tactical","physical","mental"] as const).map((k) => (
            <SliderRow key={k} label={ratingLabel(k)} value={data.ratings[k]} min={0} max={10} step={0.1}
              onChange={(v) => updateRating(k, v)} />
          ))}
        </div>
        <div className="mt-6 pt-6 border-hairline-t flex items-center justify-between">
          <span className="font-display font-semibold uppercase">Overall (auto)</span>
          <span className="font-mono text-3xl text-accent-lime">{calcOverall(data.ratings).toFixed(1)}</span>
        </div>
      </Section>

      {/* SECTION D — SKILLS */}
      <Section label="// D · SKILLS (0-100)">
        <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
          {(Object.keys(data.skills) as (keyof Player["skills"])[]).map((k) => (
            <SliderRow key={k} label={skillLabel(k)} value={data.skills[k]} min={0} max={100} step={1}
              onChange={(v) => updateSkill(k, v)} />
          ))}
        </div>
      </Section>

      {/* SECTION E — STELLE */}
      <Section label="// E · STELLE">
        <div className="grid md:grid-cols-2 gap-4">
          {(Object.keys(data.stars) as (keyof Player["stars"])[]).map((k) => (
            <div key={k} className="flex items-center justify-between border-hairline-b py-3">
              <span className="font-display font-semibold uppercase">{starLabel(k)}</span>
              <Stars value={data.stars[k]} onChange={(v) => updateStar(k, v)} size={22} />
            </div>
          ))}
        </div>
      </Section>

      {/* SECTION F — MERCATO */}
      <Section label="// F · MERCATO">
        <div className="grid md:grid-cols-3 gap-4">
          <Field label="Valore min €"><input type="number" className="dm-input" value={data.market.value_min} onChange={(e) => updateMarket("value_min", parseInt(e.target.value) || 0)} /></Field>
          <Field label="Valore max €"><input type="number" className="dm-input" value={data.market.value_max} onChange={(e) => updateMarket("value_max", parseInt(e.target.value) || 0)} /></Field>
          <Field label="Potenziale">
            <select className="dm-input" value={data.market.potential} onChange={(e) => updateMarket("potential", e.target.value)}>
              <option>Alto</option><option>Medio-Alto</option><option>Medio</option><option>Basso</option>
            </select>
          </Field>
          <Field label="Rischio">
            <select className="dm-input" value={data.market.risk} onChange={(e) => updateMarket("risk", e.target.value)}>
              <option>Basso</option><option>Medio</option><option>Alto</option>
            </select>
          </Field>
          <Field label="Timeline"><input className="dm-input" value={data.market.timeline} onChange={(e) => updateMarket("timeline", e.target.value)} /></Field>
          <Field label="Pronta inseribilità"><input className="dm-input" value={data.market.ready_level} onChange={(e) => updateMarket("ready_level", e.target.value)} /></Field>
        </div>
      </Section>

      {/* SECTION G — TAGS */}
      <Section label="// G · TAGS">
        <div className="flex flex-wrap gap-2">
          {ALL_TAGS.map((t) => {
            const on = data.tags.includes(t);
            return (
              <button key={t} type="button" onClick={() => toggleTag(t)}
                className="tag-pill cursor-pointer" data-tone={on ? "accent" : undefined}
                style={{ opacity: on ? 1 : 0.45 }}>{t}</button>
            );
          })}
        </div>
      </Section>

      {/* SECTION H — VERDETTO */}
      <Section label="// H · VERDETTO">
        <div className="flex flex-wrap gap-3 mb-4">
          {(["buy","monitor","pass"] as const).map((v) => {
            const on = data.verdict_type === v;
            const colors = v === "buy" ? "hsl(var(--accent))" : v === "monitor" ? "hsl(var(--orange))" : "hsl(var(--red))";
            return (
              <button
                key={v}
                type="button"
                onClick={() => update("verdict_type", v)}
                className="px-6 py-3 font-display font-bold uppercase tracking-[0.18rem] text-sm transition-colors"
                style={{
                  background: on ? colors : "transparent",
                  color: on ? (v === "buy" ? "hsl(var(--background))" : "hsl(var(--background))") : colors,
                  border: `0.5px solid ${colors}`,
                  borderRadius: 1,
                }}
              >{v.toUpperCase()}</button>
            );
          })}
        </div>
        <Field label="Testo verdetto">
          <textarea rows={4} className="dm-input" value={data.verdict} onChange={(e) => update("verdict", e.target.value)} />
        </Field>
      </Section>

      {/* SECTION I — ANALISI */}
      <Section label="// I · ANALISI TESTUALE">
        <Field label="Summary">
          <textarea rows={6} className="dm-input" value={data.summary} onChange={(e) => update("summary", e.target.value)} />
        </Field>

        <div className="grid md:grid-cols-2 gap-6 mt-4">
          <ChipList
            label="Punti di forza"
            items={data.strengths}
            input={strengthInput}
            setInput={setStrengthInput}
            onAdd={(v) => update("strengths", [...data.strengths, v])}
            onRemove={(i) => update("strengths", data.strengths.filter((_, idx) => idx !== i))}
            tone="accent"
          />
          <ChipList
            label="Aree di miglioramento"
            items={data.weaknesses}
            input={weakInput}
            setInput={setWeakInput}
            onAdd={(v) => update("weaknesses", [...data.weaknesses, v])}
            onRemove={(i) => update("weaknesses", data.weaknesses.filter((_, idx) => idx !== i))}
            tone="red"
          />
        </div>

        <div className="grid md:grid-cols-4 gap-4 mt-6">
          <Field label="Tipo osservazione">
            <select className="dm-input" value={data.observation_type} onChange={(e) => update("observation_type", e.target.value)}>
              <option>Video</option><option>Dal vivo</option><option>Video + Dal vivo</option>
            </select>
          </Field>
          <Field label="N. osservazioni"><input type="number" className="dm-input" value={data.observation_count} onChange={(e) => update("observation_count", parseInt(e.target.value) || 0)} /></Field>
          <Field label="Data osservazione"><input type="date" className="dm-input" value={data.date} onChange={(e) => update("date", e.target.value)} /></Field>
          <Field label="URL video YouTube"><input className="dm-input" value={data.video_url || ""} onChange={(e) => update("video_url", e.target.value)} /></Field>
        </div>
      </Section>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-hairline-t">
        {mode === "edit" ? (
          <button type="button" onClick={remove} className="dm-btn-danger">Elimina Report</button>
        ) : <span />}
        <button type="button" onClick={submit} className="dm-btn-primary !px-8">
          {mode === "create" ? "Salva Report →" : "Aggiorna Report →"}
        </button>
      </div>
    </div>
  );
}

// helpers
function ratingLabel(k: keyof Player["ratings"]) {
  const m = { technical:"Tecnica", tactical:"Tattica", physical:"Fisico", mental:"Mentalità", overall:"Overall" };
  return m[k];
}
function skillLabel(k: keyof Player["skills"]) {
  const m: Record<string,string> = {
    ball_control:"Ball Control", passing:"Passaggio", dribbling:"Dribbling", finishing:"Finalizzazione",
    defensive_work:"Lavoro Difensivo", tactical_iq:"Intelligenza Tattica", decision_making:"Decision Making",
    aerial:"Gioco Aereo", pace:"Velocità", stamina:"Resistenza",
  };
  return m[k];
}
function starLabel(k: keyof Player["stars"]) {
  const m: Record<string,string> = { technique:"Tecnica", athleticism:"Atletismo", mentality:"Mentalità", potential:"Potenziale", market_value:"Valore di Mercato" };
  return m[k];
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="section-label mb-4">{label}</div>
      {children}
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[0.65rem] font-mono uppercase tracking-[0.12rem] text-gray-soft mb-1.5">{label}</span>
      {children}
    </label>
  );
}
function SliderRow({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="font-display font-semibold uppercase text-sm">{label}</span>
        <span className="font-mono text-xs text-accent-lime">{step < 1 ? value.toFixed(1) : value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[hsl(var(--accent))]" />
    </div>
  );
}
function ChipList({ label, items, input, setInput, onAdd, onRemove, tone }: {
  label: string; items: string[]; input: string; setInput: (v: string) => void;
  onAdd: (v: string) => void; onRemove: (i: number) => void; tone: "accent" | "red";
}) {
  const add = () => { const v = input.trim(); if (!v) return; onAdd(v); setInput(""); };
  return (
    <div>
      <div className="text-[0.65rem] font-mono uppercase tracking-[0.12rem] text-gray-soft mb-1.5">{label}</div>
      <div className="flex gap-2">
        <input className="dm-input flex-1" value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Scrivi e premi Invio" />
        <button type="button" onClick={add} className="dm-btn-outline !py-2 !px-4 text-xs">Aggiungi</button>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {items.map((it, i) => (
          <span key={i} className="tag-pill flex items-center gap-2" data-tone={tone}>
            {it} <button type="button" onClick={() => onRemove(i)} className="opacity-70 hover:opacity-100">✕</button>
          </span>
        ))}
      </div>
    </div>
  );
}
