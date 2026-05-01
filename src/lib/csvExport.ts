import type { Player } from "./types";
import { STATS_GROUPS, STATS_MATCH_GROUPS } from "./types";

/** Versione del formato di export — cambiala se modifichi la struttura del CSV. */
export const CSV_EXPORT_VERSION = "2.0";

/** Escape a CSV cell per RFC 4180 (quotes, commas, newlines). */
function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  // Normalizza i numeri con punto decimale (no separatore di migliaia, no localizzazione).
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return "";
    // Mantieni interi puliti, decimali con max 4 cifre, sempre con `.`
    const s = Number.isInteger(v) ? String(v) : String(Math.round(v * 10000) / 10000);
    return s;
  }
  const s = String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Format currency in EUR with dot decimal, no thousand separators (Excel-friendly). */
function fmtCurrency(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v as number)) return "";
  // Sempre intero in euro, senza simbolo (la colonna "Valuta" indica EUR).
  return String(Math.round(v as number));
}

/** Build a CSV string from an array of rows. Each row is an array of cells. */
export function rowsToCsv(rows: (string | number | null | undefined)[][]): string {
  // Prepend BOM for Excel UTF-8 compatibility.
  return "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\n");
}

/** Trigger a browser download of the given CSV text. */
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/** Sanitize a string for safe use in a filename. */
export function safeFilename(s: string): string {
  return (s || "report").replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60);
}

/** Header metadata block, comune a tutti gli export. */
function metaRows(opts: {
  kind: "player" | "comparison";
  scope: "Stagione" | "Ultima partita" | "Stagione + Ultima partita";
  season?: string;
  source?: string;
  reportDate?: string;
  extra?: [string, unknown][];
}): (string | number | null | undefined)[][] {
  const rows: (string | number | null | undefined)[][] = [];
  rows.push(["DM Scout", opts.kind === "player" ? "Report giocatore" : "Confronto giocatori"]);
  rows.push(["Versione export", CSV_EXPORT_VERSION]);
  rows.push(["Generato il (ISO)", new Date().toISOString()]);
  rows.push(["Generato il (locale)", new Date().toLocaleString("it-IT")]);
  rows.push(["Modalità", opts.scope]);
  if (opts.season) rows.push(["Stagione", opts.season]);
  if (opts.source) rows.push(["Fonte statistiche", opts.source]);
  if (opts.reportDate) rows.push(["Data report", opts.reportDate]);
  rows.push(["Separatore decimale", "."]);
  rows.push(["Valuta", "EUR"]);
  (opts.extra || []).forEach(([k, v]) => rows.push([k, v as any]));
  rows.push([]);
  return rows;
}

/**
 * Build a key/value style CSV (Field,Value) for a single player,
 * including identity, ratings, skills, market, verdict and all stats.
 */
