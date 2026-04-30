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
import {
  listSavedComparisons,
  saveComparison,
  deleteSavedComparison,
  type SavedComparison,
} from "@/lib/savedComparisons";

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

  // Saved comparisons
  const [saved, setSaved] = useState<SavedComparison[]>([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveNotes, setSaveNotes] = useState("");
  const [currentSavedId, setCurrentSavedId] = useState<string | null>(null);

  const loadSaved = async () => {
    setSavedLoading(true);
    try {
      setSaved(await listSavedComparisons());
    } catch (e: any) {
      toast.error(e?.message || "Caricamento confronti fallito");
    } finally {
      setSavedLoading(false);
    }
  };

  useEffect(() => { loadSaved(); }, []);

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
      await new Promise((r) => requestAnimationFrame(() => r(null)));

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const headerH = 18;
      const footerH = 10;
      const contentMaxH = pageH - headerH - footerH - margin;

      const today = new Date().toLocaleDateString("it-IT");
      const namesShort = selected.map((p) => p.name.split(" ")[0]).join(" · ");

      const drawHeader = (pageNum: number, totalPages: number) => {
        // Top accent bar
        pdf.setFillColor(200, 240, 0);
        pdf.rect(0, 0, pageW, 2, "F");
        // Brand
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.setTextColor(20, 20, 20);
        pdf.text("DM SCOUT", margin, 10);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(110, 110, 110);
        pdf.text("CONFRONTO PARALLELO", margin, 14);
        // Right side
        pdf.setFontSize(8);
        pdf.text(today, pageW - margin, 10, { align: "right" });
        pdf.text(`Pag. ${pageNum} / ${totalPages}`, pageW - margin, 14, { align: "right" });
        // Subjects line
        pdf.setDrawColor(220, 220, 220);
        pdf.line(margin, 17, pageW - margin, 17);
        pdf.setFontSize(7);
        pdf.setTextColor(80, 80, 80);
        pdf.text(namesShort, margin, headerH + 2);
      };

      const drawFooter = () => {
        pdf.setDrawColor(220, 220, 220);
        pdf.line(margin, pageH - footerH, pageW - margin, pageH - footerH);
        pdf.setFontSize(7);
        pdf.setTextColor(140, 140, 140);
        pdf.text("Generato da DM Scout · Riservato e confidenziale", margin, pageH - footerH + 5);
      };

      // Capture each section separately for clean page breaks
      const sections = Array.from(
        exportRef.current.querySelectorAll<HTMLElement>("[data-pdf-section]")
      );
      type Img = { data: string; w: number; h: number };
      const images: Img[] = [];
      for (const sec of sections) {
        const canvas = await html2canvas(sec, {
          backgroundColor: "#ffffff",
          scale: 2,
          useCORS: true,
          logging: false,
          onclone: (doc) => {
            // Forza temi chiari nelle sezioni clonate per leggibilità in stampa
            doc.documentElement.classList.add("pdf-export-light");
          },
        });
        const wMm = pageW - margin * 2;
        const hMm = (canvas.height * wMm) / canvas.width;
        images.push({ data: canvas.toDataURL("image/jpeg", 0.92), w: wMm, h: hMm });
      }

      // Layout
      let pageNum = 1;
      let y = headerH + 6;
      const startY = headerH + 6;
      // First pass: layout to count pages
      const placements: { page: number; y: number; img: Img }[] = [];
      for (const img of images) {
        if (img.h > contentMaxH) {
          // Big image: slice across pages
          let remaining = img.h;
          let offset = 0;
          while (remaining > 0) {
            const sliceH = Math.min(contentMaxH - (y - startY), remaining);
            placements.push({ page: pageNum, y, img: { ...img, h: img.h, data: img.data, w: img.w } as any });
            // Mark slice info
            (placements[placements.length - 1] as any).slice = { offset, sliceH };
            remaining -= sliceH;
            offset += sliceH;
            if (remaining > 0) {
              pageNum++;
              y = startY;
            } else {
              y += sliceH + 4;
            }
          }
        } else {
          if (y + img.h > pageH - footerH - 2) {
            pageNum++;
            y = startY;
          }
          placements.push({ page: pageNum, y, img });
          y += img.h + 4;
        }
      }
      const totalPages = pageNum;

      // Render
      let currentPage = 1;
      drawHeader(1, totalPages);
      drawFooter();
      for (const pl of placements) {
        while (currentPage < pl.page) {
          pdf.addPage();
          currentPage++;
          drawHeader(currentPage, totalPages);
          drawFooter();
        }
        const slice = (pl as any).slice;
        if (slice) {
          // Draw a portion using a temp canvas
          // Simpler: use addImage with negative y trick (render full image clipped)
          // jsPDF doesn't clip; so use full image with shifted y, then mask via white rects
          pdf.addImage(pl.img.data, "JPEG", margin, pl.y - slice.offset, pl.img.w, pl.img.h);
          // Mask above and below
          pdf.setFillColor(255, 255, 255);
          if (pl.y > headerH) {
            pdf.rect(0, headerH + 1, pageW, pl.y - headerH - 1, "F");
          }
          const bottomY = pl.y + slice.sliceH;
          pdf.rect(0, bottomY, pageW, pageH - bottomY - footerH, "F");
          // Re-draw header/footer on top
          drawHeader(currentPage, totalPages);
          drawFooter();
        } else {
          pdf.addImage(pl.img.data, "JPEG", margin, pl.y, pl.img.w, pl.img.h);
        }
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

  const handleSaveComparison = async () => {
    if (selected.length < 2) {
      toast.error("Seleziona almeno 2 giocatori");
      return;
    }
    try {
      const c = await saveComparison(
        saveName || `Confronto ${new Date().toLocaleDateString("it-IT")}`,
        selectedIds,
        saveNotes,
        currentSavedId || undefined
      );
      setCurrentSavedId(c.id);
      toast.success(currentSavedId ? "Confronto aggiornato ✓" : "Confronto salvato ✓");
      setShowSaveDialog(false);
      setSaveName("");
      setSaveNotes("");
      loadSaved();
    } catch (e: any) {
      toast.error(e?.message || "Salvataggio fallito");
    }
  };

  const handleLoadComparison = (c: SavedComparison) => {
    const valid = c.player_ids.filter((id) => players.find((p) => p.id === id));
    if (valid.length < 2) {
      toast.error("I giocatori salvati non sono più disponibili");
      return;
    }
    setSelectedIds(valid);
    setCurrentSavedId(c.id);
    setShowLoadDialog(false);
    toast.success(`"${c.name}" caricato`);
  };

  const handleDeleteComparison = async (id: string) => {
    if (!confirm("Eliminare questo confronto salvato?")) return;
    try {
      await deleteSavedComparison(id);
      if (currentSavedId === id) setCurrentSavedId(null);
      loadSaved();
      toast.success("Eliminato");
    } catch (e: any) {
      toast.error(e?.message || "Eliminazione fallita");
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
          <div className="flex flex-wrap justify-end gap-2 mb-4">
            <button
              onClick={() => setShowLoadDialog(true)}
              className="dm-btn-outline"
              title="Carica un confronto salvato"
            >
              📂 Salvati ({saved.length})
            </button>
            <button
              onClick={() => {
                setSaveName(currentSavedId
                  ? saved.find((s) => s.id === currentSavedId)?.name || ""
                  : `Confronto ${new Date().toLocaleDateString("it-IT")}`);
                setSaveNotes(currentSavedId
                  ? saved.find((s) => s.id === currentSavedId)?.notes || ""
                  : "");
                setShowSaveDialog(true);
              }}
              className="dm-btn-outline"
            >
              {currentSavedId ? "💾 Aggiorna" : "💾 Salva"}
            </button>
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
            <div data-pdf-section="header" className="grid gap-px bg-border/10 border-hairline mb-6"
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
            <div data-pdf-section="radar" className="border-hairline p-4 mb-8 flex flex-col items-center">
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
            <div data-pdf-section="ratings">
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
            </div>

            {/* SKILLS */}
            <div data-pdf-section="skills">
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
            </div>

            {/* STATISTICHE */}
            <div data-pdf-section="stats">
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
            </div>

            {/* VERDETTI */}
            <div data-pdf-section="verdicts">
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

        {/* SAVE DIALOG */}
        {showSaveDialog && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowSaveDialog(false)}>
            <div className="bg-background border-hairline max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="section-label mb-3">// {currentSavedId ? "AGGIORNA CONFRONTO" : "SALVA CONFRONTO"}</div>
              <h3 className="font-display font-bold text-2xl uppercase mb-4">
                {currentSavedId ? "Aggiorna" : "Salva"} confronto
              </h3>
              <label className="block text-xs font-mono uppercase tracking-[0.12rem] text-gray-soft mb-1">Nome</label>
              <input
                className="dm-input w-full mb-3"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Es. Top mediani Serie B"
                autoFocus
              />
              <label className="block text-xs font-mono uppercase tracking-[0.12rem] text-gray-soft mb-1">Note (opzionale)</label>
              <textarea
                className="dm-input w-full mb-4"
                rows={3}
                value={saveNotes}
                onChange={(e) => setSaveNotes(e.target.value)}
                placeholder="Contesto, obiettivo del confronto…"
              />
              <div className="text-xs font-mono text-gray-soft mb-4">
                {selected.length} giocatori inclusi: {selected.map((p) => p.name).join(", ")}
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowSaveDialog(false)} className="dm-btn-outline">Annulla</button>
                <button onClick={handleSaveComparison} className="dm-btn-primary">
                  {currentSavedId ? "Aggiorna" : "Salva"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* LOAD DIALOG */}
        {showLoadDialog && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowLoadDialog(false)}>
            <div className="bg-background border-hairline max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="section-label mb-1">// CONFRONTI SALVATI</div>
                  <h3 className="font-display font-bold text-2xl uppercase">Confronti salvati</h3>
                </div>
                <button onClick={() => setShowLoadDialog(false)} className="text-gray-soft hover:text-foreground text-2xl leading-none">✕</button>
              </div>
              {savedLoading ? (
                <div className="py-8 text-center text-gray-soft">Caricamento…</div>
              ) : saved.length === 0 ? (
                <div className="py-8 text-center text-gray-soft">
                  Nessun confronto salvato. Crea un confronto e salvalo per ritrovarlo qui.
                </div>
              ) : (
                <div className="space-y-2">
                  {saved.map((c) => {
                    const playerNames = c.player_ids
                      .map((id) => players.find((p) => p.id === id)?.name)
                      .filter(Boolean) as string[];
                    const missing = c.player_ids.length - playerNames.length;
                    return (
                      <div key={c.id} className="border-hairline p-3 hover:bg-gray-light/30 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-display font-bold uppercase truncate">{c.name}</div>
                            <div className="text-xs font-mono text-gray-soft mt-0.5 truncate">
                              {playerNames.join(" · ") || "—"}
                              {missing > 0 && <span className="text-destructive ml-2">⚠ {missing} non disponibili</span>}
                            </div>
                            {c.notes && <div className="text-xs text-gray-soft mt-1 italic">{c.notes}</div>}
                            <div className="text-[0.65rem] font-mono text-gray-soft mt-1">
                              {new Date(c.updated_at).toLocaleString("it-IT")}
                            </div>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <button onClick={() => handleLoadComparison(c)} className="dm-btn-primary text-xs !py-1 !px-3">
                              Carica
                            </button>
                            <button onClick={() => handleDeleteComparison(c.id)} className="text-xs text-destructive hover:underline font-mono">
                              Elimina
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </PageShell>
  );
}
