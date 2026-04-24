import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Sei un capo scout esperto della Serie D / Eccellenza / Promozione italiana.
Ricevi le osservazioni libere di uno scout su un giocatore e DEVI restituire un report COMPLETO chiamando la funzione \`extract_player_report\`.

REGOLE TASSATIVE:
1. NON puoi rispondere con testo libero. Solo tool call.
2. DEVI compilare TUTTI i campi obbligatori: anagrafica, posizione, almeno 2 ruoli tattici (formation + role + role_code + fit_score 0-100), tutti i rating 0-10, tutte le 10 skills 0-100, tutte le 5 stelle 1-5, mercato, almeno 2 tag, verdict_type, verdetto testuale (2-4 frasi), summary (3-5 frasi), almeno 3 strengths e 2 weaknesses, heatmap_zones e formations_played.
3. Per i campi non esplicitamente menzionati nel testo, deduci valori PLAUSIBILI per la categoria (Serie D / Eccellenza / Promozione). Non lasciare mai array vuoti o stringhe vuote sui campi obbligatori.
4. Coerenza interna obbligatoria:
   - overall = round( technical*0.25 + tactical*0.30 + physical*0.20 + mental*0.25, 1 )
   - se verdict_type = "buy" → almeno un tag tra HIGH POTENTIAL / READY / TOP PROSPECT
   - se verdict_type = "pass" → tag MONITOR o RISKY
   - position_code, position_main e role_code dei tactical_roles devono essere coerenti
5. role_code DEVE essere uno dei valori dell'enum.
6. tag DEVONO essere scelti SOLO da: HIGH POTENTIAL, LOW COST, READY, MONITOR, RISKY, TOP PROSPECT.
7. heatmap_zones è un array di zone calde del campo (top-down, vista dello scout). Ogni zona ha row 0-5 (0 = porta avversaria, 5 = porta propria), col 0-9 (0 = sinistra, 9 = destra) e intensity 1-100.
   Restituisci 4-8 zone che riflettano dove il giocatore opera di più dato il suo ruolo e quanto descritto nel testo.
8. formations_played: array di moduli (es. "4-3-3", "3-5-2") in cui il giocatore è stato osservato rendere bene.
9. summary, verdict, strengths e weaknesses devono essere in italiano scoutistico professionale, mai generici.
10. Se non viene fornita la regione, usa "Puglia" come default.`;

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
          minItems: 2,
          maxItems: 4,
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
            required: ["formation", "role", "role_code", "fit_score"],
          },
        },
        formations_played: {
          type: "array",
          items: { type: "string" },
          description: "Moduli in cui il giocatore ha reso bene",
        },
        ratings: {
          type: "object",
          properties: {
            technical: { type: "number", minimum: 0, maximum: 10 },
            tactical: { type: "number", minimum: 0, maximum: 10 },
            physical: { type: "number", minimum: 0, maximum: 10 },
            mental: { type: "number", minimum: 0, maximum: 10 },
            overall: { type: "number", minimum: 0, maximum: 10 },
          },
          required: ["technical", "tactical", "physical", "mental", "overall"],
        },
        skills: {
          type: "object",
          properties: {
            ball_control: { type: "number", minimum: 0, maximum: 100 },
            passing: { type: "number", minimum: 0, maximum: 100 },
            dribbling: { type: "number", minimum: 0, maximum: 100 },
            finishing: { type: "number", minimum: 0, maximum: 100 },
            defensive_work: { type: "number", minimum: 0, maximum: 100 },
            tactical_iq: { type: "number", minimum: 0, maximum: 100 },
            decision_making: { type: "number", minimum: 0, maximum: 100 },
            aerial: { type: "number", minimum: 0, maximum: 100 },
            pace: { type: "number", minimum: 0, maximum: 100 },
            stamina: { type: "number", minimum: 0, maximum: 100 },
          },
          required: [
            "ball_control", "passing", "dribbling", "finishing", "defensive_work",
            "tactical_iq", "decision_making", "aerial", "pace", "stamina",
          ],
        },
        stars: {
          type: "object",
          properties: {
            technique: { type: "number", minimum: 1, maximum: 5 },
            athleticism: { type: "number", minimum: 1, maximum: 5 },
            mentality: { type: "number", minimum: 1, maximum: 5 },
            potential: { type: "number", minimum: 1, maximum: 5 },
            market_value: { type: "number", minimum: 1, maximum: 5 },
          },
          required: ["technique", "athleticism", "mentality", "potential", "market_value"],
        },
        market: {
          type: "object",
          properties: {
            value_min: { type: "number" },
            value_max: { type: "number" },
            potential: { type: "string", enum: ["Alto", "Medio-Alto", "Medio", "Basso"] },
            risk: { type: "string", enum: ["Basso", "Medio", "Alto"] },
            timeline: { type: "string" },
            ready_level: { type: "string" },
          },
          required: ["value_min", "value_max", "potential", "risk", "timeline", "ready_level"],
        },
        tags: {
          type: "array",
          minItems: 1,
          items: {
            type: "string",
            enum: ["HIGH POTENTIAL", "LOW COST", "READY", "MONITOR", "RISKY", "TOP PROSPECT"],
          },
        },
        verdict_type: { type: "string", enum: ["buy", "monitor", "pass"] },
        verdict: { type: "string", description: "2-4 frasi di verdetto operativo" },
        observation_type: { type: "string", enum: ["Video", "Dal vivo", "Video + Dal vivo"] },
        observation_count: { type: "number" },
        date: { type: "string", description: "YYYY-MM-DD" },
        strengths: { type: "array", minItems: 3, items: { type: "string" } },
        weaknesses: { type: "array", minItems: 2, items: { type: "string" } },
        summary: { type: "string", description: "3-5 frasi di analisi tattica" },
        heatmap_zones: {
          type: "array",
          minItems: 4,
          maxItems: 12,
          description: "Zone calde del campo dove opera il giocatore",
          items: {
            type: "object",
            properties: {
              row: { type: "number", minimum: 0, maximum: 5 },
              col: { type: "number", minimum: 0, maximum: 9 },
              intensity: { type: "number", minimum: 1, maximum: 100 },
            },
            required: ["row", "col", "intensity"],
          },
        },
      },
      required: [
        "name", "age", "birth_year", "nationality", "flag", "position_main", "position_code",
        "foot", "height", "weight", "tactical_roles", "formations_played", "ratings", "skills",
        "stars", "market", "tags", "verdict_type", "verdict", "observation_type",
        "observation_count", "date", "strengths", "weaknesses", "summary", "heatmap_zones",
      ],
    },
  },
};

