import type { Player } from "./types";
import { SEED_PLAYERS } from "./seed";

const STORAGE_KEY = "dmscout_players";
const COMPARE_KEY = "dmscout_compare_id";
const AI_DRAFT_KEY = "dmscout_ai_draft";

const subscribers = new Set<() => void>();

function read(): Player[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_PLAYERS));
      return [...SEED_PLAYERS];
    }
    return JSON.parse(raw);
  } catch {
    return [...SEED_PLAYERS];
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
