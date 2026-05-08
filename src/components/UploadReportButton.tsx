import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { savePlayer, setAiDraft, nextNum } from "@/lib/storage";
import { heatmapFromPosition } from "@/components/HeatmapEditor";
import type { Player, PositionCode } from "@/lib/types";
import { POSITION_LABEL } from "@/lib/types";
import { toast } from "sonner";

/** Estrae un numero da stringhe tipo "1,88 m", "75 kg", "€ 2.500.000", "85%". */
function toNum(v: any, def = 0): number {
  if (v == null || v === "") return def;
  if (typeof v === "number") return Number.isFinite(v) ? v : def;
  let s = String(v).trim().toLowerCase()
    .replace(/[€$£¥]/g, "")
    .replace(/\b(kg|cm|mt|m|kgs|kgp|%|min|gol|goals?|assists?|anni|years?)\b/g, "")
    .replace(/[^\d,.\-]/g, "")
    .trim();
  if (!s) return def;
  // gestisci separatori: "2.500.000,50" oppure "2,500,000.50" oppure "1,88"
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) { s = s.replace(/\./g, "").replace(",", "."); }
    else { s = s.replace(/,/g, ""); }
  } else if (lastComma > -1) {
    // solo virgola: se ce n'è una sola e seguita da 1-2 cifre -> decimale
    const parts = s.split(",");
    if (parts.length === 2 && parts[1].length <= 2) s = parts.join(".");
    else s = s.replace(/,/g, "");
  }
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : def;
}

function toInt(v: any, def: number, min?: number, max?: number): number {
  let n = toNum(v, def);
  // height in metri -> cm
  if (min === 140 && max === 220 && n > 0 && n < 3) n = n * 100;
  // weight in grammi -> kg
  if (min === 40 && max === 130 && n > 1000) n = n / 1000;
  // age in mesi? skip
  n = Math.round(n);
  if (typeof min === "number" && n < min) n = def;
  if (typeof max === "number" && n > max) n = def;
  return n;
}

function clean01to10(v: any, def = 6): number {
  const n = toNum(v, def);
  return Math.max(0, Math.min(10, Math.round(n)));
}
function clean0to100(v: any, def = 60): number {
  const n = toNum(v, def);
  return Math.max(0, Math.min(100, Math.round(n)));
}
function clean1to5(v: any, def = 3): number {
  const n = toNum(v, def);
  return Math.max(1, Math.min(5, Math.round(n)));
}

function sanitizeAi(ai: Partial<Player>): Partial<Player> {
  const out: any = { ...ai };
  // ratings 0..10
  if (out.ratings && typeof out.ratings === "object") {
    const r: any = {};
    for (const k of Object.keys(out.ratings)) r[k] = clean01to10(out.ratings[k], 6);
    out.ratings = r;
  }
  // skills 0..100
  if (out.skills && typeof out.skills === "object") {
    const s: any = {};
    for (const k of Object.keys(out.skills)) s[k] = clean0to100(out.skills[k], 60);
    out.skills = s;
  }
  // stars 1..5
  if (out.stars && typeof out.stars === "object") {
    const st: any = {};
    for (const k of Object.keys(out.stars)) st[k] = clean1to5(out.stars[k], 3);
    out.stars = st;
  }
  // market: numeri puliti, stringhe lasciate
  if (out.market && typeof out.market === "object") {
    const m: any = { ...out.market };
    if ("value_min" in m) m.value_min = Math.round(toNum(m.value_min, 0));
    if ("value_max" in m) m.value_max = Math.round(toNum(m.value_max, 0));
    out.market = m;
  }
  // stats: tutti number
  if (out.stats && typeof out.stats === "object") {
    const ss: any = {};
    for (const k of Object.keys(out.stats)) {
      const n = toNum(out.stats[k], NaN);
      if (Number.isFinite(n)) ss[k] = n;
    }
    out.stats = ss;
  }
  // heatmap: numeri 0..100
  if (Array.isArray(out.heatmap)) {
    out.heatmap = out.heatmap.map((v: any) => clean0to100(v, 0));
  }
  return out;
}

interface Props {
  /** Se true (default), il report estratto viene salvato automaticamente nel database
   *  e l'utente viene portato alla pagina del giocatore. Se false, viene messo in
   *  bozza e si apre il form di compilazione manuale. */
  autoSave?: boolean;
  label?: string;
}

/**
 * Carica un report PDF/DOCX/TXT e lo invia alla edge function `parse-report-file`.
 * Per default salva subito il giocatore nel database (auto-compilazione completa).
 */