export function playerToCsv(p: Player): string {
  const stats = p.stats || {};
  const hasMatch = STATS_MATCH_GROUPS.some((g) => g.fields.some(({ k }) => stats[k] !== undefined && stats[k] !== null));
  const hasSeason = STATS_GROUPS.some((g) => g.fields.some(({ k }) => stats[k] !== undefined && stats[k] !== null));
  const scope: "Stagione" | "Ultima partita" | "Stagione + Ultima partita" =
    hasMatch && hasSeason ? "Stagione + Ultima partita" : hasMatch ? "Ultima partita" : "Stagione";

  const rows: (string | number | null | undefined)[][] = [
    ...metaRows({
      kind: "player",
      scope,
      season: p.stats_season,
      source: p.stats_source,
      reportDate: p.date,
      extra: [
        ["Giocatore", p.name],
        ["Club", p.club],
        ["Posizione", p.position_main],
      ],
    }),
  ];

  rows.push(["# IDENTITÀ"]);
  rows.push(["Campo", "Valore"]);
  const identity: [string, unknown][] = [
    ["Nome", p.name],
    ["Numero report", p.num],
    ["Età", p.age],
    ["Anno di nascita", p.birth_year],
    ["Nazionalità", p.nationality],
    ["Club", p.club],
    ["Lega", p.league],
    ["Regione", p.region],
    ["Posizione", p.position_main],
    ["Posizione codice", p.position_code],
    ["Posizioni secondarie", (p.position_secondary || []).join(" / ")],
    ["Piede", p.foot],
    ["Altezza (cm)", p.height],
    ["Peso (kg)", p.weight],
    ["Tag", (p.tags || []).join(" / ")],
    ["Data report", p.date],
    ["Tipo osservazione", p.observation_type],
    ["N. osservazioni", p.observation_count],
  ];
  identity.forEach(([k, v]) => rows.push([k, v as any]));
  rows.push([]);

  rows.push(["# RATINGS (0-10)"]);
  rows.push(["Campo", "Valore"]);
  Object.entries(p.ratings).forEach(([k, v]) => rows.push([k, v]));
  rows.push([]);

  rows.push(["# SKILLS (0-100)"]);
  rows.push(["Campo", "Valore"]);
  Object.entries(p.skills).forEach(([k, v]) => rows.push([k, v]));
  rows.push([]);

  rows.push(["# STARS (0-5)"]);
  rows.push(["Campo", "Valore"]);
  Object.entries(p.stars).forEach(([k, v]) => rows.push([k, v]));
  rows.push([]);

  rows.push(["# MERCATO"]);
  rows.push(["Campo", "Valore", "Valuta"]);
  rows.push(["Valore min", fmtCurrency(p.market.value_min), "EUR"]);
  rows.push(["Valore max", fmtCurrency(p.market.value_max), "EUR"]);
  rows.push(["Potenziale", p.market.potential]);
  rows.push(["Rischio", p.market.risk]);
  rows.push(["Timeline", p.market.timeline]);
  rows.push(["Pronta inseribilità", p.market.ready_level]);
  rows.push([]);

  rows.push(["# VERDETTO"]);
  rows.push(["Tipo", p.verdict_type]);
  rows.push(["Verdetto", p.verdict]);
  rows.push(["Sintesi", p.summary]);
  rows.push([]);

  rows.push(["# PUNTI DI FORZA"]);
  (p.strengths || []).forEach((s, i) => rows.push([`#${i + 1}`, s]));
  rows.push([]);

  rows.push(["# AREE DI MIGLIORAMENTO"]);
  (p.weaknesses || []).forEach((s, i) => rows.push([`#${i + 1}`, s]));
  rows.push([]);

  if (p.tactical_roles && p.tactical_roles.length > 0) {
    rows.push(["# RUOLI TATTICI"]);
    rows.push(["Modulo", "Ruolo", "Codice", "Duty", "Fit score"]);
    p.tactical_roles.forEach((r) =>
      rows.push([r.formation, r.role, r.role_code, r.duty || "", r.fit_score])
    );
    rows.push([]);
  }

  // Stats — sezioni separate con colonna Modalità per filtro Excel.
  if (hasMatch) {
    rows.push(["# STATISTICHE · ULTIMA PARTITA"]);
    rows.push(["Modalità", "Gruppo", "Statistica", "Chiave", "Valore", "Unità"]);
    STATS_MATCH_GROUPS.forEach((g) => {
      g.fields.forEach(({ k, label, unit }) => {
        const v = stats[k];
        if (v === undefined || v === null) return;
        rows.push(["Ultima partita", g.label, label, String(k), v as number, unit || ""]);
      });
    });
    rows.push([]);
  }
  if (hasSeason) {
    rows.push(["# STATISTICHE · STAGIONE", `Stagione: ${p.stats_season || "-"}`, `Fonte: ${p.stats_source || "-"}`]);
    rows.push(["Modalità", "Gruppo", "Statistica", "Chiave", "Valore", "Unità"]);
    STATS_GROUPS.forEach((g) => {
      g.fields.forEach(({ k, label, unit }) => {
        const v = stats[k];
        if (v === undefined || v === null) return;
        rows.push(["Stagione", g.label, label, String(k), v as number, unit || ""]);
      });
    });
    rows.push([]);
  }

  return rowsToCsv(rows);
}

/**
 * Build a wide CSV comparing N players side-by-side.
 * One column per player; rows are categorised metrics with a `Modalità` column.
 */
