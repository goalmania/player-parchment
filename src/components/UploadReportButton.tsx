import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { setAiDraft } from "@/lib/storage";
import { toast } from "sonner";

/**
 * Carica un report PDF/DOCX/TXT, lo invia alla edge function `parse-report-file`,
 * e in caso di successo salva il draft del giocatore in sessione e naviga ad
 * AddReport per la conferma manuale.
 */
export default function UploadReportButton() {
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
      // base64 encode senza esplodere lo stack
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

      setAiDraft({ ...payload.player, raw_report: payload.extracted_text || "" });
      toast.success("Report estratto ✓ Verifica i dati prima di salvare.");
      navigate("/add-report");
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
        {loading ? "Estrazione…" : "📄 Carica report (PDF/DOCX/TXT)"}
      </button>
    </>
  );
}
