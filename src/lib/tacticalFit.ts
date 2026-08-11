import type { Player, PositionCode } from "./types";

type SkillKey =
  | "ball_control" | "passing" | "dribbling" | "finishing"
  | "defensive_work" | "tactical_iq" | "decision_making"
  | "aerial" | "pace" | "stamina"
  | "crossing" | "heading" | "marking" | "vision" | "work_rate";

type RatingKey = "technical" | "tactical" | "physical" | "mental";

interface RoleProfile {
  skills?: Partial<Record<SkillKey, number>>;
  ratings?: Partial<Record<RatingKey, number>>;
}

// Weights per ogni ruolo tattico. Devono sommare a 1.0 tra skills + ratings.
const ROLE_PROFILES: Record<string, RoleProfile> = {
  // ── PORTIERI ───────────────────────────────────────────────────────────────
  GK_TRAD:      { ratings: { technical: 0.40, physical: 0.30, mental: 0.20, tactical: 0.10 } },
  GK_SWEEPER:   { ratings: { technical: 0.30, tactical: 0.30, physical: 0.20, mental: 0.20 } },
  GK_SHOT_STOP: { ratings: { physical: 0.45, technical: 0.35, mental: 0.20 } },

  // ── DIFENSORI CENTRALI ─────────────────────────────────────────────────────
  CB_BALL_PLAYING: { skills: { ball_control: 0.25, passing: 0.25, defensive_work: 0.20, aerial: 0.15, decision_making: 0.15 } },
  CB_STOPPER:      { skills: { defensive_work: 0.22, aerial: 0.19, pace: 0.15, stamina: 0.11, tactical_iq: 0.08, heading: 0.12, marking: 0.13 } },
  CB_LIBERO:       { skills: { ball_control: 0.25, passing: 0.20, defensive_work: 0.20, tactical_iq: 0.20, pace: 0.15 } },
  CB_NO_NONSENSE:  { skills: { defensive_work: 0.26, aerial: 0.19, stamina: 0.15, pace: 0.08, tactical_iq: 0.07, heading: 0.12, marking: 0.13 } },
  CB_WIDE:         { skills: { defensive_work: 0.21, pace: 0.21, stamina: 0.17, aerial: 0.13, ball_control: 0.13, marking: 0.15 } },

  // ── TERZINI SINISTRI ───────────────────────────────────────────────────────
  LB_FULL_BACK:   { skills: { stamina: 0.20, pace: 0.20, defensive_work: 0.20, passing: 0.20, tactical_iq: 0.20 } },
  LB_WING_BACK:   { skills: { stamina: 0.20, pace: 0.20, dribbling: 0.12, passing: 0.12, defensive_work: 0.12, ball_control: 0.04, crossing: 0.20 } },
  LB_INVERTED:    { skills: { dribbling: 0.25, ball_control: 0.20, passing: 0.20, defensive_work: 0.20, pace: 0.15 } },
  LB_CONTAINMENT: { skills: { defensive_work: 0.40, stamina: 0.25, pace: 0.15, aerial: 0.10, tactical_iq: 0.10 } },
  LB_OVERLAP:     { skills: { pace: 0.24, stamina: 0.20, dribbling: 0.16, passing: 0.12, defensive_work: 0.08, crossing: 0.20 } },
  LB_COMPLETE:    { skills: { pace: 0.17, stamina: 0.17, dribbling: 0.12, passing: 0.13, defensive_work: 0.13, ball_control: 0.13, crossing: 0.15 } },

  // ── TERZINI DESTRI ─────────────────────────────────────────────────────────
  RB_FULL_BACK:   { skills: { stamina: 0.20, pace: 0.20, defensive_work: 0.20, passing: 0.20, tactical_iq: 0.20 } },
  RB_WING_BACK:   { skills: { stamina: 0.20, pace: 0.20, dribbling: 0.12, passing: 0.12, defensive_work: 0.12, ball_control: 0.04, crossing: 0.20 } },
  RB_INVERTED:    { skills: { dribbling: 0.25, ball_control: 0.20, passing: 0.20, defensive_work: 0.20, pace: 0.15 } },
  RB_CONTAINMENT: { skills: { defensive_work: 0.40, stamina: 0.25, pace: 0.15, aerial: 0.10, tactical_iq: 0.10 } },
  RB_OVERLAP:     { skills: { pace: 0.24, stamina: 0.20, dribbling: 0.16, passing: 0.12, defensive_work: 0.08, crossing: 0.20 } },
  RB_COMPLETE:    { skills: { pace: 0.17, stamina: 0.17, dribbling: 0.12, passing: 0.13, defensive_work: 0.13, ball_control: 0.13, crossing: 0.15 } },

  // ── MEDIANI (CDM) ──────────────────────────────────────────────────────────
  CDM_ANCHOR:   { skills: { defensive_work: 0.30, aerial: 0.17, stamina: 0.17, tactical_iq: 0.13, pace: 0.08, marking: 0.15 } },
  CDM_HALF_BACK:{ skills: { defensive_work: 0.30, tactical_iq: 0.25, passing: 0.15, stamina: 0.15, aerial: 0.15 } },
  CDM_DLP:      { skills: { passing: 0.26, ball_control: 0.21, tactical_iq: 0.21, decision_making: 0.17, vision: 0.15 } },
  CDM_BALL_WIN: { skills: { defensive_work: 0.26, stamina: 0.19, pace: 0.15, tactical_iq: 0.07, aerial: 0.08, marking: 0.13, work_rate: 0.12 } },
  CDM_DM:       { skills: { defensive_work: 0.30, stamina: 0.20, tactical_iq: 0.20, passing: 0.15, aerial: 0.15 } },
  CDM_SEGUNDO:  { skills: { stamina: 0.20, pace: 0.20, ball_control: 0.15, passing: 0.15, finishing: 0.15, defensive_work: 0.15 } },

  // ── CENTROCAMPISTI (CM) ────────────────────────────────────────────────────
  CM_REGISTA:   { skills: { passing: 0.24, tactical_iq: 0.20, ball_control: 0.20, decision_making: 0.16, vision: 0.20 } },
  CM_DLP:       { skills: { passing: 0.26, ball_control: 0.21, tactical_iq: 0.21, defensive_work: 0.17, vision: 0.15 } },
  CM_AP:        { skills: { passing: 0.25, dribbling: 0.20, ball_control: 0.20, decision_making: 0.20, tactical_iq: 0.15 } },
  CM_BBM:       { skills: { stamina: 0.21, defensive_work: 0.17, passing: 0.17, ball_control: 0.13, pace: 0.09, finishing: 0.08, work_rate: 0.15 } },
  CM_MEZZALA:   { skills: { stamina: 0.20, dribbling: 0.20, passing: 0.20, ball_control: 0.15, pace: 0.15, finishing: 0.10 } },
  CM_CARRILERO: { skills: { defensive_work: 0.25, stamina: 0.25, passing: 0.20, tactical_iq: 0.20, pace: 0.10 } },
  CM_ROAMING:   { skills: { tactical_iq: 0.21, passing: 0.21, ball_control: 0.17, decision_making: 0.17, dribbling: 0.09, work_rate: 0.15 } },
  CM_CENTRAL:   { skills: { passing: 0.20, defensive_work: 0.20, stamina: 0.20, tactical_iq: 0.20, ball_control: 0.20 } },

  // ── TREQUARTISTI (CAM) ─────────────────────────────────────────────────────
  CAM_TREQ:    { skills: { dribbling: 0.25, ball_control: 0.25, passing: 0.20, decision_making: 0.20, tactical_iq: 0.10 } },
  CAM_AP:      { skills: { passing: 0.21, ball_control: 0.17, dribbling: 0.17, decision_making: 0.17, tactical_iq: 0.13, vision: 0.15 } },
  CAM_SHADOW:  { skills: { finishing: 0.30, pace: 0.25, dribbling: 0.20, decision_making: 0.15, tactical_iq: 0.10 } },
  CAM_ENGANCHE:{ skills: { passing: 0.30, ball_control: 0.25, tactical_iq: 0.21, decision_making: 0.09, vision: 0.15 } },
  CAM_AM:      { skills: { passing: 0.20, ball_control: 0.20, dribbling: 0.15, tactical_iq: 0.20, finishing: 0.15, decision_making: 0.10 } },

  // ── ALI SINISTRA (LW) ──────────────────────────────────────────────────────
  LW_WINGER:      { skills: { pace: 0.21, dribbling: 0.21, ball_control: 0.17, stamina: 0.13, passing: 0.13, crossing: 0.15 } },
  LW_INVERTED:    { skills: { dribbling: 0.25, ball_control: 0.25, finishing: 0.20, pace: 0.15, passing: 0.15 } },
  LW_DEFENSIVE:   { skills: { defensive_work: 0.26, stamina: 0.21, pace: 0.17, dribbling: 0.13, passing: 0.08, work_rate: 0.15 } },
  LW_IF:          { skills: { finishing: 0.25, dribbling: 0.25, pace: 0.20, ball_control: 0.20, decision_making: 0.10 } },
  LW_RAUMDEUTER:  { skills: { decision_making: 0.30, finishing: 0.30, pace: 0.20, tactical_iq: 0.20 } },
  LW_TARGET_WIDE: { skills: { pace: 0.30, stamina: 0.25, dribbling: 0.20, ball_control: 0.15, passing: 0.10 } },

  // ── ALI DESTRA (RW) ────────────────────────────────────────────────────────
  RW_WINGER:      { skills: { pace: 0.21, dribbling: 0.21, ball_control: 0.17, stamina: 0.13, passing: 0.13, crossing: 0.15 } },
  RW_INVERTED:    { skills: { dribbling: 0.25, ball_control: 0.25, finishing: 0.20, pace: 0.15, passing: 0.15 } },
  RW_DEFENSIVE:   { skills: { defensive_work: 0.26, stamina: 0.21, pace: 0.17, dribbling: 0.13, passing: 0.08, work_rate: 0.15 } },
  RW_IF:          { skills: { finishing: 0.25, dribbling: 0.25, pace: 0.20, ball_control: 0.20, decision_making: 0.10 } },
  RW_RAUMDEUTER:  { skills: { decision_making: 0.30, finishing: 0.30, pace: 0.20, tactical_iq: 0.20 } },
  RW_TARGET_WIDE: { skills: { pace: 0.30, stamina: 0.25, dribbling: 0.20, ball_control: 0.15, passing: 0.10 } },

  // ── PRIMA PUNTA (ST) ───────────────────────────────────────────────────────
  ST_TARGET:   { skills: { aerial: 0.24, finishing: 0.20, ball_control: 0.12, stamina: 0.12, tactical_iq: 0.08, pace: 0.04, heading: 0.20 } },
  ST_PRESSING: { skills: { pace: 0.30, stamina: 0.25, defensive_work: 0.20, finishing: 0.15, tactical_iq: 0.10 } },
  ST_POACHER:  { skills: { finishing: 0.30, decision_making: 0.21, pace: 0.17, aerial: 0.13, ball_control: 0.04, heading: 0.15 } },
  ST_DLF:      { skills: { passing: 0.25, ball_control: 0.25, tactical_iq: 0.25, dribbling: 0.15, finishing: 0.10 } },
  ST_COMPLETE: { skills: { finishing: 0.20, pace: 0.15, aerial: 0.15, ball_control: 0.15, passing: 0.15, stamina: 0.10, tactical_iq: 0.10 } },
  ST_ADVANCED: { skills: { pace: 0.30, finishing: 0.30, dribbling: 0.20, ball_control: 0.10, decision_making: 0.10 } },

  // ── SECONDA PUNTA / CF ─────────────────────────────────────────────────────
  CF_FALSE_9:    { skills: { dribbling: 0.25, passing: 0.25, ball_control: 0.25, tactical_iq: 0.15, decision_making: 0.10 } },
  CF_SECONDA:    { skills: { dribbling: 0.20, finishing: 0.20, ball_control: 0.20, passing: 0.15, pace: 0.15, tactical_iq: 0.10 } },
  CF_DLF:        { skills: { passing: 0.30, ball_control: 0.30, tactical_iq: 0.20, dribbling: 0.20 } },
  CF_TREQ_PUNTA: { skills: { passing: 0.25, dribbling: 0.25, ball_control: 0.25, decision_making: 0.15, tactical_iq: 0.10 } },
};

