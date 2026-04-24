export type PositionCode =
  | "GK" | "CB" | "LB" | "RB" | "CDM" | "CM" | "CAM"
  | "LW" | "RW" | "ST" | "CF";

export type VerdictType = "buy" | "monitor" | "pass";

export type RoleCode =
  | "GK_SWEEPER" | "GK_SHOT_STOPPER"
  | "CB_BALL_PLAYING" | "CB_STOPPER" | "CB_LIBERO"
  | "RB_WING_BACK" | "RB_INVERTED" | "RB_CLASSIC"
  | "LB_WING_BACK" | "LB_INVERTED" | "LB_CLASSIC"
  | "CDM_SCREEN" | "CDM_BOX_TO_BOX"
  | "CM_REGISTA" | "CM_BOX" | "CM_MEZZALA_OFF" | "CM_MEZZALA_DEF"
  | "CAM_TREQUARTISTA" | "CAM_SHADOW"
  | "LW_WINGER" | "LW_INVERTED" | "RW_WINGER" | "RW_INVERTED"
  | "ST_TARGET" | "ST_PRESSING" | "CF_FALSE_9" | "CF_SECONDA_PUNTA";

export interface TacticalRole {
  formation: string;
  role: string;
  role_code: RoleCode | string;
  fit_score: number;
}

export interface Observation {
  date: string;
  overall: number;
  ratings: { technical: number; tactical: number; physical: number; mental: number };
  note: string;
  type: string;
}

/**
 * Heatmap is a 6 rows × 10 columns grid (rows = vertical pitch zones, cols = horizontal).
 * Values 0-100 representing presence/intensity in that zone.
 * Stored as a flat number[60] (row-major) to keep JSON small.
 */
export type Heatmap = number[];
export const HEATMAP_ROWS = 6;
export const HEATMAP_COLS = 10;
export const HEATMAP_SIZE = HEATMAP_ROWS * HEATMAP_COLS;
export const emptyHeatmap = (): Heatmap => new Array(HEATMAP_SIZE).fill(0);

export interface Player {
  id: string;
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
  video_url?: string;
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

// Pitch coordinates (viewBox 400x300)
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

export const ROLE_OPTIONS_BY_POSITION: Record<PositionCode, {code:string;label:string}[]> = {
  GK: [
    { code:"GK_SWEEPER", label:"Portiere Sweeper" },
    { code:"GK_SHOT_STOPPER", label:"Portiere Shot Stopper" },
  ],
  CB: [
    { code:"CB_BALL_PLAYING", label:"Difensore Palla al Piede" },
    { code:"CB_STOPPER", label:"Stopper" },
    { code:"CB_LIBERO", label:"Libero" },
  ],
  LB: [
    { code:"LB_WING_BACK", label:"Wing Back" },
    { code:"LB_INVERTED", label:"Terzino Invertito" },
    { code:"LB_CLASSIC", label:"Terzino Classico" },
  ],
  RB: [
    { code:"RB_WING_BACK", label:"Wing Back" },
    { code:"RB_INVERTED", label:"Terzino Invertito" },
    { code:"RB_CLASSIC", label:"Terzino Classico" },
  ],
  CDM: [
    { code:"CDM_SCREEN", label:"Mediano Schermo" },
    { code:"CDM_BOX_TO_BOX", label:"Mediano Box-to-Box" },
  ],
  CM: [
    { code:"CM_REGISTA", label:"Regista" },
    { code:"CM_MEZZALA_OFF", label:"Mezzala Offensiva" },
    { code:"CM_MEZZALA_DEF", label:"Mezzala Difensiva" },
    { code:"CM_BOX", label:"Box-to-Box" },
  ],
  CAM: [
    { code:"CAM_TREQUARTISTA", label:"Trequartista" },
    { code:"CAM_SHADOW", label:"Shadow Striker" },
  ],
  LW: [
    { code:"LW_WINGER", label:"Ala Pura" },
    { code:"LW_INVERTED", label:"Ala Accentrante" },
  ],
  RW: [
    { code:"RW_WINGER", label:"Ala Pura" },
    { code:"RW_INVERTED", label:"Ala Accentrante" },
  ],
  ST: [
    { code:"ST_PRESSING", label:"Prima Punta di Pressione" },
    { code:"ST_TARGET", label:"Centravanti Target" },
  ],
  CF: [
    { code:"CF_FALSE_9", label:"Falso Nueve" },
    { code:"CF_SECONDA_PUNTA", label:"Seconda Punta" },
  ],
};

export const ALL_TAGS = [
  "HIGH POTENTIAL","LOW COST","READY","MONITOR","RISKY","TOP PROSPECT",
] as const;

export const FORMATIONS = ["4-3-3","4-2-3-1","4-4-2","3-5-2","3-4-3","5-3-2","4-1-4-1"];

export const REGIONS = [
  "Puglia","Campania","Basilicata","Calabria","Sicilia","Sardegna","Lazio",
  "Lombardia","Veneto","Toscana","Emilia-Romagna","Piemonte","Liguria","Marche","Abruzzo","Umbria","Molise","Friuli-Venezia Giulia","Trentino-Alto Adige","Valle d'Aosta",
];
