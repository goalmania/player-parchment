import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getPlayer } from "@/lib/storage";
import Logo from "@/components/Logo";
import HeatmapEditor from "@/components/HeatmapEditor";
import RadarChart from "@/components/RadarChart";
import { STATS_GROUPS, STATS_MATCH_GROUPS } from "@/lib/types";

/**
 * Print-optimized player report. Opens in a new tab and auto-triggers
 * the browser print dialog so the user can "Save as PDF".
 */
export default function PlayerPrint() {
  const [params] = useSearchParams();
  const id = params.get("id") || "";
  const player = getPlayer(id);

  useEffect(() => {
    if (!player) return;
    // Wait for canvas/heatmap to render before opening the print dialog.
    const t = setTimeout(() => window.print(), 700);
    return () => clearTimeout(t);
  }, [player]);

  if (!player) {
    return (
      <div style={{ padding: 40, fontFamily: "Barlow, sans-serif", color: "#111" }}>
        <h1>Report non trovato</h1>
        <Link to="/database">← Torna al database</Link>
      </div>
    );
  }

  const today = new Date().toLocaleDateString("it-IT");
  const radarValues = [
    player.ratings.technical,
    player.ratings.tactical,
    player.ratings.physical,
    player.ratings.mental,
    player.skills.decision_making / 10,
    player.stars.potential * 2,
  ];

  return (
    <>
      <style>{`
        @page { size: A4; margin: 14mm; }
        html, body, #print-root { background: #ffffff !important; color: #111 !important; }
        body::before { display: none !important; }
        .print-wrap { max-width: 800px; margin: 0 auto; font-family: 'Barlow', sans-serif; color: #111; }
        .print-wrap h1, .print-wrap h2, .print-wrap h3 { font-family: 'Barlow Condensed', sans-serif; }
        .print-rule { height: 3px; background: #c8f000; margin: 12px 0 24px; }
        .print-section { break-inside: avoid; page-break-inside: avoid; margin-bottom: 22px; }
        .print-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
        .print-card { border: 1px solid #ccc; padding: 14px; border-radius: 1px; }
        .print-tag { display: inline-block; padding: 3px 8px; font-family: 'Space Mono', monospace;
          font-size: 0.6rem; letter-spacing: 0.12rem; text-transform: uppercase;
          border: 1px solid #111; margin-right: 6px; margin-bottom: 4px; }
        .print-skill { height: 6px; background: #eee; border: 1px solid #ddd; }
        .print-skill > span { display: block; height: 100%; background: #333; }
        .print-page-break { page-break-before: always; }
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>
      <div id="print-root" className="print-wrap" style={{ padding: 24 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Logo size={42} variant="dark" />
            <div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 28, lineHeight: 1, letterSpacing: "0.15rem" }}>
                DM SCOUT
              </div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: "0.12rem", textTransform: "uppercase", color: "#555" }}>
                Report Ufficiale · #{player.num}
              </div>
            </div>
          </div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#555" }}>
            Generato il {today}
          </div>
        </div>
        <div className="print-rule" />

        {/* Identity */}
        <div className="print-section" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20 }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontWeight: 900, textTransform: "uppercase", fontSize: 44, margin: 0, lineHeight: 0.95 }}>
              {player.name}
            </h1>
            <div style={{ color: "#555", marginTop: 6, fontSize: 13 }}>
              {player.flag} {player.nationality} · {player.club} · {player.league} · {player.birth_year}
            </div>
            <div style={{ marginTop: 8 }}>
              {player.tags.map((t) => <span key={t} className="print-tag">{t}</span>)}
              <span className="print-tag" style={{ background: "#111", color: "#fff" }}>
                VERDETTO: {player.verdict_type.toUpperCase()}
              </span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#555", letterSpacing: "0.12rem", textTransform: "uppercase" }}>Overall</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 56, fontWeight: 700, lineHeight: 1 }}>
              {player.ratings.overall.toFixed(1)}
            </div>
          </div>
        </div>

        {/* Two columns: radar + quick info */}
        <div className="print-section print-grid-2">
          <div className="print-card" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#555", letterSpacing: "0.12rem", textTransform: "uppercase", alignSelf: "flex-start", marginBottom: 8 }}>
              Radar
            </div>
            <RadarChart
              axes={["Tecnica", "Tattica", "Fisico", "Mentalità", "Decisioni", "Potenziale"]}
              values={radarValues}
              size={280}
            />
          </div>
          <div className="print-card">
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#555", letterSpacing: "0.12rem", textTransform: "uppercase", marginBottom: 10 }}>
              Scheda
            </div>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <tbody>
                {[
                  ["Età", player.age],
                  ["Piede", player.foot],
                  ["Altezza", `${player.height} cm`],
                  ["Peso", `${player.weight} kg`],
                  ["Posizione", player.position_main],
                  ["Osservazioni", `${player.observation_count} (${player.observation_type})`],
                ].map(([k, v]) => (
                  <tr key={k as string} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "6px 0", color: "#555", textTransform: "uppercase", fontFamily: "'Space Mono', monospace", fontSize: 10 }}>{k}</td>
                    <td style={{ padding: "6px 0", textAlign: "right", fontWeight: 600 }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Skills */}
        <div className="print-section">
          <h3 style={{ textTransform: "uppercase", fontSize: 16, margin: "0 0 10px", letterSpacing: "0.08rem" }}>Abilità tecniche</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 24px" }}>
            {Object.entries(player.skills).map(([k, v]) => (
              <div key={k}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                  <span style={{ textTransform: "uppercase", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 600 }}>{k.replace(/_/g, " ")}</span>
                  <span style={{ fontFamily: "'Space Mono', monospace" }}>{v}</span>
                </div>
                <div className="print-skill"><span style={{ width: `${v}%` }} /></div>
              </div>
            ))}
          </div>
        </div>

        {/* Strengths / weaknesses */}
        <div className="print-section print-grid-2">
          <div className="print-card">
            <h3 style={{ margin: "0 0 8px", textTransform: "uppercase", fontSize: 14 }}>Punti di forza</h3>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
              {player.strengths.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
            </ul>
          </div>
          <div className="print-card">
            <h3 style={{ margin: "0 0 8px", textTransform: "uppercase", fontSize: 14 }}>Aree di miglioramento</h3>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
              {player.weaknesses.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
            </ul>
          </div>
        </div>

        {/* PAGE 2 */}
        <div className="print-page-break" />

        <div className="print-section" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Logo size={26} variant="dark" />
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 20, letterSpacing: "0.12rem" }}>
              {player.name.toUpperCase()}
            </div>
          </div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#555" }}>Pagina 2 / 2</div>
        </div>
        <div className="print-rule" />

        <div className="print-section">
          <h3 style={{ textTransform: "uppercase", fontSize: 16, margin: "0 0 10px" }}>Analisi tattica</h3>
          <p style={{ fontSize: 13, lineHeight: 1.55, margin: 0 }}>{player.summary}</p>
        </div>

        <div className="print-section">
          <h3 style={{ textTransform: "uppercase", fontSize: 16, margin: "0 0 10px" }}>Verdetto</h3>
          <div className="print-card" style={{ borderLeft: "4px solid #c8f000" }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: "0.12rem", textTransform: "uppercase", color: "#555", marginBottom: 6 }}>
              {player.verdict_type.toUpperCase()}
            </div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55 }}>{player.verdict}</p>
          </div>
        </div>

        <div className="print-section">
          <h3 style={{ textTransform: "uppercase", fontSize: 16, margin: "0 0 10px" }}>Mercato</h3>
          <div className="print-card">
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <tbody>
                {[
                  ["Valore", `€${player.market.value_min.toLocaleString("it-IT")} – €${player.market.value_max.toLocaleString("it-IT")}`],
                  ["Potenziale", player.market.potential],
                  ["Rischio", player.market.risk],
                  ["Timeline", player.market.timeline],
                  ["Pronta inseribilità", player.market.ready_level],
                ].map(([k, v]) => (
                  <tr key={k as string} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "6px 0", color: "#555", textTransform: "uppercase", fontFamily: "'Space Mono', monospace", fontSize: 10 }}>{k}</td>
                    <td style={{ padding: "6px 0", textAlign: "right", fontWeight: 600 }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tactical roles */}
        {player.tactical_roles && player.tactical_roles.length > 0 && (
          <div className="print-section">
            <h3 style={{ textTransform: "uppercase", fontSize: 16, margin: "0 0 10px" }}>Ruoli tattici</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {player.tactical_roles.map((r, i) => (
                <span key={i} className="print-tag" style={{ background: "#f4f4f4" }}>
                  {r.formation} · {r.role}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Statistiche stagione */}
        {(() => {
          const seasonRows = STATS_GROUPS.flatMap((g) =>
            g.fields
              .filter(({ k }) => {
                const v = player.stats?.[k];
                return v !== undefined && v !== null;
              })
              .map(({ k, label, unit }) => ({ group: g.label, k, label, unit, v: player.stats?.[k] }))
          );
          const matchRows = STATS_MATCH_GROUPS.flatMap((g) =>
            g.fields
              .filter(({ k }) => {
                const v = player.stats?.[k];
                return v !== undefined && v !== null;
              })
              .map(({ k, label, unit }) => ({ group: g.label, k, label, unit, v: player.stats?.[k] }))
          );
          if (seasonRows.length === 0 && matchRows.length === 0) return null;
          const renderTable = (rows: typeof seasonRows, title: string) => {
            if (rows.length === 0) return null;
            // Group by group
            const grouped: Record<string, typeof rows> = {};
            for (const r of rows) {
              if (!grouped[r.group]) grouped[r.group] = [] as any;
              (grouped[r.group] as any).push(r);
            }
            return (
              <div className="print-section">
                <h3 style={{ textTransform: "uppercase", fontSize: 16, margin: "0 0 10px" }}>{title}</h3>
                <div className="print-card" style={{ padding: 0 }}>
                  <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
                    <tbody>
                      {Object.entries(grouped).map(([gname, rs]) => (
                        <>
                          <tr key={`g-${gname}`} style={{ background: "#f4f4f4" }}>
                            <td colSpan={2} style={{ padding: "4px 10px", fontFamily: "'Space Mono', monospace", fontSize: 9, letterSpacing: "0.15rem", textTransform: "uppercase", color: "#444" }}>
                              {gname}
                            </td>
                          </tr>
                          {(rs as any).map((r: any) => (
                            <tr key={r.k as string} style={{ borderBottom: "1px solid #eee" }}>
                              <td style={{ padding: "5px 10px", color: "#555" }}>{r.label}{r.unit ? ` (${r.unit})` : ""}</td>
                              <td style={{ padding: "5px 10px", textAlign: "right", fontWeight: 600, fontFamily: "'Space Mono', monospace" }}>{r.v}</td>
                            </tr>
                          ))}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          };
          return (
            <>
              {renderTable(seasonRows, "Statistiche stagione")}
              {renderTable(matchRows, "Ultima partita")}
            </>
          );
        })()}

        {player.heatmap && player.heatmap.length > 0 && (
          <div className="print-section">
            <h3 style={{ textTransform: "uppercase", fontSize: 16, margin: "0 0 10px" }}>Mappa di calore</h3>
            <div style={{ maxWidth: 320, margin: "0 auto" }}>
              <HeatmapEditor value={player.heatmap} readOnly height={420} showToolbar={false} />
            </div>
          </div>
        )}

        <div style={{ marginTop: 30, paddingTop: 12, borderTop: "1px solid #ccc", fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#888", textAlign: "center" }}>
          Report generato da DM Scout · {today} · Riservato e confidenziale
        </div>

        <div className="no-print" style={{ marginTop: 24, textAlign: "center" }}>
          <button onClick={() => window.print()} style={{ padding: "10px 24px", background: "#c8f000", color: "#000", border: "none", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: "0.1rem", textTransform: "uppercase", cursor: "pointer" }}>
            Salva come PDF
          </button>
        </div>
      </div>
    </>
  );
}
