export type PositionCode =
  | "GK" | "CB" | "LB" | "RB" | "CDM" | "CM" | "CAM"
  | "LW" | "RW" | "ST" | "CF";

export type VerdictType = "buy" | "monitor" | "pass";

export type RoleDuty = "Defend" | "Support" | "Attack";

export interface TacticalRole {
  formation: string;
  role: string;
  role_code: string;
  duty?: RoleDuty;
  fit_score: number;
}

export interface Observation {
  date: string;
  overall: number;
  ratings: { technical: number; tactical: number; physical: number; mental: number };
  note: string;
  type: string;
}

export type Heatmap = number[];
export const HEATMAP_ROWS = 6;
export const HEATMAP_COLS = 10;
export const HEATMAP_SIZE = HEATMAP_ROWS * HEATMAP_COLS;
export const emptyHeatmap = (): Heatmap => new Array(HEATMAP_SIZE).fill(0);

export interface PlayerVideo {
  url: string;
  label?: string;
  /** "youtube" | "vimeo" | "file" | "external" */
  kind: "youtube" | "vimeo" | "file" | "external";
}

/**
 * Comprehensive FM-style stats. All optional, all numeric.
 * Convention: chiavi senza prefisso = STAGIONE; chiavi con prefisso `m_` = ULTIMA PARTITA.
 * Esempio: shots = tiri stagione, m_shots = tiri ultima partita.
 */
