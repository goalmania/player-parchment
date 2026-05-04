import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import PageShell from "@/components/PageShell";
import ReportForm from "@/components/ReportForm";
import { popAiDraft } from "@/lib/storage";
import UploadReportButton from "@/components/UploadReportButton";
import type { Player } from "@/lib/types";

export default function AddReport() {
  const [draft, setDraft] = useState<Partial<Player> | null>(null);
  useEffect(() => { setDraft(popAiDraft()); }, []);

  return (
    <PageShell>
      <section className="container py-10">
        <div className="section-label mb-3">// NUOVO REPORT GIOCATORE</div>
        <h1 className="font-display font-black uppercase text-4xl md:text-5xl mb-2">Aggiungi Profilo</h1>
        <p className="text-gray-soft mb-8">Compila i campi per generare la scheda completa del giocatore.</p>

        {/* Compilazione automatica - CTA primaria, ben visibile */}
        <div className="mb-8 p-5 border-hairline bg-gradient-to-br from-accent-lime/10 to-transparent">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="font-display font-bold text-lg uppercase mb-1">⚡ Compila automaticamente</div>
              <p className="text-sm text-gray-soft">
                Carica un report (PDF / DOCX / TXT) e l'AI <strong className="text-foreground">crea e salva</strong> immediatamente il giocatore nel database.
                <br />Vuoi solo precompilare e rivedere prima del salvataggio? Usa "Carica in bozza".
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <UploadReportButton autoSave label="📄 Carica e salva (PDF/DOCX/TXT)" />
              <UploadReportButton autoSave={false} label="✏️ Carica in bozza" />
              <Link to="/ai-report" className="dm-btn-primary whitespace-nowrap">Incolla testo →</Link>
            </div>
          </div>
        </div>

        <ReportForm mode="create" initial={draft || undefined} />
      </section>
    </PageShell>
  );
}
