/**
 * Players storage layer — backed by Supabase (Lovable Cloud).
 * Provides reactive in-memory cache + subscribe API so existing components
 * (usePlayers, etc.) keep working with minimal changes.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Player, Observation } from "./types";
import { heatmapFromPosition } from "@/components/HeatmapEditor";

const COMPARE_KEY = "dmscout_compare_id";
const AI_DRAFT_KEY = "dmscout_ai_draft";
const LOCAL_LEGACY_KEY = "dmscout_players";

let cache: Player[] = [];
let initialized = false;
let loading = false;
const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((fn) => {
    try { fn(); } catch {}
  });
}

/** Fields that are stored as columns in DB and need mapping back to a Player */
function rowToPlayer(row: any): Player {
  const p: Player = {
    id: row.id,
    owner_id: row.owner_id,
    num: row.num || "",
    name: row.name || "",
    photo: row.photo || "",
    age: row.age ?? 20,
    birth_year: row.birth_year ?? new Date().getFullYear() - 20,
    nationality: row.nationality || "Italia",
    flag: row.flag || "🇮🇹",
    club: row.club || "",
    league: row.league || "",
    region: row.region || "",
    lat: row.lat ?? 0,
    lng: row.lng ?? 0,
    position_main: row.position_main || "Mezzala",
    position_code: row.position_code || "CM",
    position_secondary: row.position_secondary || [],
    foot: row.foot || "Destro",
    height: row.height ?? 180,
    weight: row.weight ?? 75,
    tactical_roles: row.tactical_roles || [],
    ratings: row.ratings || { technical: 6, tactical: 6, physical: 6, mental: 6, overall: 6 },
    skills: row.skills || {
      ball_control: 60, passing: 60, dribbling: 60, finishing: 60,
      defensive_work: 60, tactical_iq: 60, decision_making: 60,
      aerial: 60, pace: 60, stamina: 60,
    },
    stars: row.stars || { technique: 3, athleticism: 3, mentality: 3, potential: 3, market_value: 3 },
    market: row.market || { value_min: 0, value_max: 0, potential: "Medio", risk: "Medio", timeline: "12 mesi", ready_level: "" },
    tags: row.tags || [],
    verdict_type: row.verdict_type || "monitor",
    verdict: row.verdict || "",
    observation_type: row.observation_type || "Video",
    observation_count: row.observation_count ?? 0,
    date: row.date || new Date().toISOString().slice(0, 10),
    strengths: row.strengths || [],
    weaknesses: row.weaknesses || [],
    summary: row.summary || "",
    videos: row.video_urls || [],
    raw_report: row.raw_report || "",
    observations: row.observations || [],
    heatmap: row.heatmap || [],
    formations_played: row.formations_played || [],
  };
  return hydrate(p);
}

function playerToRow(p: Player, ownerId: string) {
  return {
    id: p.id || undefined,
    owner_id: ownerId,
    num: p.num,
    name: p.name,
    photo: p.photo,
    age: p.age,
    birth_year: p.birth_year,
    nationality: p.nationality,
    flag: p.flag,
    club: p.club,
    league: p.league,
    region: p.region,
    lat: p.lat,
    lng: p.lng,
    position_main: p.position_main,
    position_code: p.position_code,
    position_secondary: p.position_secondary,
    foot: p.foot,
    height: p.height,
    weight: p.weight,
    tactical_roles: p.tactical_roles,
    ratings: p.ratings,
    skills: p.skills,
    stars: p.stars,
    market: p.market,
    tags: p.tags,
    verdict_type: p.verdict_type,
    verdict: p.verdict,
    observation_type: p.observation_type,
    observation_count: p.observation_count,
    date: p.date,
    strengths: p.strengths,
    weaknesses: p.weaknesses,
    summary: p.summary,
    video_urls: p.videos || (p.video_url ? [{ url: p.video_url, kind: "external" }] : []),
    raw_report: p.raw_report,
    observations: p.observations || [],
    heatmap: p.heatmap || [],
    formations_played: p.formations_played || [],
  };
}

/** Ensure each player has the optional fields populated with defaults. */
function hydrate(p: Player): Player {
  let next = p;
  if (!next.heatmap || next.heatmap.length === 0) {
    next = { ...next, heatmap: heatmapFromPosition(next.position_code) };
  }
  if (!next.observations || next.observations.length === 0) {
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
    next = { ...next, observations: [cur] };
  }
  if (!next.formations_played || next.formations_played.length === 0) {
    next = {
      ...next,
      formations_played: Array.from(new Set((next.tactical_roles || []).map((r) => r.formation))),
    };
  }
  return next;
}

