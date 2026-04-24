import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { readSharedPayloadFromHash } from "@/lib/share";
import { savePlayer } from "@/lib/storage";
import { TagPill, VerdictBadge } from "@/components/PlayerCard";
import Stars from "@/components/Stars";
import Pitch from "@/components/Pitch";
import RadarChart from "@/components/RadarChart";
import HeatmapEditor from "@/components/HeatmapEditor";
import ObservationTimeline from "@/components/ObservationTimeline";
import { toast } from "sonner";
import type { Player } from "@/lib/types";

/**
 * Read-only public view of a player whose data lives entirely in the URL hash.
 * No backend lookup — payload is decoded client-side.
 */
export default function SharedPlayer() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const p = readSharedPayloadFromHash();
    if (!p) {
      setError("Link non valido o scaduto.");
      return;
    }
    setPlayer(p);
  }, []);

  if (error) {
    return (
      <PageShell>
        <div className="container py-24">
          <div className="dm-card p-10 max-w-xl mx-auto text-center">
            <div className="section-label mb-3">// LINK NON VALIDO</div>
            <h2 className="font-display font-bold text-3xl uppercase mb-3">Profilo non disponibile</h2>
            <p className="text-gray-soft mb-6">{error}</p>
            <Link to="/" className="dm-btn-primary">← Torna alla Dashboard</Link>
          </div>
        </div>
      </PageShell>
    );
  }
  if (!player) {
    return (
      <PageShell>
        <div className="container py-24 text-center text-gray-soft">Caricamento profilo condiviso…</div>
      </PageShell>
    );
  }

  const fitColor = (s: number) =>
    s >= 80 ? "hsl(var(--accent))" : s >= 60 ? "hsl(var(--orange))" : "hsl(var(--red))";

  const radarValues = [
    player.ratings.technical, player.ratings.tactical,
    player.ratings.physical, player.ratings.mental,
    player.skills.decision_making / 10, player.stars.potential * 2,
  ];

  const importToDb = () => {
    savePlayer(player);
    toast.success("Giocatore importato nel tuo Database ✓");
  };

  return (
    <PageShell>
      {/* Banner: shared profile */}
      <div className="bg-accent-lime/15 border-hairline-b">
        <div className="container py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="font-mono text-[0.7rem] uppercase tracking-[0.15rem] text-accent-lime">
            ◉ PROFILO CONDIVISO · sola lettura
          </div>
          <button onClick={importToDb} className="dm-btn-outline !py-1 !px-3 text-xs">
            ⬇ Importa nel mio Database
          </button>
        </div>
      </div>

      {/* Header */}
      <section className="container pt-10 pb-8">
        <div className="section-label mb-4">// SCHEDA GIOCATORE · #{player.num}</div>
        <div className="grid md:grid-cols-[auto_1fr_auto] gap-6 items-end">
          {player.photo ? (
            <img src={player.photo} alt={player.name}
                 className="w-[120px] h-[120px] object-cover border-hairline" />
          ) : (
            <div className="w-[120px] h-[120px] border-hairline bg-gray-light flex items-center justify-center font-display font-black text-4xl text-accent-lime">
              {player.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
            </div>
          )}
          <div>
            <h1 className="font-display font-black uppercase leading-[0.95] mb-2"
                style={{ fontSize: "clamp(2.25rem, 6vw, 5rem)" }}>{player.name}</h1>
            <div className="text-gray-soft mb-3">
              {player.flag} {player.nationality} · {player.club} · {player.league} · {player.birth_year}
            </div>
            <div className="flex flex-wrap gap-2">
              {player.tags.map((t) => <TagPill key={t} tag={t} />)}
              <VerdictBadge type={player.verdict_type} />
            </div>
          </div>
          <div className="text-right">
            <div className="section-label mb-1">// OVERALL</div>
            <div className="font-mono text-accent-lime leading-none" style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}>
              {player.ratings.overall.toFixed(1)}
            </div>
          </div>
        </div>
      </section>

      <section className="container pb-10 grid lg:grid-cols-2 gap-px bg-border/10 border-hairline">
        <div className="bg-background p-6">
          <div className="section-label mb-4">// POSIZIONE IN CAMPO</div>
          <Pitch player={player} />
        </div>
        <div className="bg-background p-6">
          <div className="section-label mb-4">// RUOLI TATTICI</div>
          <div className="space-y-5">
            {player.tactical_roles.map((r, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs px-2 py-1 bg-gray-light border-hairline">{r.formation}</span>
                    <span className="font-display font-semibold uppercase">{r.role}</span>
                  </div>
                  <span className="font-mono" style={{ color: fitColor(r.fit_score) }}>{r.fit_score}%</span>
                </div>
                <div className="skill-bar">
                  <span style={{ width: `${r.fit_score}%`, background: fitColor(r.fit_score) }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container pb-10 grid lg:grid-cols-[1fr_1fr] gap-px bg-border/10 border-hairline">
        <div className="bg-background p-6 flex flex-col items-center">
          <div className="section-label self-start mb-4">// RADAR</div>
          <RadarChart
            axes={["Tecnica", "Tattica", "Fisico", "Mentalità", "Decisioni", "Potenziale"]}
            values={radarValues} size={380}
          />
        </div>
        <div className="bg-background p-6">
          <div className="section-label mb-4">// VALUTAZIONE A STELLE</div>
          <div className="space-y-2">
            {([
              ["Tecnica", player.stars.technique],
              ["Atletismo", player.stars.athleticism],
              ["Mentalità", player.stars.mentality],
              ["Potenziale", player.stars.potential],
              ["Valore di Mercato", player.stars.market_value],
            ] as const).map(([label, v]) => (
              <div key={label} className="flex items-center justify-between border-hairline-b pb-2">
                <span className="font-display font-semibold uppercase text-sm">{label}</span>
                <div className="flex items-center gap-3">
                  <Stars value={v} />
                  <span className="font-mono text-xs text-gray-soft">{v}/5</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container pb-10 grid lg:grid-cols-3 gap-px bg-border/10 border-hairline">
        <div className="bg-background p-6">
          <div className="section-label mb-3">// SUMMARY</div>
          <p className="text-foreground/90 leading-relaxed">{player.summary}</p>
        </div>
        <div className="bg-background p-6">
          <div className="section-label mb-4">// PUNTI DI FORZA</div>
          <ul className="space-y-2">
            {player.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-2 inline-block" style={{ width:6, height:6, background:"hsl(var(--accent))", borderRadius:"50%" }} />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-background p-6">
          <div className="section-label mb-4">// AREE DI MIGLIORAMENTO</div>
          <ul className="space-y-2">
            {player.weaknesses.map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-2 inline-block" style={{ width:6, height:6, background:"hsl(var(--red))", borderRadius:"50%" }} />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {player.heatmap && player.heatmap.length > 0 && (
        <section className="container pb-10">
          <div className="section-label mb-3">// MAPPA DI CALORE</div>
          <div className="grid lg:grid-cols-[420px_1fr] gap-6 items-start">
            <HeatmapEditor value={player.heatmap} readOnly height={460} />
            <div className="text-sm text-gray-soft">
              Zone in cui il giocatore opera con maggiore frequenza.
            </div>
          </div>
        </section>
      )}

      {player.observations && player.observations.length > 0 && (
        <section className="container pb-10">
          <div className="section-label mb-3">// TIMELINE OSSERVAZIONI</div>
          <ObservationTimeline observations={player.observations} />
        </section>
      )}

      <section className="container pb-16">
        <div className="dm-card p-6 text-center">
          <p className="text-gray-soft mb-4">Vuoi avere il tuo database scout?</p>
          <Link to="/" className="dm-btn-primary">Scopri DM Scout</Link>
        </div>
      </section>
    </PageShell>
  );
}
