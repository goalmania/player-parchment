import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Sei un capo scout esperto della Serie D / Eccellenza / Promozione italiana.
Ricevi le osservazioni di uno scout e rispondi SOLO con un oggetto JSON valido contenente il report completo del giocatore.

CAMPI OBBLIGATORI del JSON:
- name (string), age (intero), birth_year (intero), nationality (string), flag (emoji), club (string), league (string), region (string, default "Puglia"), lat (number), lng (number)
- position_main (string), position_code (uno tra: GK CB LB RB CDM CM CAM LW RW ST CF), position_secondary (array di stringhe), foot (Destro/Sinistro/Entrambi)
- height (intero cm, es. 183 NON 1.83), weight (intero kg)
- tactical_roles: array di oggetti {formation, role, role_code, fit_score 0-100}. role_code tra: GK_SWEEPER, GK_SHOT_STOPPER, CB_BALL_PLAYING, CB_STOPPER, CB_LIBERO, RB_WING_BACK, RB_INVERTED, RB_CLASSIC, LB_WING_BACK, LB_INVERTED, LB_CLASSIC, CDM_SCREEN, CDM_BOX_TO_BOX, CM_REGISTA, CM_BOX, CM_MEZZALA_OFF, CM_MEZZALA_DEF, CAM_TREQUARTISTA, CAM_SHADOW, LW_WINGER, LW_INVERTED, RW_WINGER, RW_INVERTED, ST_TARGET, ST_PRESSING, CF_FALSE_9, CF_SECONDA_PUNTA
- formations_played: array di stringhe (es. ["4-3-3","3-5-2"])
- ratings: {technical, tactical, physical, mental, overall} tutti 0-10. overall = technical*0.25 + tactical*0.30 + physical*0.20 + mental*0.25
- skills: {ball_control, passing, dribbling, finishing, defensive_work, tactical_iq, decision_making, aerial, pace, stamina} tutti 0-100
- stars: {technique, athleticism, mentality, potential, market_value} tutti 1-5
- market: {value_min (intero €), value_max (intero €), potential (Alto/Medio-Alto/Medio/Basso), risk (Basso/Medio/Alto), timeline (string), ready_level (string)}
- tags: array con valori SOLO da: HIGH POTENTIAL, LOW COST, READY, MONITOR, RISKY, TOP PROSPECT
- verdict_type: buy/monitor/pass
- verdict: 2-4 frasi in italiano scoutistico
- observation_type: Video/Dal vivo/Video + Dal vivo
- observation_count: intero
- date: YYYY-MM-DD (oggi se non specificata)
- strengths: array di almeno 3 stringhe in italiano
- weaknesses: array di almeno 2 stringhe in italiano
- summary: 3-5 frasi in italiano scoutistico
- heatmap_zones: array di oggetti {row 0-5, col 0-9, intensity 1-100} che indicano le zone di campo più frequentate
- stats: oggetto con statistiche numeriche estratte dal testo (solo quelle presenti, non inventare). Es: {goals:5, assists:3, minutes:900}