// Le skill per il profilo "generico" di posizione (usato quando non è selezionato nessun ruolo specifico)
const POSITION_GENERIC_PROFILE: Partial<Record<PositionCode, RoleProfile>> = {
  GK:  { ratings: { technical: 0.40, physical: 0.35, mental: 0.25 } },
  CB:  { skills: { defensive_work: 0.30, aerial: 0.25, tactical_iq: 0.20, pace: 0.15, stamina: 0.10 } },
  LB:  { skills: { pace: 0.25, stamina: 0.25, defensive_work: 0.20, passing: 0.15, dribbling: 0.15 } },
  RB:  { skills: { pace: 0.25, stamina: 0.25, defensive_work: 0.20, passing: 0.15, dribbling: 0.15 } },
  CDM: { skills: { defensive_work: 0.30, passing: 0.20, tactical_iq: 0.20, stamina: 0.20, aerial: 0.10 } },
  CM:  { skills: { passing: 0.25, stamina: 0.20, ball_control: 0.20, tactical_iq: 0.20, dribbling: 0.15 } },
  CAM: { skills: { dribbling: 0.25, passing: 0.25, ball_control: 0.25, decision_making: 0.15, finishing: 0.10 } },
  LW:  { skills: { pace: 0.25, dribbling: 0.25, ball_control: 0.20, finishing: 0.15, stamina: 0.15 } },
  RW:  { skills: { pace: 0.25, dribbling: 0.25, ball_control: 0.20, finishing: 0.15, stamina: 0.15 } },
  ST:  { skills: { finishing: 0.30, pace: 0.20, aerial: 0.20, ball_control: 0.15, stamina: 0.15 } },
  CF:  { skills: { finishing: 0.25, dribbling: 0.20, ball_control: 0.20, passing: 0.20, pace: 0.15 } },
};

