import { Link, useSearchParams } from "react-router-dom";
import PageShell from "@/components/PageShell";
import ReportForm from "@/components/ReportForm";
import { getPlayer } from "@/lib/storage";

export default function EditReport() {
  const [params] = useSearchParams();
  const id = params.get("id") || "";
  const player = getPlayer(id);

  if (!player) {
    return (
      <PageShell>
        <div className="container py-24 text-center">
          <h2 className="font-display font-bold text-3xl uppercase mb-3">Report non trovato</h2>
          <Link to="/database" className="dm-btn-primary">← Database</Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="container py-10">
        <div className="section-label mb-3">// MODIFICA REPORT — {player.name.toUpperCase()}</div>
        <h1 className="font-display font-black uppercase text-4xl md:text-5xl mb-2">Modifica Profilo</h1>
        <p className="text-gray-soft mb-8">Aggiorna i dati e salva, oppure elimina definitivamente il report.</p>

        <ReportForm mode="edit" initial={player} />

        <div className="mt-6">
          <Link to={`/player?id=${player.id}`} className="dm-btn-outline">← Annulla</Link>
        </div>
      </section>
    </PageShell>
  );
}
