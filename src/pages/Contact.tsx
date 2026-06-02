import { useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { toast } from "sonner";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

type ServiceType = "Report Singolo" | "Pacchetto Osservazioni" | "Consulenza Continuativa" | "Altro";

const ALL_FAQS: { id: string; q: string; a: string; types: ServiceType[] }[] = [
  {
    id: "cosa-include-report",
    q: "Cosa include un Report Singolo?",
    a: "Ogni report include scheda anagrafica, profilo tattico con ruoli, valutazione radar (6 assi), skills tecniche (0-100), stelle potenziale, heatmap di posizione, punti di forza e debolezza, verdetto finale con valutazione di mercato e video highlights quando disponibili.",
    types: ["Report Singolo"],
  },
  {
    id: "tempi-consegna",
    q: "Quanto tempo ci vuole per ricevere un report?",
    a: "I report singoli vengono consegnati entro 5-7 giorni lavorativi dalla conferma. I pacchetti osservazioni richiedono circa 3 settimane. La consulenza continuativa prevede report settimanali con tempistiche concordate.",
    types: ["Report Singolo", "Pacchetto Osservazioni", "Consulenza Continuativa"],
  },
  {
    id: "giocatore-specifico",
    q: "Posso richiedere l'analisi di un giocatore specifico?",
    a: "Certo. Puoi indicare nome, club e campionato nel modulo di contatto o caricare direttamente materiale video tramite la piattaforma. Il report verrà redatto su misura seguendo i parametri tattici richiesti.",
    types: ["Report Singolo", "Pacchetto Osservazioni"],
  },
  {
    id: "differenza-servizi",
    q: "Che differenza c'è tra i tre servizi?",
    a: "Il Report Singolo è ideale per un'occhiata puntuale su un target. Il Pacchetto Osservazioni offre 5 report scontati per coprire un reparto o un profilo specifico. La Consulenza Continuativa è un abbonamento mensile con database condiviso e supporto al direttore sportivo.",
    types: ["Report Singolo", "Pacchetto Osservazioni", "Consulenza Continuativa", "Altro"],
  },
  {
    id: "pacchetto-quanti-report",
    q: "Quanti report include il Pacchetto Osservazioni?",
    a: "Il Pacchetto Osservazioni include 5 report completi a tariffa scontata rispetto al singolo. Puoi richiedere giocatori in ruoli diversi o concentrarti su un reparto specifico. I report vengono consegnati entro 3 settimane dalla conferma.",
    types: ["Pacchetto Osservazioni"],
  },
  {
    id: "consulenza-cosa-include",
    q: "Cosa include la Consulenza Continuativa?",
    a: "La Consulenza Continuativa prevede un contratto mensile con: database condiviso aggiornato in tempo reale, report settimanali su profili concordati, supporto diretto al direttore sportivo via call o messaggistica, e possibilità di richieste prioritarie fuori programma.",
    types: ["Consulenza Continuativa"],
  },
  {
    id: "dati-aggiornati",
    q: "I dati e i report sono aggiornati?",
    a: "Tutti i report si basano su osservazioni dirette e dati della stagione in corso. I parametri tecnico-tattici, le statistiche e i valori di mercato vengono rivisti al momento della redazione per garantire il massimo aggiornamento.",
    types: ["Report Singolo", "Pacchetto Osservazioni", "Consulenza Continuativa"],
  },
  {
    id: "marketplace",
    q: "Come funziona il Marketplace?",
    a: "Il Marketplace è la vetrina pubblica dove vengono pubblicate schede giocatori selezionate. I club e gli osservatori possono richiedere l'accesso completo: una volta approvati, il giocatore compare nella sezione 'Sbloccati' con tutti i dettagli.",
    types: ["Altro"],
  },
  {
    id: "export-report",
    q: "È possibile esportare i report?",
    a: "Sì. Ogni scheda giocatore è esportabile in PDF e CSV. Inoltre è possibile stampare una versione ottimizzata del profilo e condividere un link pubblico con altri membri dello staff.",
    types: ["Report Singolo", "Pacchetto Osservazioni", "Consulenza Continuativa"],
  },
  {
    id: "solo-professionisti",
    q: "Lavori solo con club professionistici?",
    a: "No. DM Scout collabora con club professionistici, semiprofessionistici, agenzie e direttori sportivi di ogni livello. Ogni servizio viene scalato in base alle esigenze e al budget del cliente.",
    types: ["Report Singolo", "Pacchetto Osservazioni", "Consulenza Continuativa", "Altro"],
  },
];

function getFaqsForType(type: ServiceType) {
  if (type === "Altro") return ALL_FAQS.filter((f) => f.types.includes("Altro"));
  return ALL_FAQS.filter((f) => f.types.includes(type));
}

export default function Contact() {
  const [form, setForm] = useState<{ name: string; email: string; type: ServiceType; message: string }>({
    name: "",
    email: "",
    type: "Report Singolo",
    message: "",
  });

  const send = () => {
    if (!form.name || !form.email || !form.message) { toast.error("Compila tutti i campi"); return; }
    const subject = encodeURIComponent(`[DM Scout] ${form.type} — ${form.name}`);
    const body = encodeURIComponent(`Da: ${form.name} <${form.email}>\nTipo: ${form.type}\n\n${form.message}`);
    window.location.href = `mailto:dimuropaolo7@gmail.com?subject=${subject}&body=${body}`;
    toast.success("Apertura client email…");
  };

  const faqs = getFaqsForType(form.type);
  const currentUrl = typeof window !== "undefined" ? window.location.origin + "/contact" : "/contact";

  return (
    <PageShell>
      <section className="container py-10 max-w-5xl">
        <div className="section-label mb-3">// CONTATTI E COLLABORAZIONI</div>
        <h1 className="font-display font-black uppercase text-5xl md:text-6xl mb-3">Collaboriamo</h1>
        <p className="text-gray-soft text-lg mb-8 max-w-2xl">
          Disponibile per consulenze di scouting, report su richiesta e collaborazioni con club e agenzie.
        </p>

        <div className="dm-card p-5 inline-flex items-center gap-3 mb-10">
          <span className="pulse-dot" />
          <div>
            <div className="font-display font-semibold uppercase">Disponibile</div>
            <div className="text-xs text-gray-soft font-mono">Risposta entro 48h · Lun-Ven</div>
          </div>
        </div>

        {/* CONTATTI */}
        <div className="grid md:grid-cols-3 gap-px bg-border/10 border-hairline mb-12 rounded-lg overflow-hidden">
          {[
            { k: "Email", v: "info@dmfootballservices.it", href: "mailto:info@dmfootballservices.it" },
            { k: "Posizione", v: "Puglia, Italia", href: null },
            { k: "LinkedIn", v: "Paolo Di Muro", href: "https://www.linkedin.com/in/paolo-di-muro-567066193/" },
          ].map((c) => (
            <div key={c.k} className="bg-background p-5">
              <div className="section-label mb-2">// {c.k}</div>
              {c.href ? (
                <a href={c.href} target="_blank" rel="noopener noreferrer"
                  className="font-display font-semibold uppercase hover:text-accent-lime transition-colors">
                  {c.v}
                </a>
              ) : (
                <div className="font-display font-semibold uppercase">{c.v}</div>
              )}
            </div>
          ))}
        </div>

        {/* SERVIZI */}
        <div className="section-label mb-4">// SERVIZI</div>
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          {[
            { t: "Report Singolo", d: "Analisi tattica completa di un giocatore con scheda dettagliata, video e verdetto.", time: "5-7 giorni · da €150" },
            { t: "Pacchetto Osservazioni", d: "5 report a tariffa scontata. Ideale per club che cercano un reparto specifico.", time: "3 settimane · da €600" },
            { t: "Consulenza Continuativa", d: "Contratto mensile. Database condiviso, report settimanali, supporto al direttore sportivo.", time: "Mensile · da €1200/mese" },
          ].map((s) => (
            <div key={s.t} className="bg-background p-6 dm-card">
              <h3 className="font-display font-bold text-xl uppercase mb-3">{s.t}</h3>
              <p className="text-gray-soft text-sm mb-4">{s.d}</p>
              <div className="font-mono text-xs uppercase tracking-[0.12rem] text-accent-lime">{s.time}</div>
            </div>
          ))}
        </div>

        {/* FORM CONTATTO */}
        <div id="contatto" className="section-label mb-4">// SCRIVIMI</div>
        <div className="dm-card p-6 grid md:grid-cols-2 gap-4 mb-16">
          <input className="dm-input" placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="dm-input" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <select
            className="dm-input md:col-span-2"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value as ServiceType })}
          >
            <option>Report Singolo</option>
            <option>Pacchetto Osservazioni</option>
            <option>Consulenza Continuativa</option>
            <option>Altro</option>
          </select>
          <textarea className="dm-input md:col-span-2" rows={5} placeholder="Messaggio" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          <div className="md:col-span-2">
            <button onClick={send} className="dm-btn-primary">Invia →</button>
          </div>
        </div>

        {/* FAQ DINAMICHE */}
        <div id="faq" className="section-label mb-2">// DOMANDE FREQUENTI</div>
        <p className="text-gray-soft text-sm mb-4">
          Mostrando le domande relative a <span className="text-accent-lime font-mono">{form.type}</span>.{" "}
          <Link to="/faq" className="underline underline-offset-2 hover:text-accent-lime transition-colors">
            Vedi tutte le FAQ →
          </Link>
        </p>
        <div className="dm-card p-6 mb-6">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq) => (
              <AccordionItem key={faq.id} id={faq.id} value={faq.id} className="border-b border-border/50">
                <AccordionTrigger className="text-left font-display font-semibold uppercase text-sm tracking-[0.08rem] hover:no-underline py-4">
                  <span className="flex-1">{faq.q}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(`${currentUrl}#${faq.id}`);
                      toast.success("Link copiato!");
                    }}
                    className="ml-3 text-gray-soft hover:text-accent-lime transition-colors text-xs font-mono normal-case tracking-normal"
                    title="Copia link diretto"
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

        {/* CTA BLOCK */}
        <div className="dm-card p-8 flex flex-col md:flex-row items-center justify-between gap-6 bg-accent-dim border-accent-lime/30 mb-8">
          <div>
            <div className="section-label mb-2">// PRONTO A INIZIARE?</div>
            <h2 className="font-display font-black uppercase text-3xl md:text-4xl mb-1">
              Richiedi il tuo report
            </h2>
            <p className="text-gray-soft text-sm max-w-md">
              Hai ancora domande? Scrivimi direttamente nel modulo qui sopra — rispondo entro 48 ore.
            </p>
          </div>
          <a
            href="#contatto"
            className="dm-btn-primary shrink-0"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById("contatto")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Scrivimi ora →
          </a>
        </div>
      </section>
    </PageShell>
  );
}
