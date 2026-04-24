import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { usePlayers } from "@/lib/usePlayers";
import { popCompareSeed } from "@/lib/storage";
import RadarChart from "@/components/RadarChart";
import Pitch from "@/components/Pitch";
import { TagPill, VerdictBadge } from "@/components/PlayerCard";
import type { Player } from "@/lib/types";

export default function Compare() {
  const players = usePlayers();
  const [aId, setAId] = useState<string>("");
  const [bId, setBId] = useState<string>("");

  useEffect(() => {
    const seeded = popCompareSeed();
    if (seeded) setAId(seeded);
    else if (players[0]) setAId(players[0].id);
    if (players[1]) setBId(players[1].id);
  }, []); // eslint-disable-line

  const a = useMemo(() => players.find((p) => p.id === aId), [players, aId]);
  const b = useMemo(() => players.find((p) => p.id === bId), [players, bId]);

  const radarValues = (p: Player) => [
    p.ratings.technical, p.ratings.tactical, p.ratings.physical, p.ratings.mental,
    p.skills.decision_making / 10, p.stars.potential * 2,
  ];

  const initials = (name: string) => name.split(" ").map((s) => s[0]).slice(0, 2).join("");

  const cellTone = (av?: number, bv?: number, side: "a" | "b" = "a") => {
    if (av == null || bv == null) return "";
    if (av === bv) return "";
    const winner = av > bv ? "a" : "b";
    if (side !== winner) return "";
    return side === "a" ? "text-accent-lime bg-accent-dim" : "text-accent-teal bg-accent2-dim";
  };

  return (
    <PageShell>
      <section className="container py-10">
        <div className="section-label mb-3">// COMPARATORE GIOCATORI</div>
        <h1 className="font-display font-black uppercase text-4xl md:text-5xl mb-6">Confronta 2 Profili</h1>

        <div className="grid md:grid-cols-3 gap-3 mb-8 items-center">
          <select className="dm-input" value={aId} onChange={(e) => setAId(e.target.value)}>
            <option value="">— Seleziona Player A —</option>
            {players.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.club}</option>)}
          </select>
          <div className="text-center font-mono text-xs uppercase tracking-[0.2rem] text-gray-soft">VS</div>
          <select className="dm-input" value={bId} onChange={(e) => setBId(e.target.value)}>
            <option value="">— Seleziona Player B —</option>
            {players.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.club}</option>)}
          </select>
        </div>

        {a && b && (
          <>
            {/* Header cards */}
            <div className="grid md:grid-cols-3 gap-px bg-border/10 border-hairline mb-6">
              <div className="bg-background p-5">
                <div className="section-label mb-1">// PLAYER A</div>
                <h3 className="font-display font-bold text-2xl uppercase">{a.name}</h3>
                <div className="text-sm text-gray-soft">{a.club} · {a.position_main}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">{a.tags.slice(0, 2).map((t) => <TagPill key={t} tag={t} />)}<VerdictBadge type={a.verdict_type} /></div>
                <div className="font-mono text-3xl text-accent-lime mt-3">{a.ratings.overall.toFixed(1)}</div>
              </div>
              <div className="bg-background p-5 flex flex-col items-center justify-center">
                <RadarChart
                  axes={["Tec","Tat","Fis","Men","Dec","Pot"]}
                  series={[
                    { values: radarValues(a), fill: "rgba(200,240,0,0.15)", stroke: "hsl(71 100% 47%)" },
                    { values: radarValues(b), fill: "rgba(0,200,160,0.15)", stroke: "hsl(167 100% 39%)" },
                  ]}
                  size={340}
                />
                <div className="flex gap-4 mt-2 text-xs font-mono">
                  <span className="flex items-center gap-2"><span className="inline-block" style={{ width:10, height:10, background:"hsl(71 100% 47%)" }} />{a.name.split(" ")[0]}</span>
                  <span className="flex items-center gap-2"><span className="inline-block" style={{ width:10, height:10, background:"hsl(167 100% 39%)" }} />{b.name.split(" ")[0]}</span>
                </div>
              </div>
              <div className="bg-background p-5 text-right">
                <div className="section-label mb-1">// PLAYER B</div>
                <h3 className="font-display font-bold text-2xl uppercase">{b.name}</h3>
                <div className="text-sm text-gray-soft">{b.club} · {b.position_main}</div>
                <div className="mt-2 flex flex-wrap justify-end gap-1.5">{b.tags.slice(0, 2).map((t) => <TagPill key={t} tag={t} />)}<VerdictBadge type={b.verdict_type} /></div>
                <div className="font-mono text-3xl text-accent-teal mt-3">{b.ratings.overall.toFixed(1)}</div>
              </div>
            </div>

            {/* Comparison table */}
            <div className="border-hairline mb-8">
              <table className="w-full text-sm">
                <tbody>
                  {[
                    ["Technical", a.ratings.technical, b.ratings.technical],
                    ["Tactical", a.ratings.tactical, b.ratings.tactical],
                    ["Physical", a.ratings.physical, b.ratings.physical],
                    ["Mental", a.ratings.mental, b.ratings.mental],
                    ["Overall", a.ratings.overall, b.ratings.overall],
                    ["Potenziale (★)", a.stars.potential, b.stars.potential],
                    ["Valore Min €", a.market.value_min, b.market.value_min],
                  ].map(([label, av, bv]) => (
                    <tr key={label as string} className="border-hairline-b">
                      <td className={`p-3 font-mono text-right w-1/3 ${cellTone(av as number, bv as number, "a")}`}>
                        {typeof av === "number" && av >= 1000 ? av.toLocaleString("it-IT") : (av as number).toString()}
                      </td>
                      <td className="p-3 text-center font-display font-semibold uppercase text-xs tracking-[0.12rem] text-gray-soft">{label}</td>
                      <td className={`p-3 font-mono w-1/3 ${cellTone(av as number, bv as number, "b")}`}>
                        {typeof bv === "number" && bv >= 1000 ? bv.toLocaleString("it-IT") : (bv as number).toString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Skills bars */}
            <div className="section-label mb-3">// SKILLS</div>
            <div className="space-y-3 mb-8">
              {(Object.keys(a.skills) as (keyof Player["skills"])[]).map((k) => (
                <div key={k} className="grid grid-cols-[1fr_120px_1fr] gap-3 items-center">
                  <div className="skill-bar" style={{ transform: "scaleX(-1)" }}>
                    <span style={{ width: `${a.skills[k]}%`, background: "linear-gradient(90deg, hsl(var(--gray-mid)), hsl(71 100% 47%))" }} />
                  </div>
                  <div className="text-center text-xs font-mono uppercase tracking-[0.12rem] text-gray-soft">
                    <span className="text-accent-lime">{a.skills[k]}</span> · {k.replace("_", " ")} · <span className="text-accent-teal">{b.skills[k]}</span>
                  </div>
                  <div className="skill-bar">
                    <span style={{ width: `${b.skills[k]}%`, background: "linear-gradient(90deg, hsl(var(--gray-mid)), hsl(167 100% 39%))" }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Pitch */}
            <div className="section-label mb-3">// POSIZIONI</div>
            <div className="border-hairline p-4 mb-8">
              <Pitch
                pairs={[
                  { player: a, color: "hsl(71 100% 47%)", initials: initials(a.name) },
                  { player: b, color: "hsl(167 100% 39%)", initials: initials(b.name) },
                ]}
              />
            </div>

            {/* Verdicts */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-5" style={{ borderLeft: "4px solid hsl(71 100% 47%)", background: "hsl(71 100% 47% / 0.08)" }}>
                <div className="font-mono text-xs uppercase tracking-[0.18rem] text-accent-lime mb-2">{a.name} · {a.verdict_type.toUpperCase()}</div>
                <p>{a.verdict}</p>
              </div>
              <div className="p-5" style={{ borderLeft: "4px solid hsl(167 100% 39%)", background: "hsl(167 100% 39% / 0.08)" }}>
                <div className="font-mono text-xs uppercase tracking-[0.18rem] text-accent-teal mb-2">{b.name} · {b.verdict_type.toUpperCase()}</div>
                <p>{b.verdict}</p>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <Link to={`/player?id=${a.id}`} className="dm-btn-outline">→ Scheda {a.name.split(" ")[0]}</Link>
              <Link to={`/player?id=${b.id}`} className="dm-btn-outline">→ Scheda {b.name.split(" ")[0]}</Link>
            </div>
          </>
        )}

        {(!a || !b) && (
          <div className="dm-card p-10 text-center text-gray-soft">Seleziona due giocatori per iniziare il confronto.</div>
        )}
      </section>
    </PageShell>
  );
}
