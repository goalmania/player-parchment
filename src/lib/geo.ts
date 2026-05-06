/**
 * Geo-lookup utility: deduce lat/lng/region for players whose record only
 * contains club/league/nationality. Used by storage hydrate() to ensure the
 * map always shows markers in the right place.
 */

export type GeoInfo = { lat: number; lng: number; region?: string };

/** Italian clubs (Serie A/B/C + main Lega Pro) → city coords + region. */
const ITALIAN_CLUBS: Record<string, GeoInfo> = {
  // Serie A
  "atalanta": { lat: 45.7090, lng: 9.6814, region: "Lombardia" },
  "bologna": { lat: 44.4949, lng: 11.3426, region: "Emilia-Romagna" },
  "cagliari": { lat: 39.2238, lng: 9.1217, region: "Sardegna" },
  "como": { lat: 45.8081, lng: 9.0852, region: "Lombardia" },
  "empoli": { lat: 43.7180, lng: 10.9466, region: "Toscana" },
  "fiorentina": { lat: 43.7807, lng: 11.2823, region: "Toscana" },
  "genoa": { lat: 44.4164, lng: 8.9520, region: "Liguria" },
  "hellas verona": { lat: 45.4351, lng: 10.9686, region: "Veneto" },
  "verona": { lat: 45.4351, lng: 10.9686, region: "Veneto" },
  "inter": { lat: 45.4781, lng: 9.1240, region: "Lombardia" },
  "internazionale": { lat: 45.4781, lng: 9.1240, region: "Lombardia" },
  "juventus": { lat: 45.1097, lng: 7.6413, region: "Piemonte" },
  "lazio": { lat: 41.9341, lng: 12.4547, region: "Lazio" },
  "lecce": { lat: 40.3653, lng: 18.2090, region: "Puglia" },
  "milan": { lat: 45.4781, lng: 9.1240, region: "Lombardia" },
  "ac milan": { lat: 45.4781, lng: 9.1240, region: "Lombardia" },
  "monza": { lat: 45.5845, lng: 9.2744, region: "Lombardia" },
  "napoli": { lat: 40.8280, lng: 14.1932, region: "Campania" },
  "parma": { lat: 44.7951, lng: 10.3380, region: "Emilia-Romagna" },
  "roma": { lat: 41.9341, lng: 12.4547, region: "Lazio" },
  "as roma": { lat: 41.9341, lng: 12.4547, region: "Lazio" },
  "salernitana": { lat: 40.6443, lng: 14.8336, region: "Campania" },
  "sassuolo": { lat: 44.5377, lng: 10.7853, region: "Emilia-Romagna" },
  "torino": { lat: 45.0416, lng: 7.6497, region: "Piemonte" },
  "udinese": { lat: 46.0815, lng: 13.2002, region: "Friuli-Venezia Giulia" },
  "venezia": { lat: 45.4264, lng: 12.3637, region: "Veneto" },
  // Serie B / C selezione
  "brescia": { lat: 45.5711, lng: 10.2294, region: "Lombardia" },
  "cremonese": { lat: 45.1390, lng: 10.0288, region: "Lombardia" },
  "frosinone": { lat: 41.6395, lng: 13.3194, region: "Lazio" },
  "palermo": { lat: 38.1521, lng: 13.3424, region: "Sicilia" },
  "pisa": { lat: 43.7030, lng: 10.4017, region: "Toscana" },
  "spezia": { lat: 44.1024, lng: 9.8201, region: "Liguria" },
  "sampdoria": { lat: 44.4164, lng: 8.9520, region: "Liguria" },
  "bari": { lat: 41.0843, lng: 16.8401, region: "Puglia" },
  "catanzaro": { lat: 38.9059, lng: 16.5963, region: "Calabria" },
  "modena": { lat: 44.6471, lng: 10.9252, region: "Emilia-Romagna" },
  "reggiana": { lat: 44.7236, lng: 10.6075, region: "Emilia-Romagna" },
  "ascoli": { lat: 42.8528, lng: 13.5803, region: "Marche" },
  "perugia": { lat: 43.1227, lng: 12.3751, region: "Umbria" },
  "ternana": { lat: 42.5575, lng: 12.6364, region: "Umbria" },
  "spal": { lat: 44.8389, lng: 11.6082, region: "Emilia-Romagna" },
  "cosenza": { lat: 39.3055, lng: 16.2546, region: "Calabria" },
  "catania": { lat: 37.5318, lng: 15.0786, region: "Sicilia" },
  "padova": { lat: 45.4011, lng: 11.8500, region: "Veneto" },
  "vicenza": { lat: 45.5535, lng: 11.5497, region: "Veneto" },
  "avellino": { lat: 40.9156, lng: 14.7919, region: "Campania" },
  // Serie C extra
  "juve stabia": { lat: 40.7461, lng: 14.5025, region: "Campania" },
  "benevento": { lat: 41.1294, lng: 14.7826, region: "Campania" },
  "casertana": { lat: 41.0723, lng: 14.3326, region: "Campania" },
  "turris": { lat: 40.7531, lng: 14.3614, region: "Campania" },
  "sorrento": { lat: 40.6263, lng: 14.3758, region: "Campania" },
  "foggia": { lat: 41.4621, lng: 15.5446, region: "Puglia" },
  "monopoli": { lat: 40.9540, lng: 17.3045, region: "Puglia" },
  "taranto": { lat: 40.4642, lng: 17.2470, region: "Puglia" },
  "audace cerignola": { lat: 41.2660, lng: 15.8987, region: "Puglia" },
  "cerignola": { lat: 41.2660, lng: 15.8987, region: "Puglia" },
  "altamura": { lat: 40.8266, lng: 16.5520, region: "Puglia" },
  "brindisi": { lat: 40.6320, lng: 17.9418, region: "Puglia" },
  "crotone": { lat: 39.0808, lng: 17.1272, region: "Calabria" },
  "vibonese": { lat: 38.6759, lng: 16.1011, region: "Calabria" },
  "messina": { lat: 38.1938, lng: 15.5540, region: "Sicilia" },
  "acr messina": { lat: 38.1938, lng: 15.5540, region: "Sicilia" },
  "trapani": { lat: 38.0176, lng: 12.5365, region: "Sicilia" },
  "siracusa": { lat: 37.0755, lng: 15.2866, region: "Sicilia" },
  "potenza": { lat: 40.6404, lng: 15.8056, region: "Basilicata" },
  "picerno": { lat: 40.6418, lng: 15.6403, region: "Basilicata" },
  "latina": { lat: 41.4677, lng: 12.9037, region: "Lazio" },
  "viterbese": { lat: 42.4194, lng: 12.1077, region: "Lazio" },
  "lupa frascati": { lat: 41.8086, lng: 12.6800, region: "Lazio" },
  "rimini": { lat: 44.0594, lng: 12.5683, region: "Emilia-Romagna" },
  "carrarese": { lat: 44.0793, lng: 10.0975, region: "Toscana" },
  "lucchese": { lat: 43.8438, lng: 10.5081, region: "Toscana" },
  "pontedera": { lat: 43.6630, lng: 10.6334, region: "Toscana" },
  "arezzo": { lat: 43.4632, lng: 11.8806, region: "Toscana" },
  "siena": { lat: 43.3188, lng: 11.3308, region: "Toscana" },
  "pistoiese": { lat: 43.9333, lng: 10.9171, region: "Toscana" },
  "grosseto": { lat: 42.7635, lng: 11.1130, region: "Toscana" },
  "livorno": { lat: 43.5485, lng: 10.3106, region: "Toscana" },
  "gubbio": { lat: 43.3517, lng: 12.5798, region: "Umbria" },
  "ancona": { lat: 43.6158, lng: 13.5189, region: "Marche" },
  "fermana": { lat: 43.1597, lng: 13.7188, region: "Marche" },
  "recanatese": { lat: 43.4022, lng: 13.5494, region: "Marche" },
  "pescara": { lat: 42.4644, lng: 14.2008, region: "Abruzzo" },
  "pineto": { lat: 42.6098, lng: 14.0668, region: "Abruzzo" },
  "teramo": { lat: 42.6589, lng: 13.7044, region: "Abruzzo" },
  "olbia": { lat: 40.9233, lng: 9.4988, region: "Sardegna" },
  "torres": { lat: 40.7259, lng: 8.5557, region: "Sardegna" },
  "novara": { lat: 45.4469, lng: 8.6219, region: "Piemonte" },
  "alessandria": { lat: 44.9133, lng: 8.6153, region: "Piemonte" },
  "pro vercelli": { lat: 45.3252, lng: 8.4231, region: "Piemonte" },
  "albinoleffe": { lat: 45.7680, lng: 9.7905, region: "Lombardia" },
  "lumezzane": { lat: 45.6531, lng: 10.2660, region: "Lombardia" },
  "mantova": { lat: 45.1564, lng: 10.7914, region: "Lombardia" },
  "renate": { lat: 45.6500, lng: 9.3000, region: "Lombardia" },
  "pergolettese": { lat: 45.3617, lng: 9.6864, region: "Lombardia" },
  "pro patria": { lat: 45.6483, lng: 8.8485, region: "Lombardia" },
  "fiorenzuola": { lat: 44.9286, lng: 9.9082, region: "Emilia-Romagna" },
  "carpi": { lat: 44.7833, lng: 10.8833, region: "Emilia-Romagna" },
  "imolese": { lat: 44.3548, lng: 11.7144, region: "Emilia-Romagna" },
  "cesena": { lat: 44.1391, lng: 12.2431, region: "Emilia-Romagna" },
  "virtus entella": { lat: 44.3667, lng: 9.3333, region: "Liguria" },
  "entella": { lat: 44.3667, lng: 9.3333, region: "Liguria" },
  "sestri levante": { lat: 44.2710, lng: 9.3963, region: "Liguria" },
  "trento": { lat: 46.0667, lng: 11.1167, region: "Trentino-Alto Adige" },
  "sudtirol": { lat: 46.4983, lng: 11.3548, region: "Trentino-Alto Adige" },
  "südtirol": { lat: 46.4983, lng: 11.3548, region: "Trentino-Alto Adige" },
  "lr vicenza": { lat: 45.5535, lng: 11.5497, region: "Veneto" },
  "feralpisalo": { lat: 45.5500, lng: 10.5167, region: "Lombardia" },
  "feralpisalò": { lat: 45.5500, lng: 10.5167, region: "Lombardia" },
  "triestina": { lat: 45.6495, lng: 13.7768, region: "Friuli-Venezia Giulia" },
  "pordenone": { lat: 45.9626, lng: 12.6605, region: "Friuli-Venezia Giulia" },
  // Capoluoghi / città principali per fallback regionale
  "aosta": { lat: 45.7372, lng: 7.3206, region: "Valle d'Aosta" },
  "campobasso": { lat: 41.5630, lng: 14.6562, region: "Molise" },
};