REGOLE:
- Per campi non menzionati, deduci valori plausibili per la categoria (Serie D/Eccellenza italiana)
- Non lasciare mai array vuoti per i campi obbligatori
- Rispondi SOLO con il JSON, nessun testo aggiuntivo`;

const TOOL = {
  type: "function",
  function: {
    name: "extract_player_report",
    description: "Estrae il report scouting completo da testo libero",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number", minimum: 14, maximum: 45 },
        birth_year: { type: "number" },
        nationality: { type: "string" },
        flag: { type: "string", description: "Emoji bandiera, es. 🇮🇹" },
        club: { type: "string" },
        league: { type: "string" },
        region: { type: "string" },
        lat: { type: "number" },
        lng: { type: "number" },
        position_main: { type: "string" },
        position_code: {
          type: "string",
          enum: ["GK", "CB", "LB", "RB", "CDM", "CM", "CAM", "LW", "RW", "ST", "CF"],
        },
        position_secondary: { type: "array", items: { type: "string" } },
        foot: { type: "string", enum: ["Destro", "Sinistro", "Entrambi"] },
        height: { type: "number" },
        weight: { type: "number" },
        tactical_roles: {
          type: "array",
          items: {
            type: "object",
            properties: {
              formation: { type: "string", enum: ["4-3-3", "4-2-3-1", "4-4-2", "3-5-2", "3-4-3", "5-3-2", "4-1-4-1"] },
              role: { type: "string" },
              role_code: {
                type: "string",
                enum: [
                  "GK_SWEEPER", "GK_SHOT_STOPPER",
                  "CB_BALL_PLAYING", "CB_STOPPER", "CB_LIBERO",
                  "RB_WING_BACK", "RB_INVERTED", "RB_CLASSIC",
                  "LB_WING_BACK", "LB_INVERTED", "LB_CLASSIC",
                  "CDM_SCREEN", "CDM_BOX_TO_BOX",
                  "CM_REGISTA", "CM_BOX", "CM_MEZZALA_OFF", "CM_MEZZALA_DEF",
                  "CAM_TREQUARTISTA", "CAM_SHADOW",
                  "LW_WINGER", "LW_INVERTED", "RW_WINGER", "RW_INVERTED",
                  "ST_TARGET", "ST_PRESSING", "CF_FALSE_9", "CF_SECONDA_PUNTA",
                ],
              },
              fit_score: { type: "number", minimum: 0, maximum: 100 },
            },
          },
        },
        formations_played: { type: "array", items: { type: "string" } },
        ratings: {
          type: "object",
          properties: {
            technical: { type: "number" },
            tactical: { type: "number" },
            physical: { type: "number" },
            mental: { type: "number" },
            overall: { type: "number" },
          },
        },
        skills: {
          type: "object",
          properties: {
            ball_control: { type: "number" },
            passing: { type: "number" },
            dribbling: { type: "number" },
            finishing: { type: "number" },
            defensive_work: { type: "number" },
            tactical_iq: { type: "number" },
            decision_making: { type: "number" },
            aerial: { type: "number" },
            pace: { type: "number" },
            stamina: { type: "number" },
          },
        },
        stars: {
          type: "object",
          properties: {
            technique: { type: "number" },
            athleticism: { type: "number" },
            mentality: { type: "number" },
            potential: { type: "number" },
            market_value: { type: "number" },
          },
        },
        market: {
          type: "object",
          properties: {
            value_min: { type: "number" },
            value_max: { type: "number" },
            potential: { type: "string" },
            risk: { type: "string" },
            timeline: { type: "string" },
            ready_level: { type: "string" },
          },
        },
        tags: { type: "array", items: { type: "string" } },
        verdict_type: { type: "string" },
        verdict: { type: "string" },
        observation_type: { type: "string" },
        observation_count: { type: "number" },
        date: { type: "string" },
        strengths: { type: "array", items: { type: "string" } },
        weaknesses: { type: "array", items: { type: "string" } },
        summary: { type: "string" },
        heatmap_zones: {
          type: "array",
          items: {
            type: "object",
            properties: {
              row: { type: "number" },
              col: { type: "number" },
              intensity: { type: "number" },
            },
          },
        },
        stats_source: { type: "string" },
        stats_season: { type: "string" },
        stats: {
          type: "object",
          description: "Statistiche numeriche estratte dal testo (goals, assists, minutes, ecc.)",
        },
      },
      required: ["name", "ratings", "skills", "stars", "market", "tags", "verdict_type", "verdict", "summary"],
    },
  },
};

const HEATMAP_ROWS = 6;
const HEATMAP_COLS = 10;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function zonesToHeatmap(zones: { row: number; col: number; intensity: number }[]): number[] {
  const out = new Array(HEATMAP_ROWS * HEATMAP_COLS).fill(0);
  if (!Array.isArray(zones)) return out;
  for (const z of zones) {
    const cr = clamp(Math.round(z.row), 0, HEATMAP_ROWS - 1);
    const cc = clamp(Math.round(z.col), 0, HEATMAP_COLS - 1);
    const intensity = clamp(z.intensity, 0, 100);
    for (let r = 0; r < HEATMAP_ROWS; r++) {
      for (let c = 0; c < HEATMAP_COLS; c++) {
        const dr = r - cr;
        const dc = c - cc;
        const dist2 = dr * dr + dc * dc;
        const v = intensity * Math.exp(-dist2 / 1.8);
        const idx = r * HEATMAP_COLS + c;
        out[idx] = Math.max(out[idx], v);
      }
    }
  }
  return out.map((v) => Math.round(v));
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { text, name, club } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "Testo del report mancante." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const matchHints = /last\s+match|ultima\s+partita|match\s+stats|per\s+match\b|match\s*report|game\s+stats|vs\.?\s+[A-Z]|\bmatch:\s|\bgame:\s/i.test(text || "");
    const userMsg = `NOME GIOCATORE (suggerimento): ${name || "non specificato"}
