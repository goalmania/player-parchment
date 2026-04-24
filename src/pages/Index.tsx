import { Link } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { usePlayers } from "@/lib/usePlayers";
import { TagPill, VerdictBadge } from "@/components/PlayerCard";

export default function Index() {
  const players = usePlayers();
  const total = players.length;
  const buys = players.filter((p) => p.verdict_type === "buy").length;
  const high = players.filter((p) => p.tags.includes("HIGH POTENTIAL")).length;
  const leagues = new Set(players.map((p) => p.league)).size;

  const topPotential = players.filter((p) => p.stars.potential === 5).slice(0, 3);
  const lowCost = players.filter((p) => p.tags.includes("LOW COST")).slice(0, 3);
  const latest = [...players].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);

  return (
    <PageShell>
      {/* HERO */}
      <section className="container pt-12 md:pt-20 pb-16">
        <div className="grid md:grid-cols-2 gap-10 items-end">
          <div className="anim-fade-up">
            <div className="section-label mb-5">// SCOUTING DASHBOARD</div>
            <h1
              className="font-display font-black uppercase leading-[0.95] mb-4"
              style={{ fontSize: "clamp(3rem, 8vw, 7rem)", letterSpacing: "-0.02em" }}
            >
              DM SCOUT
            </h1>
            <p className="text-base md:text-lg text-gray-soft max-w-lg mb-8">
              Analisi tattica e valutazione giocatori — Serie D · Eccellenza · Promozione
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/database" className="dm-btn-primary">Vai al Database →</Link>
              <Link to="/add-report" className="dm-btn-outline">Aggiungi Report +</Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-px bg-border/10 border-hairline anim-fade-up anim-delay-2">
            {[
              { label: "Giocatori totali", value: total },
              { label: "Verdetti BUY", value: buys },
              { label: "High Potential", value: high },
              { label: "Campionati", value: leagues },
            ].map((s) => (
              <div key={s.label} className="bg-background p-6 md:p-8">
                <div className="section-label mb-3">// {s.label}</div>
                <div className="font-mono text-4xl md:text-5xl text-accent-lime leading-none">
                  {String(s.value).padStart(2, "0")}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INSIGHTS */}
      <section className="container pb-24">
        <div className="grid md:grid-cols-3 gap-px bg-border/10 border-hairline">
          {[
            { label: "// Top High Potential", list: topPotential },
            { label: "// Low Cost", list: lowCost },
            { label: "// Ultimi Inseriti", list: latest },
          ].map((col, idx) => (
            <div key={col.label} className="bg-background p-6 anim-fade-up" style={{ animationDelay: `${idx * 60}ms` }}>
              <div className="section-label mb-5">{col.label}</div>
              <div className="flex flex-col">
                {col.list.length === 0 && <div className="text-sm text-gray-soft">Nessun risultato</div>}
                {col.list.map((p) => (
                  <Link
                    key={p.id}
                    to={`/player?id=${p.id}`}
                    className="border-hairline-t first:border-t-0 py-4 flex items-center gap-3 hover:bg-gray-light/50 -mx-3 px-3 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-semibold uppercase truncate">{p.name}</div>
                      <div className="text-xs text-gray-soft truncate">{p.position_main} · {p.club}</div>
                      <div className="mt-1.5 flex gap-1.5">
                        {p.tags.slice(0, 1).map((t) => <TagPill key={t} tag={t} />)}
                        <VerdictBadge type={p.verdict_type} />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-2xl text-accent-lime leading-none">{p.ratings.overall.toFixed(1)}</div>
                      <div className="text-xs text-gray-soft mt-1">→</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
