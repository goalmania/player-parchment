import { useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { toast } from "sonner";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

const FAQS = [
  {
    id: "cosa-include-report",
    category: "Report Singolo",
    q: "Cosa include un Report Singolo?",
    a: "Ogni report include scheda anagrafica, profilo tattico con ruoli, valutazione radar (6 assi), skills tecniche (0-100), stelle potenziale, heatmap di posizione, punti di forza e debolezza, verdetto finale con valutazione di mercato e video highlights quando disponibili.",
  },
  {
    id: "tempi-consegna",
    category: "Generale",
    q: "Quanto tempo ci vuole per ricevere un report?",
    a: "I report singoli vengono consegnati entro 5-7 giorni lavorativi dalla conferma. I pacchetti osservazioni richiedono circa 3 settimane. La consulenza continuativa prevede report settimanali con tempistiche concordate.",
  },
  {
    id: "giocatore-specifico",
    category: "Report Singolo",
    q: "Posso richiedere l'analisi di un giocatore specifico?",
    a: "Certo. Puoi indicare nome, club e campionato nel modulo di contatto o caricare direttamente materiale video tramite la piattaforma. Il report verrà redatto su misura seguendo i parametri tattici richiesti.",
  },
  {
    id: "differenza-servizi",
    category: "Generale",
    q: "Che differenza c'è tra i tre servizi?",
    a: "Il Report Singolo è ideale per un'occhiata puntuale su un target. Il Pacchetto Osservazioni offre 5 report scontati per coprire un reparto o un profilo specifico. La Consulenza Continuativa è un abbonamento mensile con database condiviso e supporto al direttore sportivo.",
  },
  {
    id: "pacchetto-quanti-report",
    category: "Pacchetto Osservazioni",
    q: "Quanti report include il Pacchetto Osservazioni?",
    a: "Il Pacchetto Osservazioni include 5 report completi a tariffa scontata rispetto al singolo. Puoi richiedere giocatori in ruoli diversi o concentrarti su un reparto specifico. I report vengono consegnati entro 3 settimane dalla conferma.",
  },
  {
    id: "consulenza-cosa-include",
    category: "Consulenza Continuativa",
    q: "Cosa include la Consulenza Continuativa?",
    a: "La Consulenza Continuativa prevede un contratto mensile con: database condiviso aggiornato in tempo reale, report settimanali su profili concordati, supporto diretto al direttore sportivo via call o messaggistica, e possibilità di richieste prioritarie fuori programma.",
  },
  {
    id: "dati-aggiornati",
    category: "Generale",
    q: "I dati e i report sono aggiornati?",
    a: "Tutti i report si basano su osservazioni dirette e dati della stagione in corso. I parametri tecnico-tattici, le statistiche e i valori di mercato vengono rivisti al momento della redazione per garantire il massimo aggiornamento.",
  },
  {
    id: "marketplace",
    category: "Piattaforma",
    q: "Come funziona il Marketplace?",
    a: "Il Marketplace è la vetrina pubblica dove vengono pubblicate schede giocatori selezionate. I club e gli osservatori possono richiedere l'accesso completo: una volta approvati, il giocatore compare nella sezione 'Sbloccati' con tutti i dettagli.",
  },
  {
    id: "export-report",
    category: "Piattaforma",
    q: "È possibile esportare i report?",
    a: "Sì. Ogni scheda giocatore è esportabile in PDF e CSV. Inoltre è possibile stampare una versione ottimizzata del profilo e condividere un link pubblico con altri membri dello staff.",
  },
  {
    id: "solo-professionisti",
    category: "Generale",
    q: "Lavori solo con club professionistici?",
    a: "No. DM Scout collabora con club professionistici, semiprofessionistici, agenzie e direttori sportivi di ogni livello. Ogni servizio viene scalato in base alle esigenze e al budget del cliente.",
  },
];

const CATEGORIES = ["Tutte", "Generale", "Report Singolo", "Pacchetto Osservazioni", "Consulenza Continuativa", "Piattaforma"];

export default function FAQ() {
  const [activeCategory, setActiveCategory] = useState("Tutte");
  const currentUrl = typeof window !== "undefined" ? window.location.origin + "/faq" : "/faq";

  const filtered = activeCategory === "Tutte" ? FAQS : FAQS.filter((f) => f.category === activeCategory);

  return (
    <PageShell>
      <section className="container py-10 max-w-4xl">
        <div className="section-label mb-3">// DOMANDE FREQUENTI</div>
        <h1 className="font-display font-black uppercase text-5xl md:text-6xl mb-3">FAQ</h1>
        <p className="text-gray-soft text-lg mb-8 max-w-2xl">
          Trova risposte alle domande più comuni sui servizi DM Scout. Puoi filtrare per categoria o condividere il link diretto a una domanda specifica.
        </p>

        {/* FILTRO CATEGORIE */}
        <div className="flex flex-wrap gap-2 mb-10">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`font-mono text-xs uppercase tracking-[0.12rem] px-4 py-2 rounded-lg border transition-colors ${
                activeCategory === cat
                  ? "bg-accent-lime text-black border-accent-lime font-bold"
                  : "border-border/20 text-gray-soft hover:border-accent-lime hover:text-accent-lime"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ACCORDION FAQ */}
        <div className="dm-card p-6 mb-10">
          <Accordion type="single" collapsible className="w-full">
            {filtered.map((faq) => (
              <AccordionItem key={faq.id} id={faq.id} value={faq.id} className="border-b border-border/50">
                <AccordionTrigger className="text-left font-display font-semibold uppercase text-sm tracking-[0.08rem] hover:no-underline py-4">
                  <div className="flex flex-col items-start gap-1 flex-1 pr-2">
                    <span className="font-mono text-xs text-gray-soft normal-case tracking-normal">{faq.category}</span>
                    <span>{faq.q}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(`${currentUrl}#${faq.id}`);
                      toast.success("Link copiato!");
                    }}
                    className="ml-3 shrink-0 text-gray-soft hover:text-accent-lime transition-colors text-sm font-mono normal-case tracking-normal"
                    title="Copia link diretto a questa domanda"
                  >
                    #
                  </button>
                </AccordionTrigger>
                <AccordionContent className="text-gray-soft text-sm leading-relaxed pb-4">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* CTA */}
        <div className="dm-card p-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-accent-dim border-accent-lime/30">
          <div>
            <div className="section-label mb-2">// NON HAI TROVATO RISPOSTA?</div>
            <h2 className="font-display font-black uppercase text-3xl md:text-4xl mb-1">
              Scrivimi direttamente
            </h2>
            <p className="text-gray-soft text-sm max-w-md">
              Sono disponibile per qualsiasi domanda. Rispondo entro 48 ore, Lun-Ven.
            </p>
          </div>
          <Link to="/contact#contatto" className="dm-btn-primary shrink-0">
            Contattami →
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