const positionFamily: Record<PositionCode, PositionCode[]> = {
  GK:  ["GK"],
  CB:  ["CB"],
  LB:  ["LB", "CB"],
  RB:  ["RB", "CB"],
  CDM: ["CDM", "CM"],
  CM:  ["CM", "CDM", "CAM"],
  CAM: ["CAM", "CM"],
  LW:  ["LW", "CAM", "ST", "CF"],
  RW:  ["RW", "CAM", "ST", "CF"],
  ST:  ["ST", "CF"],
  CF:  ["CF", "ST", "CAM"],
};

function positionMultiplier(player: Player, slotPosition: PositionCode): number {
  if (player.position_code === slotPosition) return 1.0;
  const family = positionFamily[slotPosition] || [slotPosition];
  if (family.includes(player.position_code)) return 0.85;
  // Controlla posizioni secondarie
  const secMatch = player.position_secondary?.some(
    (s) => s === slotPosition || family.includes(s as PositionCode)
  );
  if (secMatch) return 0.80;
  return 0.55;
}

function scoreFromProfile(player: Player, profile: RoleProfile): number {
  let total = 0;
  let weightSum = 0;

  if (profile.skills) {
    for (const [key, weight] of Object.entries(profile.skills) as [SkillKey, number][]) {
      const val = player.skills[key] ?? 50;
      // Skills sono 0-100
      total += (val / 100) * weight;
      weightSum += weight;
    }
  }

  if (profile.ratings) {
    for (const [key, weight] of Object.entries(profile.ratings) as [RatingKey, number][]) {
      const val = player.ratings[key] ?? 5;
      // Ratings sono 0-10
      total += (val / 10) * weight;
      weightSum += weight;
    }
  }

  return weightSum > 0 ? total / weightSum : 0.5;
}

