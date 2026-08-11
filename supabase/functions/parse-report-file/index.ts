import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Decomprime dati Flate/Deflate rilevando automaticamente il formato */
async function decompressFlate(data: Uint8Array): Promise<Uint8Array> {
  // Rileva formato: zlib header inizia con 0x78 (CMF byte)
  const hasZlibHeader = data.length > 1 && data[0] === 0x78;
  const format = hasZlibHeader ? "deflate" : "deflate-raw";

  try {
    const ds = new DecompressionStream(format);
    const writer = ds.writable.getWriter();
    const reader = ds.readable.getReader();

    // Scrivi i dati e chiudi
    const writePromise = writer.write(data as unknown as BufferSource).then(() => writer.close());

    // Leggi tutti i chunk
    const chunks: Uint8Array[] = [];
    const readPromise = (async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
    })();

    await Promise.all([writePromise, readPromise]);

    const total = chunks.reduce((n, c) => n + c.length, 0);
    if (total === 0) return new Uint8Array(0);
    const out = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) { out.set(c, off); off += c.length; }
    return out;
  } catch {
    // Tenta il formato alternativo
    const altFormat = hasZlibHeader ? "deflate-raw" : "deflate";
    try {
      const ds2 = new DecompressionStream(altFormat);
      const writer2 = ds2.writable.getWriter();
      const reader2 = ds2.readable.getReader();
      const writePromise2 = writer2.write(data as unknown as BufferSource).then(() => writer2.close());
      const chunks2: Uint8Array[] = [];
      const readPromise2 = (async () => {
        while (true) {
          const { done, value } = await reader2.read();
          if (done) break;
          if (value) chunks2.push(value);
        }
      })();
      await Promise.all([writePromise2, readPromise2]);
      const total2 = chunks2.reduce((n, c) => n + c.length, 0);
      if (total2 === 0) return new Uint8Array(0);
      const out2 = new Uint8Array(total2);
      let off2 = 0;
      for (const c of chunks2) { out2.set(c, off2); off2 += c.length; }
      return out2;
    } catch { return new Uint8Array(0); }
  }
}

/** Decodifica stringa esadecimale CIDFont usando una CMap glyph→char */
function decodeHexWithCmap(hex: string, cmap: Map<number, string>): string {
  let out = "";
  // Glyph ID a 2 byte (CIDFont)
  for (let i = 0; i < hex.length; i += 4) {
    const glyph = parseInt(hex.slice(i, i + 4), 16);
    const ch = cmap.get(glyph);
    if (ch) out += ch;
  }
  // Fallback a 1 byte se la CMap non ha dato risultati
  if (!out) {
    for (let i = 0; i < hex.length; i += 2) {
      const glyph = parseInt(hex.slice(i, i + 2), 16);
      const ch = cmap.get(glyph);
      if (ch) out += ch;
    }
  }
  return out;
}

/** Risolve gli escape di una stringa letterale PDF "(...)" ai byte originali (spazio latin1 1:1) */
function unescapePdfLiteral(raw: string): string {
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (c === "\\" && i + 1 < raw.length) {
      const n = raw[i + 1];
      if (n === "n") { out += " "; i++; }
      else if (n === "r") { i++; }
      else if (n === "t") { out += "\t"; i++; }
      else if (n === "(" || n === ")" || n === "\\") { out += n; i++; }
      else if (n === "\n") { i++; }
      else if (n === "\r") { i++; if (raw[i + 1] === "\n") i++; }
      else if (/[0-7]/.test(n)) {
        let oct = n;
        let j = i + 2;
        for (let k = 0; k < 2 && j < raw.length && /[0-7]/.test(raw[j]); k++, j++) oct += raw[j];
        out += String.fromCharCode(parseInt(oct, 8) & 0xff);
        i = j - 1;
      } else { out += n; i++; }
    } else {
      out += c;
    }
  }
  return out;
}