export interface PlayerStats {
  // ── ULTIMA PARTITA ──
  m_minutes?: number;
  m_goals?: number;
  m_assists?: number;
  m_shots?: number;
  m_shots_on_target?: number;
  m_shots_blocked?: number;
  m_shots_off_target?: number;
  m_xg?: number;
  m_xa?: number;
  m_npxg?: number;
  m_big_chances_created?: number;
  m_big_chances_missed?: number;
  m_passes?: number;
  m_passes_completed?: number;
  m_pass_accuracy?: number;
  m_key_passes?: number;
  m_through_balls?: number;
  m_long_balls?: number;
  m_long_ball_accuracy?: number;
  m_crosses?: number;
  m_crosses_completed?: number;
  m_forward_passes?: number;
  m_back_passes?: number;
  m_passes_into_final_third?: number;
  m_passes_into_box?: number;
  m_dribbles?: number;
  m_dribbles_completed?: number;
  m_dribble_success?: number;
  m_progressive_carries?: number;
  m_progressive_passes?: number;
  m_touches?: number;
  m_touches_in_box?: number;
  m_lost_balls?: number;
  m_recoveries?: number;
  m_tackles?: number;
  m_tackles_won?: number;
  m_interceptions?: number;
  m_blocks?: number;
  m_clearances?: number;
  m_duels_total?: number;
  m_duels_won?: number;
  m_aerial_duels_total?: number;
  m_aerial_duels_won?: number;
  m_ground_duels_total?: number;
  m_ground_duels_won?: number;
  m_fouls_committed?: number;
  m_fouls_drawn?: number;
  m_offsides?: number;
  m_distance_km?: number;
  m_sprints?: number;
  m_high_intensity_runs?: number;
  m_top_speed_kmh?: number;
  m_avg_speed_kmh?: number;
  m_rating?: number;
  m_yellow_cards?: number;
  m_red_cards?: number;
  m_saves?: number;
  m_saves_inside_box?: number;
  m_saves_outside_box?: number;
  m_goals_conceded?: number;
  m_clean_sheet?: number;
  m_punches?: number;
  m_high_claims?: number;
  m_sweeper_actions?: number;
  // ── STAGIONE ──
  // Apparizioni
  matches?: number;
  matches_started?: number;
  matches_subbed_in?: number;
  matches_subbed_out?: number;
  minutes?: number;
  minutes_per_match?: number;
  // Disciplina
  yellow_cards?: number;
  yellow_red_cards?: number;
  red_cards?: number;
  fouls_per_match?: number;
  // Offensive
  goals?: number;
  goals_per_90?: number;
  non_penalty_goals?: number;
  assists?: number;
  assists_per_90?: number;
  goal_contributions?: number;
  shots?: number;
  shots_per_90?: number;
  shots_on_target?: number;
  shots_on_target_pct?: number; // %
  shots_blocked?: number;
  shots_off_target?: number;
  xg?: number;
  xg_per_90?: number;
  xa?: number;
  xa_per_90?: number;
  npxg?: number;
  npxg_per_90?: number;
  xg_overperformance?: number; // gol - xG
  goal_conversion?: number; // %
  big_chances_created?: number;
  big_chances_missed?: number;
  penalties_scored?: number;
  penalties_taken?: number;
  penalty_conversion?: number; // %
  free_kick_goals?: number;
  headed_goals?: number;
  // Passing
  passes?: number;
  passes_per_90?: number;
  passes_completed?: number;
  pass_accuracy?: number; // %
  key_passes?: number;
  key_passes_per_90?: number;
  through_balls?: number;
  through_ball_accuracy?: number; // %
  long_balls?: number;
  long_ball_accuracy?: number;
  crosses?: number;
  crosses_completed?: number;
  cross_accuracy?: number; // %
  forward_passes?: number;
  back_passes?: number;
  passes_into_final_third?: number;
  passes_into_box?: number;
  smart_passes?: number; // InStat
  smart_passes_completed?: number;
  // Possesso / dribbling
  touches?: number;
  touches_in_box?: number;
  dribbles?: number;
  dribbles_completed?: number;
  dribble_success?: number; // %
  progressive_carries?: number;
  progressive_passes?: number;
  carries_into_final_third?: number;
  carries_into_box?: number;
  lost_balls?: number;
  recoveries?: number;
  successful_attacking_actions?: number; // InStat
  successful_defensive_actions?: number; // InStat
  // Difensivi
  tackles?: number;
  tackles_per_90?: number;
  tackles_won?: number;
  tackle_success?: number; // %
  interceptions?: number;
  interceptions_per_90?: number;
  blocks?: number;
  clearances?: number;
  duels_won?: number;
  duels_total?: number;
  duel_success?: number; // %
  aerial_duels_won?: number;
  aerial_duels_total?: number;
  aerial_duel_success?: number; // %
  ground_duels_won?: number;
  ground_duels_total?: number;
  ground_duel_success?: number; // %
  fouls_committed?: number;
  fouls_drawn?: number;
  offsides?: number;
  errors_leading_to_goal?: number;
  errors_leading_to_shot?: number;
  // Atletici
  distance_km?: number;
  distance_per_match_km?: number;
  sprints?: number;
  sprints_per_match?: number;
  high_intensity_runs?: number;
  top_speed_kmh?: number;
  avg_speed_kmh?: number;
  // Portieri
  saves?: number;
  saves_per_90?: number;
  save_pct?: number;
  clean_sheets?: number;
  goals_conceded?: number;
  goals_conceded_per_90?: number;
  psxg?: number; // post-shot xG
  psxg_minus_goals?: number;
  punches?: number;
  high_claims?: number;
  sweeper_actions?: number;
  goal_kicks?: number;
  goal_kick_accuracy?: number; // %
  // InStat composite
  instat_index?: number;
  // Rating medio
  avg_rating?: number;
}

