import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Sei un capo scout esperto della Serie D / Eccellenza / Promozione italiana.
Ricevi le osservazioni libere di uno scout (o un report PDF/DOCX/TXT InStat/Wyscout/FBref/club) e DEVI restituire un report COMPLETO chiamando la funzione \`extract_player_report\`.

REGOLE TASSATIVE:
1. NON puoi rispondere con testo libero. Solo tool call.
2. DEVI compilare TUTTI i campi obbligatori: anagrafica, posizione, almeno 2 ruoli tattici (formation + role + role_code + fit_score 0-100), tutti i rating 0-10, tutte le 15 skills 0-100, tutte le 5 stelle 1-5, mercato, almeno 2 tag, verdict_type, verdetto testuale (2-4 frasi), summary (3-5 frasi), almeno 3 strengths e 2 weaknesses, heatmap_zones e formations_played.
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
11. body_type: deduci Longilineo/Normolineo/Brevilineo da indizi sulla corporatura nel testo (es. "fisico esile" → Longilineo, "strutturato/muscoloso" → Brevilineo); se non menzionato usa "Normolineo".
12. STATISTICHE:
    - Se il testo è un report di InStat/Wyscout/FBref, estrai ogni statistica e popola l'oggetto stats.
    - Metriche STAGIONALI → chiavi senza prefisso (goals, assists, minutes, ecc.)
    - Metriche ULTIMA PARTITA → prefisso m_ (m_goals, m_assists, m_minutes, ecc.)
    - NON inventare valori statistici: se non è nel testo, ometti.
    - Tutti i valori devono essere numerici. Le percentuali come numero 0-100.`;

const FILE_SYSTEM_PROMPT = SYSTEM_PROMPT + `

Il report NON ti viene fornito come testo: ricevi il documento ORIGINALE allegato (PDF), che può contenere
testo selezionabile, tabelle, grafici, oppure essere una scansione/foto (solo immagini). Leggi ATTENTAMENTE
tutto il contenuto del documento, pagina per pagina — incluso testo scritto a mano, tabelle e didascalie nelle
immagini — ed usa quei dati per compilare il report. Se alcune pagine sono illeggibili, deduci comunque valori
plausibili per i campi mancanti secondo la REGOLA 3.`;

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
        body_type: { type: "string", enum: ["Longilineo", "Normolineo", "Brevilineo"] },
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
            crossing: { type: "number" },
            heading: { type: "number" },
            marking: { type: "number" },
            vision: { type: "number" },
            work_rate: { type: "number" },
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

/** Converte lo schema JSON del TOOL (usato per il function-calling OpenAI/GROQ) in uno
 *  schema compatibile con generationConfig.responseSchema di Gemini, che non supporta
 *  "additionalProperties" per gli oggetti a chiavi libere (es. stats). Senza questo vincolo
 *  esplicito, in modalità JSON libera Gemini può restituire una struttura arbitraria diversa
 *  da quella piatta attesa dal client (è già successo: player_profile.first_name invece di name). */
function toGeminiSchema(node: any): any {
  if (Array.isArray(node)) return node.map(toGeminiSchema);
  if (node && typeof node === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === "additionalProperties") continue;
      out[k] = toGeminiSchema(v);
    }
    return out;
  }
  return node;
}

const GEMINI_RESPONSE_SCHEMA = toGeminiSchema(TOOL.function.parameters);

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

// Modelli Gemini da provare in ordine (il primo è il più recente/capace; i successivi
// fanno da rete di sicurezza se Google ritira/rinomina un modello, come già accaduto
// con gemini-2.0-flash).
const GEMINI_MODELS = ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-2.0-flash"];

/** Chiama Gemini generateContent con le parti fornite, provando più modelli entro una scadenza
 *  TOTALE condivisa (non un timeout fisso per tentativo): un errore rapido e transitorio (es.
 *  503 "modello sovraccarico") consuma poco budget e lascia margine per riprovare con un altro
 *  modello, mentre un tentativo lento (es. OCR di un documento lungo) non arriva mai a moltiplicare
 *  l'attesa oltre il limite di risposta di 150s di Supabase Edge Functions. */
