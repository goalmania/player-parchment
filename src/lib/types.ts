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