export const STATS_GROUPS: { key: string; label: string; fields: { k: keyof PlayerStats; label: string; unit?: string }[] }[] = [
  { key: "apps", label: "Apparizioni", fields: [
    { k: "matches", label: "Partite" },
    { k: "matches_started", label: "Da titolare" },
    { k: "matches_subbed_in", label: "Subentri" },
    { k: "matches_subbed_out", label: "Sostituito" },
    { k: "minutes", label: "Minuti" },
    { k: "minutes_per_match", label: "Min/partita" },
    { k: "avg_rating", label: "Voto medio" },
    { k: "instat_index", label: "Indice InStat" },
    { k: "yellow_cards", label: "Gialli" },
    { k: "yellow_red_cards", label: "Doppi gialli" },
    { k: "red_cards", label: "Rossi" },
    { k: "fouls_per_match", label: "Falli/partita" },
  ]},
  { key: "off", label: "Offensive", fields: [
    { k: "goals", label: "Gol" },
    { k: "goals_per_90", label: "Gol/90" },
    { k: "non_penalty_goals", label: "Gol no rigori" },
    { k: "assists", label: "Assist" },
    { k: "assists_per_90", label: "Assist/90" },
    { k: "goal_contributions", label: "G+A" },
    { k: "shots", label: "Tiri" },
    { k: "shots_per_90", label: "Tiri/90" },
    { k: "shots_on_target", label: "Tiri in porta" },
    { k: "shots_on_target_pct", label: "% in porta", unit: "%" },
    { k: "shots_blocked", label: "Tiri bloccati" },
    { k: "shots_off_target", label: "Tiri fuori" },
    { k: "xg", label: "xG" },
    { k: "xg_per_90", label: "xG/90" },
    { k: "xa", label: "xA" },
    { k: "xa_per_90", label: "xA/90" },
    { k: "npxg", label: "npxG" },
    { k: "npxg_per_90", label: "npxG/90" },
    { k: "xg_overperformance", label: "Gol - xG" },
    { k: "goal_conversion", label: "Conv. gol", unit: "%" },
    { k: "big_chances_created", label: "Grandi occ. create" },
    { k: "big_chances_missed", label: "Grandi occ. fallite" },
    { k: "penalties_scored", label: "Rigori segnati" },
    { k: "penalties_taken", label: "Rigori battuti" },
    { k: "penalty_conversion", label: "% rigori", unit: "%" },
    { k: "free_kick_goals", label: "Gol su punizione" },
    { k: "headed_goals", label: "Gol di testa" },
  ]},
  { key: "pass", label: "Passaggi", fields: [
    { k: "passes", label: "Passaggi" },
    { k: "passes_per_90", label: "Pass/90" },
    { k: "passes_completed", label: "Riusciti" },
    { k: "pass_accuracy", label: "Precisione", unit: "%" },
    { k: "key_passes", label: "Passaggi chiave" },
    { k: "key_passes_per_90", label: "Pass.chiave/90" },
    { k: "through_balls", label: "Filtranti" },
    { k: "through_ball_accuracy", label: "Prec. filtranti", unit: "%" },
    { k: "long_balls", label: "Lanci lunghi" },
    { k: "long_ball_accuracy", label: "Prec. lanci", unit: "%" },
    { k: "crosses", label: "Cross" },
    { k: "crosses_completed", label: "Cross riusciti" },
    { k: "cross_accuracy", label: "Prec. cross", unit: "%" },
    { k: "forward_passes", label: "Pass. in avanti" },
    { k: "back_passes", label: "Pass. indietro" },
    { k: "passes_into_final_third", label: "Pass. in ultimo terzo" },
    { k: "passes_into_box", label: "Pass. in area" },
    { k: "smart_passes", label: "Smart passes" },
    { k: "smart_passes_completed", label: "Smart pass riusciti" },
    { k: "progressive_passes", label: "Pass. progressivi" },
  ]},
  { key: "poss", label: "Possesso & Dribbling", fields: [
    { k: "touches", label: "Tocchi" },
    { k: "touches_in_box", label: "Tocchi in area" },
    { k: "dribbles", label: "Dribbling tentati" },
    { k: "dribbles_completed", label: "Dribbling riusciti" },
    { k: "dribble_success", label: "Successo dribbling", unit: "%" },
    { k: "progressive_carries", label: "Conduzioni progr." },
    { k: "carries_into_final_third", label: "Cond. ultimo terzo" },
    { k: "carries_into_box", label: "Cond. in area" },
    { k: "lost_balls", label: "Palle perse" },
    { k: "recoveries", label: "Palle recuperate" },
    { k: "successful_attacking_actions", label: "Azioni off. riuscite" },
    { k: "successful_defensive_actions", label: "Azioni dif. riuscite" },
  ]},
  { key: "def", label: "Difensive", fields: [
    { k: "tackles", label: "Contrasti" },
    { k: "tackles_per_90", label: "Contrasti/90" },
    { k: "tackles_won", label: "Contrasti vinti" },
    { k: "tackle_success", label: "% contrasti", unit: "%" },
    { k: "interceptions", label: "Intercetti" },
    { k: "interceptions_per_90", label: "Intercetti/90" },
    { k: "blocks", label: "Blocchi" },
    { k: "clearances", label: "Spazzate" },
    { k: "duels_won", label: "Duelli vinti" },
    { k: "duels_total", label: "Duelli totali" },
    { k: "duel_success", label: "% duelli", unit: "%" },
    { k: "aerial_duels_won", label: "Aerei vinti" },
    { k: "aerial_duels_total", label: "Aerei totali" },
    { k: "aerial_duel_success", label: "% aerei", unit: "%" },
    { k: "ground_duels_won", label: "Duelli terra vinti" },
    { k: "ground_duels_total", label: "Duelli terra tot." },
    { k: "ground_duel_success", label: "% duelli terra", unit: "%" },
    { k: "fouls_committed", label: "Falli commessi" },
    { k: "fouls_drawn", label: "Falli subiti" },
    { k: "offsides", label: "Fuorigioco" },
    { k: "errors_leading_to_goal", label: "Errori → gol" },
    { k: "errors_leading_to_shot", label: "Errori → tiro" },
  ]},
  { key: "ath", label: "Atletici", fields: [
    { k: "distance_km", label: "Distanza", unit: "km" },
    { k: "distance_per_match_km", label: "Dist./partita", unit: "km" },
    { k: "sprints", label: "Sprint" },
    { k: "sprints_per_match", label: "Sprint/partita" },
    { k: "high_intensity_runs", label: "Corse alta int." },
    { k: "top_speed_kmh", label: "Velocità top", unit: "km/h" },
    { k: "avg_speed_kmh", label: "Velocità media", unit: "km/h" },
  ]},
  { key: "gk", label: "Portiere", fields: [
    { k: "saves", label: "Parate" },
    { k: "saves_per_90", label: "Parate/90" },
    { k: "save_pct", label: "% parate", unit: "%" },
    { k: "clean_sheets", label: "Clean sheets" },
    { k: "goals_conceded", label: "Gol subiti" },
    { k: "goals_conceded_per_90", label: "Gol subiti/90" },
    { k: "psxg", label: "PSxG" },
    { k: "psxg_minus_goals", label: "PSxG - gol" },
    { k: "punches", label: "Respinte di pugno" },
    { k: "high_claims", label: "Uscite alte" },
    { k: "sweeper_actions", label: "Azioni da sweeper" },
    { k: "goal_kicks", label: "Rinvii dal fondo" },
    { k: "goal_kick_accuracy", label: "Prec. rinvii", unit: "%" },
  ]},
];