CLUB (suggerimento): ${club || "non specificato"}
DATA OSSERVAZIONE: ${new Date().toISOString().slice(0, 10)}
INDIZIO: ${matchHints ? "il documento sembra contenere statistiche di una SINGOLA PARTITA — usa il prefisso m_ per quei numeri." : "il documento sembra contenere statistiche STAGIONALI — usa chiavi senza prefisso."}

OSSERVAZIONI DELLO SCOUT (testo libero):
"""
${text}
"""

Compila ORA il report completo chiamando extract_player_report. Non scrivere altro testo.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY mancante");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMsg },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "extract_player_report" } },
        temperature: 0.3,
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "Limite richieste AI. Riprova tra poco." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResp.status === 402) {
      return new Response(JSON.stringify({ error: "Credito AI esaurito." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("Lovable AI Gateway error", aiResp.status, t.slice(0, 500));
      return new Response(JSON.stringify({ error: "Errore AI durante la trasformazione del report." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const msg = data.choices?.[0]?.message;
    const toolArgs = msg?.tool_calls?.[0]?.function?.arguments;
    const rawText = toolArgs || msg?.content || "";
    let parsed: any;
    try {
      parsed = typeof rawText === "string" ? JSON.parse(rawText) : rawText;
    } catch (err) {
      const jsonMatch = String(rawText).match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]); } catch {}
      }
      if (!parsed) {
        console.error("Bad JSON from Lovable AI", err, String(rawText).slice(0, 300));
        return new Response(JSON.stringify({ error: "Risposta AI non valida. Riprova con un PDF più leggibile." }), {
          status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const heatmap = zonesToHeatmap(parsed.heatmap_zones || []);

    let cleanStats: Record<string, number> = {};
    if (parsed.stats && typeof parsed.stats === "object") {
      for (const [k, v] of Object.entries(parsed.stats)) {
        const n = typeof v === "number" ? v : Number(v);
        if (Number.isFinite(n)) cleanStats[k] = n;
      }
    }

    const hasMKeys = Object.keys(cleanStats).some((k) => k.startsWith("m_"));
    if (matchHints && !hasMKeys && Object.keys(cleanStats).length > 0) {
      const remapped: Record<string, number> = {};
      for (const [k, v] of Object.entries(cleanStats)) {
        remapped[`m_${k}`] = v;
      }
      cleanStats = remapped;
    }

    const player = {
      ...parsed,
      heatmap,
      stats: cleanStats,
      stats_source: parsed.stats_source || "",
      stats_season: parsed.stats_season || "",
    };
    delete player.heatmap_zones;

    // Convert height/weight if Gemini returned them in wrong units
    if (player.height && player.height < 3) player.height = Math.round(player.height * 100);
    if (player.weight && player.weight < 3) player.weight = Math.round(player.weight * 100);
    // Ensure integer fields are integers
    player.height = Math.round(Number(player.height) || 180);
    player.weight = Math.round(Number(player.weight) || 75);
    player.age = Math.round(Number(player.age) || 20);
    player.birth_year = Math.round(Number(player.birth_year) || 2000);
    player.observation_count = Math.round(Number(player.observation_count) || 1);

    if (player.ratings) {
      const r = player.ratings;
      player.ratings = {
        ...r,
        overall: +(r.technical * 0.25 + r.tactical * 0.30 + r.physical * 0.20 + r.mental * 0.25).toFixed(1),
      };
    }

    return new Response(JSON.stringify({ player }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-report error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Errore" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
