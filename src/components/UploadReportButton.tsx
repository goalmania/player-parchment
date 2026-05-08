import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { savePlayer, setAiDraft, nextNum } from "@/lib/storage";
import { heatmapFromPosition } from "@/components/HeatmapEditor";
import type { Player, PositionCode } from "@/lib/types";
import { POSITION_LABEL } from "@/lib/types";
import { toast } from "sonner";

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