/** City → region table for Italian fallback when club is unknown. */
const ITALIAN_CITIES: Record<string, GeoInfo> = {
  "milano": { lat: 45.4642, lng: 9.1900, region: "Lombardia" },
  "roma": { lat: 41.9028, lng: 12.4964, region: "Lazio" },
  "napoli": { lat: 40.8518, lng: 14.2681, region: "Campania" },
  "torino": { lat: 45.0703, lng: 7.6869, region: "Piemonte" },
  "palermo": { lat: 38.1157, lng: 13.3613, region: "Sicilia" },
  "genova": { lat: 44.4056, lng: 8.9463, region: "Liguria" },
  "bologna": { lat: 44.4949, lng: 11.3426, region: "Emilia-Romagna" },
  "firenze": { lat: 43.7696, lng: 11.2558, region: "Toscana" },
  "bari": { lat: 41.1171, lng: 16.8719, region: "Puglia" },
  "catania": { lat: 37.5079, lng: 15.0830, region: "Sicilia" },
  "venezia": { lat: 45.4408, lng: 12.3155, region: "Veneto" },
  "verona": { lat: 45.4384, lng: 10.9916, region: "Veneto" },
  "messina": { lat: 38.1938, lng: 15.5540, region: "Sicilia" },
  "padova": { lat: 45.4064, lng: 11.8768, region: "Veneto" },
  "trieste": { lat: 45.6495, lng: 13.7768, region: "Friuli-Venezia Giulia" },
  "brescia": { lat: 45.5416, lng: 10.2118, region: "Lombardia" },
  "parma": { lat: 44.8015, lng: 10.3279, region: "Emilia-Romagna" },
  "modena": { lat: 44.6471, lng: 10.9252, region: "Emilia-Romagna" },
  "perugia": { lat: 43.1107, lng: 12.3908, region: "Umbria" },
  "ancona": { lat: 43.6158, lng: 13.5189, region: "Marche" },
  "pescara": { lat: 42.4644, lng: 14.2008, region: "Abruzzo" },
  "campobasso": { lat: 41.5630, lng: 14.6562, region: "Molise" },
  "potenza": { lat: 40.6404, lng: 15.8056, region: "Basilicata" },
  "catanzaro": { lat: 38.9059, lng: 16.5963, region: "Calabria" },
  "cagliari": { lat: 39.2238, lng: 9.1217, region: "Sardegna" },
  "aosta": { lat: 45.7372, lng: 7.3206, region: "Valle d'Aosta" },
  "trento": { lat: 46.0667, lng: 11.1167, region: "Trentino-Alto Adige" },
  "bolzano": { lat: 46.4983, lng: 11.3548, region: "Trentino-Alto Adige" },
};

