import type { Player, PlayerStats } from "./types";
import { STATS_GROUPS, STATS_MATCH_GROUPS } from "./types";

/** Versione del formato di export — cambiala se modifichi la struttura del CSV. */
export const CSV_EXPORT_VERSION = "2.1";

/** Escape a CSV cell per RFC 4180 (quotes, commas, newlines). */
function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return "";
    const s = Number.isInteger(v) ? String(v) : String(Math.round(v * 10000) / 10000);
    return s;
  }
  const s = String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Format currency in EUR with dot decimal, no thousand separators (Excel-friendly). */
function fmtCurrency(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v as number)) return "";
  if (v === 0) return ""; // 0 € quasi sempre = "non valutato"
  return String(Math.round(v as number));
}

/** Build a CSV string from an array of rows. */
export function rowsToCsv(rows: (string | number | null | undefined)[][]): string {
  return "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

export function safeFilename(s: string): string {
  return (s || "report").replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60);
}

// ─────────────────────────────────────────────────────────────────────────────
// Normalizzazione "zero come vuoto"
//
// Excel/Pivot table vengono falsati se trattiamo 0 come valore reale per
// metriche che in pratica significano "non rilevato": percentuali, rate,
// per-90, indici, voti medi, market value, ecc.
// Per i counter "puri" (gol, tiri, contrasti) lo 0 è informativo e va tenuto.
// ─────────────────────────────────────────────────────────────────────────────

/** Suffissi/keyword di chiavi dove 0 va trattato come vuoto. */
const ZERO_AS_EMPTY_SUBSTR = [
  "_pct", "accuracy", "_per_90", "_per_match", "rating", "index",
  "success", "conversion", "speed_kmh",
];

/** Chiavi specifiche dove 0 = "non rilevato". */
const ZERO_AS_EMPTY_KEYS = new Set<string>([
  "avg_rating", "m_rating", "instat_index",
  "psxg", "psxg_minus_goals", "xg_overperformance",
  "minutes_per_match", "distance_per_match_km", "sprints_per_match",
  "top_speed_kmh", "avg_speed_kmh",
  "m_top_speed_kmh", "m_avg_speed_kmh", "m_distance_km",
]);

/** True se per questa chiave statistica lo 0 va emesso come cella vuota. */
function isZeroEmptyKey(key: string): boolean {
  if (ZERO_AS_EMPTY_KEYS.has(key)) return true;
  return ZERO_AS_EMPTY_SUBSTR.some((s) => key.includes(s));
}

/** Restituisce il valore "stampabile": "" per 0 quando opportuno, altrimenti il numero. */
function statValue(key: string, v: number | null | undefined): number | string {
  if (v === null || v === undefined || !Number.isFinite(v as number)) return "";
  if (v === 0 && isZeroEmptyKey(key)) return "";
  return v as number;
}

/** Versione "raw" che restituisce sempre un numero o "". Usata dove non vogliamo logica zero-empty. */
function num(v: number | null | undefined): number | string {
  if (v === null || v === undefined || !Number.isFinite(v as number)) return "";
  return v as number;
}

