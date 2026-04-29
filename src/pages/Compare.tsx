import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { usePlayers } from "@/lib/usePlayers";
import { popCompareSeed } from "@/lib/storage";
import RadarChart from "@/components/RadarChart";
import { TagPill, VerdictBadge } from "@/components/PlayerCard";
import type { Player, PlayerStats } from "@/lib/types";
import { STATS_GROUPS, STATS_MATCH_GROUPS, POSITION_CODES, POSITION_LABEL } from "@/lib/types";
import { toast } from "sonner";

const PALETTE = [
  "hsl(71 100% 47%)",   // lime
  "hsl(167 100% 39%)",  // teal
  "hsl(28 100% 55%)",   // orange
  "hsl(330 90% 60%)",   // pink
  "hsl(220 90% 60%)",   // blue
  "hsl(48 100% 55%)",   // yellow
];

const MAX_PLAYERS = 6;

export default function Compare() {
  const players = usePlayers();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pickerId, setPickerId] = useState<string>("");
  const [statsScope, setStatsScope] = useState<"season" | "match">("season");
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerPos, setPickerPos] = useState<string>("all");
  const [pickerClub, setPickerClub] = useState<string>("all");
  const [exporting, setExporting] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Seed dal database con eventuale player iniziale
  useEffect(() => {
    if (selectedIds.length > 0 || players.length === 0) return;
    const seeded = popCompareSeed();
    const initial: string[] = [];
    if (seeded && players.find((p) => p.id === seeded)) initial.push(seeded);
    for (const p of players) {
      if (initial.length >= 2) break;
      if (!initial.includes(p.id)) initial.push(p.id);
    }
    setSelectedIds(initial);
  }, [players]); // eslint-disable-line

  const selected = useMemo(
    () => selectedIds.map((id) => players.find((p) => p.id === id)).filter(Boolean) as Player[],
    [selectedIds, players]
  );

  const clubOptions = useMemo(
    () => Array.from(new Set(players.map((p) => p.club).filter(Boolean))).sort(),
    [players]
  );

  const available = useMemo(
    () => players.filter((p) => {
      if (selectedIds.includes(p.id)) return false;
      if (pickerPos !== "all" && p.position_code !== pickerPos) return false;
      if (pickerClub !== "all" && p.club !== pickerClub) return false;
      if (pickerSearch) {
        const s = pickerSearch.toLowerCase();
        if (![p.name, p.club, p.position_main].some((v) => (v || "").toLowerCase().includes(s))) return false;
      }
      return true;
    }),
    [players, selectedIds, pickerPos, pickerClub, pickerSearch]
  );

  const addPlayer = () => {
    if (!pickerId || selectedIds.length >= MAX_PLAYERS) return;
    setSelectedIds((s) => [...s, pickerId]);
    setPickerId("");
  };
  const removePlayer = (id: string) => setSelectedIds((s) => s.filter((x) => x !== id));

  const exportPDF = async () => {
    if (!exportRef.current || selected.length < 2) return;
    setExporting(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      // Aspetta paint
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: "#0a0a0a",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;

      let heightLeft = imgH;
      let position = 0;
      pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        position = heightLeft - imgH;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
        heightLeft -= pageH;
      }
      const names = selected.map((p) => p.name.split(" ")[0]).join("-vs-");
      pdf.save(`confronto-${names}-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("PDF esportato ✓");
    } catch (e: any) {
      toast.error(e?.message || "Export PDF fallito");
    } finally {
      setExporting(false);
    }
  };

  const colorFor = (i: number) => PALETTE[i % PALETTE.length];

  const radarValues = (p: Player) => [
    p.ratings.technical,
    p.ratings.tactical,
    p.ratings.physical,
    p.ratings.mental,
    p.skills.decision_making / 10,
    p.stars.potential * 2,
  ];

  // Highlight value = max in row (winner). Returns true if value is the (unique) max.
  const isWinner = (vals: (number | null | undefined)[], idx: number, higherIsBetter = true) => {
    const numeric = vals.map((v) => (typeof v === "number" && !isNaN(v) ? v : null));
    const valid = numeric.filter((v): v is number => v !== null);
    if (valid.length < 2) return false;
    const target = higherIsBetter ? Math.max(...valid) : Math.min(...valid);
    return numeric[idx] === target;
  };

  const ratingRows: { label: string; key: (p: Player) => number; lowerBetter?: boolean }[] = [
    { label: "Overall", key: (p) => p.ratings.overall },
    { label: "Tecnica", key: (p) => p.ratings.technical },
    { label: "Tattica", key: (p) => p.ratings.tactical },
    { label: "Fisico", key: (p) => p.ratings.physical },
    { label: "Mentalità", key: (p) => p.ratings.mental },
    { label: "Età", key: (p) => p.age, lowerBetter: true },
    { label: "Altezza (cm)", key: (p) => p.height },
    { label: "Potenziale ★", key: (p) => p.stars.potential },
    { label: "Valore Min €", key: (p) => p.market.value_min, lowerBetter: true },
    { label: "Valore Max €", key: (p) => p.market.value_max },
  ];

  const skillKeys = useMemo(() => {
    if (selected.length === 0) return [] as (keyof Player["skills"])[];
    return Object.keys(selected[0].skills) as (keyof Player["skills"])[];
  }, [selected]);

  const statGroups = statsScope === "season" ? STATS_GROUPS : STATS_MATCH_GROUPS;
  // "Lower is better" per alcune metriche
  const LOWER_BETTER: (keyof PlayerStats)[] = [
    "yellow_cards", "red_cards", "fouls_committed", "goals_conceded",
    "m_yellow_cards", "m_red_cards", "m_goals_conceded",
  ];

  return (
    <PageShell>
      <section className="container py-10">
        <div className="section-label mb-3">// COMPARATORE GIOCATORI</div>
        <h1 className="font-display font-black uppercase text-4xl md:text-5xl mb-2">Confronto Parallelo</h1>
        <p className="text-gray-soft mb-6">
          Confronta fino a {MAX_PLAYERS} giocatori in parallelo. I valori migliori sono evidenziati riga per riga.
        </p>

        {/* SELECTOR */}
        <div className="border-hairline p-4 mb-6 bg-gray-light/40 space-y-3">
          <div className="flex flex-wrap gap-2 min-h-[36px]">
            {selected.length === 0 && (
              <span className="text-xs font-mono text-gray-soft self-center">Nessun giocatore selezionato</span>
            )}
            {selected.map((p, i) => (
              <span key={p.id}
                className="inline-flex items-center gap-2 px-3 py-1.5 border-hairline font-mono text-xs"
                style={{ borderLeft: `4px solid ${colorFor(i)}` }}>
                <span className="font-display font-semibold uppercase">{p.name}</span>
                <span className="text-gray-soft">· {p.club || "—"}</span>
                <button onClick={() => removePlayer(p.id)} className="opacity-60 hover:opacity-100 ml-1">✕</button>
              </span>
            ))}
          </div>
          {selected.length < MAX_PLAYERS && (
            <div className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  className="dm-input"
                  placeholder="🔍 Cerca nome, club, ruolo…"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                />
                <select className="dm-input" value={pickerPos} onChange={(e) => setPickerPos(e.target.value)}>
                  <option value="all">Tutti i ruoli</option>
                  {POSITION_CODES.map((c) => <option key={c} value={c}>{c} · {POSITION_LABEL[c]}</option>)}
                </select>
                <select className="dm-input" value={pickerClub} onChange={(e) => setPickerClub(e.target.value)}>
                  <option value="all">Tutti i club</option>
                  {clubOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <select className="dm-input flex-1" value={pickerId} onChange={(e) => setPickerId(e.target.value)}>
                  <option value="">— Aggiungi giocatore ({available.length} disponibili) —</option>
                  {available.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.club || "—"} · {p.position_main}</option>)}
                </select>
                <button onClick={addPlayer} disabled={!pickerId} className="dm-btn-primary disabled:opacity-50">+ Aggiungi</button>
                {selected.length > 0 && (
                  <button onClick={() => setSelectedIds([])} className="dm-btn-outline">Pulisci</button>
                )}
              </div>
              {(pickerPos !== "all" || pickerClub !== "all" || pickerSearch) && (
                <button
                  onClick={() => { setPickerSearch(""); setPickerPos("all"); setPickerClub("all"); }}
                  className="text-xs font-mono text-gray-soft hover:text-foreground underline"
                >↺ Reset filtri ricerca</button>
              )}
            </div>
          )}
          {selected.length >= MAX_PLAYERS && (
            <div className="text-xs font-mono text-gray-soft">Limite massimo raggiunto ({MAX_PLAYERS}).</div>
          )}
        </div>

        {selected.length >= 2 && (
          <div className="flex justify-end mb-4">
            <button onClick={exportPDF} disabled={exporting} className="dm-btn-primary disabled:opacity-50">
              {exporting ? "Esportazione…" : "📄 Esporta PDF"}
            </button>
          </div>
        )}

        {selected.length < 2 && (
          <div className="dm-card p-10 text-center text-gray-soft">
            Seleziona almeno 2 giocatori per iniziare il confronto.
          </div>
        )}

        {selected.length >= 2 && (
          <div ref={exportRef} className="bg-background">
            {/* HEADER CARDS */}
            <div className="grid gap-px bg-border/10 border-hairline mb-6"
              style={{ gridTemplateColumns: `repeat(${selected.length}, minmax(0, 1fr))` }}>
              {selected.map((p, i) => (
                <div key={p.id} className="bg-background p-5" style={{ borderTop: `4px solid ${colorFor(i)}` }}>
                  <div className="section-label mb-1" style={{ color: colorFor(i) }}>// PLAYER {i + 1}</div>
                  <h3 className="font-display font-bold text-xl uppercase truncate">{p.name}</h3>
                  <div className="text-xs text-gray-soft truncate">{p.club || "—"} · {p.position_main}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {p.tags.slice(0, 1).map((t) => <TagPill key={t} tag={t} />)}
                    <VerdictBadge type={p.verdict_type} />
                  </div>
                  <div className="font-mono text-3xl mt-3" style={{ color: colorFor(i) }}>
                    {p.ratings.overall.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>

            {/* RADAR */}
            <div className="border-hairline p-4 mb-8 flex flex-col items-center">
              <div className="section-label mb-3 self-start">// RADAR ATTRIBUTI</div>
              <RadarChart
                axes={["Tec", "Tat", "Fis", "Men", "Dec", "Pot"]}
                series={selected.map((p, i) => ({
                  values: radarValues(p),
                  fill: `${colorFor(i).replace("hsl", "hsla").replace(")", " / 0.12)")}`,
                  stroke: colorFor(i),
                }))}
                size={380}
              />
              <div className="flex flex-wrap justify-center gap-4 mt-3 text-xs font-mono">
                {selected.map((p, i) => (
                  <span key={p.id} className="flex items-center gap-2">
                    <span className="inline-block" style={{ width: 10, height: 10, background: colorFor(i) }} />
                    {p.name}
                  </span>
                ))}
              </div>
            </div>

            {/* RATINGS TABLE */}
            <div className="section-label mb-3">// VALUTAZIONI & ANAGRAFICA</div>
            <div className="border-hairline mb-8 overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="border-hairline-b bg-gray-light/40">
                    <th className="p-3 text-left text-xs font-mono uppercase tracking-[0.12rem] text-gray-soft">Metrica</th>
                    {selected.map((p, i) => (
                      <th key={p.id} className="p-3 text-center text-xs font-display font-bold uppercase truncate"
                        style={{ color: colorFor(i) }}>{p.name.split(" ")[0]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ratingRows.map((row) => {
                    const vals = selected.map((p) => row.key(p));
                    return (
                      <tr key={row.label} className="border-hairline-b">
                        <td className="p-3 font-display font-semibold uppercase text-xs tracking-[0.12rem] text-gray-soft">
                          {row.label}
                        </td>
                        {selected.map((p, i) => {
                          const win = isWinner(vals, i, !row.lowerBetter);
                          const v = vals[i];
                          return (
                            <td key={p.id} className="p-3 text-center font-mono"
                              style={win ? { color: colorFor(i), background: `${colorFor(i).replace(")", " / 0.10)").replace("hsl", "hsla")}`, fontWeight: 700 } : undefined}>
                              {typeof v === "number" && v >= 1000 ? v.toLocaleString("it-IT") : v}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* SKILLS */}
            <div className="section-label mb-3">// SKILLS (0-100)</div>
            <div className="border-hairline mb-8 p-4 space-y-4">
              {skillKeys.map((k) => {
                const vals = selected.map((p) => p.skills[k]);
                return (
                  <div key={k}>
                    <div className="flex justify-between mb-1.5">
                      <span className="font-display font-semibold uppercase text-sm">{k.replace(/_/g, " ")}</span>
                    </div>
                    <div className="space-y-1.5">
                      {selected.map((p, i) => {
                        const win = isWinner(vals, i, true);
                        return (
                          <div key={p.id} className="grid grid-cols-[80px_1fr_40px] items-center gap-2">
                            <span className="text-xs font-mono text-gray-soft truncate" style={{ color: colorFor(i) }}>
                              {p.name.split(" ")[0]}
                            </span>
                            <div className="h-2 bg-gray-light/40 relative">
                              <span className="absolute inset-y-0 left-0" style={{
                                width: `${vals[i]}%`,
                                background: colorFor(i),
                                boxShadow: win ? `0 0 6px ${colorFor(i)}` : undefined,
                              }} />
                            </div>
                            <span className="text-xs font-mono text-right" style={win ? { color: colorFor(i), fontWeight: 700 } : undefined}>
                              {vals[i]}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* STATISTICHE */}
            <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
              <div className="section-label">// STATISTICHE</div>
              <div className="flex border-hairline">
                <button onClick={() => setStatsScope("season")}
                  className={`px-4 py-2 font-mono text-xs uppercase tracking-[0.12rem] ${statsScope === "season" ? "bg-accent text-background" : "text-gray-soft"}`}>
                  📅 Stagione
                </button>
                <button onClick={() => setStatsScope("match")}
                  className={`px-4 py-2 font-mono text-xs uppercase tracking-[0.12rem] ${statsScope === "match" ? "bg-accent text-background" : "text-gray-soft"}`}>
                  ⚽ Ultima partita
                </button>
              </div>
            </div>

            <div className="border-hairline mb-8 overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-hairline-b bg-gray-light/40">
                    <th className="p-3 text-left text-xs font-mono uppercase tracking-[0.12rem] text-gray-soft">Metrica</th>
                    {selected.map((p, i) => (
                      <th key={p.id} className="p-3 text-center text-xs font-display font-bold uppercase truncate"
                        style={{ color: colorFor(i) }}>{p.name.split(" ")[0]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {statGroups.map((group) => {
                    // Filtra i field in cui almeno un giocatore ha un valore
                    const rows = group.fields.filter(({ k }) =>
                      selected.some((p) => {
                        const v = p.stats?.[k];
                        return v !== undefined && v !== null;
                      })
                    );
                    if (rows.length === 0) return null;
                    return (
                      <>
                        <tr key={`h-${group.key}`} className="bg-gray-light/20 border-hairline-b">
                          <td colSpan={selected.length + 1}
                            className="p-2 px-3 text-[0.65rem] font-mono uppercase tracking-[0.18rem] text-accent-lime">
                            {group.label}
                          </td>
                        </tr>
                        {rows.map(({ k, label, unit }) => {
                          const vals = selected.map((p) => {
                            const v = p.stats?.[k];
                            return typeof v === "number" ? v : null;
                          });
                          const higher = !LOWER_BETTER.includes(k);
                          return (
                            <tr key={k as string} className="border-hairline-b">
                              <td className="p-3 font-display font-semibold uppercase text-xs tracking-[0.12rem] text-gray-soft">
                                {label}{unit ? ` (${unit})` : ""}
                              </td>
                              {selected.map((p, i) => {
                                const v = vals[i];
                                const win = v !== null && isWinner(vals, i, higher);
                                return (
                                  <td key={p.id} className="p-3 text-center font-mono"
                                    style={win ? { color: colorFor(i), background: `${colorFor(i).replace(")", " / 0.10)").replace("hsl", "hsla")}`, fontWeight: 700 } : undefined}>
                                    {v === null ? <span className="text-gray-soft/50">—</span> : v}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* VERDETTI */}
            <div className="section-label mb-3">// VERDETTI</div>
            <div className="grid gap-4 mb-6"
              style={{ gridTemplateColumns: `repeat(${Math.min(selected.length, 3)}, minmax(0, 1fr))` }}>
              {selected.map((p, i) => (
                <div key={p.id} className="p-5"
                  style={{ borderLeft: `4px solid ${colorFor(i)}`, background: `${colorFor(i).replace("hsl", "hsla").replace(")", " / 0.06)")}` }}>
                  <div className="font-mono text-xs uppercase tracking-[0.18rem] mb-2"
                    style={{ color: colorFor(i) }}>
                    {p.name} · {p.verdict_type.toUpperCase()}
                  </div>
                  <p className="text-sm">{p.verdict || <span className="text-gray-soft">Nessun verdetto.</span>}</p>
                </div>
              ))}
            </div>

          </div>
        )}

        {selected.length >= 2 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {selected.map((p) => (
              <Link key={p.id} to={`/player?id=${p.id}`} className="dm-btn-outline text-xs">
                → {p.name.split(" ")[0]}
              </Link>
            ))}
          </div>
        )}
      </section>
    </PageShell>
  );
}
