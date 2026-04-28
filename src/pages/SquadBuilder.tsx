import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { usePlayers } from "@/lib/usePlayers";
import { getShortlist } from "@/lib/shortlist";
import type { Player, PositionCode, RoleDef, RoleDuty } from "@/lib/types";
import { POSITION_LABEL, ROLE_OPTIONS_BY_POSITION, FORMATIONS as ALL_FORMATIONS } from "@/lib/types";

type Slot = { label: string; position: PositionCode; x: number; y: number; role?: RoleDef; duty?: RoleDuty };

/** All formations with detailed tactical role suggestions per slot. */
const FORMATION_LAYOUTS: Record<string, Slot[]> = {
  "4-3-3": [
    { label: "GK",  position: "GK",  x: 50, y: 130 },
    { label: "LB",  position: "LB",  x: 15, y: 100 },
    { label: "CB",  position: "CB",  x: 38, y: 105 },
    { label: "CB",  position: "CB",  x: 62, y: 105 },
    { label: "RB",  position: "RB",  x: 85, y: 100 },
    { label: "DLP", position: "CDM", x: 50, y: 80  },
    { label: "MEZ", position: "CM",  x: 28, y: 62  },
    { label: "B2B", position: "CM",  x: 72, y: 62  },
    { label: "LW",  position: "LW",  x: 18, y: 30  },
    { label: "ST",  position: "ST",  x: 50, y: 16  },
    { label: "RW",  position: "RW",  x: 82, y: 30  },
  ],
  "4-2-3-1": [
    { label: "GK",  position: "GK",  x: 50, y: 130 },
    { label: "LB",  position: "LB",  x: 15, y: 100 },
    { label: "CB",  position: "CB",  x: 38, y: 105 },
    { label: "CB",  position: "CB",  x: 62, y: 105 },
    { label: "RB",  position: "RB",  x: 85, y: 100 },
    { label: "DM",  position: "CDM", x: 35, y: 80  },
    { label: "DM",  position: "CDM", x: 65, y: 80  },
    { label: "AM",  position: "CAM", x: 50, y: 52  },
    { label: "LW",  position: "LW",  x: 18, y: 32  },
    { label: "RW",  position: "RW",  x: 82, y: 32  },
    { label: "ST",  position: "ST",  x: 50, y: 16  },
  ],
  "4-4-2": [
    { label: "GK",  position: "GK",  x: 50, y: 130 },
    { label: "LB",  position: "LB",  x: 15, y: 100 },
    { label: "CB",  position: "CB",  x: 38, y: 105 },
    { label: "CB",  position: "CB",  x: 62, y: 105 },
    { label: "RB",  position: "RB",  x: 85, y: 100 },
    { label: "LM",  position: "LW",  x: 15, y: 65  },
    { label: "CM",  position: "CM",  x: 38, y: 70  },
    { label: "CM",  position: "CM",  x: 62, y: 70  },
    { label: "RM",  position: "RW",  x: 85, y: 65  },
    { label: "ST",  position: "ST",  x: 38, y: 20  },
    { label: "CF",  position: "CF",  x: 62, y: 20  },
  ],
  "4-3-1-2": [
    { label: "GK",  position: "GK",  x: 50, y: 130 },
    { label: "LB",  position: "LB",  x: 15, y: 100 },
    { label: "CB",  position: "CB",  x: 38, y: 105 },
    { label: "CB",  position: "CB",  x: 62, y: 105 },
    { label: "RB",  position: "RB",  x: 85, y: 100 },
    { label: "CDM", position: "CDM", x: 50, y: 80  },
    { label: "CM",  position: "CM",  x: 28, y: 65  },
    { label: "CM",  position: "CM",  x: 72, y: 65  },
    { label: "AM",  position: "CAM", x: 50, y: 45  },
    { label: "ST",  position: "ST",  x: 38, y: 18  },
    { label: "CF",  position: "CF",  x: 62, y: 18  },
  ],
  "4-1-4-1": [
    { label: "GK",  position: "GK",  x: 50, y: 130 },
    { label: "LB",  position: "LB",  x: 15, y: 100 },
    { label: "CB",  position: "CB",  x: 38, y: 105 },
    { label: "CB",  position: "CB",  x: 62, y: 105 },
    { label: "RB",  position: "RB",  x: 85, y: 100 },
    { label: "DM",  position: "CDM", x: 50, y: 78  },
    { label: "LM",  position: "LW",  x: 15, y: 55  },
    { label: "CM",  position: "CM",  x: 38, y: 58  },
    { label: "CM",  position: "CM",  x: 62, y: 58  },
    { label: "RM",  position: "RW",  x: 85, y: 55  },
    { label: "ST",  position: "ST",  x: 50, y: 18  },
  ],
  "4-5-1": [
    { label: "GK",  position: "GK",  x: 50, y: 130 },
    { label: "LB",  position: "LB",  x: 15, y: 100 },
    { label: "CB",  position: "CB",  x: 38, y: 105 },
    { label: "CB",  position: "CB",  x: 62, y: 105 },
    { label: "RB",  position: "RB",  x: 85, y: 100 },
    { label: "LM",  position: "LW",  x: 12, y: 60  },
    { label: "CM",  position: "CM",  x: 32, y: 65  },
    { label: "CM",  position: "CDM", x: 50, y: 72  },
    { label: "CM",  position: "CM",  x: 68, y: 65  },
    { label: "RM",  position: "RW",  x: 88, y: 60  },
    { label: "ST",  position: "ST",  x: 50, y: 18  },
  ],
  "3-5-2": [
    { label: "GK",  position: "GK",  x: 50, y: 130 },
    { label: "CB",  position: "CB",  x: 25, y: 105 },
    { label: "CB",  position: "CB",  x: 50, y: 110 },
    { label: "CB",  position: "CB",  x: 75, y: 105 },
    { label: "LWB", position: "LB",  x: 10, y: 75  },
    { label: "CM",  position: "CM",  x: 32, y: 70  },
    { label: "DM",  position: "CDM", x: 50, y: 82  },
    { label: "CM",  position: "CM",  x: 68, y: 70  },
    { label: "RWB", position: "RB",  x: 90, y: 75  },
    { label: "ST",  position: "ST",  x: 38, y: 22  },
    { label: "CF",  position: "CF",  x: 62, y: 22  },
  ],
  "3-4-3": [
    { label: "GK",  position: "GK",  x: 50, y: 130 },
    { label: "CB",  position: "CB",  x: 25, y: 105 },
    { label: "CB",  position: "CB",  x: 50, y: 110 },
    { label: "CB",  position: "CB",  x: 75, y: 105 },
    { label: "LWB", position: "LB",  x: 10, y: 70  },
    { label: "CM",  position: "CM",  x: 38, y: 75  },
    { label: "CM",  position: "CM",  x: 62, y: 75  },
    { label: "RWB", position: "RB",  x: 90, y: 70  },
    { label: "LW",  position: "LW",  x: 20, y: 25  },
    { label: "ST",  position: "ST",  x: 50, y: 18  },
    { label: "RW",  position: "RW",  x: 80, y: 25  },
  ],
  "3-4-1-2": [
    { label: "GK",  position: "GK",  x: 50, y: 130 },
    { label: "CB",  position: "CB",  x: 25, y: 105 },
    { label: "CB",  position: "CB",  x: 50, y: 110 },
    { label: "CB",  position: "CB",  x: 75, y: 105 },
    { label: "LWB", position: "LB",  x: 10, y: 72  },
    { label: "CM",  position: "CM",  x: 38, y: 75  },
    { label: "CM",  position: "CM",  x: 62, y: 75  },
    { label: "RWB", position: "RB",  x: 90, y: 72  },
    { label: "AM",  position: "CAM", x: 50, y: 48  },
    { label: "ST",  position: "ST",  x: 38, y: 20  },
    { label: "CF",  position: "CF",  x: 62, y: 20  },
  ],
  "5-3-2": [
    { label: "GK",  position: "GK",  x: 50, y: 130 },
    { label: "LWB", position: "LB",  x: 12, y: 95  },
    { label: "CB",  position: "CB",  x: 30, y: 108 },
    { label: "CB",  position: "CB",  x: 50, y: 112 },
    { label: "CB",  position: "CB",  x: 70, y: 108 },
    { label: "RWB", position: "RB",  x: 88, y: 95  },
    { label: "CM",  position: "CM",  x: 30, y: 65  },
    { label: "DM",  position: "CDM", x: 50, y: 75  },
    { label: "CM",  position: "CM",  x: 70, y: 65  },
    { label: "ST",  position: "ST",  x: 38, y: 22  },
    { label: "CF",  position: "CF",  x: 62, y: 22  },
  ],
  "5-4-1": [
    { label: "GK",  position: "GK",  x: 50, y: 130 },
    { label: "LWB", position: "LB",  x: 12, y: 95  },
    { label: "CB",  position: "CB",  x: 30, y: 108 },
    { label: "CB",  position: "CB",  x: 50, y: 112 },
    { label: "CB",  position: "CB",  x: 70, y: 108 },
    { label: "RWB", position: "RB",  x: 88, y: 95  },
    { label: "LM",  position: "LW",  x: 15, y: 65  },
    { label: "CM",  position: "CM",  x: 38, y: 70  },
    { label: "CM",  position: "CM",  x: 62, y: 70  },
    { label: "RM",  position: "RW",  x: 85, y: 65  },
    { label: "ST",  position: "ST",  x: 50, y: 20  },
  ],
};

