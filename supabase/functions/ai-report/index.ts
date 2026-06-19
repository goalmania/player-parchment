import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Sei un capo scout esperto della Serie D / Eccellenza / Promozione italiana.
Ricevi le osservazioni libere di uno scout (o un report PDF/DOCX/TXT InStat/Wyscout/FBref/club) e DEVI restituire un report COMPLETO chiamando la funzione \`extract_player_report\`.

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
   Restituisci 4-8 zone che riflettano dove il giocatore opera di più dato il suo ruolo.
8. formations_played: array di moduli (es. "4-3-3", "3-5-2") in cui il giocatore è stato osservato.
9. summary, verdict, strengths e weaknesses devono essere in italiano scoutistico professionale, mai generici.
10. Il campo "region" va compilato SOLO se il giocatore è italiano (nationality = "Italia" o simile). Per giocatori stranieri lascia region come stringa vuota "".
11. STATISTICHE:
    - Se il testo è un report di InStat/Wyscout/FBref, estrai ogni statistica e popola l'oggetto stats.
    - Metriche STAGIONALI → chiavi senza prefisso (goals, assists, minutes, ecc.)
    - Metriche ULTIMA PARTITA → prefisso m_ (m_goals, m_assists, m_minutes, ecc.)
    - NON inventare valori statistici: se non è nel testo, ometti.
    - Tutti i valori devono essere numerici. Le percentuali come numero 0-100.`;

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
        flag: { type: "string" },
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
              formation: { type: "string" },
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
          additionalProperties: { type: "number" },
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

function zonesToHeatmap(zones: { row: number; col: number; intensity: number }[]): number[] {
  const out = new Array(HEATMAP_ROWS * HEATMAP_COLS).fill(0);
  if (!Array.isArray(zones)) return out;
  for (const z of zones) {
    const cr = clamp(Math.round(z.row), 0, HEATMAP_ROWS - 1);
    const cc = clamp(Math.round(z.col), 0, HEATMAP_COLS - 1);
    const intensity = clamp(z.intensity, 0, 100);
    for (let r = 0; r < HEATMAP_ROWS; r++) {
      for (let c = 0; c < HEATMAP_COLS; c++) {
        const dist2 = (r - cr) ** 2 + (c - cc) ** 2;
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
    if (!text || text.length < 20) {
      return new Response(JSON.stringify({ error: "Testo troppo breve per generare un report." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
    const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!OPENAI_KEY && !GEMINI_KEY) {
      return new Response(JSON.stringify({ error: "Nessuna chiave AI configurata nel progetto." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const matchHints = /last\s+match|ultima\s+partita|match\s+stats|per\s+match\b|match\s*report|game\s+stats|vs\.?\s+[A-Z]|\bmatch:\s|\bgame:\s/i.test(text);
    const userMsg = `NOME GIOCATORE (suggerimento): ${name || "non specificato"}
CLUB (suggerimento): ${club || "non specificato"}
DATA OSSERVAZIONE: ${new Date().toISOString().slice(0, 10)}
INDIZIO: ${matchHints ? "il documento contiene statistiche di una SINGOLA PARTITA — usa il prefisso m_ per quei numeri." : "il documento contiene statistiche STAGIONALI — usa chiavi senza prefisso."}

OSSERVAZIONI DELLO SCOUT:
"""
${text}
"""

Compila ORA il report completo chiamando extract_player_report.`;

    const GROQ_KEY = Deno.env.get("GROQ_API_KEY");
    let parsed: any = null;

    // Helper: chiama un endpoint compatibile OpenAI con tool calling (timeout 40s)
    async function callOpenAICompat(url: string, apiKey: string, model: string): Promise<any> {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 40000);
      try {
        const r = await fetch(url, {
          signal: ctrl.signal,
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userMsg },
            ],
            tools: [TOOL],
            tool_choice: { type: "function", function: { name: "extract_player_report" } },
            temperature: 0.3,
            max_tokens: 4096,
          }),
        });
        if (!r.ok) { console.warn(`${url} error`, r.status, await r.text()); return null; }
        const d = await r.json();
        const args = d.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        if (!args) { console.warn(`${url} no args`, JSON.stringify(d).slice(0, 300)); return null; }
        return JSON.parse(args);
      } finally {
        clearTimeout(timer);
      }
    }

    // 1. OpenAI (primary)
    if (!parsed && OPENAI_KEY) {
      try { parsed = await callOpenAICompat("https://api.openai.com/v1/chat/completions", OPENAI_KEY, "gpt-4o-mini"); }
      catch (e) { console.warn("OpenAI error", e); }
    }

    // 2. GROQ (secondary)
    if (!parsed && GROQ_KEY) {
      try { parsed = await callOpenAICompat("https://api.groq.com/openai/v1/chat/completions", GROQ_KEY, "llama-3.3-70b-versatile"); }
      catch (e) { console.warn("GROQ error", e); }
    }

    // 3. Gemini (last resort)
    if (!parsed && GEMINI_KEY) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 40000);
      try {
        const geminiPrompt = SYSTEM_PROMPT + "\n\nRispondi SOLO con JSON valido (oggetto con tutti i campi del tool).\n\n" + userMsg;
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
          {
            signal: ctrl.signal,
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: geminiPrompt }] }],
              generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
            }),
          }
        );
        if (r.ok) {
          const d = await r.json();
          const rawText = d.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) parsed = JSON.parse(rawText);
          else console.warn("Gemini no text", JSON.stringify(d).slice(0, 300));
        } else { console.warn("Gemini error", r.status, await r.text()); }
      } catch (e) { console.warn("Gemini fetch error", e); }
      finally { clearTimeout(timer); }
    }

    if (!parsed) {
      return new Response(JSON.stringify({ error: "Servizio AI temporaneamente non disponibile. Riprova tra qualche secondo." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const heatmap = zonesToHeatmap(parsed.heatmap_zones || []);

    let cleanStats: Record<string, number> = {};
    if (parsed.stats && typeof parsed.stats === "object") {
      for (const [k, v] of Object.entries(parsed.stats)) {
        const n = typeof v === "number" ? v : Number(v);
        if (Number.isFinite(n)) cleanStats[k] = n;
      }
    }

    // Safety: se documento di singola partita ma l'AI non ha usato m_ prefix, rimappa
    const hasMKeys = Object.keys(cleanStats).some((k) => k.startsWith("m_"));
    if (matchHints && !hasMKeys && Object.keys(cleanStats).length > 0) {
      const remapped: Record<string, number> = {};
      for (const [k, v] of Object.entries(cleanStats)) remapped[`m_${k}`] = v;
      cleanStats = remapped;
    }

    const player = { ...parsed, heatmap, stats: cleanStats, stats_source: parsed.stats_source || "", stats_season: parsed.stats_season || "" };
    delete player.heatmap_zones;

    // Enforce integer fields
    player.height = Math.round(Number(player.height) || 180);
    if (player.height < 3) player.height = Math.round(player.height * 100);
    player.weight = Math.round(Number(player.weight) || 75);
    if (player.weight < 3) player.weight = Math.round(player.weight * 100);
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
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-report error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Errore interno" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
