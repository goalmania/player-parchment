// Edge function: estrae statistiche da testo libero o da una pagina web
// (Transfermarkt / FBref / Sofascore / WhoScored / ecc.) usando AI tool calling.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STATS_TOOL = {
  type: "function",
  function: {
    name: "extract_stats",
    description: "Estrae le statistiche stagionali del giocatore dal testo fornito.",
    parameters: {
      type: "object",
      properties: {
        season: { type: "string", description: "Stagione di riferimento, es. 2024/25" },
        source: { type: "string", description: "Fonte (es. Transfermarkt, FBref, WhoScored, manuale)" },
        stats: {
          type: "object",
          description: "Statistiche numeriche. Includi solo quelle realmente trovate nel testo.",
          properties: {
            matches: { type: "number" }, matches_started: { type: "number" }, minutes: { type: "number" },
            yellow_cards: { type: "number" }, red_cards: { type: "number" },
            goals: { type: "number" }, assists: { type: "number" },
            shots: { type: "number" }, shots_on_target: { type: "number" },
            xg: { type: "number" }, xa: { type: "number" }, npxg: { type: "number" },
            goal_conversion: { type: "number" }, penalties_scored: { type: "number" }, penalties_taken: { type: "number" },
            passes: { type: "number" }, passes_completed: { type: "number" }, pass_accuracy: { type: "number" },
            key_passes: { type: "number" }, through_balls: { type: "number" },
            long_balls: { type: "number" }, long_ball_accuracy: { type: "number" },
            crosses: { type: "number" }, crosses_completed: { type: "number" },
            touches: { type: "number" }, dribbles: { type: "number" }, dribbles_completed: { type: "number" },
            dribble_success: { type: "number" }, progressive_carries: { type: "number" }, progressive_passes: { type: "number" },
            tackles: { type: "number" }, tackles_won: { type: "number" }, interceptions: { type: "number" },
            blocks: { type: "number" }, clearances: { type: "number" },
            duels_won: { type: "number" }, duels_total: { type: "number" },
            aerial_duels_won: { type: "number" }, aerial_duels_total: { type: "number" },
            fouls_committed: { type: "number" }, fouls_drawn: { type: "number" },
            distance_km: { type: "number" }, sprints: { type: "number" }, top_speed_kmh: { type: "number" },
            saves: { type: "number" }, clean_sheets: { type: "number" }, goals_conceded: { type: "number" }, save_pct: { type: "number" },
            avg_rating: { type: "number" },
          },
        },
      },
      required: ["stats"],
    },
  },
};

async function fetchUrlText(url: string): Promise<string> {
  const resp = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; DMScoutBot/1.0)",
      "Accept": "text/html,application/xhtml+xml",
    },
    redirect: "follow",
  });
  if (!resp.ok) throw new Error(`Fetch URL fallito: ${resp.status}`);
  const html = await resp.text();
  // Rimuove script/style e tag HTML, lascia solo testo
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.slice(0, 25000);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { input } = await req.json();
    if (!input || typeof input !== "string") {
      return new Response(JSON.stringify({ error: "input richiesto" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY mancante");

    let sourceText = input;
    let sourceLabel = "manuale/testo";
    if (/^https?:\/\//i.test(input.trim())) {
      try {
        sourceText = await fetchUrlText(input.trim());
        sourceLabel = new URL(input.trim()).hostname.replace(/^www\./, "");
      } catch (e) {
        return new Response(JSON.stringify({ error: `Impossibile leggere l'URL (${e instanceof Error ? e.message : "errore"}). Prova a copia-incollare il testo della pagina.` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const userMsg = `FONTE: ${sourceLabel}

TESTO:
"""
${sourceText.slice(0, 20000)}
"""

Estrai TUTTE le statistiche stagionali del calciatore che riesci a identificare. Se il testo cita più stagioni, prendi la più recente. Restituisci numeri puri (es. 12 non "12 gol"). Se la statistica non è presente, NON includerla.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Sei un parser di statistiche calcistiche. Usa SEMPRE il tool extract_stats." },
          { role: "user", content: userMsg },
        ],
        tools: [STATS_TOOL],
        tool_choice: { type: "function", function: { name: "extract_stats" } },
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "Limite richieste. Riprova." }), {
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
      console.error("Gateway error", aiResp.status, t);
      return new Response(JSON.stringify({ error: "Errore AI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) {
      return new Response(JSON.stringify({ error: "Nessuna statistica estratta. Prova un testo più ricco di numeri." }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(call.function.arguments);
    return new Response(JSON.stringify({
      stats: parsed.stats || {},
      season: parsed.season || "",
      source: parsed.source || sourceLabel,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("import-stats error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Errore" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
