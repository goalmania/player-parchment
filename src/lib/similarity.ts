import type { Player } from "./types";

/**
 * Compute Tactical DNA similarity between two players (0-100).
 * Combines: position match, tactical role overlap, skill vector cosine, ratings vector cosine.
 */
function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function skillsVec(p: Player): number[] {
  const s = p.skills;
  return [
    s.ball_control, s.passing, s.dribbling, s.finishing,
    s.defensive_work, s.tactical_iq, s.decision_making,
    s.aerial, s.pace, s.stamina,
  ];
}
function ratingsVec(p: Player): number[] {
  const r = p.ratings;
  return [r.technical, r.tactical, r.physical, r.mental];
}

export function similarity(a: Player, b: Player): number {
  if (a.id === b.id) return 100;
  const posMatch = a.position_code === b.position_code ? 1 : 0;
  const aRoles = new Set(a.tactical_roles.map((r) => r.role_code));
  const bRoles = new Set(b.tactical_roles.map((r) => r.role_code));
  const inter = Array.from(aRoles).filter((r) => bRoles.has(r)).length;
  const union = new Set([...aRoles, ...bRoles]).size || 1;
  const roleJacc = inter / union;

  const skillCos = cosine(skillsVec(a), skillsVec(b));
  const ratCos = cosine(ratingsVec(a), ratingsVec(b));

  // Weighted blend
  const score = posMatch * 25 + roleJacc * 25 + skillCos * 30 + ratCos * 20;
  return Math.round(Math.max(0, Math.min(100, score)));
}

export function findSimilar(target: Player, pool: Player[], limit = 5) {
  return pool
    .filter((p) => p.id !== target.id)
    .map((p) => ({ player: p, score: similarity(target, p) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, limit);
}
