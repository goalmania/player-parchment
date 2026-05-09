import { useState } from "react";
import PageShell from "@/components/PageShell";
import { toast } from "sonner";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", type: "Report Singolo", message: "" });

  const send = () => {
    if (!form.name || !form.email || !form.message) { toast.error("Compila tutti i campi"); return; }
    const subject = encodeURIComponent(`[DM Scout] ${form.type} — ${form.name}`);
    const body = encodeURIComponent(`Da: ${form.name} <${form.email}>\nTipo: ${form.type}\n\n${form.message}`);
    window.location.href = `mailto:contact@dmscout.it?subject=${subject}&body=${body}`;
    toast.success("Apertura client email…");
  };

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

        <div className="grid md:grid-cols-3 gap-px bg-border/10 border-hairline mb-12">
          {[
            { k: "Email", v: "contact@dmscout.it" },
            { k: "Posizione", v: "Puglia, Italia" },
            { k: "LinkedIn", v: "linkedin.com/in/dmscout" },
          ].map((c) => (
            <div key={c.k} className="bg-background p-5">
              <div className="section-label mb-2">// {c.k}</div>
              <div className="font-display font-semibold uppercase">{c.v}</div>
            </div>
          ))}
        </div>

        <div className="section-label mb-4">// SERVIZI</div>
        <div className="grid md:grid-cols-3 gap-px bg-border/10 border-hairline mb-12">
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

        <div className="section-label mb-4">// DOMANDE FREQUENTI</div>
        <div className="dm-card p-6 mb-12">
          <Accordion type="single" collapsible className="w-full">
            {[
              { q: "Cosa include un Report Singolo?", a: "Ogni report include scheda anagrafica, profilo tattico con ruoli, valutazione radar (6 assi), skills tecniche (0-100), stelle potenziale, heatmap di posizione, punti di forza e debolezza, verdetto finale con valutazione di mercato e video highlights quando disponibili." },
              { q: "Quanto tempo ci vuole per ricevere un report?", a: "I report singoli vengono consegnati entro 5-7 giorni lavorativi dalla conferma. I pacchetti osservazioni richiedono circa 3 settimane. La consulenza continuativa prevede report settimanali con tempistiche concordate." },
              { q: "Posso richiedere l'analisi di un giocatore specifico?", a: "Certo. Puoi indicare nome, club e campionato nel modulo di contatto o caricare direttamente materiale video tramite la piattaforma. Il report verrà redatto su misura seguendo i parametri tattici richiesti." },
              { q: "Che differenza c'è tra i tre servizi?", a: "Il Report Singolo è ideale per un'occhiata puntuale su un target. Il Pacchetto Osservazioni offre 5 report scontati per coprire un reparto o un profilo specifico. La Consulenza Continuativa è un abbonamento mensile con database condiviso e supporto al direttore sportivo." },
              { q: "I dati e i report sono aggiornati?", a: "Tutti i report si basano su osservazioni dirette e dati della stagione in corso. I parametri tecnico-tattici, le statistiche e i valori di mercato vengono rivisti al momento della redazione per garantire il massimo aggiornamento." },
              { q: "Come funziona il Marketplace?", a: "Il Marketplace è la vetrina pubblica dove vengono pubblicate schede giocatori selezionate. I club e gli osservatori possono richiedere l'accesso completo: una volta approvati, il giocatore compare nella sezione 'Sbloccati' con tutti i dettagli." },
              { q: "È possibile esportare i report?", a: "Sì. Ogni scheda giocatore è esportabile in PDF e CSV. Inoltre è possibile stampare una versione ottimizzata del profilo e condividere un link pubblico con altri membri dello staff." },
              { q: "Lavori solo con club professionistici?", a: "No. DM Scout collabora con club professionistici, semiprofessionistici, agenzie e direttori sportivi di ogni livello. Ogni servizio viene scalato in base alle esigenze e al budget del cliente." },
            ].map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-b border-border/50">
                <AccordionTrigger className="text-left font-display font-semibold uppercase text-sm tracking-[0.08rem] hover:no-underline py-4">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-gray-soft text-sm leading-relaxed pb-4">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        <div className="section-label mb-4">// SCRIVIMI</div>
        <div className="dm-card p-6 grid md:grid-cols-2 gap-4">
          <input className="dm-input" placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="dm-input" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <select className="dm-input md:col-span-2" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option>Report Singolo</option><option>Pacchetto Osservazioni</option><option>Consulenza Continuativa</option><option>Altro</option>
          </select>
          <textarea className="dm-input md:col-span-2" rows={5} placeholder="Messaggio" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          <div className="md:col-span-2">
            <button onClick={send} className="dm-btn-primary">Invia →</button>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
