import { useMemo, useState } from "react";
import PageShell from "@/components/PageShell";
import { usePlayers } from "@/lib/usePlayers";
import type { Player } from "@/lib/types";

/**
 * Match Planner: pick own XI vs opponent XI, get a tactical SWOT-style matchup briefing.
 * Stays fully client-side; uses player ratings & roles.
 */
const STORAGE_KEY = "dmscout_match_plan";
type Plan = { ours: string[]; theirs: string[]; opponentName: string; notes: string };

function load(): Plan {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r); } catch {}
  return { ours: [], theirs: [], opponentName: "Avversario", notes: "" };
}
function save(p: Plan) { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); }

function avg(list: Player[], key: "technical" | "tactical" | "physical" | "mental" | "overall") {
  if (!list.length) return 0;
  return list.reduce((s, p) => s + p.ratings[key], 0) / list.length;
}

export default function MatchPlanner() {
  const players = usePlayers();
  const [plan, setPlan] = useState<Plan>(load());

  const update = (next: Plan) => { setPlan(next); save(next); };

  const ours = useMemo(() => plan.ours.map((id) => players.find((p) => p.id === id)).filter(Boolean) as Player[], [plan, players]);
  const theirs = useMemo(() => plan.theirs.map((id) => players.find((p) => p.id === id)).filter(Boolean) as Player[], [plan, players]);

  const matchup = useMemo(() => {
    if (!ours.length || !theirs.length) return null;
    const dims = ["overall", "technical", "tactical", "physical", "mental"] as const;
    return dims.map((d) => ({
      key: d,
      ours: avg(ours, d),
      theirs: avg(theirs, d),
    }));
  }, [ours, theirs]);

  const briefing = useMemo(() => {
    if (!matchup) return null;
    const us = matchup.find((m) => m.key === "overall")!;
    const diff = us.ours - us.theirs;
    const verdict = diff > 0.3 ? "Favoriti" : diff < -0.3 ? "Sfavoriti" : "Equilibrio";
    const adv = matchup.filter((m) => m.ours - m.theirs >= 0.3).map((m) => m.key);
    const dis = matchup.filter((m) => m.theirs - m.ours >= 0.3).map((m) => m.key);
    return { verdict, diff, adv, dis };
  }, [matchup]);

  const toggle = (which: "ours" | "theirs", id: string) => {
    const arr = plan[which].includes(id) ? plan[which].filter((x) => x !== id) : [...plan[which], id];
    update({ ...plan, [which]: arr });
  };

  return (
    <PageShell>
      <section className="container pt-10 pb-6">
        <div className="section-label mb-3">// MATCH PLANNER</div>
        <h1 className="font-display font-black uppercase text-4xl md:text-6xl mb-2">Briefing Pre-partita</h1>
        <p className="text-gray-soft">Seleziona la nostra XI ideale e una rosa avversaria stimata per generare il dossier.</p>
      </section>

      <section className="container pb-6 flex flex-wrap gap-3 items-center">
        <input
          className="dm-input max-w-sm"
          placeholder="Nome avversario"
          value={plan.opponentName}
          onChange={(e) => update({ ...plan, opponentName: e.target.value })}
        />
        <button onClick={() => update({ ours: [], theirs: [], opponentName: "Avversario", notes: "" })} className="dm-btn-outline !py-1.5 !px-3 text-xs">
          Reset piano
        </button>
      </section>

      <section className="container pb-12 grid md:grid-cols-2 gap-px bg-border/10 border-hairline">
        {/* Our roster */}
        <div className="bg-background p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="section-label">// LA NOSTRA XI ({ours.length})</div>
            <span className="font-mono text-xs text-accent-lime">Ø {avg(ours, "overall").toFixed(2)}</span>
          </div>
          <div className="max-h-[420px] overflow-y-auto space-y-1">
            {players.map((p) => {
              const sel = plan.ours.includes(p.id);
              return (
                <button key={p.id} onClick={() => toggle("ours", p.id)} className={`w-full p-2 text-left flex items-center gap-2 border-hairline hover:bg-gray-light ${sel ? "bg-accent-dim" : ""}`}>
                  <span className="font-mono text-xs w-8 text-accent-lime">{p.ratings.overall.toFixed(1)}</span>
                  <span className="flex-1 truncate text-sm font-display font-semibold uppercase">{p.name}</span>
                  <span className="font-mono text-[10px] text-gray-soft">{p.position_code}</span>
                  <span className="font-mono text-[10px]">{sel ? "✓" : ""}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Opponent roster */}
        <div className="bg-background p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="section-label">// {plan.opponentName.toUpperCase()} XI ({theirs.length})</div>
            <span className="font-mono text-xs text-accent-teal">Ø {avg(theirs, "overall").toFixed(2)}</span>
          </div>
          <div className="max-h-[420px] overflow-y-auto space-y-1">
            {players.map((p) => {
              const sel = plan.theirs.includes(p.id);
              return (
                <button key={p.id} onClick={() => toggle("theirs", p.id)} className={`w-full p-2 text-left flex items-center gap-2 border-hairline hover:bg-gray-light ${sel ? "bg-accent2-dim" : ""}`}>
                  <span className="font-mono text-xs w-8 text-accent-teal">{p.ratings.overall.toFixed(1)}</span>
                  <span className="flex-1 truncate text-sm font-display font-semibold uppercase">{p.name}</span>
                  <span className="font-mono text-[10px] text-gray-soft">{p.position_code}</span>
                  <span className="font-mono text-[10px]">{sel ? "✓" : ""}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Briefing */}
      {briefing && matchup && (
        <section className="container pb-16 space-y-6">
          <div className="grid md:grid-cols-3 gap-px bg-border/10 border-hairline">
            <div className="bg-background p-5">
              <div className="section-label mb-2">// VERDETTO</div>
              <div className="font-display font-black text-3xl uppercase mb-1" style={{ color: briefing.diff > 0 ? "hsl(var(--accent))" : briefing.diff < 0 ? "hsl(var(--red))" : "hsl(var(--orange))" }}>
                {briefing.verdict}
              </div>
              <div className="font-mono text-sm text-gray-soft">Δ Overall: {briefing.diff > 0 ? "+" : ""}{briefing.diff.toFixed(2)}</div>
            </div>
            <div className="bg-background p-5">
              <div className="section-label mb-2">// VANTAGGI</div>
              {briefing.adv.length === 0 ? <div className="text-sm text-gray-soft">Nessun vantaggio netto.</div> : (
                <ul className="space-y-1 text-sm">{briefing.adv.map((k) => <li key={k} className="text-accent-lime">✓ {k.toUpperCase()}</li>)}</ul>
              )}
            </div>
            <div className="bg-background p-5">
              <div className="section-label mb-2">// CRITICITÀ</div>
              {briefing.dis.length === 0 ? <div className="text-sm text-gray-soft">Nessuna criticità rilevante.</div> : (
                <ul className="space-y-1 text-sm">{briefing.dis.map((k) => <li key={k} className="text-red">⚠ {k.toUpperCase()}</li>)}</ul>
              )}
            </div>
          </div>

          {/* Comparison bars */}
          <div className="border-hairline p-6">
            <div className="section-label mb-4">// CONFRONTO PER REPARTI</div>
            <div className="space-y-4">
              {matchup.map((m) => {
                const tot = m.ours + m.theirs || 1;
                const oursPct = (m.ours / tot) * 100;
                return (
                  <div key={m.key}>
                    <div className="flex justify-between text-xs font-mono uppercase tracking-[0.12rem] mb-1">
                      <span className="text-accent-lime">{m.ours.toFixed(2)}</span>
                      <span className="text-gray-soft">{m.key}</span>
                      <span className="text-accent-teal">{m.theirs.toFixed(2)}</span>
                    </div>
                    <div className="h-2 flex border-hairline">
                      <div style={{ width: `${oursPct}%`, background: "hsl(var(--accent))" }} />
                      <div style={{ width: `${100 - oursPct}%`, background: "hsl(var(--accent2))" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <div className="section-label mb-2">// NOTE TATTICHE</div>
            <textarea
              className="dm-input w-full min-h-[120px]"
              placeholder="Appunti, marcature, palle inattive…"
              value={plan.notes}
              onChange={(e) => update({ ...plan, notes: e.target.value })}
            />
          </div>
        </section>
      )}
    </PageShell>
  );
}