/** Foreign clubs / common European destinations. */
const FOREIGN_CLUBS: Record<string, GeoInfo> = {
  "real madrid": { lat: 40.4530, lng: -3.6883 },
  "barcelona": { lat: 41.3809, lng: 2.1228 },
  "atletico madrid": { lat: 40.4362, lng: -3.5995 },
  "sevilla": { lat: 37.3840, lng: -5.9706 },
  "valencia": { lat: 39.4747, lng: -0.3585 },
  "manchester united": { lat: 53.4631, lng: -2.2913 },
  "manchester city": { lat: 53.4831, lng: -2.2004 },
  "liverpool": { lat: 53.4308, lng: -2.9608 },
  "chelsea": { lat: 51.4817, lng: -0.1910 },
  "arsenal": { lat: 51.5549, lng: -0.1084 },
  "tottenham": { lat: 51.6043, lng: -0.0664 },
  "bayern munich": { lat: 48.2188, lng: 11.6247 },
  "bayern münchen": { lat: 48.2188, lng: 11.6247 },
  "borussia dortmund": { lat: 51.4926, lng: 7.4519 },
  "rb leipzig": { lat: 51.3458, lng: 12.3483 },
  "psg": { lat: 48.8414, lng: 2.2530 },
  "paris saint-germain": { lat: 48.8414, lng: 2.2530 },
  "lyon": { lat: 45.7653, lng: 4.9819 },
  "marseille": { lat: 43.2700, lng: 5.3960 },
  "ajax": { lat: 52.3144, lng: 4.9419 },
  "psv": { lat: 51.4416, lng: 5.4673 },
  "feyenoord": { lat: 51.8939, lng: 4.5230 },
  "porto": { lat: 41.1617, lng: -8.5836 },
  "benfica": { lat: 38.7528, lng: -9.1844 },
  "sporting": { lat: 38.7613, lng: -9.1607 },
  "celtic": { lat: 55.8497, lng: -4.2057 },
  "rangers": { lat: 55.8531, lng: -4.3094 },
  "galatasaray": { lat: 41.1036, lng: 28.9911 },
  "fenerbahce": { lat: 40.9876, lng: 29.0367 },
  "besiktas": { lat: 41.0392, lng: 29.0067 },
};