/** Initial load + realtime sync of accessible players. */
export async function loadPlayers(): Promise<Player[]> {
  if (loading) return cache;
  loading = true;
  try {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error("loadPlayers failed:", error);
      cache = [];
    } else {
      cache = (data || []).map(rowToPlayer);
    }
    initialized = true;
    notify();
    return cache;
  } finally {
    loading = false;
  }
}

let realtimeChannel: any = null;
export function startRealtime() {
  if (realtimeChannel) return;
  realtimeChannel = supabase
    .channel("players-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "players" },
      () => { loadPlayers(); }
    )
    .subscribe();
}
export function stopRealtime() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
}

export function clearCache() {
  cache = [];
  initialized = false;
  notify();
}

export function isInitialized() { return initialized; }

export function subscribe(fn: () => void) {
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}

export function getPlayers(): Player[] {
  return cache;
}

export function getPlayer(id: string): Player | null {
  return cache.find((p) => p.id === id) ?? null;
}

export function generateId(name: string): string {
  return name.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-");
}

export function nextNum(): string {
  const max = cache.reduce((m, p) => Math.max(m, parseInt(p.num, 10) || 0), 0);
  return String(max + 1).padStart(3, "0");
}

async function getOwnerId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Insert or update a player. ID is the DB UUID; if missing, a new row is created. */
export async function savePlayer(player: Player): Promise<Player> {
  const ownerId = await getOwnerId();
  if (!ownerId) throw new Error("Devi essere autenticato per salvare un report.");

  const isNew = !player.id || !cache.find((p) => p.id === player.id);
  let toSave = { ...player };
  if (!toSave.num) toSave.num = nextNum();

  const row = playerToRow(toSave, ownerId) as any;

  let saved: Player;
  if (isNew) {
    delete row.id;
    const { data, error } = await supabase
      .from("players")
      .insert(row)
      .select()
      .single();
    if (error) throw error;
    saved = rowToPlayer(data);
    cache = [saved, ...cache.filter((p) => p.id !== saved.id)];
  } else {
    const { data, error } = await supabase
      .from("players")
      .update(row)
      .eq("id", player.id)
      .select()
      .single();
    if (error) throw error;
    saved = rowToPlayer(data);
    cache = cache.map((p) => (p.id === saved.id ? saved : p));
  }
  notify();
  return saved;
}

export async function deletePlayer(id: string): Promise<void> {
  const { error } = await supabase.from("players").delete().eq("id", id);
  if (error) throw error;
  cache = cache.filter((p) => p.id !== id);
  notify();
}

/** Export visible players to JSON file. */
export function exportJSON() {
  const blob = new Blob([JSON.stringify(cache, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `dmscout-export-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Import players from a JSON file into the current account. */
export async function importJSON(file: File): Promise<number> {
  const ownerId = await getOwnerId();
  if (!ownerId) throw new Error("Devi essere autenticato.");
  const text = await file.text();
  const incoming = JSON.parse(text) as Player[];
  if (!Array.isArray(incoming)) throw new Error("Formato JSON non valido");

  const rows = incoming.map((p) => {
    const r = playerToRow(p, ownerId) as any;
    delete r.id;
    return r;
  });
  const { error } = await supabase.from("players").insert(rows);
  if (error) throw error;
  await loadPlayers();
  return incoming.length;
}

/** Migrate legacy localStorage players to the current account. */
export async function migrateLocalToCloud(): Promise<number> {
  const ownerId = await getOwnerId();
  if (!ownerId) throw new Error("Devi essere autenticato.");
  const raw = localStorage.getItem(LOCAL_LEGACY_KEY);
  if (!raw) return 0;
  let list: Player[] = [];
  try { list = JSON.parse(raw); } catch { return 0; }
  if (!Array.isArray(list) || list.length === 0) return 0;

  const rows = list.map((p) => {
    const r = playerToRow(p, ownerId) as any;
    delete r.id;
    return r;
  });
  const { error } = await supabase.from("players").insert(rows);
  if (error) throw error;
  localStorage.removeItem(LOCAL_LEGACY_KEY);
  await loadPlayers();
  return list.length;
}

export function hasLegacyLocalData(): boolean {
  const raw = localStorage.getItem(LOCAL_LEGACY_KEY);
  if (!raw) return false;
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) && list.length > 0;
  } catch { return false; }
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