async function callGemini(apiKey: string, parts: unknown[], totalTimeoutMs: number, models: string[] = GEMINI_MODELS): Promise<any> {
  const deadline = Date.now() + totalTimeoutMs;
  for (const model of models) {
    const remaining = deadline - Date.now();
    if (remaining <= 2000) break;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), remaining);
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          signal: ctrl.signal,
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: { temperature: 0.3, responseMimeType: "application/json", responseSchema: GEMINI_RESPONSE_SCHEMA },
          }),
        }
      );
      if (r.ok) {
        const d = await r.json();
        const rawText = d.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          try { return JSON.parse(rawText); }
          catch (e) { console.warn(`Gemini ${model} invalid JSON`, e); continue; }
        }
        console.warn(`Gemini ${model} no text`, JSON.stringify(d).slice(0, 300));
      } else {
        console.warn(`Gemini ${model} error`, r.status, await r.text());
      }
    } catch (e) {
      console.warn(`Gemini ${model} fetch error`, e);
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

// Modelli gratuiti su OpenRouter (https://openrouter.ai) usati come rete di sicurezza in più:
// nessun costo, di vendor diversi da OpenAI/GROQ/Google, così un singolo provider che si rompe
// (chiave senza crediti, modello ritirato, rate limit) non blocca mai l'estrazione. Richiede il
// secret OPENROUTER_API_KEY (account gratuito su openrouter.ai/keys, nessuna carta necessaria);
// se il secret manca questi tentativi vengono semplicemente saltati, come per le altre chiavi.
//
// Lista verificata a mano (11 ago 2026) contro l'API reale con tool_choice forzato:
// - openai/gpt-oss-20b:free → ESCLUSO, non supporta tool_choice forzato (400 invalid_request_error)
// - nvidia/nemotron-3-ultra-550b-a55b:free → ESCLUSO, ha restituito output vuoto/spazzatura
// - google/gemma-4-31b-it:free → tenuto ma spesso in rate-limit condiviso (429), fallback opportunistico
const OPENROUTER_TEXT_MODELS = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "openrouter/free",
  "google/gemma-4-31b-it:free",
];

// NB: niente fallback OpenRouter per l'OCR (percorso file). Verificato empiricamente: le API
// di visione compatibili OpenAI (inclusi i modelli gratuiti sopra) rifiutano un PDF grezzo come
// image_url ("cannot identify image file" — richiedono PNG/JPEG già renderizzati). Solo Gemini,
// tra i provider integrati, capisce un PDF multi-pagina senza prima convertirlo in immagini:
// per questo l'OCR resta basato solo su Gemini (già reso resiliente su 3 modelli in sequenza).

/** Chiama un endpoint compatibile OpenAI (chat completions + tool calling forzato) con un
 *  timeout esplicito in ms. Usato per OpenAI, GROQ e OpenRouter — stesso schema per tutti. */