/** Percentuale di caratteri stampabili/leggibili in una stringa (0..1) */
function printableRatio(s: string): number {
  if (!s.length) return 0;
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if ((c >= 0x20 && c <= 0x7e) || c === 0x09 || c >= 0xa0) n++;
  }
  return n / s.length;
}

/** Decodifica una stringa "grezza" (1 char = 1 byte latin1) come coppie di codici CID via CMap */
function decodeCidPairs(raw: string, cmap: Map<number, string>): string {
  let out = "";
  for (let i = 0; i + 1 < raw.length; i += 2) {
    const code = (raw.charCodeAt(i) << 8) | raw.charCodeAt(i + 1);
    const ch = cmap.get(code);
    if (ch) out += ch;
  }
  return out;
}

/** Estrae stringhe testuali dagli operatori Tj e TJ di un content stream PDF */
function extractTjTJ(s: string, cmap?: Map<number, string>): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const hasCmap = !!cmap && cmap.size > 0;

  // (text) Tj — testo letterale: può essere ASCII/Latin1 oppure, se il font attivo è un
  // CIDFont Identity-H, una sequenza di codici a 2 byte scritta come stringa letterale
  // invece che esadecimale. Proviamo entrambe le decodifiche e teniamo la più leggibile.
  const MIN_PRINTABLE = 0.5;
  const tj = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*Tj/g;
  while ((m = tj.exec(s)) !== null) {
    const raw = unescapePdfLiteral(m[1]);
    let t = raw;
    let ratio = printableRatio(raw);
    if (hasCmap && raw.length >= 2) {
      const cidDecoded = decodeCidPairs(raw, cmap!);
      const cidRatio = cidDecoded ? printableRatio(cidDecoded) : 0;
      if (cidRatio > ratio) { t = cidDecoded; ratio = cidRatio; }
    }
    if (ratio >= MIN_PRINTABLE && t.trim()) out.push(t.trim());
  }
  // [(text) ...] TJ
  const tjArr = /\[([^\]]*)\]\s*TJ/g;
  while ((m = tjArr.exec(s)) !== null) {
    const parts: string[] = [];
    const partRx = /\(([^)\\]*(?:\\.[^)\\]*)*)\)/g;
    let pm: RegExpExecArray | null;
    while ((pm = partRx.exec(m[1])) !== null) parts.push(unescapePdfLiteral(pm[1]));
    const raw = parts.join("");
    let t = raw;
    let ratio = printableRatio(raw);
    if (hasCmap && raw.length >= 2) {
      const cidDecoded = decodeCidPairs(raw, cmap!);
      const cidRatio = cidDecoded ? printableRatio(cidDecoded) : 0;
      if (cidRatio > ratio) { t = cidDecoded; ratio = cidRatio; }
    }
    if (ratio >= MIN_PRINTABLE && t.trim()) out.push(t.trim());
  }

  // <hex> Tj — CIDFont con CMap
  if (hasCmap) {
    const hexTj = /<([0-9a-fA-F]+)>\s*Tj/g;
    while ((m = hexTj.exec(s)) !== null) {
      const t = decodeHexWithCmap(m[1], cmap!);
      if (t.trim()) out.push(t.trim());
    }
    // [<hex> -num <hex> ...] TJ
    const hexTjArr = /\[([^\]]*)\]\s*TJ/g;
    while ((m = hexTjArr.exec(s)) !== null) {
      const block = m[1];
      let decoded = "";
      const hexPartRx = /<([0-9a-fA-F]+)>/g;
      let pm: RegExpExecArray | null;
      while ((pm = hexPartRx.exec(block)) !== null) {
        decoded += decodeHexWithCmap(pm[1], cmap!);
      }
      if (decoded.trim()) out.push(decoded.trim());
    }
  }

  return out;
}

