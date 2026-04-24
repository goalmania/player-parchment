import { useState } from "react";
import PageShell from "@/components/PageShell";
import { toast } from "sonner";

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
