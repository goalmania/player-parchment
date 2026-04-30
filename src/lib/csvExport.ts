import type { Player } from "./types";
import { STATS_GROUPS, STATS_MATCH_GROUPS } from "./types";

/** Escape a CSV cell per RFC 4180 (quotes, commas, newlines). */
function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Build a CSV string from an array of rows. Each row is string[]. */
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

/**
 * Build a key/value style CSV (Field,Value) for a single player,
 * including identity, ratings, skills, market, verdict and all stats.
 */
export function playerToCsv(p: Player): string {
  const rows: (string | number | null | undefined)[][] = [];
  rows.push(["DM Scout · Report giocatore"]);
  rows.push(["Generato il", new Date().toLocaleString("it-IT")]);
  rows.push([]);

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
  rows.push(["Campo", "Valore"]);
  rows.push(["Valore min (€)", p.market.value_min]);
  rows.push(["Valore max (€)", p.market.value_max]);
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

  // Stats
  const stats = p.stats || {};
  const seasonRows = STATS_GROUPS.flatMap((g) =>
    g.fields
      .filter(({ k }) => stats[k] !== undefined && stats[k] !== null)
      .map(({ k, label, unit }) => [g.label, label, stats[k] as any, unit || ""])
  );
  const matchRows = STATS_MATCH_GROUPS.flatMap((g) =>
    g.fields
      .filter(({ k }) => stats[k] !== undefined && stats[k] !== null)
      .map(({ k, label, unit }) => [g.label, label, stats[k] as any, unit || ""])
  );

  if (seasonRows.length || matchRows.length) {
    rows.push(["# STATISTICHE", `Stagione: ${p.stats_season || "-"}`, `Fonte: ${p.stats_source || "-"}`]);
  }
  if (matchRows.length) {
    rows.push([]);
    rows.push(["## ULTIMA PARTITA"]);
    rows.push(["Gruppo", "Statistica", "Valore", "Unità"]);
    matchRows.forEach((r) => rows.push(r));
  }
  if (seasonRows.length) {
    rows.push([]);
    rows.push(["## STAGIONE"]);
    rows.push(["Gruppo", "Statistica", "Valore", "Unità"]);
    seasonRows.forEach((r) => rows.push(r));
  }

  return rowsToCsv(rows);
}

/**
 * Build a wide CSV comparing N players side-by-side.
 * One column per player; rows are categorised metrics.
 */
export function comparisonToCsv(players: Player[]): string {
  if (players.length === 0) return rowsToCsv([["(nessun giocatore)"]]);
  const header = ["Categoria", "Metrica", ...players.map((p) => p.name)];
  const rows: (string | number | null | undefined)[][] = [];

  rows.push(["DM Scout · Confronto giocatori"]);
  rows.push(["Generato il", new Date().toLocaleString("it-IT")]);
  rows.push(["N. giocatori", players.length]);
  rows.push([]);
  rows.push(header);

  const push = (cat: string, label: string, getter: (p: Player) => unknown) => {
    rows.push([cat, label, ...players.map((p) => {
      const v = getter(p);
      return v === undefined || v === null ? "" : (v as any);
    })]);
  };

  // Identity
  push("Identità", "Club", (p) => p.club);
  push("Identità", "Lega", (p) => p.league);
  push("Identità", "Nazionalità", (p) => p.nationality);
  push("Identità", "Regione", (p) => p.region);
  push("Identità", "Posizione", (p) => p.position_main);
  push("Identità", "Età", (p) => p.age);
  push("Identità", "Piede", (p) => p.foot);
  push("Identità", "Altezza (cm)", (p) => p.height);
  push("Identità", "Peso (kg)", (p) => p.weight);

  // Ratings
  (["overall","technical","tactical","physical","mental"] as const).forEach((k) =>
    push("Ratings", k, (p) => p.ratings[k])
  );

  // Skills
  Object.keys(players[0].skills).forEach((k) =>
    push("Skills", k, (p) => (p.skills as any)[k])
  );

  // Stars
  Object.keys(players[0].stars).forEach((k) =>
    push("Stars", k, (p) => (p.stars as any)[k])
  );

  // Market
  push("Mercato", "Valore min (€)", (p) => p.market.value_min);
  push("Mercato", "Valore max (€)", (p) => p.market.value_max);
  push("Mercato", "Potenziale", (p) => p.market.potential);
  push("Mercato", "Rischio", (p) => p.market.risk);
  push("Mercato", "Timeline", (p) => p.market.timeline);
  push("Mercato", "Pronta inseribilità", (p) => p.market.ready_level);

  // Verdict
  push("Verdetto", "Tipo", (p) => p.verdict_type);
  push("Verdetto", "Verdetto", (p) => p.verdict);

  // Stats — both season + match, only metrics where at least one player has a value
  const allGroups = [
    ...STATS_MATCH_GROUPS.map((g) => ({ ...g, scope: "Match" })),
    ...STATS_GROUPS.map((g) => ({ ...g, scope: "Stagione" })),
  ];
  for (const g of allGroups) {
    for (const f of g.fields) {
      const present = players.some((p) => {
        const v = p.stats?.[f.k];
        return v !== undefined && v !== null;
      });
      if (!present) continue;
      const cat = `${g.scope} · ${g.label}`;
      const lbl = f.unit ? `${f.label} (${f.unit})` : f.label;
      push(cat, lbl, (p) => p.stats?.[f.k]);
    }
  }

  return rowsToCsv(rows);
}