/** Estrae mappature CMap (bfrange/bfchar) da una stringa di testo */
function parseCMapData(s: string, cmap: Map<number, string>) {
  // beginbfrange <start> <end> <uStart>
  const bfrange = /beginbfrange([\s\S]*?)endbfrange/g;
  let m: RegExpExecArray | null;
  while ((m = bfrange.exec(s)) !== null) {
    const rangeRx = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g;
    let rm: RegExpExecArray | null;
    while ((rm = rangeRx.exec(m[1])) !== null) {
      const start = parseInt(rm[1], 16);
      const end = parseInt(rm[2], 16);
      const uStart = parseInt(rm[3], 16);
      for (let i = 0; i <= end - start; i++) {
        try { cmap.set(start + i, String.fromCodePoint(uStart + i)); } catch { /* skip */ }
      }
    }
  }
  // beginbfchar
  const bfchar = /beginbfchar([\s\S]*?)endbfchar/g;
  while ((m = bfchar.exec(s)) !== null) {
    const charRx = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g;
    let cm: RegExpExecArray | null;
    while ((cm = charRx.exec(m[1])) !== null) {
      try { cmap.set(parseInt(cm[1], 16), String.fromCodePoint(parseInt(cm[2], 16))); } catch { /* skip */ }
    }
  }
}

/** Decodifica ASCII85 (variante Adobe, con o senza delimitatori <~ ~>) */
function decodeAscii85(str: string): Uint8Array {
  let s = str.trim();
  if (s.startsWith("<~")) s = s.slice(2);
  if (s.endsWith("~>")) s = s.slice(0, -2);
  s = s.replace(/\s+/g, "");

  const out: number[] = [];
  let i = 0;
  while (i < s.length) {
    if (s[i] === "z") { out.push(0, 0, 0, 0); i++; continue; }
    const groupLen = Math.min(5, s.length - i);
    if (groupLen <= 0) break;
    let group = s.slice(i, i + groupLen);
    while (group.length < 5) group += "u";
    let value = 0;
    let invalid = false;
    for (let k = 0; k < 5; k++) {
      const c = group.charCodeAt(k) - 33;
      if (c < 0 || c > 84) { invalid = true; break; }
      value = value * 85 + c;
    }
    i += groupLen;
    if (invalid) continue;
    const b0 = (value >>> 24) & 0xff, b1 = (value >>> 16) & 0xff, b2 = (value >>> 8) & 0xff, b3 = value & 0xff;
    const outCount = groupLen - 1;
    const all = [b0, b1, b2, b3];
    for (let k = 0; k < outCount; k++) out.push(all[k]);
  }
  return new Uint8Array(out);
}

/** Decodifica ASCIIHex (coppie esadecimali terminate da '>') */
function decodeAsciiHex(str: string): Uint8Array {
  const clean = str.replace(/>[\s\S]*$/, "").replace(/[^0-9a-fA-F]/g, "");
  const hex = clean.length % 2 === 0 ? clean : clean + "0";
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) out[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  return out;
}

/** Trova l'inizio del dizionario dell'oggetto PDF corrente (dopo l'ultimo "N N obj" prima
 *  della posizione data), per non confondere il dizionario di un oggetto vicino con quello
 *  dello stream in esame — una finestra a lunghezza fissa può "sconfinare" nell'oggetto precedente. */
const OBJ_START_RE = /\d+\s+\d+\s+obj\b/g;
function dictBefore(latin1: string, streamKeywordIndex: number): string {
  const windowStart = Math.max(0, streamKeywordIndex - 4000);
  const windowText = latin1.slice(windowStart, streamKeywordIndex);
  OBJ_START_RE.lastIndex = 0;
  let lastEnd = 0;
  let m: RegExpExecArray | null;
  while ((m = OBJ_START_RE.exec(windowText)) !== null) {
    lastEnd = m.index + m[0].length;
  }
  return windowText.slice(lastEnd);
}