/**
 * Calcola il fit tattico di un giocatore per uno slot/ruolo specifico.
 * Restituisce un valore 0-1.
 *
 * Se è selezionato un ruolo tattico: 30% posizione + 70% skill/rating match.
 * Se nessun ruolo: 40% posizione + 60% profilo generico di posizione.
 */
export function computeTacticalFit(
  player: Player,
  slotPosition: PositionCode,
  roleCode?: string
): number {
  const posMult = positionMultiplier(player, slotPosition);
  const profile = roleCode ? ROLE_PROFILES[roleCode] : POSITION_GENERIC_PROFILE[slotPosition];

  if (!profile) return posMult;

  const skillScore = scoreFromProfile(player, profile);

  if (roleCode) {
    // Con ruolo selezionato: skill dominano
    return posMult * 0.30 + skillScore * 0.70;
  } else {
    // Senza ruolo: posizione pesa di più
    return posMult * 0.40 + skillScore * 0.60;
  }
}

/**
 * Descrizione testuale dei requisiti chiave per un ruolo.
 */
export function getRoleKeyAttributes(roleCode: string): string[] {
  const profile = ROLE_PROFILES[roleCode];
  if (!profile) return [];

  const entries: [string, number][] = [
    ...Object.entries(profile.skills ?? {}),
    ...Object.entries(profile.ratings ?? {}),
  ];

  const labelMap: Record<string, string> = {
    ball_control: "Controllo palla",
    passing: "Passaggio",
    dribbling: "Dribbling",
    finishing: "Finalizzazione",
    defensive_work: "Lavoro difensivo",
    tactical_iq: "QI tattico",
    decision_making: "Decisione",
    aerial: "Gioco aereo",
    pace: "Velocità",
    stamina: "Resistenza",
    crossing: "Cross",
    heading: "Colpo di testa",
    marking: "Marcatura",
    vision: "Visione di gioco",
    work_rate: "Work rate",
    technical: "Tecnica",
    tactical: "Tattica",
    physical: "Fisico",
    mental: "Mentalità",
  };

  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => labelMap[k] ?? k);
}