export function comparisonToCsv(players: Player[]): string {
  if (players.length === 0) return rowsToCsv([["(nessun giocatore)"]]);

  // Determina lo scope globale dal contenuto effettivo.
  const anyMatch = players.some((p) =>
    STATS_MATCH_GROUPS.some((g) => g.fields.some(({ k }) => p.stats?.[k] !== undefined && p.stats?.[k] !== null))
  );
  const anySeason = players.some((p) =>
    STATS_GROUPS.some((g) => g.fields.some(({ k }) => p.stats?.[k] !== undefined && p.stats?.[k] !== null))
  );
  const scope: "Stagione" | "Ultima partita" | "Stagione + Ultima partita" =
    anyMatch && anySeason ? "Stagione + Ultima partita" : anyMatch ? "Ultima partita" : "Stagione";

  const rows: (string | number | null | undefined)[][] = [
    ...metaRows({
      kind: "comparison",
      scope,
      extra: [
        ["N. giocatori", players.length],
        ["Giocatori", players.map((p) => p.name).join(" | ")],
      ],
    }),
  ];

  const header = ["Modalità", "Categoria", "Metrica", "Chiave", "Unità", ...players.map((p) => p.name)];
  rows.push(header);

  const push = (
    mode: string,
    cat: string,
    label: string,
    key: string,
    unit: string,
    getter: (p: Player) => unknown,
  ) => {
    rows.push([
      mode, cat, label, key, unit,
      ...players.map((p) => {
        const v = getter(p);
        return v === undefined || v === null ? "" : (v as any);
      }),
    ]);
  };

  // Identity (modalità "Profilo")
  push("Profilo", "Identità", "Club", "club", "", (p) => p.club);
  push("Profilo", "Identità", "Lega", "league", "", (p) => p.league);
  push("Profilo", "Identità", "Nazionalità", "nationality", "", (p) => p.nationality);
  push("Profilo", "Identità", "Regione", "region", "", (p) => p.region);
  push("Profilo", "Identità", "Posizione", "position_main", "", (p) => p.position_main);
  push("Profilo", "Identità", "Età", "age", "anni", (p) => p.age);
  push("Profilo", "Identità", "Piede", "foot", "", (p) => p.foot);
  push("Profilo", "Identità", "Altezza", "height", "cm", (p) => p.height);
  push("Profilo", "Identità", "Peso", "weight", "kg", (p) => p.weight);

  // Ratings
  (["overall", "technical", "tactical", "physical", "mental"] as const).forEach((k) =>
    push("Profilo", "Ratings (0-10)", k, k, "", (p) => p.ratings[k]),
  );

  // Skills
  Object.keys(players[0].skills).forEach((k) =>
    push("Profilo", "Skills (0-100)", k, k, "", (p) => (p.skills as any)[k]),
  );

  // Stars
  Object.keys(players[0].stars).forEach((k) =>
    push("Profilo", "Stars (0-5)", k, k, "★", (p) => (p.stars as any)[k]),
  );

  // Market — valuta esplicita, formattata per Excel (punto decimale, niente simbolo).
  push("Profilo", "Mercato", "Valore min", "value_min", "EUR", (p) => fmtCurrency(p.market.value_min));
  push("Profilo", "Mercato", "Valore max", "value_max", "EUR", (p) => fmtCurrency(p.market.value_max));
  push("Profilo", "Mercato", "Potenziale", "potential", "", (p) => p.market.potential);
  push("Profilo", "Mercato", "Rischio", "risk", "", (p) => p.market.risk);
  push("Profilo", "Mercato", "Timeline", "timeline", "", (p) => p.market.timeline);
  push("Profilo", "Mercato", "Pronta inseribilità", "ready_level", "", (p) => p.market.ready_level);

  // Verdict
  push("Profilo", "Verdetto", "Tipo", "verdict_type", "", (p) => p.verdict_type);
  push("Profilo", "Verdetto", "Verdetto", "verdict", "", (p) => p.verdict);

  // Stats stagione + ultima partita (solo metriche con almeno un valore presente).
  const blocks: { mode: string; groups: typeof STATS_GROUPS }[] = [
    { mode: "Ultima partita", groups: STATS_MATCH_GROUPS },
    { mode: "Stagione", groups: STATS_GROUPS },
  ];
  for (const { mode, groups } of blocks) {
    for (const g of groups) {
      for (const f of g.fields) {
        const present = players.some((p) => {
          const v = p.stats?.[f.k];
          return v !== undefined && v !== null;
        });
        if (!present) continue;
        push(mode, g.label, f.label, String(f.k), f.unit || "", (p) => p.stats?.[f.k]);
      }
    }
  }

  return rowsToCsv(rows);
}