/** Stats della SINGOLA partita (chiavi prefissate `m_`). */
export const STATS_MATCH_GROUPS: { key: string; label: string; fields: { k: keyof PlayerStats; label: string; unit?: string }[] }[] = [
  { key: "m_apps", label: "Match · Generali", fields: [
    { k: "m_minutes", label: "Minuti" },
    { k: "m_rating", label: "Voto" },
    { k: "m_yellow_cards", label: "Gialli" },
    { k: "m_red_cards", label: "Rossi" },
  ]},
  { key: "m_off", label: "Match · Offensive", fields: [
    { k: "m_goals", label: "Gol" },
    { k: "m_assists", label: "Assist" },
    { k: "m_shots", label: "Tiri" },
    { k: "m_shots_on_target", label: "Tiri in porta" },
    { k: "m_shots_blocked", label: "Tiri bloccati" },
    { k: "m_shots_off_target", label: "Tiri fuori" },
    { k: "m_xg", label: "xG" },
    { k: "m_xa", label: "xA" },
    { k: "m_npxg", label: "npxG" },
    { k: "m_big_chances_created", label: "Grandi occ. create" },
    { k: "m_big_chances_missed", label: "Grandi occ. fallite" },
  ]},
  { key: "m_pass", label: "Match · Passaggi & Dribbling", fields: [
    { k: "m_passes", label: "Passaggi" },
    { k: "m_passes_completed", label: "Riusciti" },
    { k: "m_pass_accuracy", label: "Precisione", unit: "%" },
    { k: "m_key_passes", label: "Passaggi chiave" },
    { k: "m_through_balls", label: "Filtranti" },
    { k: "m_long_balls", label: "Lanci lunghi" },
    { k: "m_long_ball_accuracy", label: "Prec. lanci", unit: "%" },
    { k: "m_crosses", label: "Cross" },
    { k: "m_crosses_completed", label: "Cross riusciti" },
    { k: "m_forward_passes", label: "Pass. in avanti" },
    { k: "m_back_passes", label: "Pass. indietro" },
    { k: "m_passes_into_final_third", label: "Pass. ultimo terzo" },
    { k: "m_passes_into_box", label: "Pass. in area" },
    { k: "m_dribbles", label: "Dribbling tentati" },
    { k: "m_dribbles_completed", label: "Dribbling riusciti" },
    { k: "m_dribble_success", label: "% dribbling", unit: "%" },
    { k: "m_progressive_carries", label: "Cond. progressive" },
    { k: "m_progressive_passes", label: "Pass. progressivi" },
    { k: "m_touches", label: "Tocchi" },
    { k: "m_touches_in_box", label: "Tocchi in area" },
    { k: "m_lost_balls", label: "Palle perse" },
    { k: "m_recoveries", label: "Palle recuperate" },
  ]},
  { key: "m_def", label: "Match · Difensive", fields: [
    { k: "m_tackles", label: "Contrasti" },
    { k: "m_tackles_won", label: "Contrasti vinti" },
    { k: "m_interceptions", label: "Intercetti" },
    { k: "m_blocks", label: "Blocchi" },
    { k: "m_clearances", label: "Spazzate" },
    { k: "m_duels_total", label: "Duelli totali" },
    { k: "m_duels_won", label: "Duelli vinti" },
    { k: "m_aerial_duels_total", label: "Aerei totali" },
    { k: "m_aerial_duels_won", label: "Aerei vinti" },
    { k: "m_ground_duels_total", label: "Duelli terra tot." },
    { k: "m_ground_duels_won", label: "Duelli terra vinti" },
    { k: "m_fouls_committed", label: "Falli commessi" },
    { k: "m_fouls_drawn", label: "Falli subiti" },
    { k: "m_offsides", label: "Fuorigioco" },
  ]},
  { key: "m_ath", label: "Match · Atletici", fields: [
    { k: "m_distance_km", label: "Distanza", unit: "km" },
    { k: "m_sprints", label: "Sprint" },
    { k: "m_high_intensity_runs", label: "Corse alta int." },
    { k: "m_top_speed_kmh", label: "Velocità top", unit: "km/h" },
    { k: "m_avg_speed_kmh", label: "Velocità media", unit: "km/h" },
  ]},
  { key: "m_gk", label: "Match · Portiere", fields: [
    { k: "m_saves", label: "Parate" },
    { k: "m_saves_inside_box", label: "Parate in area" },
    { k: "m_saves_outside_box", label: "Parate fuori area" },
    { k: "m_goals_conceded", label: "Gol subiti" },
    { k: "m_clean_sheet", label: "Clean sheet (1/0)" },
    { k: "m_punches", label: "Respinte di pugno" },
    { k: "m_high_claims", label: "Uscite alte" },
    { k: "m_sweeper_actions", label: "Azioni da sweeper" },
  ]},
];

