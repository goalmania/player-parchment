/**
 * Players storage layer — backed by Supabase (Lovable Cloud).
 * Provides reactive in-memory cache + subscribe API so existing components
 * (usePlayers, etc.) keep working with minimal changes.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Player, Observation } from "./types";
import { heatmapFromPosition } from "@/components/HeatmapEditor";
import { resolveGeo } from "./geo";

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
    position_secondary: Array.isArray(row.position_secondary) ? row.position_secondary : (row.position_secondary ? [row.position_secondary] : []),
    foot: row.foot || "Destro",
    height: row.height ?? 180,
    weight: row.weight ?? 75,
    tactical_roles: row.tactical_roles || [],
    ratings: (() => {
      const r = row.ratings || {};
      return {
        technical: Number(r.technical) || 6,
        tactical: Number(r.tactical) || 6,
        physical: Number(r.physical) || 6,
        mental: Number(r.mental) || 6,
        overall: Number(r.overall) || 6,
      };
    })(),
    skills: (() => {
      const s = row.skills || {};
      return {
        ball_control: Number(s.ball_control) || 60,
        passing: Number(s.passing) || 60,
        dribbling: Number(s.dribbling) || 60,
        finishing: Number(s.finishing) || 60,
        defensive_work: Number(s.defensive_work) || 60,
        tactical_iq: Number(s.tactical_iq) || 60,
        decision_making: Number(s.decision_making) || 60,
        aerial: Number(s.aerial) || 60,
        pace: Number(s.pace) || 60,
        stamina: Number(s.stamina) || 60,
      };
    })(),
    stars: (() => {
      const s = row.stars || {};
      return {
        technique: Number(s.technique) || 3,
        athleticism: Number(s.athleticism) || 3,
        mentality: Number(s.mentality) || 3,
        potential: Number(s.potential) || 3,
        market_value: Number(s.market_value) || 3,
      };
    })(),
    market: (() => {
      const m = row.market || {};
      return {
        value_min: Number(m.value_min) || 0,
        value_max: Number(m.value_max) || 0,
        potential: m.potential || "Medio",
        risk: m.risk || "Medio",
        timeline: m.timeline || "12 mesi",
        ready_level: m.ready_level || "",
      };
    })(),
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
    stats: row.stats || {},
    stats_source: row.stats_source || "",
    stats_season: row.stats_season || "",
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
    stats: p.stats || {},
    stats_source: p.stats_source || null,
    stats_season: p.stats_season || null,
    observations: p.observations || [],
    heatmap: p.heatmap || [],
    formations_played: p.formations_played || [],
  };
}

/** Ensure each player has the optional fields populated with defaults. */
function hydrate(p: Player): Player {
  let next = p;
  // Resolve geo from club/nationality when lat/lng or region are missing
  const needsGeo = !next.lat || !next.lng || Math.abs(next.lat) < 0.001 || Math.abs(next.lng) < 0.001 || !next.region;
  if (needsGeo) {
    const geo = resolveGeo({
      club: next.club,
      league: next.league,
      nationality: next.nationality,
      seed: next.id || next.name,
    });
    if (geo) {
      next = {
        ...next,
        lat: (!next.lat || Math.abs(next.lat) < 0.001) ? geo.lat : next.lat,
        lng: (!next.lng || Math.abs(next.lng) < 0.001) ? geo.lng : next.lng,
        region: next.region || geo.region || "",
      };
    }
  }
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
      cache = dedupPlayers((data || []).map(rowToPlayer));
    }
    initialized = true;
    notify();
    return cache;
  } finally {
    loading = false;
  }
}

let realtimeChannel: any = null;
let realtimeStarting = false;
export function startRealtime() {
  if (realtimeChannel || realtimeStarting) return;
  realtimeStarting = true;
  const ch = supabase.channel("players-changes");
  ch.on(
    "postgres_changes" as any,
    { event: "*", schema: "public", table: "players" },
    () => { loadPlayers(); }
  );
  realtimeChannel = ch;
  ch.subscribe(() => { realtimeStarting = false; });
}
export function stopRealtime() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
    realtimeStarting = false;
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

/** Deduplica per nome (case-insensitive) + birth_year — tieni il primo inserito. */
function dedupPlayers(list: Player[]): Player[] {
  const seen = new Set<string>();
  return list.filter((p) => {
    const key = `${(p.name || "").trim().toLowerCase()}|${p.birth_year ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getPlayers(): Player[] {
  return cache;
}

export function getPlayer(id: string): Player | null {
  return cache.find((p) => p.id === id) ?? null;
}

/**
 * Fetches a single player by UUID directly from Supabase, waiting for the
 * auth session to be fully initialized (INITIAL_SESSION event). Used by
 * PlayerPrint which opens in a fresh tab with an empty in-memory cache.
 */
export function fetchPlayerById(id: string): Promise<Player | null> {
  return new Promise((resolve) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event !== "INITIAL_SESSION" && event !== "SIGNED_IN") return;
        subscription.unsubscribe();
        if (!session) { resolve(null); return; }
        const { data, error } = await supabase
          .from("players")
          .select("*")
          .eq("id", id)
          .maybeSingle();
        resolve(data && !error ? rowToPlayer(data) : null);
      }
    );
  });
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

/** Import players from a JSON file into the current account.
 *  Duplicates are detected by name (case-insensitive) + birth_year and skipped. */
export async function importJSON(file: File): Promise<number> {
  const ownerId = await getOwnerId();
  if (!ownerId) throw new Error("Devi essere autenticato.");
  const text = await file.text();
  const incoming = JSON.parse(text) as Player[];
  if (!Array.isArray(incoming)) throw new Error("Formato JSON non valido");

  const toInsert = incoming.filter((p) => {
    const incomingName = (p.name || "").trim().toLowerCase();
    const incomingYear = p.birth_year;
    return !cache.some((existing) => {
      const existingName = (existing.name || "").trim().toLowerCase();
      return existingName === incomingName && existing.birth_year === incomingYear;
    });
  });

  if (toInsert.length === 0) return 0;

  const rows = toInsert.map((p) => {
    const r = playerToRow(p, ownerId) as any;
    delete r.id;
    return r;
  });
  const { error } = await supabase.from("players").insert(rows);
  if (error) throw error;
  await loadPlayers();
  return toInsert.length;
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
