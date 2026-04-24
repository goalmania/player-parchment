import type { Player } from "./types";
import { getPlayers } from "./storage";

export type AlertSeverity = "up" | "down" | "info";

export interface Alert {
  id: string;
  player_id: string;
  player_name: string;
  player_num: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  delta: number;
  created_at: string;
  read: boolean;
}

const ALERTS_KEY = "dmscout_alerts";
const DISMISSED_KEY = "dmscout_alerts_dismissed";
const subscribers = new Set<() => void>();

function read(): Alert[] {
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    return raw ? (JSON.parse(raw) as Alert[]) : [];
  } catch {
    return [];
  }
}
function write(list: Alert[]) {
  localStorage.setItem(ALERTS_KEY, JSON.stringify(list));
  subscribers.forEach((fn) => fn());
}
function dismissedSet(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}
function persistDismissed(s: Set<string>) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(s)));
}

export function subscribeAlerts(fn: () => void) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

/**
 * Recompute alerts from the current player set.
 * Rules:
 *   – If a player has ≥2 observations and |Δoverall| ≥ 0.4 between the two latest, raise an alert.
 *   – If overall ≥ 8.5 and player still has tag MONITOR / verdict_type "monitor", suggest review.
 * Existing dismissed alert ids are filtered out.
 */
export function recomputeAlerts(): Alert[] {
  const dismissed = dismissedSet();
  const out: Alert[] = [];
  const players = getPlayers();

  for (const p of players) {
    const obs = p.observations || [];
    if (obs.length >= 2) {
      const sorted = [...obs].sort((a, b) => a.date.localeCompare(b.date));
      const last = sorted[sorted.length - 1];
      const prev = sorted[sorted.length - 2];
      const delta = +(last.overall - prev.overall).toFixed(2);
      if (Math.abs(delta) >= 0.4) {
        const id = `${p.id}::overall::${last.date}`;
        if (!dismissed.has(id)) {
          out.push({
            id,
            player_id: p.id,
            player_name: p.name,
            player_num: p.num,
            severity: delta > 0 ? "up" : "down",
            title: delta > 0
              ? `Overall in crescita (+${delta.toFixed(1)})`
              : `Overall in calo (${delta.toFixed(1)})`,
            detail: `Da ${prev.overall.toFixed(1)} (${prev.date}) a ${last.overall.toFixed(1)} (${last.date}).`,
            delta,
            created_at: last.date,
            read: false,
          });
        }
      }
    }

    if (p.ratings.overall >= 8.5 && p.verdict_type === "monitor") {
      const id = `${p.id}::review::high-overall`;
      if (!dismissed.has(id)) {
        out.push({
          id,
          player_id: p.id,
          player_name: p.name,
          player_num: p.num,
          severity: "info",
          title: "Possibile upgrade verdetto",
          detail: `Overall ${p.ratings.overall.toFixed(1)} ma verdetto ancora MONITOR.`,
          delta: 0,
          created_at: p.date,
          read: false,
        });
      }
    }
  }

  // Preserve previously-read flags
  const previous = new Map(read().map((a) => [a.id, a.read]));
  const merged = out.map((a) => ({ ...a, read: previous.get(a.id) ?? false }));
  merged.sort((a, b) => b.created_at.localeCompare(a.created_at));
  write(merged);
  return merged;
}

export function getAlerts(): Alert[] {
  // Always recompute so storage stays in sync with player state
  return recomputeAlerts();
}

export function unreadCount(): number {
  return getAlerts().filter((a) => !a.read).length;
}

export function markAllRead() {
  const list = read().map((a) => ({ ...a, read: true }));
  write(list);
}

export function dismissAlert(id: string) {
  const s = dismissedSet();
  s.add(id);
  persistDismissed(s);
  write(read().filter((a) => a.id !== id));
}