export interface Player {
  id: string;
  owner_id?: string;
  num: string;
  name: string;
  photo: string;
  age: number;
  birth_year: number;
  nationality: string;
  flag: string;
  club: string;
  league: string;
  region: string;
  lat: number;
  lng: number;
  position_main: string;
  position_code: PositionCode;
  position_secondary: string[];
  foot: "Destro" | "Sinistro" | "Entrambi" | string;
  height: number;
  weight: number;
  tactical_roles: TacticalRole[];
  ratings: {
    technical: number;
    tactical: number;
    physical: number;
    mental: number;
    overall: number;
  };
  skills: {
    ball_control: number;
    passing: number;
    dribbling: number;
    finishing: number;
    defensive_work: number;
    tactical_iq: number;
    decision_making: number;
    aerial: number;
    pace: number;
    stamina: number;
  };
  stars: {
    technique: number;
    athleticism: number;
    mentality: number;
    potential: number;
    market_value: number;
  };
  market: {
    value_min: number;
    value_max: number;
    potential: "Alto" | "Medio-Alto" | "Medio" | "Basso" | string;
    risk: "Basso" | "Medio" | "Alto" | string;
    timeline: string;
    ready_level: string;
  };
  tags: string[];
  verdict_type: VerdictType;
  verdict: string;
  observation_type: string;
  observation_count: number;
  date: string;
  strengths: string[];
  weaknesses: string[];
  summary: string;
  /** @deprecated use videos[] - kept for backward compat */
  video_url?: string;
  videos?: PlayerVideo[];
  raw_report?: string;
  stats?: PlayerStats;
  stats_source?: string;
  stats_season?: string;
  observations?: Observation[];
  heatmap?: Heatmap;
  formations_played?: string[];
}