const STORAGE_KEY = "dmscout_squad";

type SlotAssignment = { player_id: string | null; role_code?: string; duty?: RoleDuty };
type Squad = { formation: string; assignments: SlotAssignment[] };

function loadSquad(): Squad {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // backward compat: array of strings
      if (Array.isArray(parsed.assignments) && typeof parsed.assignments[0] === "string") {
        parsed.assignments = parsed.assignments.map((id: string | null) => ({ player_id: id }));
      }
      return parsed;
    }
  } catch {}
  return { formation: "4-3-3", assignments: new Array(11).fill(null).map(() => ({ player_id: null })) };
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

  const slots = FORMATION_LAYOUTS[squad.formation] || FORMATION_LAYOUTS["4-3-3"];

  // Ensure assignments length matches the current formation slot count.
  useEffect(() => {
    if (squad.assignments.length !== slots.length) {
      const next: Squad = { ...squad, assignments: new Array(slots.length).fill(null).map(() => ({ player_id: null })) };
      setSquad(next);
      saveSquad(next);
    }
  }, [squad.formation]); // eslint-disable-line

  const update = (next: Squad) => { setSquad(next); saveSquad(next); };

  const assignPlayer = (slotIdx: number, playerId: string | null) => {
    const a = [...squad.assignments];
    if (playerId) for (let i = 0; i < a.length; i++) if (a[i]?.player_id === playerId) a[i] = { ...a[i], player_id: null };
    a[slotIdx] = { ...(a[slotIdx] || {}), player_id: playerId };
    update({ ...squad, assignments: a });
  };

  const setSlotRole = (slotIdx: number, role_code: string, duty?: RoleDuty) => {
    const a = [...squad.assignments];
    a[slotIdx] = { ...(a[slotIdx] || { player_id: null }), role_code, duty };
    update({ ...squad, assignments: a });
  };

  const changeFormation = (f: string) => {
    update({ formation: f, assignments: new Array(FORMATION_LAYOUTS[f].length).fill(null).map(() => ({ player_id: null })) });
  };

  const teamStats = useMemo(() => {
    const used = squad.assignments
      .map((as, i) => (as?.player_id ? { player: players.find((p) => p.id === as.player_id), slot: slots[i] } : null))
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

  const activeSlotData = activeSlot !== null ? slots[activeSlot] : null;
  const activeAssignment = activeSlot !== null ? squad.assignments[activeSlot] : null;
  const roleOptions: RoleDef[] = activeSlotData ? (ROLE_OPTIONS_BY_POSITION[activeSlotData.position] || []) : [];
  const selectedRole = roleOptions.find((r) => r.code === activeAssignment?.role_code);

  return (
    <PageShell>
      <section className="container pt-10 pb-6">
        <div className="section-label mb-3">// SQUAD BUILDER</div>
        <h1 className="font-display font-black uppercase text-4xl md:text-6xl mb-2">Costruisci la Tua Rosa</h1>
        <p className="text-gray-soft">Scegli formazione, ruolo tattico e duty per ogni slot. Stile Football Manager.</p>
      </section>

      <section className="container pb-6 flex flex-wrap gap-3 items-center">
        <select className="dm-input max-w-[180px]" value={squad.formation} onChange={(e) => changeFormation(e.target.value)}>
          {ALL_FORMATIONS.filter((f) => FORMATION_LAYOUTS[f]).map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <button className="dm-btn-outline !py-1.5 !px-3 text-xs" onClick={() => update({ ...squad, assignments: new Array(slots.length).fill(null).map(() => ({ player_id: null })) })}>
          Svuota
        </button>
        <Link to="/match-planner" className="dm-btn-primary !py-1.5 !px-3 text-xs ml-auto">⚡ Match Planner →</Link>
      </section>

      <section className="container pb-12 grid lg:grid-cols-[1.4fr_1fr] gap-6 items-start">
        <div className="border-hairline p-3 bg-[#0e1f0e]">
          <svg viewBox="0 0 100 140" width="100%" preserveAspectRatio="xMidYMid meet" style={{ display: "block" }}>
            <rect x="2" y="2" width="96" height="136" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.4" />
            <line x1="2" y1="70" x2="98" y2="70" stroke="rgba(255,255,255,0.3)" strokeWidth="0.4" />
            <circle cx="50" cy="70" r="10" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.4" />
            <rect x="25" y="2" width="50" height="18" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.4" />
            <rect x="25" y="120" width="50" height="18" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.4" />

            {slots.map((s, i) => {
              const as = squad.assignments[i];
              const player = as?.player_id ? players.find((p) => p.id === as.player_id) : null;
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
                  {as?.duty && (
                    <text x={s.x} y={s.y - 7.5} textAnchor="middle" fontSize="2" fontFamily="Space Mono" fill="rgba(255,255,255,0.7)">
                      {as.duty[0].toUpperCase()}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        <div className="space-y-4">
          {teamStats && (
            <div className="dm-card p-5">
              <div className="section-label mb-3">// FORZA SQUADRA · {teamStats.count}/{slots.length}</div>
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

          {activeSlotData && (
            <div className="dm-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="section-label">// SLOT {activeSlotData.label} · {POSITION_LABEL[activeSlotData.position]}</div>
                <button onClick={() => setActiveSlot(null)} className="text-gray-soft text-xs">Chiudi ✕</button>
              </div>

              {/* Tactical role + duty selector */}
              <div className="mb-4 space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-[0.14rem] text-gray-soft">Ruolo tattico</div>
                <select
                  className="dm-input w-full"
                  value={activeAssignment?.role_code || ""}
                  onChange={(e) => {
                    const role = roleOptions.find((r) => r.code === e.target.value);
                    setSlotRole(activeSlot!, e.target.value, role?.duties[0]);
                  }}
                >
                  <option value="">— Nessun ruolo —</option>
                  {roleOptions.map((r) => (
                    <option key={r.code} value={r.code}>{r.label}</option>
                  ))}
                </select>
                {selectedRole && selectedRole.duties.length > 0 && (
                  <div className="flex gap-1">
                    {selectedRole.duties.map((d) => (
                      <button
                        key={d}
                        onClick={() => setSlotRole(activeSlot!, selectedRole.code, d)}
                        className={`flex-1 text-[10px] font-mono uppercase tracking-[0.1rem] py-1.5 border-hairline ${
                          activeAssignment?.duty === d ? "bg-accent-lime text-background" : "hover:bg-gray-light"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 mb-3">
                <input className="dm-input flex-1" placeholder="Cerca…" value={search} onChange={(e) => setSearch(e.target.value)} />
                <select className="dm-input max-w-[140px]" value={filter} onChange={(e) => setFilter(e.target.value as any)}>
                  <option value="all">Tutti</option>
                  <option value="shortlist">★ Shortlist</option>
                </select>
              </div>
              <button onClick={() => assignPlayer(activeSlot!, null)} className="dm-btn-outline !py-1 !px-2 text-[10px] mb-2 w-full">— Svuota giocatore —</button>
              <div className="max-h-[320px] overflow-y-auto space-y-1">
                {filteredPool
                  .map((p) => ({ p, fit: fitFor(p, activeSlotData.position) }))
                  .sort((a, b) => b.fit - a.fit || b.p.ratings.overall - a.p.ratings.overall)
                  .map(({ p, fit }) => {
                    const used = squad.assignments.some((a) => a?.player_id === p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => assignPlayer(activeSlot!, p.id)}
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
              Clicca su uno slot in campo per assegnare un giocatore, scegliere il ruolo tattico (es. Wing Back, Mezzala, Raumdeuter) e il duty (Defend / Support / Attack).
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
