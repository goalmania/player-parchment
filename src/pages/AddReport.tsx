import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import PageShell from "@/components/PageShell";
import ReportForm from "@/components/ReportForm";
import { popAiDraft } from "@/lib/storage";
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

        <ReportForm mode="create" initial={draft || undefined} />

        <div className="mt-8 text-sm text-gray-soft">
          Preferisci descrivere il giocatore? <Link to="/ai-report" className="text-accent-lime">Usa il Generatore AI →</Link>
        </div>
      </section>
    </PageShell>
  );
}