/** Country fallback (capital-ish coords). */
const COUNTRIES: Record<string, GeoInfo> = {
  "italia": { lat: 42.5, lng: 12.5 },
  "italy": { lat: 42.5, lng: 12.5 },
  "spagna": { lat: 40.4, lng: -3.7 },
  "spain": { lat: 40.4, lng: -3.7 },
  "francia": { lat: 46.6, lng: 2.3 },
  "france": { lat: 46.6, lng: 2.3 },
  "germania": { lat: 51.1, lng: 10.4 },
  "germany": { lat: 51.1, lng: 10.4 },
  "inghilterra": { lat: 52.5, lng: -1.5 },
  "england": { lat: 52.5, lng: -1.5 },
  "regno unito": { lat: 54.0, lng: -2.0 },
  "uk": { lat: 54.0, lng: -2.0 },
  "portogallo": { lat: 39.5, lng: -8.0 },
  "portugal": { lat: 39.5, lng: -8.0 },
  "olanda": { lat: 52.1, lng: 5.3 },
  "paesi bassi": { lat: 52.1, lng: 5.3 },
  "netherlands": { lat: 52.1, lng: 5.3 },
  "belgio": { lat: 50.8, lng: 4.4 },
  "belgium": { lat: 50.8, lng: 4.4 },
  "svizzera": { lat: 46.8, lng: 8.2 },
  "switzerland": { lat: 46.8, lng: 8.2 },
  "austria": { lat: 47.5, lng: 14.5 },
  "polonia": { lat: 51.9, lng: 19.1 },
  "poland": { lat: 51.9, lng: 19.1 },
  "croazia": { lat: 45.1, lng: 15.2 },
  "croatia": { lat: 45.1, lng: 15.2 },
  "serbia": { lat: 44.0, lng: 21.0 },
  "turchia": { lat: 39.0, lng: 35.2 },
  "turkey": { lat: 39.0, lng: 35.2 },
  "grecia": { lat: 39.0, lng: 22.0 },
  "greece": { lat: 39.0, lng: 22.0 },
  "brasile": { lat: -10.0, lng: -55.0 },
  "brazil": { lat: -10.0, lng: -55.0 },
  "argentina": { lat: -34.0, lng: -64.0 },
  "uruguay": { lat: -33.0, lng: -56.0 },
  "colombia": { lat: 4.6, lng: -74.0 },
  "messico": { lat: 23.6, lng: -102.5 },
  "mexico": { lat: 23.6, lng: -102.5 },
  "stati uniti": { lat: 39.8, lng: -98.5 },
  "usa": { lat: 39.8, lng: -98.5 },
  "canada": { lat: 56.1, lng: -106.3 },
  "giappone": { lat: 36.2, lng: 138.2 },
  "japan": { lat: 36.2, lng: 138.2 },
  "corea del sud": { lat: 35.9, lng: 127.7 },
  "south korea": { lat: 35.9, lng: 127.7 },
  "australia": { lat: -25.3, lng: 133.8 },
  "marocco": { lat: 31.8, lng: -7.1 },
  "morocco": { lat: 31.8, lng: -7.1 },
  "algeria": { lat: 28.0, lng: 1.7 },
  "tunisia": { lat: 33.9, lng: 9.5 },
  "egitto": { lat: 26.8, lng: 30.8 },
  "egypt": { lat: 26.8, lng: 30.8 },
  "nigeria": { lat: 9.1, lng: 8.7 },
  "ghana": { lat: 7.9, lng: -1.0 },
  "senegal": { lat: 14.5, lng: -14.5 },
  "costa d'avorio": { lat: 7.5, lng: -5.5 },
  "ivory coast": { lat: 7.5, lng: -5.5 },
  "camerun": { lat: 7.4, lng: 12.4 },
  "cameroon": { lat: 7.4, lng: 12.4 },
};

