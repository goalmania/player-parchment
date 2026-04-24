import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { usePlayers } from "@/lib/usePlayers";
import { getShortlist } from "@/lib/shortlist";
import type { Player, PositionCode } from "@/lib/types";
import { POSITION_LABEL } from "@/lib/types";

/**
 * Tactical formations expressed as ordered slots (label + position bucket + x/y on a 100x140 pitch).
 * Origin top-left, attack at top.
 */
type Slot = { label: string; position: PositionCode; x: number; y: number };

const FORMATIONS: Record<string, Slot[]> = {
  "4-3-3": [
    { label: "GK",  position: "GK",  x: 50, y: 130 },
    { label: "LB",  position: "LB",  x: 15, y: 100 },
    { label: "CB",  position: "CB",  x: 38, y: 105 },
    { label: "CB",  position: "CB",  x: 62, y: 105 },
    { label: "RB",  position: "RB",  x: 85, y: 100 },
    { label: "CDM", position: "CDM", x: 50, y: 80  },
    { label: "CM",  position: "CM",  x: 30, y: 65  },
    { label: "CM",  position: "CM",  x: 70, y: 65  },
    { label: "LW",  position: "LW",  x: 18, y: 30  },
    { label: "ST",  position: "ST",  x: 50, y: 18  },
    { label: "RW",  position: "RW",  x: 82, y: 30  },
  ],
  "4-2-3-1": [
    { label: "GK",  position: "GK",  x: 50, y: 130 },
    { label: "LB",  position: "LB",  x: 15, y: 100 },
    { label: "CB",  position: "CB",  x: 38, y: 105 },
    { label: "CB",  position: "CB",  x: 62, y: 105 },
    { label: "RB",  position: "RB",  x: 85, y: 100 },
    { label: "CDM", position: "CDM", x: 35, y: 80  },
    { label: "CDM", position: "CDM", x: 65, y: 80  },
    { label: "CAM", position: "CAM", x: 50, y: 55  },
    { label: "LW",  position: "LW",  x: 18, y: 35  },
    { label: "RW",  position: "RW",  x: 82, y: 35  },
    { label: "ST",  position: "ST",  x: 50, y: 18  },
  ],
  "3-5-2": [
    { label: "GK",  position: "GK",  x: 50, y: 130 },
    { label: "CB",  position: "CB",  x: 25, y: 105 },
    { label: "CB",  position: "CB",  x: 50, y: 110 },
    { label: "CB",  position: "CB",  x: 75, y: 105 },
    { label: "LB",  position: "LB",  x: 12, y: 75  },
    { label: "CM",  position: "CM",  x: 35, y: 75  },
    { label: "CDM", position: "CDM", x: 50, y: 88  },
    { label: "CM",  position: "CM",  x: 65, y: 75  },
    { label: "RB",  position: "RB",  x: 88, y: 75  },
    { label: "ST",  position: "ST",  x: 38, y: 22  },
    { label: "CF",  position: "CF",  x: 62, y: 22  },
  ],
  "4-4-2": [
    { label: "GK",  position: "GK",  x: 50, y: 130 },
    { label: "LB",  position: "LB",  x: 15, y: 100 },
    { label: "CB",  position: "CB",  x: 38, y: 105 },
    { label: "CB",  position: "CB",  x: 62, y: 105 },
    { label: "RB",  position: "RB",  x: 85, y: 100 },
    { label: "LW",  position: "LW",  x: 15, y: 65  },
    { label: "CM",  position: "CM",  x: 38, y: 70  },
    { label: "CM",  position: "CM",  x: 62, y: 70  },
    { label: "RW",  position: "RW",  x: 85, y: 65  },
    { label: "ST",  position: "ST",  x: 38, y: 22  },
    { label: "CF",  position: "CF",  x: 62, y: 22  },
  ],
};

const STORAGE_KEY = "dmscout_squad";

type Squad = { formation: keyof typeof FORMATIONS; assignments: (string | null)[] };

function loadSquad(): Squad {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { formation: "4-3-3", assignments: new Array(11).fill(null) };
}
function saveSquad(s: Squad) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }

const positionFamily: Record<PositionCode, PositionCode[]> = {
  GK: ["GK"],
  CB: ["CB"],
  LB: ["LB", "CB"],
  RB: ["RB", "CB"],
  CDM: ["CDM", "CM"],
  CM: ["CM", "CDM", "CAM"],
  CAM: ["CAM", "CM"],
  LW: ["LW", "CAM", "ST", "CF"],
  RW: ["RW", "CAM", "ST", "CF"],
  ST: ["ST", "CF"],
  CF: ["CF", "ST", "CAM"],
};