export const POSITION_CODES: PositionCode[] = [
  "GK","CB","LB","RB","CDM","CM","CAM","LW","RW","ST","CF",
];

export const POSITION_LABEL: Record<PositionCode,string> = {
  GK:"Portiere", CB:"Difensore Centrale", LB:"Terzino Sinistro", RB:"Terzino Destro",
  CDM:"Mediano", CM:"Mezzala", CAM:"Trequartista",
  LW:"Ala Sinistra", RW:"Ala Destra", ST:"Prima Punta", CF:"Seconda Punta",
};

export const POSITION_FROM_LABEL: Record<string, PositionCode> = Object.fromEntries(
  Object.entries(POSITION_LABEL).map(([k,v]) => [v, k as PositionCode])
) as Record<string, PositionCode>;

export const PITCH_COORDS: Record<PositionCode,{x:number;y:number}> = {
  GK:  { x: 50,  y: 150 },
  CB:  { x: 100, y: 150 },
  LB:  { x: 100, y: 80  },
  RB:  { x: 100, y: 220 },
  CDM: { x: 160, y: 150 },
  CM:  { x: 200, y: 150 },
  CAM: { x: 240, y: 150 },
  LW:  { x: 280, y: 60  },
  RW:  { x: 280, y: 240 },
  ST:  { x: 320, y: 150 },
  CF:  { x: 300, y: 150 },
};

/**
 * FM-style tactical roles with duty (Defend / Support / Attack).
 * Each entry: { code, label, duties[] }
 * Code is stable; UI shows "label · duty".
 */
export interface RoleDef {
  code: string;
  label: string;
  duties: RoleDuty[];
}