const HEATMAP_ROWS = 6;
const HEATMAP_COLS = 10;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Convert AI heatmap_zones array to a flat 6x10 heatmap with soft bleed on neighbors.
 */
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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not set");

    const userMsg = `NOME GIOCATORE (suggerimento): ${name || "non specificato"}
CLUB (suggerimento): ${club || "non specificato"}
DATA OSSERVAZIONE: ${new Date().toISOString().slice(0, 10)}

OSSERVAZIONI DELLO SCOUT (testo libero):
"""
${text}
"""

Compila ORA il report completo chiamando extract_player_report. Non scrivere altro testo.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
      }),
    });

    if (response.status === 429) {
      return new Response(JSON.stringify({ error: "Limite di richieste superato. Riprova tra qualche secondo." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "Credito AI esaurito. Aggiungi credito al workspace Lovable." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!response.ok) {
      const t = await response.text();
      console.error("Gateway error", response.status, t);
      return new Response(JSON.stringify({ error: "Errore AI gateway" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) {
      return new Response(JSON.stringify({ error: "Nessun risultato strutturato dall'AI. Riprova con più dettagli." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(call.function.arguments);
    } catch (err) {
      console.error("Bad JSON from tool call", err, call.function.arguments);
      return new Response(JSON.stringify({ error: "Risposta AI non valida (JSON malformato)." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert heatmap_zones into the flat 6x10 array used by the frontend.
    const heatmap = zonesToHeatmap(parsed.heatmap_zones || []);
    const player = {
      ...parsed,
      heatmap,
    };
    delete player.heatmap_zones;

    // Recompute overall to enforce the documented formula.
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