async function callOpenAICompat(url: string, apiKey: string, model: string, userMsg: string, timeoutMs: number): Promise<any> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
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
    if (!r.ok) { console.warn(`${model} error`, r.status, await r.text()); return null; }
    const d = await r.json();
    const args = d.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) { console.warn(`${model} no args`, JSON.stringify(d).slice(0, 300)); return null; }
    return JSON.parse(args);
  } catch (e) {
    console.warn(`${model} fetch error`, e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { text, name, club, fileBase64, mimeType } = await req.json();
    const isFileMode = !!fileBase64;

    if (!isFileMode && (!text || text.length < 20)) {
      return new Response(JSON.stringify({ error: "Testo troppo breve per generare un report." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
    const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
    const GROQ_KEY = Deno.env.get("GROQ_API_KEY");
    const OPENROUTER_KEY = Deno.env.get("OPENROUTER_API_KEY");

    if (!OPENAI_KEY && !GEMINI_KEY && !GROQ_KEY && !OPENROUTER_KEY) {
      return new Response(JSON.stringify({ error: "Nessuna chiave AI configurata nel progetto." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: any = null;
    let matchHints = false;

    if (isFileMode) {
      // Percorso OCR: il file (tipicamente un PDF scansionato) viene letto direttamente da
      // Gemini, l'unico provider integrato che capisce un PDF grezzo multi-pagina senza doverlo
      // prima convertire in immagini (verificato: i modelli gratuiti di OpenRouter rifiutano un
      // PDF grezzo come input immagine — richiedono PNG/JPEG già renderizzati, non applicabile
      // qui senza un rasterizzatore PDF dedicato). La resilienza qui viene dai 3 modelli Gemini
      // già in sequenza in callGemini(), non da più provider.
      if (!GEMINI_KEY) {
        return new Response(JSON.stringify({ error: "Lettura diretta del documento (OCR) non disponibile: chiave Gemini non configurata." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userInfoFile = `NOME GIOCATORE (suggerimento): ${name || "non specificato"}
CLUB (suggerimento): ${club || "non specificato"}
DATA OSSERVAZIONE: ${new Date().toISOString().slice(0, 10)}

Il documento allegato è il report scouting originale. Analizzalo e compila ORA il report completo in formato JSON secondo lo schema richiesto.`;

      const geminiPrompt = FILE_SYSTEM_PROMPT + "\n\nRispondi SOLO con JSON valido (oggetto con tutti i campi richiesti).\n\n" + userInfoFile;

      parsed = await callGemini(
        GEMINI_KEY,
        [{ text: geminiPrompt }, { inlineData: { mimeType: mimeType || "application/pdf", data: fileBase64 } }],
        115000,
      );
      if (parsed) console.log("ai-report (file) servito da Gemini");

      if (!parsed) {
        return new Response(JSON.stringify({ error: "Non sono riuscito a leggere il documento (scansione di bassa qualità o pagine illeggibili)." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      matchHints = /last\s+match|ultima\s+partita|match\s+stats|per\s+match\b|match\s*report|game\s+stats|vs\.?\s+[A-Z]|\bmatch:\s|\bgame:\s/i.test(text);
      const userMsg = `NOME GIOCATORE (suggerimento): ${name || "non specificato"}
CLUB (suggerimento): ${club || "non specificato"}
DATA OSSERVAZIONE: ${new Date().toISOString().slice(0, 10)}
INDIZIO: ${matchHints ? "il documento contiene statistiche di una SINGOLA PARTITA — usa il prefisso m_ per quei numeri." : "il documento contiene statistiche STAGIONALI — usa chiavi senza prefisso."}

OSSERVAZIONI DELLO SCOUT:
"""
${text}
"""

Compila ORA il report completo chiamando extract_player_report.`;

      // Catena di provider testuali compatibili OpenAI, in ordine di preferenza. Nessun singolo
      // provider deve poter bloccare l'estrazione: OpenAI/GROQ restano primari quando disponibili
      // (qualità migliore), OpenRouter aggiunge 4 modelli GRATUITI di vendor diversi come rete di
      // sicurezza, Gemini testuale resta l'ultima risorsa.
      const textCandidates: { url: string; apiKey: string; model: string }[] = [];
      if (OPENAI_KEY) textCandidates.push({ url: "https://api.openai.com/v1/chat/completions", apiKey: OPENAI_KEY, model: "gpt-4o-mini" });
      if (GROQ_KEY) textCandidates.push({ url: "https://api.groq.com/openai/v1/chat/completions", apiKey: GROQ_KEY, model: "llama-3.3-70b-versatile" });
      if (OPENROUTER_KEY) for (const model of OPENROUTER_TEXT_MODELS) textCandidates.push({ url: "https://openrouter.ai/api/v1/chat/completions", apiKey: OPENROUTER_KEY, model });

      // Scadenza TOTALE condivisa fra OpenAI/GROQ/OpenRouter (fino a 7 tentativi): un fallimento
      // rapido lascia margine per il successivo, uno lento non arriva mai a saturare il budget.
      const textDeadline = Date.now() + 100000;
      for (const c of textCandidates) {
        const remaining = textDeadline - Date.now();
        if (remaining <= 2000) break;
        try {
          parsed = await callOpenAICompat(c.url, c.apiKey, c.model, userMsg, remaining);
          if (parsed) { console.log(`ai-report servito da ${c.model}`); break; }
        } catch (e) { console.warn(`${c.model} error`, e); }
      }

      // Ultima risorsa: Gemini testuale (già resiliente su più modelli internamente).
      if (!parsed && GEMINI_KEY) {
        const geminiPrompt = SYSTEM_PROMPT + "\n\nRispondi SOLO con JSON valido (oggetto con tutti i campi del tool).\n\n" + userMsg;
        parsed = await callGemini(GEMINI_KEY, [{ text: geminiPrompt }], 30000);
        if (parsed) console.log("ai-report servito da Gemini (testo)");
      }

      if (!parsed) {
        return new Response(JSON.stringify({ error: "Servizio AI temporaneamente non disponibile. Riprova tra qualche secondo." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
