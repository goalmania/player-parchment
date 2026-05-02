// Edge function: estrae testo da PDF/DOCX/TXT e lo passa al modello AI per
// generare un report giocatore strutturato. Il client invia il file in base64.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore deno npm specifier
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";
// @ts-ignore deno npm specifier
import mammoth from "https://esm.sh/mammoth@1.8.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function extractFromPdf(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : String(text || "");
}

async function extractFromDocx(bytes: Uint8Array): Promise<string> {
  const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const res = await mammoth.extractRawText({ arrayBuffer: buf });
  return res.value || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { fileBase64, fileName, mimeType, name, club } = await req.json();
    if (!fileBase64 || !fileName) {
      return new Response(JSON.stringify({ error: "fileBase64 e fileName richiesti" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lower = String(fileName).toLowerCase();
    const bytes = b64ToBytes(fileBase64);

    let text = "";
    if (lower.endsWith(".pdf") || mimeType === "application/pdf") {
      text = await extractFromPdf(bytes);
    } else if (lower.endsWith(".docx") || mimeType?.includes("wordprocessingml")) {
      text = await extractFromDocx(bytes);
    } else if (lower.endsWith(".txt") || mimeType?.startsWith("text/")) {
      text = new TextDecoder().decode(bytes);
    } else {
      return new Response(JSON.stringify({ error: "Formato non supportato. Usa PDF, DOCX o TXT." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    text = text.trim();
    if (text.length < 50) {
      return new Response(JSON.stringify({ error: "Testo estratto troppo breve. Il file potrebbe essere scansionato (immagini)." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Riusa la edge function ai-report
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const ANON = Deno.env.get("SUPABASE_ANON_KEY");
    // Mandiamo fino a 24k caratteri (Gemini gestisce contesti molto più ampi)
    // così la sezione statistiche di un report InStat/Wyscout non viene troncata.
    const aiText = text.slice(0, 24000);
    const aiResp = await fetch(`${SUPABASE_URL}/functions/v1/ai-report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: ANON || "",
        Authorization: `Bearer ${ANON}`,
      },
      body: JSON.stringify({ text: aiText, name, club }),
    });

    const data = await aiResp.json();

    // Default stats_source dal nome file se l'AI non l'ha dedotto
    if (data?.player && !data.player.stats_source) {
      const lf = lower;
      if (lf.includes("instat")) data.player.stats_source = "InStat";
      else if (lf.includes("wyscout")) data.player.stats_source = "Wyscout";
      else if (lf.includes("fbref")) data.player.stats_source = "FBref";
      else if (lf.includes("transfermarkt")) data.player.stats_source = "Transfermarkt";
      else data.player.stats_source = `Upload: ${fileName}`;
    }

    return new Response(JSON.stringify({ ...data, extracted_text: text.slice(0, 8000) }), {
      status: aiResp.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-report-file error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Errore" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