/** Per ratings/skills/stars: 0 = "non valutato". */
function score(v: number | null | undefined): number | string {
  if (v === null || v === undefined || !Number.isFinite(v as number)) return "";
  if (v === 0) return "";
  return v as number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapping InStat
//
// Mappa le chiavi interne al naming usato nelle schede InStat / Wyscout / FBref.
// La sezione viene emessa nel CSV per rendere import e join prevedibili.
// ─────────────────────────────────────────────────────────────────────────────

interface InstatMap {
  /** Etichetta InStat ufficiale o equivalente più vicino. */
  instat: string;
  /** Naming usato anche in Wyscout / FBref / altri (per riferimento). */
  also?: string;
}

export const INSTAT_FIELD_MAP: Partial<Record<keyof PlayerStats, InstatMap>> = {
  // Apparizioni
  matches: { instat: "Matches played", also: "Apps" },
  matches_started: { instat: "Matches started", also: "Starts" },
  matches_subbed_in: { instat: "Substituted in" },
  matches_subbed_out: { instat: "Substituted out" },
  minutes: { instat: "Minutes played" },
  minutes_per_match: { instat: "Minutes per match" },
  yellow_cards: { instat: "Yellow cards" },
  yellow_red_cards: { instat: "Second yellow cards" },
  red_cards: { instat: "Red cards" },
  fouls_per_match: { instat: "Fouls per match" },

  // Offensive
  goals: { instat: "Goals" },
  goals_per_90: { instat: "Goals per 90", also: "Gls/90" },
  non_penalty_goals: { instat: "Non-penalty goals", also: "npG" },
  assists: { instat: "Assists" },
  assists_per_90: { instat: "Assists per 90", also: "Ast/90" },
  goal_contributions: { instat: "Goals + Assists", also: "G+A" },
  shots: { instat: "Shots" },
  shots_per_90: { instat: "Shots per 90" },
  shots_on_target: { instat: "Shots on target" },
  shots_on_target_pct: { instat: "Shots on target, %" },
  shots_blocked: { instat: "Shots blocked" },
  shots_off_target: { instat: "Shots off target" },
  xg: { instat: "xG" },
  xg_per_90: { instat: "xG per 90" },
  xa: { instat: "xA" },
  xa_per_90: { instat: "xA per 90" },
  npxg: { instat: "Non-penalty xG", also: "npxG" },
  npxg_per_90: { instat: "Non-penalty xG per 90" },
  xg_overperformance: { instat: "Goals minus xG", also: "G-xG" },
  goal_conversion: { instat: "Goal conversion, %" },
  big_chances_created: { instat: "Big chances created" },
  big_chances_missed: { instat: "Big chances missed" },
  penalties_scored: { instat: "Penalties scored" },
  penalties_taken: { instat: "Penalties taken" },
  penalty_conversion: { instat: "Penalty conversion, %" },
  free_kick_goals: { instat: "Free kick goals" },
  headed_goals: { instat: "Headed goals" },

  // Passing
  passes: { instat: "Passes" },
  passes_per_90: { instat: "Passes per 90" },
  passes_completed: { instat: "Accurate passes", also: "Cmp" },
  pass_accuracy: { instat: "Pass accuracy, %" },
  key_passes: { instat: "Key passes" },
  key_passes_per_90: { instat: "Key passes per 90" },
  through_balls: { instat: "Through passes", also: "Through balls" },
  through_ball_accuracy: { instat: "Through pass accuracy, %" },
  long_balls: { instat: "Long passes" },
  long_ball_accuracy: { instat: "Long pass accuracy, %" },
  crosses: { instat: "Crosses" },
  crosses_completed: { instat: "Accurate crosses" },
  cross_accuracy: { instat: "Cross accuracy, %" },
  forward_passes: { instat: "Forward passes" },
  back_passes: { instat: "Back passes" },
  passes_into_final_third: { instat: "Passes to final third" },
  passes_into_box: { instat: "Passes to penalty area" },
  smart_passes: { instat: "Smart passes" },
  smart_passes_completed: { instat: "Accurate smart passes" },
  progressive_passes: { instat: "Progressive passes" },

  // Possesso / dribbling
  touches: { instat: "Touches" },
  touches_in_box: { instat: "Touches in penalty area" },
  dribbles: { instat: "Dribbles" },
  dribbles_completed: { instat: "Successful dribbles" },
  dribble_success: { instat: "Dribbles success, %" },
  progressive_carries: { instat: "Progressive runs" },
  carries_into_final_third: { instat: "Carries into final third" },
  carries_into_box: { instat: "Carries into penalty area" },
  lost_balls: { instat: "Losses", also: "Ball losses" },
  recoveries: { instat: "Ball recoveries" },
  successful_attacking_actions: { instat: "Successful attacking actions" },
  successful_defensive_actions: { instat: "Successful defensive actions" },

  // Difensive
  tackles: { instat: "Tackles", also: "Sliding tackles" },
  tackles_per_90: { instat: "Tackles per 90" },
  tackles_won: { instat: "Successful tackles" },
  tackle_success: { instat: "Tackle success, %" },
  interceptions: { instat: "Interceptions" },
  interceptions_per_90: { instat: "Interceptions per 90" },
  blocks: { instat: "Shots blocked", also: "Blocks" },
  clearances: { instat: "Clearances" },
  duels_won: { instat: "Duels won" },
  duels_total: { instat: "Total duels" },
  duel_success: { instat: "Duels won, %" },
  aerial_duels_won: { instat: "Aerial duels won" },
  aerial_duels_total: { instat: "Aerial duels" },
  aerial_duel_success: { instat: "Aerial duels won, %" },
  ground_duels_won: { instat: "Ground duels won" },
  ground_duels_total: { instat: "Ground duels" },
  ground_duel_success: { instat: "Ground duels won, %" },
  fouls_committed: { instat: "Fouls" },
  fouls_drawn: { instat: "Fouls suffered" },
  offsides: { instat: "Offsides" },
  errors_leading_to_goal: { instat: "Errors leading to goal" },
  errors_leading_to_shot: { instat: "Errors leading to shot" },

  // Atletici
  distance_km: { instat: "Distance covered, km" },
  distance_per_match_km: { instat: "Distance per match, km" },
  sprints: { instat: "Sprints" },
  sprints_per_match: { instat: "Sprints per match" },
  high_intensity_runs: { instat: "High intensity runs" },
  top_speed_kmh: { instat: "Top speed, km/h" },
  avg_speed_kmh: { instat: "Average speed, km/h" },

  // Portiere
  saves: { instat: "Saves" },
  saves_per_90: { instat: "Saves per 90" },
  save_pct: { instat: "Save percentage" },
  clean_sheets: { instat: "Clean sheets" },
  goals_conceded: { instat: "Goals conceded" },
  goals_conceded_per_90: { instat: "Goals conceded per 90" },
  psxg: { instat: "Post-shot xG", also: "PSxG" },
  psxg_minus_goals: { instat: "PSxG minus goals" },
  punches: { instat: "Punches" },
  high_claims: { instat: "High claims" },
  sweeper_actions: { instat: "Sweeper actions", also: "Defensive actions outside box" },
  goal_kicks: { instat: "Goal kicks" },
  goal_kick_accuracy: { instat: "Goal kick accuracy, %" },

  // Indici
  instat_index: { instat: "InStat Index" },
  avg_rating: { instat: "Average rating" },
};

/** Helper per derivare il mapping match (m_*) dal mapping stagione. */
function instatForKey(key: string): InstatMap | undefined {
  if (key in INSTAT_FIELD_MAP) return (INSTAT_FIELD_MAP as any)[key];
  if (key.startsWith("m_")) {
    const base = key.slice(2);
    const m = (INSTAT_FIELD_MAP as any)[base] as InstatMap | undefined;
    if (m) return { instat: `${m.instat} (last match)`, also: m.also };
  }
  return undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Header metadata block
// ─────────────────────────────────────────────────────────────────────────────

function metaRows(opts: {
  kind: "player" | "comparison";
  scope: "Stagione" | "Ultima partita" | "Stagione + Ultima partita";
  season?: string;
  source?: string;
  reportDate?: string;
  extra?: [string, unknown][];
}): (string | number | null | undefined)[][] {
  const rows: (string | number | null | undefined)[][] = [];
  rows.push(["DM Scout", opts.kind === "player" ? "Report giocatore" : "Confronto giocatori"]);
  rows.push(["Versione export", CSV_EXPORT_VERSION]);
  rows.push(["Generato il (ISO)", new Date().toISOString()]);
  rows.push(["Generato il (locale)", new Date().toLocaleString("it-IT")]);
  rows.push(["Modalità", opts.scope]);
  if (opts.season) rows.push(["Stagione", opts.season]);
  if (opts.source) rows.push(["Fonte statistiche", opts.source]);
  if (opts.reportDate) rows.push(["Data report", opts.reportDate]);
  rows.push(["Separatore decimale", "."]);
  rows.push(["Valuta", "EUR"]);
  rows.push(["Convenzione zero", "Le celle vuote indicano dato non rilevato; lo 0 esplicito è un valore reale solo per i counter (gol, tiri, contrasti, ecc.)."]);
  (opts.extra || []).forEach(([k, v]) => rows.push([k, v as any]));
  rows.push([]);
  return rows;
}

/** Sezione mapping InStat: chiave interna ↔ nome InStat ↔ alias ↔ unità. */
function instatMappingRows(usedKeys: Set<string>): (string | number | null | undefined)[][] {
  const rows: (string | number | null | undefined)[][] = [];
  rows.push(["# MAPPING INSTAT"]);
  rows.push([
    "Riferimento per importare/esportare verso InStat, Wyscout, FBref. Solo i campi presenti nell'export sono elencati.",
  ]);
  rows.push(["Chiave DM Scout", "Nome InStat", "Alias (Wyscout/FBref)", "Unità", "Modalità"]);

  const allFields = [
    ...STATS_GROUPS.flatMap((g) => g.fields.map((f) => ({ ...f, mode: "Stagione" }))),
    ...STATS_MATCH_GROUPS.flatMap((g) => g.fields.map((f) => ({ ...f, mode: "Ultima partita" }))),
  ];

  for (const f of allFields) {
    const key = String(f.k);
    if (!usedKeys.has(key)) continue;
    const map = instatForKey(key);
    rows.push([
      key,
      map?.instat || "",
      map?.also || "",
      f.unit || "",
      f.mode,
    ]);
  }
  rows.push([]);
  return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// Player CSV
// ─────────────────────────────────────────────────────────────────────────────

export function playerToCsv(p: Player): string {
  const stats = p.stats || {};
  const hasMatch = STATS_MATCH_GROUPS.some((g) => g.fields.some(({ k }) => stats[k] !== undefined && stats[k] !== null));
  const hasSeason = STATS_GROUPS.some((g) => g.fields.some(({ k }) => stats[k] !== undefined && stats[k] !== null));
  const scope: "Stagione" | "Ultima partita" | "Stagione + Ultima partita" =
    hasMatch && hasSeason ? "Stagione + Ultima partita" : hasMatch ? "Ultima partita" : "Stagione";

  const usedKeys = new Set<string>();

  const rows: (string | number | null | undefined)[][] = [
    ...metaRows({
      kind: "player",
      scope,
      season: p.stats_season,
      source: p.stats_source,
      reportDate: p.date,
      extra: [
        ["Giocatore", p.name],
        ["Club", p.club],
        ["Posizione", p.position_main],
      ],
    }),
  ];

  rows.push(["# IDENTITÀ"]);
  rows.push(["Campo", "Valore"]);
  const identity: [string, unknown][] = [
    ["Nome", p.name],
    ["Numero report", p.num],
    ["Età", p.age || ""],
    ["Anno di nascita", p.birth_year || ""],
    ["Nazionalità", p.nationality],
    ["Club", p.club],
    ["Lega", p.league],
    ["Regione", p.region],
    ["Posizione", p.position_main],
    ["Posizione codice", p.position_code],
    ["Posizioni secondarie", (p.position_secondary || []).join(" / ")],
    ["Piede", p.foot],
    ["Altezza (cm)", p.height || ""],
    ["Peso (kg)", p.weight || ""],
    ["Tag", (p.tags || []).join(" / ")],
    ["Data report", p.date],
    ["Tipo osservazione", p.observation_type],
    ["N. osservazioni", p.observation_count ?? ""],
  ];
  identity.forEach(([k, v]) => rows.push([k, v as any]));
  rows.push([]);

  rows.push(["# RATINGS (0-10)"]);
  rows.push(["Campo", "Valore"]);
  Object.entries(p.ratings).forEach(([k, v]) => rows.push([k, score(v as number)]));
  rows.push([]);

  rows.push(["# SKILLS (0-100)"]);
  rows.push(["Campo", "Valore"]);
  Object.entries(p.skills).forEach(([k, v]) => rows.push([k, score(v as number)]));
  rows.push([]);

  rows.push(["# STARS (0-5)"]);
  rows.push(["Campo", "Valore"]);
  Object.entries(p.stars).forEach(([k, v]) => rows.push([k, score(v as number)]));
  rows.push([]);

  rows.push(["# MERCATO"]);
  rows.push(["Campo", "Valore", "Valuta"]);
  rows.push(["Valore min", fmtCurrency(p.market.value_min), "EUR"]);
  rows.push(["Valore max", fmtCurrency(p.market.value_max), "EUR"]);
  rows.push(["Potenziale", p.market.potential]);
  rows.push(["Rischio", p.market.risk]);
  rows.push(["Timeline", p.market.timeline]);
  rows.push(["Pronta inseribilità", p.market.ready_level]);
  rows.push([]);

  rows.push(["# VERDETTO"]);
  rows.push(["Tipo", p.verdict_type]);
  rows.push(["Verdetto", p.verdict]);
  rows.push(["Sintesi", p.summary]);
  rows.push([]);

  rows.push(["# PUNTI DI FORZA"]);
  (p.strengths || []).forEach((s, i) => rows.push([`#${i + 1}`, s]));
  rows.push([]);

  rows.push(["# AREE DI MIGLIORAMENTO"]);
  (p.weaknesses || []).forEach((s, i) => rows.push([`#${i + 1}`, s]));
  rows.push([]);

  if (p.tactical_roles && p.tactical_roles.length > 0) {
    rows.push(["# RUOLI TATTICI"]);
    rows.push(["Modulo", "Ruolo", "Codice", "Duty", "Fit score"]);
    p.tactical_roles.forEach((r) =>
      rows.push([r.formation, r.role, r.role_code, r.duty || "", num(r.fit_score)])
    );
    rows.push([]);
  }

  // Stats — Ultima partita
  if (hasMatch) {
    rows.push(["# STATISTICHE · ULTIMA PARTITA"]);
    rows.push(["Modalità", "Gruppo", "Statistica", "Chiave", "Nome InStat", "Valore", "Unità"]);
    STATS_MATCH_GROUPS.forEach((g) => {
      g.fields.forEach(({ k, label, unit }) => {
        const v = stats[k];
        if (v === undefined || v === null) return;
        const key = String(k);
        usedKeys.add(key);
        const cell = statValue(key, v as number);
        const map = instatForKey(key);
        rows.push(["Ultima partita", g.label, label, key, map?.instat || "", cell, unit || ""]);
      });
    });
    rows.push([]);
  }

  // Stats — Stagione
  if (hasSeason) {
    rows.push(["# STATISTICHE · STAGIONE", `Stagione: ${p.stats_season || "-"}`, `Fonte: ${p.stats_source || "-"}`]);
    rows.push(["Modalità", "Gruppo", "Statistica", "Chiave", "Nome InStat", "Valore", "Unità"]);
    STATS_GROUPS.forEach((g) => {
      g.fields.forEach(({ k, label, unit }) => {
        const v = stats[k];
        if (v === undefined || v === null) return;
        const key = String(k);
        usedKeys.add(key);
        const cell = statValue(key, v as number);
        const map = instatForKey(key);
        rows.push(["Stagione", g.label, label, key, map?.instat || "", cell, unit || ""]);
      });
    });
    rows.push([]);
  }

  // Mapping InStat finale (solo per le chiavi effettivamente esportate)
  if (usedKeys.size > 0) {
    rows.push(...instatMappingRows(usedKeys));
  }

  return rowsToCsv(rows);
}

// ─────────────────────────────────────────────────────────────────────────────
// Comparison CSV
// ─────────────────────────────────────────────────────────────────────────────

export function comparisonToCsv(players: Player[]): string {
  if (players.length === 0) return rowsToCsv([["(nessun giocatore)"]]);

  const anyMatch = players.some((p) =>
    STATS_MATCH_GROUPS.some((g) => g.fields.some(({ k }) => p.stats?.[k] !== undefined && p.stats?.[k] !== null))
  );
  const anySeason = players.some((p) =>
    STATS_GROUPS.some((g) => g.fields.some(({ k }) => p.stats?.[k] !== undefined && p.stats?.[k] !== null))
  );
  const scope: "Stagione" | "Ultima partita" | "Stagione + Ultima partita" =
    anyMatch && anySeason ? "Stagione + Ultima partita" : anyMatch ? "Ultima partita" : "Stagione";

  const usedKeys = new Set<string>();

  const rows: (string | number | null | undefined)[][] = [
    ...metaRows({
      kind: "comparison",
      scope,
      extra: [
        ["N. giocatori", players.length],
        ["Giocatori", players.map((p) => p.name).join(" | ")],
      ],
    }),
  ];

  const header = ["Modalità", "Categoria", "Metrica", "Chiave", "Nome InStat", "Unità", ...players.map((p) => p.name)];
  rows.push(header);

  const push = (
    mode: string,
    cat: string,
    label: string,
    key: string,
    unit: string,
    getter: (p: Player) => number | string | null | undefined,
    instatName = "",
  ) => {
    rows.push([
      mode, cat, label, key, instatName, unit,
      ...players.map((p) => {
        const v = getter(p);
        if (v === undefined || v === null || v === "") return "";
        return v;
      }),
    ]);
  };

  // Profilo
  push("Profilo", "Identità", "Club", "club", "", (p) => p.club);
  push("Profilo", "Identità", "Lega", "league", "", (p) => p.league);
  push("Profilo", "Identità", "Nazionalità", "nationality", "", (p) => p.nationality);
  push("Profilo", "Identità", "Regione", "region", "", (p) => p.region);
  push("Profilo", "Identità", "Posizione", "position_main", "", (p) => p.position_main);
  push("Profilo", "Identità", "Età", "age", "anni", (p) => p.age || "");
  push("Profilo", "Identità", "Piede", "foot", "", (p) => p.foot);
  push("Profilo", "Identità", "Altezza", "height", "cm", (p) => p.height || "");
  push("Profilo", "Identità", "Peso", "weight", "kg", (p) => p.weight || "");

  (["overall", "technical", "tactical", "physical", "mental"] as const).forEach((k) =>
    push("Profilo", "Ratings (0-10)", k, k, "", (p) => score(p.ratings[k] as number)),
  );
  Object.keys(players[0].skills).forEach((k) =>
    push("Profilo", "Skills (0-100)", k, k, "", (p) => score((p.skills as any)[k])),
  );
  Object.keys(players[0].stars).forEach((k) =>
    push("Profilo", "Stars (0-5)", k, k, "★", (p) => score((p.stars as any)[k])),
  );

  push("Profilo", "Mercato", "Valore min", "value_min", "EUR", (p) => fmtCurrency(p.market.value_min));
  push("Profilo", "Mercato", "Valore max", "value_max", "EUR", (p) => fmtCurrency(p.market.value_max));
  push("Profilo", "Mercato", "Potenziale", "potential", "", (p) => p.market.potential);
  push("Profilo", "Mercato", "Rischio", "risk", "", (p) => p.market.risk);
  push("Profilo", "Mercato", "Timeline", "timeline", "", (p) => p.market.timeline);
  push("Profilo", "Mercato", "Pronta inseribilità", "ready_level", "", (p) => p.market.ready_level);

  push("Profilo", "Verdetto", "Tipo", "verdict_type", "", (p) => p.verdict_type);
  push("Profilo", "Verdetto", "Verdetto", "verdict", "", (p) => p.verdict);

  // Statistiche
  const blocks: { mode: string; groups: typeof STATS_GROUPS }[] = [
    { mode: "Ultima partita", groups: STATS_MATCH_GROUPS },
    { mode: "Stagione", groups: STATS_GROUPS },
  ];
  for (const { mode, groups } of blocks) {
    for (const g of groups) {
      for (const f of g.fields) {
        const present = players.some((p) => {
          const v = p.stats?.[f.k];
          return v !== undefined && v !== null;
        });
        if (!present) continue;
        const key = String(f.k);
        usedKeys.add(key);
        const map = instatForKey(key);
        push(
          mode, g.label, f.label, key, f.unit || "",
          (p) => statValue(key, p.stats?.[f.k] as number | undefined),
          map?.instat || "",
        );
      }
    }
  }

  // Mapping finale
  if (usedKeys.size > 0) {
    rows.push([]);
    rows.push(...instatMappingRows(usedKeys));
  }

  return rowsToCsv(rows);
}