const norm = (s: string) =>
  s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(fc|cf|ac|as|us|sc|cd|ud|rc|ssc|calcio|club|football)\b/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function lookupClub(club: string): GeoInfo | null {
  if (!club) return null;
  const k = norm(club);
  if (ITALIAN_CLUBS[k]) return ITALIAN_CLUBS[k];
  if (FOREIGN_CLUBS[k]) return FOREIGN_CLUBS[k];
  // partial contains match (e.g. "Inter Milano U19")
  for (const [name, info] of Object.entries(ITALIAN_CLUBS)) {
    if (k.includes(name) || name.includes(k)) return info;
  }
  for (const [name, info] of Object.entries(FOREIGN_CLUBS)) {
    if (k.includes(name) || name.includes(k)) return info;
  }
  return null;
}

function lookupCountry(nationality: string): GeoInfo | null {
  if (!nationality) return null;
  const k = norm(nationality);
  return COUNTRIES[k] || null;
}

/**
 * Resolve geographic info for a player using club first, then nationality.
 * Adds slight jitter so multiple players in the same city don't overlap.
 */
export function resolveGeo(opts: {
  club?: string;
  league?: string;
  nationality?: string;
  seed?: string;
}): GeoInfo | null {
  const fromClub = lookupClub(opts.club || "");
  const base = fromClub || lookupCountry(opts.nationality || "");
  if (!base) return null;
  // Deterministic small jitter (~5-15km) based on seed string
  const seed = opts.seed || `${opts.club || ""}-${opts.nationality || ""}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const jLat = ((h & 0xff) / 255 - 0.5) * 0.08;
  const jLng = (((h >> 8) & 0xff) / 255 - 0.5) * 0.08;
  return {
    lat: base.lat + jLat,
    lng: base.lng + jLng,
    region: base.region,
  };
}
