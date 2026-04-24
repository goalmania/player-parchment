import type { Player, Observation } from "./types";
import { heatmapFromPosition } from "@/components/HeatmapEditor";
import { SEED_PLAYERS } from "./seed";

const STORAGE_KEY = "dmscout_players";
const COMPARE_KEY = "dmscout_compare_id";
const AI_DRAFT_KEY = "dmscout_ai_draft";

const subscribers = new Set<() => void>();

/**
 * Ensure each player has the new optional fields populated with sensible defaults.
 * Runs on every read so old saved data also gets enriched in the UI.
 */
function hydrate(p: Player): Player {
  let next = p;
  if (!next.heatmap || next.heatmap.length === 0) {
    next = { ...next, heatmap: heatmapFromPosition(next.position_code) };
  }
  if (!next.observations || next.observations.length === 0) {
    // Build a 2-point baseline timeline from current ratings + a slightly weaker prior point.
    const cur: Observation = {
      date: next.date,
      overall: next.ratings.overall,
      ratings: {
        technical: next.ratings.technical,
        tactical: next.ratings.tactical,
        physical: next.ratings.physical,
        mental: next.ratings.mental,
      },
      note: "Stato attuale del profilo.",
      type: next.observation_type || "Video + Dal vivo",
    };
    const priorDate = (() => {
      const d = new Date(next.date);
      d.setMonth(d.getMonth() - 2);
      return d.toISOString().slice(0, 10);
    })();
    const drop = (v: number, by = 0.4) => Math.max(0, +(v - by).toFixed(1));
    const prior: Observation = {
      date: priorDate,
      overall: drop(next.ratings.overall, 0.5),
      ratings: {
        technical: drop(next.ratings.technical),
        tactical: drop(next.ratings.tactical, 0.6),
        physical: drop(next.ratings.physical, 0.2),
        mental: drop(next.ratings.mental),
      },
      note: "Prima osservazione di riferimento.",
      type: "Video",
    };
    next = { ...next, observations: [prior, cur] };
  }
  if (!next.formations_played || next.formations_played.length === 0) {
    next = {
      ...next,
      formations_played: Array.from(new Set(next.tactical_roles.map((r) => r.formation))),
    };
  }
  return next;
}

function read(): Player[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = SEED_PLAYERS.map(hydrate);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const list = JSON.parse(raw) as Player[];
    return list.map(hydrate);
  } catch {
    return SEED_PLAYERS.map(hydrate);
  }
}

function write(players: Player[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
  subscribers.forEach((fn) => fn());
}

export function subscribe(fn: () => void) {
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}

export function getPlayers(): Player[] {
  return read();
}

export function getPlayer(id: string): Player | null {
  return read().find((p) => p.id === id) ?? null;
}

export function generateId(name: string): string {
  return name.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-");
}

export function nextNum(): string {
  const list = read();
  const max = list.reduce((m, p) => Math.max(m, parseInt(p.num, 10) || 0), 0);
  return String(max + 1).padStart(3, "0");
}

export function savePlayer(player: Player): Player {
  const list = read();
  const idx = list.findIndex((p) => p.id === player.id);
  let next = { ...player };
  if (!next.id) next.id = generateId(next.name);
  if (!next.num) next.num = nextNum();
  if (idx === -1) {
    list.push(next);
  } else {
    list[idx] = next;
  }
  write(list);
  return next;
}

export function deletePlayer(id: string) {
  write(read().filter((p) => p.id !== id));
}

export function exportJSON() {
  const blob = new Blob([JSON.stringify(read(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dmscout-export-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importJSON(file: File): Promise<number> {
  const text = await file.text();
  const incoming = JSON.parse(text) as Player[];
  if (!Array.isArray(incoming)) throw new Error("Formato JSON non valido");
  const current = read();
  const map = new Map(current.map((p) => [p.id, p]));
  incoming.forEach((p) => map.set(p.id, p));
  write(Array.from(map.values()));
  return incoming.length;
}

export function setCompareSeed(id: string) {
  localStorage.setItem(COMPARE_KEY, id);
}
export function popCompareSeed(): string | null {
  const v = localStorage.getItem(COMPARE_KEY);
  if (v) localStorage.removeItem(COMPARE_KEY);
  return v;
}

export function setAiDraft(p: Partial<Player>) {
  sessionStorage.setItem(AI_DRAFT_KEY, JSON.stringify(p));
}
export function popAiDraft(): Partial<Player> | null {
  const raw = sessionStorage.getItem(AI_DRAFT_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(AI_DRAFT_KEY);
  try { return JSON.parse(raw); } catch { return null; }
}
