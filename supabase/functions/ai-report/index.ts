import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Sei un assistente per scout calcistici. Analizza il testo di osservazione fornito ed estrai tutte le informazioni del giocatore. Rispondi SOLO chiamando la funzione extract_player_report con dati strutturati. Per i campi mancanti, usa valori neutri plausibili dal contesto. Per tactical_roles, deduci il ruolo specifico dalla posizione.`;

const TOOL = {
  type: "function",
  function: {
    name: "extract_player_report",
    description: "Estrae i campi di un report scouting da testo libero",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
        birth_year: { type: "number" },
        nationality: { type: "string" },
        flag: { type: "string" },
        club: { type: "string" },
        league: { type: "string" },
        region: { type: "string" },
        lat: { type: "number" },
        lng: { type: "number" },
        position_main: { type: "string" },
        position_code: { type: "string", enum: ["GK","CB","LB","RB","CDM","CM","CAM","LW","RW","ST","CF"] },
        position_secondary: { type: "array", items: { type: "string" } },
        foot: { type: "string", enum: ["Destro","Sinistro","Entrambi"] },
        height: { type: "number" },
        weight: { type: "number" },
        tactical_roles: {
          type: "array",
          items: {
            type: "object",
            properties: {
              formation: { type: "string" },
              role: { type: "string" },
              role_code: { type: "string" },
              fit_score: { type: "number" },
            },
            required: ["formation","role","role_code","fit_score"],
          },
        },
        ratings: {
          type: "object",
          properties: {
            technical: { type: "number" }, tactical: { type: "number" },
            physical: { type: "number" }, mental: { type: "number" },
            overall: { type: "number" },
          },
          required: ["technical","tactical","physical","mental","overall"],
        },
        skills: {
          type: "object",
          properties: {
            ball_control:{type:"number"}, passing:{type:"number"}, dribbling:{type:"number"},
            finishing:{type:"number"}, defensive_work:{type:"number"}, tactical_iq:{type:"number"},
            decision_making:{type:"number"}, aerial:{type:"number"}, pace:{type:"number"}, stamina:{type:"number"},
          },
        },
        stars: {
          type: "object",
          properties: {
            technique:{type:"number"}, athleticism:{type:"number"}, mentality:{type:"number"},
            potential:{type:"number"}, market_value:{type:"number"},
          },
        },
        market: {
          type: "object",
          properties: {
            value_min:{type:"number"}, value_max:{type:"number"},
            potential:{type:"string"}, risk:{type:"string"},
            timeline:{type:"string"}, ready_level:{type:"string"},
          },
        },
        tags: { type: "array", items: { type: "string" } },
        verdict_type: { type: "string", enum: ["buy","monitor","pass"] },
        verdict: { type: "string" },
        observation_type: { type: "string" },
        observation_count: { type: "number" },
        date: { type: "string" },
        strengths: { type: "array", items: { type: "string" } },
        weaknesses: { type: "array", items: { type: "string" } },
        summary: { type: "string" },
      },
      required: ["name","position_code","ratings","summary","verdict_type","tags","strengths","weaknesses"],
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { text, name, club } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not set");

    const userMsg = `Nome giocatore (suggerimento): ${name || "non specificato"}\nClub (suggerimento): ${club || "non specificato"}\n\nOsservazioni:\n${text}`;

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
      return new Response(JSON.stringify({ error: "Rate limit superato. Riprova tra poco." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (response.status === 402) {
      return new Response(JSON.stringify({ error: "Credito AI esaurito. Aggiungi credito al workspace." }), {
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
      return new Response(JSON.stringify({ error: "Nessun risultato dall'AI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = JSON.parse(call.function.arguments);
    return new Response(JSON.stringify({ player: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-report error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Errore" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