export default function UploadReportButton({ autoSave = true, label }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFile = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      toast.error("File troppo grande (max 8MB)");
      return;
    }
    setLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      const fileBase64 = btoa(binary);

      const { data, error } = await supabase.functions.invoke("parse-report-file", {
        body: { fileBase64, fileName: file.name, mimeType: file.type },
      });
      if (error) throw error;
      const payload = data as any;
      if (payload?.error) throw new Error(payload.error);
      if (!payload?.player) throw new Error("Nessun report estratto");

      const ai = sanitizeAi(payload.player as Partial<Player>);
      const draft: Partial<Player> = { ...ai, raw_report: payload.extracted_text || "" };

      if (!autoSave) {
        setAiDraft(draft);
        toast.success("Report estratto ✓ Verifica i dati prima di salvare.");
        navigate("/add-report");
        return;
      }

      // AUTO-SAVE — costruisci un Player completo con default sicuri sui campi mancanti
      const code = (ai.position_code as PositionCode) || "CM";
      const currentYear = new Date().getFullYear();
      const age = toInt(ai.age, 20, 14, 50);
      const birthYear = toInt(ai.birth_year, currentYear - age, 1950, currentYear);
      const full: Player = {
        id: "",
        num: ai.num || nextNum(),
        name: (ai.name || "Senza nome").toString().slice(0, 120),
        photo: ai.photo || "",
        age,
        birth_year: birthYear,
        nationality: ai.nationality || "Italia",
        flag: ai.flag || "🇮🇹",
        club: ai.club || "",
        league: ai.league || "",
        region: ai.region || "Puglia",
        lat: toNum(ai.lat, 41),
        lng: toNum(ai.lng, 16.5),
        position_main: ai.position_main || POSITION_LABEL[code],
        position_code: code,
        position_secondary: Array.isArray(ai.position_secondary) ? ai.position_secondary : [],
        foot: ai.foot || "Destro",
        height: toInt(ai.height, 180, 140, 220),
        weight: toInt(ai.weight, 75, 40, 130),
        tactical_roles: Array.isArray(ai.tactical_roles) ? ai.tactical_roles : [],
        ratings: ai.ratings || { technical: 6, tactical: 6, physical: 6, mental: 6, overall: 6 },
        skills: ai.skills || { ball_control: 60, passing: 60, dribbling: 60, finishing: 60, defensive_work: 60, tactical_iq: 60, decision_making: 60, aerial: 60, pace: 60, stamina: 60 },
        stars: ai.stars || { technique: 3, athleticism: 3, mentality: 3, potential: 3, market_value: 3 },
        market: ai.market || { value_min: 20000, value_max: 50000, potential: "Medio", risk: "Medio", timeline: "12 mesi", ready_level: "Serie D" },
        tags: Array.isArray(ai.tags) ? ai.tags : [],
        verdict_type: ai.verdict_type || "monitor",
        verdict: ai.verdict || "",
        observation_type: ai.observation_type || "Video",
        observation_count: toInt(ai.observation_count, 1, 0, 9999),
        date: ai.date || new Date().toISOString().slice(0, 10),
        strengths: Array.isArray(ai.strengths) ? ai.strengths : [],
        weaknesses: Array.isArray(ai.weaknesses) ? ai.weaknesses : [],
        summary: ai.summary || "",
        video_url: (ai as any).video_url || "",
        raw_report: payload.extracted_text || "",
        heatmap: (ai.heatmap && ai.heatmap.length ? ai.heatmap : heatmapFromPosition(code)) as any,
        observations: Array.isArray(ai.observations) ? ai.observations : [],
        formations_played: Array.isArray(ai.formations_played) ? ai.formations_played : [],
        stats: (ai as any).stats || {},
        stats_source: (ai as any).stats_source || "",
        stats_season: (ai as any).stats_season || "",
      } as Player;

      const saved = await savePlayer(full);
      toast.success(`Report di ${saved.name} creato automaticamente ✓`);
      navigate(`/player?id=${saved.id}`);
    } catch (e: any) {
      toast.error(e?.message || "Estrazione fallita");
    } finally {
      setLoading(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={ref}
        type="file"
        accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={loading}
        className="dm-btn-outline disabled:opacity-50"
      >
        {loading ? "Estrazione e salvataggio…" : (label || "📄 Carica report (PDF/DOCX/TXT)")}
      </button>
    </>
  );
}