/** Estrae testo da un PDF, gestendo stream FlateDecode/ASCII85/ASCIIHex compressi e CIDFont hex */
async function extractFromPdf(bytes: Uint8Array): Promise<string> {
  const latin1 = new TextDecoder("latin1").decode(bytes);

  // Decomprime tutti gli stream (Flate, con eventuale pre-filtro ASCII85/Hex) una volta sola
  const streamRe = /stream\r?\n/g;
  let sm: RegExpExecArray | null;
  const decompressedStreams: string[] = [];

  // Riconosce stream binari (immagini raster, font embedded) da escludere sempre dalla
  // ricerca testuale: i loro byte decompressi/grezzi possono casualmente contenere sequenze
  // che sembrano operatori Tj/TJ, producendo testo-spazzatura che supera la soglia minima
  // e impedisce l'attivazione corretta del fallback OCR per i PDF davvero scansionati.
  const BINARY_STREAM_RE = /\/Subtype\s*\/Image|DCTDecode|CCITTFaxDecode|JBIG2Decode|JPXDecode|\/FontFile\d?\b|\/Subtype\s*\/(?:Type1C|CIDFontType0C|OpenType)/;

  while ((sm = streamRe.exec(latin1)) !== null) {
    const streamDataStart = sm.index + sm[0].length;

    // Finestra di ricerca del dizionario: dal marcatore "N N obj" dell'oggetto corrente
    // fino alla keyword "stream", MAI una finestra a lunghezza fissa che potrebbe
    // sconfinare nel dizionario di un oggetto vicino (o, dentro un blob binario, non
    // trovare affatto un dizionario reale).
    const before = dictBefore(latin1, sm.index);

    // Usa la /Length dichiarata nel dizionario quando è un numero letterale: è più
    // affidabile della ricerca testuale di "endstream", che dentro un blob binario di
    // alcune centinaia di KB (es. immagini JPEG) può incontrare per puro caso una
    // sotto-sequenza di byte identica a "stream\n", causando corrispondenze spurie.
    let endIdx = -1;
    const lenMatch = before.match(/\/Length\s+(\d+)(?!\s+\d+\s+R\b)/);
    if (lenMatch) {
      const declaredLen = parseInt(lenMatch[1], 10);
      const candidateEnd = streamDataStart + declaredLen;
      if (latin1.slice(candidateEnd, candidateEnd + 20).includes("endstream")) {
        endIdx = latin1.indexOf("endstream", candidateEnd);
      }
    }
    if (endIdx === -1) endIdx = latin1.indexOf("endstream", streamDataStart);
    if (endIdx === -1) continue;

    // Fa avanzare la scansione oltre l'intero corpo di questo stream: senza questo, il
    // prossimo giro del ciclo potrebbe ri-matchare "stream\n" dentro i byte binari appena
    // consumati, producendo uno pseudo-oggetto fittizio con un "dizionario" spazzatura.
    streamRe.lastIndex = endIdx + "endstream".length;

    if (BINARY_STREAM_RE.test(before)) continue;

    const hasFlate = before.includes("FlateDecode");
    const hasA85 = before.includes("ASCII85Decode");
    const hasAHex = before.includes("ASCIIHexDecode");

    let endData = endIdx;
    if (latin1[endData - 1] === "\n") endData--;
    if (latin1[endData - 1] === "\r") endData--;

    let streamBytes: Uint8Array = bytes.slice(streamDataStart, endData);
    if (streamBytes.length === 0) continue;

    // Applica l'eventuale pre-filtro testuale (ASCII85/ASCIIHex) prima di Flate
    if (hasA85) {
      streamBytes = decodeAscii85(new TextDecoder("latin1").decode(streamBytes));
    } else if (hasAHex) {
      streamBytes = decodeAsciiHex(new TextDecoder("latin1").decode(streamBytes));
    }
    if (streamBytes.length === 0) continue;

    if (hasFlate) {
      const decompressed = await decompressFlate(streamBytes);
      if (decompressed.length === 0) continue;
      decompressedStreams.push(new TextDecoder("latin1").decode(decompressed));
    } else {
      // Nessun filtro binario riconosciuto: stream di contenuto non compresso (raro ma valido)
      decompressedStreams.push(new TextDecoder("latin1").decode(streamBytes));
    }
  }

  // Raccoglie tutte le CMap (bfrange/bfchar) dagli stream di contenuto individuati.
  // NB: non si cerca più nell'intero file grezzo per evitare di intercettare dati binari.
  const cmap = new Map<number, string>();
  for (const s of decompressedStreams) {
    if (s.includes("beginbfrange") || s.includes("beginbfchar")) {
      parseCMapData(s, cmap);
    }
  }

  // Estrae il testo (operatori Tj/TJ) SOLO dagli stream di contenuto individuati sopra,
  // mai dall'intero file grezzo che includerebbe dati binari di immagini/font.
  const texts: string[] = [];
  for (const s of decompressedStreams) {
    if (s.includes("beginbfrange") || s.includes("beginbfchar")) continue;
    texts.push(...extractTjTJ(s, cmap));
  }

  if (texts.length === 0) return "";
  return texts.join(" ").replace(/\s{2,}/g, " ").trim();
}