function fitFor(player: Player, slot: PositionCode): number {
  const family = positionFamily[slot] || [slot];
  if (player.position_code === slot) return 1;
  if (family.includes(player.position_code)) return 0.85;
  return 0.55;
}

export default function SquadBuilder() {
  const players = usePlayers();
  const [squad, setSquad] = useState<Squad>(loadSquad());
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "shortlist">("all");
  const [search, setSearch] = useState("");

  const slots = FORMATIONS[squad.formation];

  const update = (next: Squad) => { setSquad(next); saveSquad(next); };

  const assign = (slotIdx: number, playerId: string | null) => {
    const a = [...squad.assignments];
    // ensure player only in one slot
    if (playerId) for (let i = 0; i < a.length; i++) if (a[i] === playerId) a[i] = null;
    a[slotIdx] = playerId;
    update({ ...squad, assignments: a });
    setActiveSlot(null);
  };

  const changeFormation = (f: keyof typeof FORMATIONS) => {
    update({ formation: f, assignments: new Array(FORMATIONS[f].length).fill(null) });
  };

  const teamStats = useMemo(() => {
    const used = squad.assignments
      .map((id, i) => (id ? { player: players.find((p) => p.id === id), slot: slots[i] } : null))
      .filter((x): x is { player: Player; slot: Slot } => !!x && !!x.player);
    if (used.length === 0) return null;
    const overall = used.reduce((s, u) => s + u.player.ratings.overall, 0) / used.length;
    const fit = used.reduce((s, u) => s + fitFor(u.player, u.slot.position), 0) / used.length * 100;
    const tech = used.reduce((s, u) => s + u.player.ratings.technical, 0) / used.length;
    const tact = used.reduce((s, u) => s + u.player.ratings.tactical, 0) / used.length;
    const phys = used.reduce((s, u) => s + u.player.ratings.physical, 0) / used.length;
    const ment = used.reduce((s, u) => s + u.player.ratings.mental, 0) / used.length;
    return { overall, fit, tech, tact, phys, ment, count: used.length };
  }, [squad, players, slots]);

  const filteredPool = useMemo(() => {
    const ids = filter === "shortlist" ? getShortlist() : null;
    return players.filter((p) => {
      if (ids && !ids.has(p.id)) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.club.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [players, filter, search]);

  return (
    <PageShell>
      <section className="container pt-10 pb-6">
        <div className="section-label mb-3">// SQUAD BUILDER</div>
        <h1 className="font-display font-black uppercase text-4xl md:text-6xl mb-2">Costruisci la Tua Rosa</h1>
        <p className="text-gray-soft">Trascina i tuoi profili nei ruoli per simulare la formazione ideale.</p>
      </section>

      <section className="container pb-6 flex flex-wrap gap-3 items-center">
        <select className="dm-input max-w-[160px]" value={squad.formation} onChange={(e) => changeFormation(e.target.value as keyof typeof FORMATIONS)}>
          {Object.keys(FORMATIONS).map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <button className="dm-btn-outline !py-1.5 !px-3 text-xs" onClick={() => update({ ...squad, assignments: new Array(slots.length).fill(null) })}>
          Svuota
        </button>
        <Link to="/match-planner" className="dm-btn-primary !py-1.5 !px-3 text-xs ml-auto">⚡ Match Planner →</Link>
      </section>

      <section className="container pb-12 grid lg:grid-cols-[1.4fr_1fr] gap-6 items-start">
        {/* Pitch */}
        <div className="border-hairline p-3 bg-[#0e1f0e]">
          <svg viewBox="0 0 100 140" width="100%" preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
            <rect x="2" y="2" width="96" height="136" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.4" />
            <line x1="2" y1="70" x2="98" y2="70" stroke="rgba(255,255,255,0.3)" strokeWidth="0.4" />
            <circle cx="50" cy="70" r="10" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.4" />
            <rect x="25" y="2" width="50" height="18" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.4" />
            <rect x="25" y="120" width="50" height="18" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.4" />

            {slots.map((s, i) => {
              const playerId = squad.assignments[i];
              const player = playerId ? players.find((p) => p.id === playerId) : null;
              const fit = player ? fitFor(player, s.position) : 0;
              const fill = player ? (fit >= 1 ? "hsl(var(--accent))" : fit >= 0.85 ? "hsl(var(--accent2))" : "hsl(var(--orange))") : "rgba(255,255,255,0.12)";
              return (
                <g key={i} style={{ cursor: "pointer" }} onClick={() => setActiveSlot(i)}>
                  <circle cx={s.x} cy={s.y} r={6} fill={fill} stroke={activeSlot === i ? "#fff" : "rgba(255,255,255,0.6)"} strokeWidth={activeSlot === i ? 0.8 : 0.4} />
                  <text x={s.x} y={s.y + 1.5} textAnchor="middle" fontSize="2.6" fontFamily="Space Mono" fontWeight={700} fill={player ? "#000" : "#fff"}>
                    {s.label}
                  </text>
                  {player && (
                    <text x={s.x} y={s.y + 10} textAnchor="middle" fontSize="2.4" fontFamily="Barlow Condensed" fontWeight={700} fill="#fff">
                      {player.name.split(" ").slice(-1)[0].toUpperCase()}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Side panel */}
        <div className="space-y-4">
          {teamStats && (
            <div className="dm-card p-5">
              <div className="section-label mb-3">// FORZA SQUADRA · {teamStats.count}/11</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-mono uppercase tracking-[0.12rem] text-gray-soft">Overall medio</div>
                  <div className="font-mono text-3xl text-accent-lime">{teamStats.overall.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs font-mono uppercase tracking-[0.12rem] text-gray-soft">Fit tattico</div>
                  <div className="font-mono text-3xl text-accent-teal">{teamStats.fit.toFixed(0)}%</div>
                </div>
                {[
                  ["Tec", teamStats.tech], ["Tat", teamStats.tact],
                  ["Fis", teamStats.phys], ["Men", teamStats.ment],
                ].map(([k, v]) => (
                  <div key={k as string}>
                    <div className="text-xs font-mono uppercase tracking-[0.12rem] text-gray-soft">{k}</div>
                    <div className="font-mono text-xl">{(v as number).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSlot !== null && (
            <div className="dm-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="section-label">// SLOT {slots[activeSlot].label} · {POSITION_LABEL[slots[activeSlot].position]}</div>
                <button onClick={() => setActiveSlot(null)} className="text-gray-soft text-xs">Chiudi ✕</button>
              </div>
              <div className="flex gap-2 mb-3">
                <input className="dm-input flex-1" placeholder="Cerca…" value={search} onChange={(e) => setSearch(e.target.value)} />
                <select className="dm-input max-w-[140px]" value={filter} onChange={(e) => setFilter(e.target.value as any)}>
                  <option value="all">Tutti</option>
                  <option value="shortlist">★ Shortlist</option>
                </select>
              </div>
              <button onClick={() => assign(activeSlot, null)} className="dm-btn-outline !py-1 !px-2 text-[10px] mb-2 w-full">— Svuota slot —</button>
              <div className="max-h-[360px] overflow-y-auto space-y-1">
                {filteredPool
                  .map((p) => ({ p, fit: fitFor(p, slots[activeSlot].position) }))
                  .sort((a, b) => b.fit - a.fit || b.p.ratings.overall - a.p.ratings.overall)
                  .map(({ p, fit }) => {
                    const used = squad.assignments.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => assign(activeSlot, p.id)}
                        className={`w-full text-left p-2 border-hairline hover:bg-gray-light flex items-center gap-2 ${used ? "opacity-60" : ""}`}
                      >
                        <span className="font-mono text-xs w-8 text-accent-lime">{p.ratings.overall.toFixed(1)}</span>
                        <span className="flex-1 truncate text-sm font-display font-semibold uppercase">{p.name}</span>
                        <span className="font-mono text-[10px] text-gray-soft">{p.position_code}</span>
                        <span className="font-mono text-[10px]" style={{ color: fit >= 1 ? "hsl(var(--accent))" : fit >= 0.85 ? "hsl(var(--accent2))" : "hsl(var(--orange))" }}>
                          {Math.round(fit * 100)}%
                        </span>
                      </button>
                    );
                  })}
                {filteredPool.length === 0 && <div className="text-gray-soft text-sm text-center py-6">Nessun risultato.</div>}
              </div>
            </div>
          )}

          {activeSlot === null && (
            <div className="dm-card p-5 text-sm text-gray-soft">
              Clicca su uno slot in campo per assegnare un giocatore. Il colore indica il livello di compatibilità tattica.
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
