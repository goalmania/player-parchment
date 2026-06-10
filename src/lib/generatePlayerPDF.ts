import type { Player } from "./types";

const LIME: [number, number, number] = [200, 240, 0];
const BLACK: [number, number, number] = [10, 10, 10];
const DARK: [number, number, number] = [22, 22, 22];
const LGRAY: [number, number, number] = [236, 236, 236];
const GRAY: [number, number, number] = [130, 130, 130];
const WHITE: [number, number, number] = [255, 255, 255];
const RED: [number, number, number] = [255, 70, 70];
const ORANGE: [number, number, number] = [255, 145, 0];

export async function generatePlayerPDF(player: Player): Promise<void> {
  const { default: jsPDF } = await import("jspdf");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 14;           // margin
  const CW = W - M * 2;  // content width
  const today = new Date().toLocaleDateString("it-IT");

  const verdictAccent =
    player.verdict_type === "buy" ? LIME :
    player.verdict_type === "monitor" ? ORANGE : RED;

  // ── helpers ─────────────────────────────────────────────────────────
  let y = 0;
  let pageNum = 1;

  const newPage = () => {
    doc.addPage();
    pageNum++;
    // lime top bar
    doc.setFillColor(...LIME);
    doc.rect(0, 0, W, 1.5, "F");
    // mini header
    doc.setFillColor(...BLACK);
    doc.rect(0, 1.5, W, 11, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...WHITE);
    doc.text("DM SCOUT", M, 9);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(player.name.toUpperCase(), M + 22, 9);
    doc.text(today, W - M, 9, { align: "right" });
    y = 20;
  };

  const checkY = (needed: number) => {
    if (y + needed > H - 16) newPage();
  };

  const sectionLabel = (text: string) => {
    checkY(10);
    doc.setFillColor(...LIME);
    doc.rect(M, y, 2, 5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...DARK);
    doc.text(text, M + 4, y + 3.8);
    y += 8;
  };

  const hRule = () => {
    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.2);
    doc.line(M, y, W - M, y);
    y += 4;
  };

  // ── PAGE 1 HEADER ────────────────────────────────────────────────────
  // lime accent strip
  doc.setFillColor(...LIME);
  doc.rect(0, 0, W, 1.5, "F");

  // black header band
  doc.setFillColor(...BLACK);
  doc.rect(0, 1.5, W, 44, "F");

  // Logo
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...WHITE);
  doc.text("DM SCOUT", M, 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...GRAY);
  doc.text("SCOUTING OPS  ·  REPORT UFFICIALE  ·  #" + player.num, M, 18.5);

  // Date + confidential
  doc.setFontSize(6.5);
  doc.text(today, W - M, 14, { align: "right" });
  doc.text("RISERVATO E CONFIDENZIALE", W - M, 18.5, { align: "right" });

  // Player name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(...WHITE);
  doc.text(player.name.toUpperCase(), M, 33);

  // Subtitle (no emoji — jsPDF non supporta Unicode emoji)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(
    [player.nationality, player.club, player.league, String(player.birth_year)]
      .filter(Boolean).join("  ·  "),
    M, 39
  );

  // Overall score (top right)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(34);
  doc.setTextColor(...LIME);
  doc.text(player.ratings.overall.toFixed(1), W - M, 36, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...GRAY);
  doc.text("OVERALL", W - M, 41, { align: "right" });

  // Verdict pill
  doc.setFillColor(...verdictAccent);
  doc.roundedRect(M, 43.5, 32, 5.5, 1, 1, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...BLACK);
  doc.text("VERDETTO: " + player.verdict_type.toUpperCase(), M + 16, 47.5, { align: "center" });

  // Tag pills — sfondo grigio scuro, testo bianco
  let tagX = M + 34;
  player.tags.slice(0, 5).forEach((tag) => {
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    const tw = doc.getTextWidth(tag) + 6;
    doc.setFillColor(50, 50, 50);
    doc.roundedRect(tagX, 43.5, tw, 5.5, 1, 1, "F");
    doc.setTextColor(...WHITE);
    doc.text(tag, tagX + tw / 2, 47.5, { align: "center" });
    tagX += tw + 2;
  });

  y = 57;

  // ── SCHEDA ANAGRAFICA ────────────────────────────────────────────────
  sectionLabel("// SCHEDA ANAGRAFICA");

  const infoItems: [string, string][] = [
    ["ETÀ", `${player.age} anni`],
    ["PIEDE", player.foot],
    ["ALTEZZA", `${player.height} cm`],
    ["PESO", `${player.weight} kg`],
    ["POSIZIONE", player.position_main],
    ["NAZIONALITÀ", player.nationality],
    ["OSSERVAZIONI", `${player.observation_count} (${player.observation_type})`],
    ["VALORE", player.market.value_min > 0
      ? `€${player.market.value_min.toLocaleString("it-IT")} – €${player.market.value_max.toLocaleString("it-IT")}`
      : "N/D"],
  ];

  const IC = 4;
  const IW = CW / IC;
  const IH = 12;
  const ROWS = Math.ceil(infoItems.length / IC);

  infoItems.forEach(([k, v], i) => {
    const col = i % IC;
    const row = Math.floor(i / IC);
    const x = M + col * IW;
    const cy = y + row * IH;
    doc.setFillColor(...LGRAY);
    doc.rect(x + 0.3, cy, IW - 0.6, IH - 0.4, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(...GRAY);
    doc.text(k, x + 2, cy + 3.5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    doc.text(v, x + 2, cy + 9.5);
  });

  y += ROWS * IH + 5;

  // ── VALUTAZIONI ──────────────────────────────────────────────────────
  sectionLabel("// VALUTAZIONI");

  const ratingItems: [string, number][] = [
    ["TECNICA", player.ratings.technical],
    ["TATTICA", player.ratings.tactical],
    ["FISICO", player.ratings.physical],
    ["MENTALITÀ", player.ratings.mental],
  ];
  const RW = CW / 4;
  const RH = 20;

  ratingItems.forEach(([label, val], i) => {
    const x = M + i * RW;
    doc.setFillColor(...DARK);
    doc.rect(x + 0.3, y, RW - 0.6, RH, "F");
    // accent bar height proportional to value
    const barH = (val / 10) * 5;
    doc.setFillColor(...LIME);
    doc.rect(x + 0.3, y + RH - barH, RW - 0.6, barH, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...WHITE);
    doc.text(String(val), x + RW / 2, y + 13, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(...GRAY);
    doc.text(label, x + RW / 2, y + 18, { align: "center" });
  });

  y += RH + 6;

  // ── ABILITÀ TECNICHE ─────────────────────────────────────────────────
  sectionLabel("// ABILITÀ TECNICHE");

  const skills = Object.entries(player.skills);
  const half = Math.ceil(skills.length / 2);
  const SCW = CW / 2 - 4;
  const SRH = 7.5;

  skills.forEach(([key, val], i) => {
    const col = i < half ? 0 : 1;
    const row = col === 0 ? i : i - half;
    const x = M + col * (SCW + 8);
    const sy = y + row * SRH;
    const label = key.replace(/_/g, " ").toUpperCase();

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...DARK);
    doc.text(label, x, sy + 3.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(...DARK);
    doc.text(String(val), x + SCW, sy + 3.5, { align: "right" });

    // bg track
    doc.setFillColor(...LGRAY);
    doc.rect(x, sy + 4.5, SCW, 2, "F");
    // fill
    const fillColor = val >= 80 ? LIME : val >= 60 ? ORANGE : RED;
    doc.setFillColor(...fillColor);
    doc.rect(x, sy + 4.5, (val / 100) * SCW, 2, "F");
  });

  y += half * SRH + 6;

  // ── PUNTI DI FORZA / AREE DI MIGLIORAMENTO ──────────────────────────
  checkY(16);
  sectionLabel("// ANALISI");

  const colW2 = CW / 2 - 3;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...DARK);
  doc.text("PUNTI DI FORZA", M, y);
  doc.text("AREE DI MIGLIORAMENTO", M + colW2 + 6, y);
  y += 5;

  const maxRows = Math.max(player.strengths.length, player.weaknesses.length);
  for (let i = 0; i < maxRows; i++) {
    checkY(7);
    if (player.strengths[i]) {
      doc.setFillColor(...LIME);
      doc.circle(M + 2, y + 2, 1, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(40, 40, 40);
      doc.text(doc.splitTextToSize(player.strengths[i], colW2 - 7)[0], M + 5, y + 3.5);
    }
    if (player.weaknesses[i]) {
      doc.setFillColor(...RED);
      doc.circle(M + colW2 + 8, y + 2, 1, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(40, 40, 40);
      doc.text(doc.splitTextToSize(player.weaknesses[i], colW2 - 7)[0], M + colW2 + 11, y + 3.5);
    }
    y += 7;
  }
  y += 2;

  // ── ANALISI TATTICA ──────────────────────────────────────────────────
  if (player.summary) {
    checkY(20);
    sectionLabel("// ANALISI TATTICA");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(50, 50, 50);
    const lines = doc.splitTextToSize(player.summary, CW);
    const visible = lines.slice(0, 10);
    doc.text(visible, M, y);
    y += visible.length * 5 + 4;
  }

  // ── VERDETTO ─────────────────────────────────────────────────────────
  if (player.verdict) {
    checkY(20);
    sectionLabel("// VERDETTO");
    doc.setFillColor(verdictAccent[0], verdictAccent[1], verdictAccent[2], 0.12);
    const vLines = doc.splitTextToSize(player.verdict, CW - 8);
    const vVisible = vLines.slice(0, 8);
    const vH = vVisible.length * 5 + 6;
    doc.setFillColor(
      verdictAccent[0] === 200 ? 245 : verdictAccent[0] === 255 && verdictAccent[1] === 145 ? 255 : 255,
      verdictAccent[1] === 240 ? 252 : 248,
      verdictAccent[2] === 0 ? 220 : 245
    );
    doc.rect(M, y, CW, vH, "F");
    // left border
    doc.setFillColor(...verdictAccent);
    doc.rect(M, y, 2, vH, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...verdictAccent);
    doc.text("VERDETTO: " + player.verdict_type.toUpperCase(), M + 5, y + 4.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(40, 40, 40);
    doc.text(vVisible, M + 5, y + 9);
    y += vH + 5;
  }

  // ── MERCATO ──────────────────────────────────────────────────────────
  checkY(24);
  sectionLabel("// MERCATO");

  const mItems: [string, string][] = [
    ["VALORE DI MERCATO", player.market.value_min > 0
      ? `€${player.market.value_min.toLocaleString("it-IT")} – €${player.market.value_max.toLocaleString("it-IT")}`
      : "N/D"],
    ["POTENZIALE", player.market.potential],
    ["RISCHIO", player.market.risk],
    ["TIMELINE", player.market.timeline],
    ["PRONTA INSERIB.", player.market.ready_level || "N/D"],
  ];

  const MC = 5;
  const MW = CW / MC;
  const MH = 14;

  mItems.forEach(([k, v], i) => {
    const x = M + i * MW;
    doc.setFillColor(...DARK);
    doc.rect(x + 0.3, y, MW - 0.6, MH, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(...GRAY);
    doc.text(k, x + 2, y + 4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...WHITE);
    const vLines = doc.splitTextToSize(v, MW - 3);
    doc.text(vLines[0], x + 2, y + 10.5);
  });

  y += MH + 5;

  // ── STELLE ───────────────────────────────────────────────────────────
  checkY(20);
  sectionLabel("// STELLE");

  const starItems: [string, number][] = [
    ["TECNICA", player.stars.technique],
    ["ATLETISMO", player.stars.athleticism],
    ["MENTALITÀ", player.stars.mentality],
    ["POTENZIALE", player.stars.potential],
    ["VALORE DI MERCATO", player.stars.market_value],
  ];

  // Disegna stelle come quadratini (jsPDF non supporta ★☆)
  const drawStars = (sx: number, sy: number, filled: number, total = 5) => {
    const size = 3.2;
    const gap = 1.2;
    for (let i = 0; i < total; i++) {
      if (i < filled) {
        doc.setFillColor(...LIME);
      } else {
        doc.setFillColor(...LGRAY);
      }
      doc.rect(sx + i * (size + gap), sy - size, size, size, "F");
    }
  };

  starItems.forEach(([label, val]) => {
    checkY(8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...DARK);
    doc.text(label, M, y);

    const starsW = 5 * 3.2 + 4 * 1.2; // total width of 5 stars + gaps
    drawStars(W - M - starsW, y, val);

    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.2);
    doc.line(M, y + 2.5, W - M, y + 2.5);
    y += 8;
  });

  y += 4;

  // ── TACTICAL ROLES ───────────────────────────────────────────────────
  if (player.tactical_roles && player.tactical_roles.length > 0) {
    checkY(16);
    sectionLabel("// RUOLI TATTICI");
    player.tactical_roles.slice(0, 4).forEach((r) => {
      checkY(9);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...DARK);
      doc.text(`${r.formation}  ·  ${r.role}`, M, y);
      const fitColor = r.fit_score >= 80 ? LIME : r.fit_score >= 60 ? ORANGE : RED;
      doc.setTextColor(...fitColor);
      doc.text(`${r.fit_score}%`, W - M, y, { align: "right" });
      doc.setFillColor(...LGRAY);
      doc.rect(M, y + 1.5, CW, 2, "F");
      doc.setFillColor(...fitColor);
      doc.rect(M, y + 1.5, (r.fit_score / 100) * CW, 2, "F");
      y += 8;
    });
    y += 2;
  }

  // ── FOOTER su tutte le pagine ────────────────────────────────────────
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFillColor(...BLACK);
    doc.rect(0, H - 9, W, 9, "F");
    doc.setFillColor(...LIME);
    doc.rect(0, H - 9, W, 0.6, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(...GRAY);
    doc.text("DM SCOUT — Scouting Operations  ·  Riservato e confidenziale", M, H - 4);
    doc.text(`${today}  ·  Pag. ${p} / ${total}`, W - M, H - 4, { align: "right" });
  }

  const filename = `dmscout-${player.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}.pdf`;
  doc.save(filename);
}