export const ROLE_OPTIONS_BY_POSITION: Record<PositionCode, RoleDef[]> = {
  GK: [
    { code: "GK_TRAD",      label: "Portiere Tradizionale", duties: ["Defend"] },
    { code: "GK_SWEEPER",   label: "Portiere Sweeper",      duties: ["Defend", "Support", "Attack"] },
    { code: "GK_SHOT_STOP", label: "Shot Stopper",          duties: ["Defend"] },
  ],
  CB: [
    { code: "CB_BALL_PLAYING", label: "Difensore Palla al Piede", duties: ["Defend", "Support"] },
    { code: "CB_STOPPER",      label: "Stopper",                  duties: ["Defend"] },
    { code: "CB_LIBERO",       label: "Libero",                   duties: ["Support", "Attack"] },
    { code: "CB_NO_NONSENSE",  label: "Difensore di Contenimento", duties: ["Defend"] },
    { code: "CB_WIDE",         label: "Difensore Largo (3 dietro)", duties: ["Defend", "Support"] },
  ],
  LB: [
    { code: "LB_FULL_BACK",   label: "Terzino Classico",       duties: ["Defend", "Support", "Attack"] },
    { code: "LB_WING_BACK",   label: "Wing Back",              duties: ["Defend", "Support", "Attack"] },
    { code: "LB_INVERTED",    label: "Terzino Invertito",      duties: ["Defend", "Support"] },
    { code: "LB_CONTAINMENT", label: "Terzino di Contenimento", duties: ["Defend"] },
    { code: "LB_OVERLAP",     label: "Terzino di Spinta",      duties: ["Support", "Attack"] },
    { code: "LB_COMPLETE",    label: "Terzino Completo",       duties: ["Support", "Attack"] },
  ],
  RB: [
    { code: "RB_FULL_BACK",   label: "Terzino Classico",       duties: ["Defend", "Support", "Attack"] },
    { code: "RB_WING_BACK",   label: "Wing Back",              duties: ["Defend", "Support", "Attack"] },
    { code: "RB_INVERTED",    label: "Terzino Invertito",      duties: ["Defend", "Support"] },
    { code: "RB_CONTAINMENT", label: "Terzino di Contenimento", duties: ["Defend"] },
    { code: "RB_OVERLAP",     label: "Terzino di Spinta",      duties: ["Support", "Attack"] },
    { code: "RB_COMPLETE",    label: "Terzino Completo",       duties: ["Support", "Attack"] },
  ],
  CDM: [
    { code: "CDM_ANCHOR",     label: "Ancoraggio",         duties: ["Defend"] },
    { code: "CDM_HALF_BACK",  label: "Half Back",          duties: ["Defend"] },
    { code: "CDM_DLP",        label: "Regista Arretrato",  duties: ["Defend", "Support"] },
    { code: "CDM_BALL_WIN",   label: "Ball Winning Mid",   duties: ["Defend", "Support"] },
    { code: "CDM_DM",         label: "Mediano Schermo",    duties: ["Defend", "Support"] },
    { code: "CDM_SEGUNDO",    label: "Segundo Volante",    duties: ["Support", "Attack"] },
  ],
  CM: [
    { code: "CM_REGISTA",     label: "Regista",                 duties: ["Support"] },
    { code: "CM_DLP",         label: "Regista Arretrato",       duties: ["Defend", "Support"] },
    { code: "CM_AP",          label: "Rifinitore Avanzato",     duties: ["Support", "Attack"] },
    { code: "CM_BBM",         label: "Box-to-Box",              duties: ["Support"] },
    { code: "CM_MEZZALA",     label: "Mezzala",                 duties: ["Support", "Attack"] },
    { code: "CM_CARRILERO",   label: "Carrilero",               duties: ["Support"] },
    { code: "CM_ROAMING",     label: "Roaming Playmaker",       duties: ["Support"] },
    { code: "CM_CENTRAL",     label: "Centrocampista Centrale", duties: ["Defend", "Support", "Attack"] },
  ],
  CAM: [
    { code: "CAM_TREQ",       label: "Trequartista",            duties: ["Support", "Attack"] },
    { code: "CAM_AP",         label: "Rifinitore Avanzato",     duties: ["Support", "Attack"] },
    { code: "CAM_SHADOW",     label: "Shadow Striker",          duties: ["Attack"] },
    { code: "CAM_ENGANCHE",   label: "Enganche",                duties: ["Support"] },
    { code: "CAM_AM",         label: "Centrocampista Offensivo", duties: ["Support", "Attack"] },
  ],
  LW: [
    { code: "LW_WINGER",      label: "Ala Pura",                duties: ["Support", "Attack"] },
    { code: "LW_INVERTED",    label: "Ala Accentrante",         duties: ["Support", "Attack"] },
    { code: "LW_DEFENSIVE",   label: "Ala Difensiva",           duties: ["Defend", "Support"] },
    { code: "LW_IF",          label: "Inside Forward",          duties: ["Support", "Attack"] },
    { code: "LW_RAUMDEUTER",  label: "Raumdeuter",              duties: ["Attack"] },
    { code: "LW_TARGET_WIDE", label: "Esterno di Sfondamento",  duties: ["Attack"] },
  ],
  RW: [
    { code: "RW_WINGER",      label: "Ala Pura",                duties: ["Support", "Attack"] },
    { code: "RW_INVERTED",    label: "Ala Accentrante",         duties: ["Support", "Attack"] },
    { code: "RW_DEFENSIVE",   label: "Ala Difensiva",           duties: ["Defend", "Support"] },
    { code: "RW_IF",          label: "Inside Forward",          duties: ["Support", "Attack"] },
    { code: "RW_RAUMDEUTER",  label: "Raumdeuter",              duties: ["Attack"] },
    { code: "RW_TARGET_WIDE", label: "Esterno di Sfondamento",  duties: ["Attack"] },
  ],
  ST: [
    { code: "ST_TARGET",      label: "Centravanti Target",      duties: ["Attack", "Support"] },
    { code: "ST_PRESSING",    label: "Punta di Pressione",      duties: ["Defend", "Attack"] },
    { code: "ST_POACHER",     label: "Poacher",                 duties: ["Attack"] },
    { code: "ST_DLF",         label: "Punta Arretrata",         duties: ["Support", "Attack"] },
    { code: "ST_COMPLETE",    label: "Centravanti Completo",    duties: ["Support", "Attack"] },
    { code: "ST_ADVANCED",    label: "Punta Avanzata",          duties: ["Attack"] },
  ],
  CF: [
    { code: "CF_FALSE_9",     label: "Falso Nueve",             duties: ["Support"] },
    { code: "CF_SECONDA",     label: "Seconda Punta",           duties: ["Support", "Attack"] },
    { code: "CF_DLF",         label: "Punta Arretrata",         duties: ["Support", "Attack"] },
    { code: "CF_TREQ_PUNTA",  label: "Trequartista-Punta",      duties: ["Support"] },
  ],
};

export const ALL_TAGS = [
  "HIGH POTENTIAL","LOW COST","READY","MONITOR","RISKY","TOP PROSPECT",
] as const;

export const FORMATIONS = [
  "4-3-3", "4-2-3-1", "4-4-2", "4-3-1-2", "4-1-4-1", "4-5-1",
  "3-5-2", "3-4-3", "3-4-1-2", "5-3-2", "5-4-1",
];

export const REGIONS = [
  "Puglia","Campania","Basilicata","Calabria","Sicilia","Sardegna","Lazio",
  "Lombardia","Veneto","Toscana","Emilia-Romagna","Piemonte","Liguria","Marche","Abruzzo","Umbria","Molise","Friuli-Venezia Giulia","Trentino-Alto Adige","Valle d'Aosta",
];