// ----- Estrazione DOCX (OOXML = archivio ZIP contenente word/document.xml) -----

const ZIP_EOCD_SIG = 0x06054b50;
const ZIP_CD_SIG = 0x02014b50;
const ZIP_LOCAL_SIG = 0x04034b50;

function findEocd(bytes: Uint8Array): number {
  const maxBack = Math.min(bytes.length, 65557); // 22 (EOCD fissa) + max commento 65535
  const start = bytes.length - 22;
  for (let i = start; i >= bytes.length - maxBack && i >= 0; i--) {
    if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) return i;
  }
  return -1;
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream("deflate-raw");
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();
  const writeP = writer.write(data as unknown as BufferSource).then(() => writer.close());
  const chunks: Uint8Array[] = [];
  const readP = (async () => {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
  })();
  await Promise.all([writeP, readP]);
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

/** Estrae il contenuto di una entry da un archivio ZIP (usato per DOCX/OOXML) via central directory */
async function unzipEntry(bytes: Uint8Array, entryName: string): Promise<Uint8Array | null> {
  const eocd = findEocd(bytes);
  if (eocd === -1) return null;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const cdEntries = dv.getUint16(eocd + 10, true);
  const cdOffset = dv.getUint32(eocd + 16, true);

  const dec = new TextDecoder("utf-8");
  let pos = cdOffset;
  for (let i = 0; i < cdEntries; i++) {
    if (pos + 46 > bytes.length || dv.getUint32(pos, true) !== ZIP_CD_SIG) break;
    const compMethod = dv.getUint16(pos + 10, true);
    const compSize = dv.getUint32(pos + 20, true);
    const nameLen = dv.getUint16(pos + 28, true);
    const extraLen = dv.getUint16(pos + 30, true);
    const commentLen = dv.getUint16(pos + 32, true);
    const localOffset = dv.getUint32(pos + 42, true);
    const name = dec.decode(bytes.subarray(pos + 46, pos + 46 + nameLen));

    if (name === entryName) {
      if (localOffset + 30 > bytes.length || dv.getUint32(localOffset, true) !== ZIP_LOCAL_SIG) return null;
      const lNameLen = dv.getUint16(localOffset + 26, true);
      const lExtraLen = dv.getUint16(localOffset + 28, true);
      const dataStart = localOffset + 30 + lNameLen + lExtraLen;
      const raw = bytes.subarray(dataStart, dataStart + compSize);
      if (compMethod === 0) return raw.slice();
      if (compMethod === 8) {
        try { return await inflateRaw(raw); } catch { return null; }
      }
      return null;
    }
    pos += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

/** Rimuove i tag XML/WordML e decodifica le entità, preservando gli a-capo tra paragrafi */
function xmlToText(xml: string): string {
  let s = xml
    .replace(/<\/w:p>/g, "\n")
    .replace(/<w:tab\s*\/>/g, "\t")
    .replace(/<[^>]+>/g, "");
  s = s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
  return s.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

/** Estrae testo da DOCX facendo l'unzip di word/document.xml (contenuto compresso Deflate) */
async function extractFromDocx(bytes: Uint8Array): Promise<string> {
  try {
    const xmlBytes = await unzipEntry(bytes, "word/document.xml");
    if (!xmlBytes || xmlBytes.length === 0) return "";
    const xml = new TextDecoder("utf-8", { fatal: false }).decode(xmlBytes);
    return xmlToText(xml);
  } catch {
    return "";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { fileBase64, fileName, mimeType, name, club } = await req.json();
    if (!fileBase64 || !fileName) return ok({ error: "fileBase64 e fileName richiesti" });

    const lower = String(fileName).toLowerCase();
    const isPdf = lower.endsWith(".pdf") || mimeType === "application/pdf";
    const isDocx = lower.endsWith(".docx") || mimeType?.includes("wordprocessingml");
    const isTxt = lower.endsWith(".txt") || mimeType?.startsWith("text/");

    if (!isPdf && !isDocx && !isTxt) {
      return ok({ error: "Formato non supportato. Usa PDF, DOCX o TXT." });
    }

    const bytes = b64ToBytes(fileBase64);
    let text = "";

    if (isPdf) {
      text = await extractFromPdf(bytes);
    } else if (isDocx) {
      text = await extractFromDocx(bytes);
    } else {
      text = new TextDecoder().decode(bytes);
    }

    text = text.trim();

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const ANON = Deno.env.get("SUPABASE_ANON_KEY");

    async function callAiReport(body: Record<string, unknown>, timeoutMs: number): Promise<any> {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/ai-report`, {
          signal: ctrl.signal,
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: ANON || "", Authorization: `Bearer ${ANON}` },
          body: JSON.stringify(body),
        });
        try { return await r.json(); } catch { return { error: "Errore risposta AI. Riprova." }; }
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return { error: "Timeout: l'analisi AI ha impiegato troppo tempo. Riprova." };
        return { error: "Errore di connessione al servizio AI. Riprova." };
      } finally {
        clearTimeout(timer);
      }
    }

    let usedVision = false;
    let data: any;

    if (text.length >= 50) {
      // Testo estratto correttamente: percorso normale (rapido ed economico)
      data = await callAiReport({ text: text.slice(0, 12000), name, club }, 90000);
    } else if (isPdf) {
      // Testo insufficiente: probabile PDF scansionato/immagine o layout non standard.
      // Invia il file originale all'AI (Gemini) che lo legge direttamente (OCR nativo del documento).
      usedVision = true;
      // Budget ampio ma entro il limite di risposta di Supabase (150s totali): l'OCR di
      // documenti multi-pagina può richiedere parecchio tempo.
      data = await callAiReport({ fileBase64, mimeType: "application/pdf", name, club }, 130000);
    } else {
      return ok({ error: "Impossibile estrarre testo dal file. Usa 'Incolla testo' per inserire il contenuto manualmente." });
    }

    if (data?.error) {
      if (usedVision) {
        return ok({ error: `${data.error} Se il problema persiste usa 'Incolla testo'.` });
      }
      return ok(data);
    }
    if (!data?.player) return ok({ error: "Nessun report generato. Riprova con più dettagli." });

    // Arricchisce stats_source dal nome file se mancante
    if (!data.player.stats_source) {
      if (lower.includes("instat")) data.player.stats_source = "InStat";
      else if (lower.includes("wyscout")) data.player.stats_source = "Wyscout";
      else if (lower.includes("fbref")) data.player.stats_source = "FBref";
      else if (lower.includes("transfermarkt")) data.player.stats_source = "Transfermarkt";
      else data.player.stats_source = `Upload: ${fileName}`;
    }

    return ok({ ...data, extracted_text: usedVision ? "" : text.slice(0, 8000) });
  } catch (e) {
    console.error("parse-report-file error", e);
    return ok({ error: e instanceof Error ? e.message : "Errore interno" });
  }
});
