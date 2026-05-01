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
    description:
      "Estrae le statistiche del giocatore dal testo fornito. Le chiavi senza prefisso = STAGIONE, con prefisso m_ = ULTIMA PARTITA. Includi solo le statistiche realmente trovate. Restituisci numeri puri con punto decimale (es. 12.5).",
    parameters: {
      type: "object",
      properties: {
        season: { type: "string", description: "Stagione di riferimento, es. 2024/25" },
        source: { type: "string", description: "Fonte (Transfermarkt, FBref, InStat, WhoScored, Sofascore, Wyscout, manuale)" },
        scope: { type: "string", enum: ["season", "match", "both"], description: "Tipo di dati estratti" },
        stats: {
          type: "object",
          description: "Statistiche numeriche. Includi SOLO quelle realmente presenti nel testo.",
          properties: {
            // === STAGIONE — apparizioni ===
            matches: { type: "number" }, matches_started: { type: "number" },
            matches_subbed_in: { type: "number" }, matches_subbed_out: { type: "number" },
            minutes: { type: "number" }, minutes_per_match: { type: "number" },
            yellow_cards: { type: "number" }, yellow_red_cards: { type: "number" }, red_cards: { type: "number" },
            fouls_per_match: { type: "number" },
            // === STAGIONE — offensive ===
            goals: { type: "number" }, goals_per_90: { type: "number" }, non_penalty_goals: { type: "number" },
            assists: { type: "number" }, assists_per_90: { type: "number" }, goal_contributions: { type: "number" },
            shots: { type: "number" }, shots_per_90: { type: "number" },
            shots_on_target: { type: "number" }, shots_on_target_pct: { type: "number" },
            shots_blocked: { type: "number" }, shots_off_target: { type: "number" },
            xg: { type: "number" }, xg_per_90: { type: "number" },
            xa: { type: "number" }, xa_per_90: { type: "number" },
            npxg: { type: "number" }, npxg_per_90: { type: "number" }, xg_overperformance: { type: "number" },
            goal_conversion: { type: "number" },
            big_chances_created: { type: "number" }, big_chances_missed: { type: "number" },
            penalties_scored: { type: "number" }, penalties_taken: { type: "number" }, penalty_conversion: { type: "number" },
            free_kick_goals: { type: "number" }, headed_goals: { type: "number" },
            // === STAGIONE — passing ===
            passes: { type: "number" }, passes_per_90: { type: "number" },
            passes_completed: { type: "number" }, pass_accuracy: { type: "number" },
            key_passes: { type: "number" }, key_passes_per_90: { type: "number" },
            through_balls: { type: "number" }, through_ball_accuracy: { type: "number" },
            long_balls: { type: "number" }, long_ball_accuracy: { type: "number" },
            crosses: { type: "number" }, crosses_completed: { type: "number" }, cross_accuracy: { type: "number" },
            forward_passes: { type: "number" }, back_passes: { type: "number" },
            passes_into_final_third: { type: "number" }, passes_into_box: { type: "number" },
            smart_passes: { type: "number" }, smart_passes_completed: { type: "number" },
            progressive_passes: { type: "number" },
            // === STAGIONE — possesso/dribbling ===
            touches: { type: "number" }, touches_in_box: { type: "number" },
            dribbles: { type: "number" }, dribbles_completed: { type: "number" }, dribble_success: { type: "number" },
            progressive_carries: { type: "number" },
            carries_into_final_third: { type: "number" }, carries_into_box: { type: "number" },
            lost_balls: { type: "number" }, recoveries: { type: "number" },
            successful_attacking_actions: { type: "number" }, successful_defensive_actions: { type: "number" },
            // === STAGIONE — difensive ===
            tackles: { type: "number" }, tackles_per_90: { type: "number" },
            tackles_won: { type: "number" }, tackle_success: { type: "number" },
            interceptions: { type: "number" }, interceptions_per_90: { type: "number" },
            blocks: { type: "number" }, clearances: { type: "number" },
            duels_won: { type: "number" }, duels_total: { type: "number" }, duel_success: { type: "number" },
            aerial_duels_won: { type: "number" }, aerial_duels_total: { type: "number" }, aerial_duel_success: { type: "number" },
            ground_duels_won: { type: "number" }, ground_duels_total: { type: "number" }, ground_duel_success: { type: "number" },
            fouls_committed: { type: "number" }, fouls_drawn: { type: "number" }, offsides: { type: "number" },
            errors_leading_to_goal: { type: "number" }, errors_leading_to_shot: { type: "number" },
            // === STAGIONE — atletici ===
            distance_km: { type: "number" }, distance_per_match_km: { type: "number" },
            sprints: { type: "number" }, sprints_per_match: { type: "number" }, high_intensity_runs: { type: "number" },
            top_speed_kmh: { type: "number" }, avg_speed_kmh: { type: "number" },
            // === STAGIONE — portiere ===
            saves: { type: "number" }, saves_per_90: { type: "number" }, save_pct: { type: "number" },
            clean_sheets: { type: "number" }, goals_conceded: { type: "number" }, goals_conceded_per_90: { type: "number" },
            psxg: { type: "number" }, psxg_minus_goals: { type: "number" },
            punches: { type: "number" }, high_claims: { type: "number" }, sweeper_actions: { type: "number" },
            goal_kicks: { type: "number" }, goal_kick_accuracy: { type: "number" },
            // === Indici ===
            instat_index: { type: "number" }, avg_rating: { type: "number" },
            // === ULTIMA PARTITA (prefisso m_) ===
            m_minutes: { type: "number" }, m_rating: { type: "number" },
            m_yellow_cards: { type: "number" }, m_red_cards: { type: "number" },
            m_goals: { type: "number" }, m_assists: { type: "number" },
            m_shots: { type: "number" }, m_shots_on_target: { type: "number" },
            m_shots_blocked: { type: "number" }, m_shots_off_target: { type: "number" },
            m_xg: { type: "number" }, m_xa: { type: "number" }, m_npxg: { type: "number" },
            m_big_chances_created: { type: "number" }, m_big_chances_missed: { type: "number" },
            m_passes: { type: "number" }, m_passes_completed: { type: "number" }, m_pass_accuracy: { type: "number" },
            m_key_passes: { type: "number" }, m_through_balls: { type: "number" },
            m_long_balls: { type: "number" }, m_long_ball_accuracy: { type: "number" },
            m_crosses: { type: "number" }, m_crosses_completed: { type: "number" },
            m_forward_passes: { type: "number" }, m_back_passes: { type: "number" },
            m_passes_into_final_third: { type: "number" }, m_passes_into_box: { type: "number" },
            m_dribbles: { type: "number" }, m_dribbles_completed: { type: "number" }, m_dribble_success: { type: "number" },
            m_progressive_carries: { type: "number" }, m_progressive_passes: { type: "number" },
            m_touches: { type: "number" }, m_touches_in_box: { type: "number" },
            m_lost_balls: { type: "number" }, m_recoveries: { type: "number" },
            m_tackles: { type: "number" }, m_tackles_won: { type: "number" },
            m_interceptions: { type: "number" }, m_blocks: { type: "number" }, m_clearances: { type: "number" },
            m_duels_total: { type: "number" }, m_duels_won: { type: "number" },
            m_aerial_duels_total: { type: "number" }, m_aerial_duels_won: { type: "number" },
            m_ground_duels_total: { type: "number" }, m_ground_duels_won: { type: "number" },
            m_fouls_committed: { type: "number" }, m_fouls_drawn: { type: "number" }, m_offsides: { type: "number" },
            m_distance_km: { type: "number" }, m_sprints: { type: "number" }, m_high_intensity_runs: { type: "number" },
            m_top_speed_kmh: { type: "number" }, m_avg_speed_kmh: { type: "number" },
            m_saves: { type: "number" }, m_saves_inside_box: { type: "number" }, m_saves_outside_box: { type: "number" },
            m_goals_conceded: { type: "number" }, m_clean_sheet: { type: "number" },
            m_punches: { type: "number" }, m_high_claims: { type: "number" }, m_sweeper_actions: { type: "number" },
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
