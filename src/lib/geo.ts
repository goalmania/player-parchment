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
  // Spagna
  "real madrid": { lat: 40.4530, lng: -3.6883 },
  "barcelona": { lat: 41.3809, lng: 2.1228 },
  "atletico madrid": { lat: 40.4362, lng: -3.5995 },
  "sevilla": { lat: 37.3840, lng: -5.9706 },
  "valencia": { lat: 39.4747, lng: -0.3585 },
  "villarreal": { lat: 39.9440, lng: -0.1027 },
  "real sociedad": { lat: 43.3015, lng: -1.9738 },
  "athletic bilbao": { lat: 43.2642, lng: -2.9490 },
  "betis": { lat: 37.3561, lng: -5.9819 },
  "osasuna": { lat: 42.7996, lng: -1.6369 },
  // Inghilterra
  "manchester united": { lat: 53.4631, lng: -2.2913 },
  "manchester city": { lat: 53.4831, lng: -2.2004 },
  "liverpool": { lat: 53.4308, lng: -2.9608 },
  "chelsea": { lat: 51.4817, lng: -0.1910 },
  "arsenal": { lat: 51.5549, lng: -0.1084 },
  "tottenham": { lat: 51.6043, lng: -0.0664 },
  "newcastle": { lat: 54.9756, lng: -1.6217 },
  "aston villa": { lat: 52.5088, lng: -1.8847 },
  "brighton": { lat: 50.8616, lng: -0.0837 },
  "west ham": { lat: 51.5389, lng: 0.0167 },
  "watford": { lat: 51.6503, lng: -0.4017 },
  "leeds": { lat: 53.7772, lng: -1.5722 },
  "everton": { lat: 53.4388, lng: -2.9664 },
  "leicester": { lat: 52.6204, lng: -1.1423 },
  "wolves": { lat: 52.5901, lng: -2.1306 },
  "wolverhampton": { lat: 52.5901, lng: -2.1306 },
  "nottingham forest": { lat: 52.9399, lng: -1.1325 },
  "brentford": { lat: 51.4883, lng: -0.3087 },
  "fulham": { lat: 51.4750, lng: -0.2214 },
  "crystal palace": { lat: 51.3983, lng: -0.0856 },
  "southampton": { lat: 50.9058, lng: -1.3914 },
  // Germania
  "bayern munich": { lat: 48.2188, lng: 11.6247 },
  "bayern münchen": { lat: 48.2188, lng: 11.6247 },
  "borussia dortmund": { lat: 51.4926, lng: 7.4519 },
  "rb leipzig": { lat: 51.3458, lng: 12.3483 },
  "bayer leverkusen": { lat: 51.0385, lng: 7.0024 },
  "eintracht frankfurt": { lat: 50.0686, lng: 8.6455 },
  "wolfsburg": { lat: 52.4323, lng: 10.8030 },
  "borussia monchengladbach": { lat: 51.1749, lng: 6.3852 },
  "schalke": { lat: 51.5543, lng: 7.0678 },
  "stuttgart": { lat: 48.7926, lng: 9.2322 },
  "freiburg": { lat: 47.9883, lng: 7.8990 },
  "hoffenheim": { lat: 49.2382, lng: 8.8886 },
  "mainz": { lat: 49.9842, lng: 8.2241 },
  "augsburg": { lat: 48.3234, lng: 10.8863 },
  "hertha berlin": { lat: 52.5145, lng: 13.2395 },
  "union berlin": { lat: 52.4576, lng: 13.5685 },
  "hamburger sv": { lat: 53.5876, lng: 9.8987 },
  // Francia
  "psg": { lat: 48.8414, lng: 2.2530 },
  "paris saint-germain": { lat: 48.8414, lng: 2.2530 },
  "lyon": { lat: 45.7653, lng: 4.9819 },
  "marseille": { lat: 43.2700, lng: 5.3960 },
  "monaco": { lat: 43.7274, lng: 7.4159 },
  "lille": { lat: 50.6113, lng: 3.1302 },
  "rennes": { lat: 48.1071, lng: -1.7116 },
  "nice": { lat: 43.7049, lng: 7.1892 },
  "lens": { lat: 50.4325, lng: 2.8235 },
  "strasbourg": { lat: 48.5603, lng: 7.7560 },
  "nantes": { lat: 47.2561, lng: -1.5250 },
  "brest": { lat: 48.3888, lng: -4.4792 },
  // Olanda (Eredivisie)
  "ajax": { lat: 52.3144, lng: 4.9419 },
  "psv": { lat: 51.4416, lng: 5.4673 },
  "psv eindhoven": { lat: 51.4416, lng: 5.4673 },
  "feyenoord": { lat: 51.8939, lng: 4.5230 },
  "utrecht": { lat: 52.0800, lng: 5.1411 },
  "az alkmaar": { lat: 52.6084, lng: 4.7499 },
  "alkmaar": { lat: 52.6084, lng: 4.7499 },
  "twente": { lat: 52.2354, lng: 6.8456 },
  "vitesse": { lat: 51.9648, lng: 5.9228 },
  "groningen": { lat: 53.2055, lng: 6.5787 },
  "heerenveen": { lat: 52.9605, lng: 5.9118 },
  "sparta rotterdam": { lat: 51.9168, lng: 4.4591 },
  "nec nijmegen": { lat: 51.8347, lng: 5.8509 },
  "nijmegen": { lat: 51.8347, lng: 5.8509 },
  "roda jc": { lat: 50.8781, lng: 5.9697 },
  "go ahead eagles": { lat: 52.2536, lng: 6.1597 },
  "fortuna sittard": { lat: 50.9940, lng: 5.8669 },
  "excelsior": { lat: 51.9096, lng: 4.5038 },
  "cambuur": { lat: 53.1996, lng: 5.8036 },
  "waalwijk": { lat: 51.6866, lng: 5.0641 },
  "heracles": { lat: 52.3286, lng: 6.6662 },
  "willem ii": { lat: 51.5589, lng: 5.0709 },
  "pec zwolle": { lat: 52.4998, lng: 6.0767 },
  "zwolle": { lat: 52.4998, lng: 6.0767 },
  // Portogallo
  "porto": { lat: 41.1617, lng: -8.5836 },
  "benfica": { lat: 38.7528, lng: -9.1844 },
  "sporting": { lat: 38.7613, lng: -9.1607 },
  "sporting cp": { lat: 38.7613, lng: -9.1607 },
  "braga": { lat: 41.5640, lng: -8.4272 },
  "vitoria guimaraes": { lat: 41.4500, lng: -8.3000 },
  // Scozia
  "celtic": { lat: 55.8497, lng: -4.2057 },
  "rangers": { lat: 55.8531, lng: -4.3094 },
  // Turchia
  "galatasaray": { lat: 41.1036, lng: 28.9911 },
  "fenerbahce": { lat: 40.9876, lng: 29.0367 },
  "besiktas": { lat: 41.0392, lng: 29.0067 },
  "trabzonspor": { lat: 41.0013, lng: 39.7353 },
  // Belgio
  "anderlecht": { lat: 50.8366, lng: 4.2980 },
  "club brugge": { lat: 51.1894, lng: 3.2156 },
  "gent": { lat: 51.0275, lng: 3.7137 },
  "standard liege": { lat: 50.6100, lng: 5.5319 },
  // Grecia
  "olympiakos": { lat: 37.9673, lng: 23.6687 },
  "panathinaikos": { lat: 37.9843, lng: 23.7291 },
  "paok": { lat: 40.6167, lng: 22.9500 },
  // Russia/Ucraina
  "shakhtar donetsk": { lat: 48.0041, lng: 37.8050 },
  "dynamo kyiv": { lat: 50.4329, lng: 30.5095 },
  // Austria
  "salzburg": { lat: 47.7962, lng: 13.0614 },
  "red bull salzburg": { lat: 47.7962, lng: 13.0614 },
  "rapid wien": { lat: 48.1878, lng: 16.3353 },
  // Svizzera
  "basel": { lat: 47.5412, lng: 7.6207 },
  "young boys": { lat: 46.9632, lng: 7.4647 },
  "zurich": { lat: 47.3820, lng: 8.5036 },
  // Serbia
  "red star belgrade": { lat: 44.7854, lng: 20.4603 },
  "crvena zvezda": { lat: 44.7854, lng: 20.4603 },
  "partizan": { lat: 44.7826, lng: 20.4424 },
  // Croazia
  "dinamo zagreb": { lat: 45.8218, lng: 15.9786 },
  "hajduk split": { lat: 43.5082, lng: 16.4450 },
  // America Latina
  "boca juniors": { lat: -34.6345, lng: -58.3661 },
  "river plate": { lat: -34.5454, lng: -58.4503 },
  "flamengo": { lat: -22.9122, lng: -43.2302 },
  "santos": { lat: -23.9597, lng: -46.3331 },
};

/** Country fallback (capital-ish coords). Includes adjective forms and ISO codes. */
const COUNTRIES: Record<string, GeoInfo> = {
  // Italia
  "italia": { lat: 42.5, lng: 12.5 }, "italy": { lat: 42.5, lng: 12.5 },
  "italiano": { lat: 42.5, lng: 12.5 }, "italiana": { lat: 42.5, lng: 12.5 }, "ita": { lat: 42.5, lng: 12.5 },
  // Spagna
  "spagna": { lat: 40.4, lng: -3.7 }, "spain": { lat: 40.4, lng: -3.7 },
  "spagnolo": { lat: 40.4, lng: -3.7 }, "spagnola": { lat: 40.4, lng: -3.7 }, "esp": { lat: 40.4, lng: -3.7 },
  // Francia
  "francia": { lat: 46.6, lng: 2.3 }, "france": { lat: 46.6, lng: 2.3 },
  "francese": { lat: 46.6, lng: 2.3 }, "fra": { lat: 46.6, lng: 2.3 },
  // Germania
  "germania": { lat: 51.1, lng: 10.4 }, "germany": { lat: 51.1, lng: 10.4 },
  "tedesco": { lat: 51.1, lng: 10.4 }, "tedesca": { lat: 51.1, lng: 10.4 }, "ger": { lat: 51.1, lng: 10.4 }, "deu": { lat: 51.1, lng: 10.4 },
  // Inghilterra / UK
  "inghilterra": { lat: 52.5, lng: -1.5 }, "england": { lat: 52.5, lng: -1.5 },
  "inglese": { lat: 52.5, lng: -1.5 }, "eng": { lat: 52.5, lng: -1.5 },
  "regno unito": { lat: 54.0, lng: -2.0 }, "uk": { lat: 54.0, lng: -2.0 }, "gran bretagna": { lat: 54.0, lng: -2.0 },
  "britannico": { lat: 54.0, lng: -2.0 }, "britannica": { lat: 54.0, lng: -2.0 },
  // Portogallo
  "portogallo": { lat: 39.5, lng: -8.0 }, "portugal": { lat: 39.5, lng: -8.0 },
  "portoghese": { lat: 39.5, lng: -8.0 }, "por": { lat: 39.5, lng: -8.0 },
  // Olanda / Paesi Bassi
  "olanda": { lat: 52.1, lng: 5.3 }, "paesi bassi": { lat: 52.1, lng: 5.3 }, "netherlands": { lat: 52.1, lng: 5.3 },
  "olandese": { lat: 52.1, lng: 5.3 }, "olandesi": { lat: 52.1, lng: 5.3 },
  "ned": { lat: 52.1, lng: 5.3 }, "nld": { lat: 52.1, lng: 5.3 }, "nl": { lat: 52.1, lng: 5.3 },
  // Belgio
  "belgio": { lat: 50.8, lng: 4.4 }, "belgium": { lat: 50.8, lng: 4.4 },
  "belga": { lat: 50.8, lng: 4.4 }, "bel": { lat: 50.8, lng: 4.4 },
  // Svizzera
  "svizzera": { lat: 46.8, lng: 8.2 }, "switzerland": { lat: 46.8, lng: 8.2 },
  "svizzero": { lat: 46.8, lng: 8.2 }, "svizzera": { lat: 46.8, lng: 8.2 }, "sui": { lat: 46.8, lng: 8.2 }, "che": { lat: 46.8, lng: 8.2 },
  // Austria
  "austria": { lat: 47.5, lng: 14.5 }, "austriaco": { lat: 47.5, lng: 14.5 }, "aut": { lat: 47.5, lng: 14.5 },
  // Polonia
  "polonia": { lat: 51.9, lng: 19.1 }, "poland": { lat: 51.9, lng: 19.1 },
  "polacco": { lat: 51.9, lng: 19.1 }, "pol": { lat: 51.9, lng: 19.1 },
  // Croazia
  "croazia": { lat: 45.1, lng: 15.2 }, "croatia": { lat: 45.1, lng: 15.2 },
  "croato": { lat: 45.1, lng: 15.2 }, "cro": { lat: 45.1, lng: 15.2 },
  // Serbia
  "serbia": { lat: 44.0, lng: 21.0 }, "serbo": { lat: 44.0, lng: 21.0 }, "srb": { lat: 44.0, lng: 21.0 },
  // Turchia
  "turchia": { lat: 39.0, lng: 35.2 }, "turkey": { lat: 39.0, lng: 35.2 },
  "turco": { lat: 39.0, lng: 35.2 }, "tur": { lat: 39.0, lng: 35.2 },
  // Grecia
  "grecia": { lat: 39.0, lng: 22.0 }, "greece": { lat: 39.0, lng: 22.0 },
  "greco": { lat: 39.0, lng: 22.0 }, "gre": { lat: 39.0, lng: 22.0 },
  // Scozia / Irlanda
  "scozia": { lat: 56.5, lng: -4.2 }, "scotland": { lat: 56.5, lng: -4.2 }, "scozzese": { lat: 56.5, lng: -4.2 },
  "irlanda": { lat: 53.4, lng: -8.0 }, "ireland": { lat: 53.4, lng: -8.0 }, "irlandese": { lat: 53.4, lng: -8.0 },
  // Svezia / Norvegia / Danimarca / Finlandia
  "svezia": { lat: 62.0, lng: 15.0 }, "sweden": { lat: 62.0, lng: 15.0 }, "svedese": { lat: 62.0, lng: 15.0 }, "swe": { lat: 62.0, lng: 15.0 },
  "norvegia": { lat: 64.5, lng: 17.9 }, "norway": { lat: 64.5, lng: 17.9 }, "norvegese": { lat: 64.5, lng: 17.9 }, "nor": { lat: 64.5, lng: 17.9 },
  "danimarca": { lat: 56.3, lng: 9.5 }, "denmark": { lat: 56.3, lng: 9.5 }, "danese": { lat: 56.3, lng: 9.5 }, "den": { lat: 56.3, lng: 9.5 },
  "finlandia": { lat: 64.9, lng: 26.0 }, "finland": { lat: 64.9, lng: 26.0 }, "finlandese": { lat: 64.9, lng: 26.0 },
  // Europa Est
  "ungheria": { lat: 47.2, lng: 19.5 }, "hungary": { lat: 47.2, lng: 19.5 }, "ungherese": { lat: 47.2, lng: 19.5 },
  "romania": { lat: 45.9, lng: 24.9 }, "romeno": { lat: 45.9, lng: 24.9 }, "rou": { lat: 45.9, lng: 24.9 },
  "bulgaria": { lat: 42.7, lng: 25.5 }, "bulgaro": { lat: 42.7, lng: 25.5 },
  "slovacchia": { lat: 48.7, lng: 19.7 }, "slovakia": { lat: 48.7, lng: 19.7 },
  "slovenia": { lat: 46.1, lng: 14.9 }, "sloveno": { lat: 46.1, lng: 14.9 },
  "albania": { lat: 41.2, lng: 20.2 }, "albanese": { lat: 41.2, lng: 20.2 }, "alb": { lat: 41.2, lng: 20.2 },
  "bosnia": { lat: 44.2, lng: 17.9 }, "bosniaco": { lat: 44.2, lng: 17.9 }, "bih": { lat: 44.2, lng: 17.9 },
  "kosovo": { lat: 42.6, lng: 20.9 }, "kosovaro": { lat: 42.6, lng: 20.9 },
  "macedonia": { lat: 41.6, lng: 21.7 }, "macedone": { lat: 41.6, lng: 21.7 }, "mkd": { lat: 41.6, lng: 21.7 },
  "montenegro": { lat: 42.7, lng: 19.4 }, "montenegrino": { lat: 42.7, lng: 19.4 },
  "ucraina": { lat: 49.0, lng: 31.4 }, "ukraine": { lat: 49.0, lng: 31.4 }, "ucraino": { lat: 49.0, lng: 31.4 }, "ukr": { lat: 49.0, lng: 31.4 },
  "russia": { lat: 61.5, lng: 105.3 }, "russo": { lat: 61.5, lng: 105.3 }, "rus": { lat: 61.5, lng: 105.3 },
  "bielorussia": { lat: 53.7, lng: 27.9 }, "bielorusso": { lat: 53.7, lng: 27.9 },
  // America Latina
  "brasile": { lat: -10.0, lng: -55.0 }, "brazil": { lat: -10.0, lng: -55.0 },
  "brasiliano": { lat: -10.0, lng: -55.0 }, "bra": { lat: -10.0, lng: -55.0 },
  "argentina": { lat: -34.0, lng: -64.0 }, "argentino": { lat: -34.0, lng: -64.0 }, "arg": { lat: -34.0, lng: -64.0 },
  "uruguay": { lat: -33.0, lng: -56.0 }, "uruguaiano": { lat: -33.0, lng: -56.0 }, "uru": { lat: -33.0, lng: -56.0 },
  "colombia": { lat: 4.6, lng: -74.0 }, "colombiano": { lat: 4.6, lng: -74.0 }, "col": { lat: 4.6, lng: -74.0 },
  "cile": { lat: -35.7, lng: -71.5 }, "chile": { lat: -35.7, lng: -71.5 }, "cileno": { lat: -35.7, lng: -71.5 },
  "peru": { lat: -9.2, lng: -75.0 }, "peruviano": { lat: -9.2, lng: -75.0 },
  "ecuador": { lat: -1.8, lng: -78.2 }, "ecuadoriano": { lat: -1.8, lng: -78.2 },
  "venezuela": { lat: 6.4, lng: -66.6 }, "venezuelano": { lat: 6.4, lng: -66.6 },
  "paraguay": { lat: -23.4, lng: -58.4 }, "paraguaiano": { lat: -23.4, lng: -58.4 },
  "bolivia": { lat: -16.3, lng: -63.6 }, "boliviano": { lat: -16.3, lng: -63.6 },
  "messico": { lat: 23.6, lng: -102.5 }, "mexico": { lat: 23.6, lng: -102.5 }, "messicano": { lat: 23.6, lng: -102.5 }, "mex": { lat: 23.6, lng: -102.5 },
  "costa rica": { lat: 9.7, lng: -83.8 }, "costaricano": { lat: 9.7, lng: -83.8 },
  "honduras": { lat: 15.2, lng: -86.2 }, "honduregno": { lat: 15.2, lng: -86.2 },
  // Nord America
  "stati uniti": { lat: 39.8, lng: -98.5 }, "usa": { lat: 39.8, lng: -98.5 }, "americano": { lat: 39.8, lng: -98.5 },
  "canada": { lat: 56.1, lng: -106.3 }, "canadese": { lat: 56.1, lng: -106.3 },
  // Africa
  "marocco": { lat: 31.8, lng: -7.1 }, "morocco": { lat: 31.8, lng: -7.1 }, "marocchino": { lat: 31.8, lng: -7.1 }, "mar": { lat: 31.8, lng: -7.1 },
  "algeria": { lat: 28.0, lng: 1.7 }, "algerino": { lat: 28.0, lng: 1.7 },
  "tunisia": { lat: 33.9, lng: 9.5 }, "tunisino": { lat: 33.9, lng: 9.5 },
  "egitto": { lat: 26.8, lng: 30.8 }, "egypt": { lat: 26.8, lng: 30.8 }, "egiziano": { lat: 26.8, lng: 30.8 },
  "nigeria": { lat: 9.1, lng: 8.7 }, "nigeriano": { lat: 9.1, lng: 8.7 }, "nga": { lat: 9.1, lng: 8.7 },
  "ghana": { lat: 7.9, lng: -1.0 }, "ghanese": { lat: 7.9, lng: -1.0 }, "gha": { lat: 7.9, lng: -1.0 },
  "senegal": { lat: 14.5, lng: -14.5 }, "senegalese": { lat: 14.5, lng: -14.5 }, "sen": { lat: 14.5, lng: -14.5 },
  "costa d'avorio": { lat: 7.5, lng: -5.5 }, "ivory coast": { lat: 7.5, lng: -5.5 }, "ivoriano": { lat: 7.5, lng: -5.5 },
  "camerun": { lat: 7.4, lng: 12.4 }, "cameroon": { lat: 7.4, lng: 12.4 }, "camerunense": { lat: 7.4, lng: 12.4 },
  "mali": { lat: 17.6, lng: -4.0 }, "maliano": { lat: 17.6, lng: -4.0 },
  "guinea": { lat: 11.0, lng: -10.9 }, "guineano": { lat: 11.0, lng: -10.9 },
  "zambia": { lat: -13.1, lng: 27.8 }, "zambiano": { lat: -13.1, lng: 27.8 },
  "zimbabwe": { lat: -20.0, lng: 30.0 }, "zimbabwese": { lat: -20.0, lng: 30.0 },
  "sudafrica": { lat: -30.6, lng: 22.9 }, "south africa": { lat: -30.6, lng: 22.9 }, "sudafricano": { lat: -30.6, lng: 22.9 },
  "angola": { lat: -11.2, lng: 17.9 }, "angolano": { lat: -11.2, lng: 17.9 },
  "congo": { lat: -4.0, lng: 21.8 }, "congolese": { lat: -4.0, lng: 21.8 },
  "mozambico": { lat: -18.7, lng: 35.5 }, "mozambicano": { lat: -18.7, lng: 35.5 },
  "etiopia": { lat: 9.1, lng: 40.5 }, "etiope": { lat: 9.1, lng: 40.5 },
  "kenya": { lat: 0.0, lng: 37.9 }, "keniota": { lat: 0.0, lng: 37.9 },
  "tanzania": { lat: -6.4, lng: 34.9 }, "tanzaniano": { lat: -6.4, lng: 34.9 },
  "uganda": { lat: 1.4, lng: 32.3 }, "ugandese": { lat: 1.4, lng: 32.3 },
  "ruanda": { lat: -1.9, lng: 29.9 }, "ruandese": { lat: -1.9, lng: 29.9 },
  "burkina faso": { lat: 12.4, lng: -1.6 }, "burkinabe": { lat: 12.4, lng: -1.6 },
  "togo": { lat: 8.6, lng: 0.8 }, "togolese": { lat: 8.6, lng: 0.8 },
  "benin": { lat: 9.3, lng: 2.3 }, "beninese": { lat: 9.3, lng: 2.3 },
  // Asia / Oceania
  "giappone": { lat: 36.2, lng: 138.2 }, "japan": { lat: 36.2, lng: 138.2 }, "giapponese": { lat: 36.2, lng: 138.2 }, "jpn": { lat: 36.2, lng: 138.2 },
  "corea del sud": { lat: 35.9, lng: 127.7 }, "south korea": { lat: 35.9, lng: 127.7 }, "coreano": { lat: 35.9, lng: 127.7 }, "kor": { lat: 35.9, lng: 127.7 },
  "cina": { lat: 35.9, lng: 104.2 }, "china": { lat: 35.9, lng: 104.2 }, "cinese": { lat: 35.9, lng: 104.2 }, "chn": { lat: 35.9, lng: 104.2 },
  "australia": { lat: -25.3, lng: 133.8 }, "australiano": { lat: -25.3, lng: 133.8 }, "aus": { lat: -25.3, lng: 133.8 },
  "iran": { lat: 32.4, lng: 53.7 }, "iraniano": { lat: 32.4, lng: 53.7 },
  "arabia saudita": { lat: 23.9, lng: 45.1 }, "saudita": { lat: 23.9, lng: 45.1 },
};

/** League-name → country coords fallback (when club and nationality are both unknown). */
const LEAGUE_COUNTRIES: Record<string, GeoInfo> = {
  "serie a": { lat: 42.5, lng: 12.5 }, "serie b": { lat: 42.5, lng: 12.5 },
  "serie c": { lat: 42.5, lng: 12.5 }, "serie d": { lat: 42.5, lng: 12.5 },
  "eccellenza": { lat: 42.5, lng: 12.5 }, "promozione": { lat: 42.5, lng: 12.5 },
  "lega pro": { lat: 42.5, lng: 12.5 },
  "premier league": { lat: 52.5, lng: -1.5 }, "championship": { lat: 52.5, lng: -1.5 },
  "league one": { lat: 52.5, lng: -1.5 }, "league two": { lat: 52.5, lng: -1.5 },
  "la liga": { lat: 40.4, lng: -3.7 }, "segunda division": { lat: 40.4, lng: -3.7 },
  "bundesliga": { lat: 51.1, lng: 10.4 }, "2 bundesliga": { lat: 51.1, lng: 10.4 }, "2. bundesliga": { lat: 51.1, lng: 10.4 },
  "ligue 1": { lat: 46.6, lng: 2.3 }, "ligue 2": { lat: 46.6, lng: 2.3 },
  "eredivisie": { lat: 52.1, lng: 5.3 }, "eerste divisie": { lat: 52.1, lng: 5.3 },
  "jupiler pro league": { lat: 50.8, lng: 4.4 }, "pro league": { lat: 50.8, lng: 4.4 },
  "super lig": { lat: 39.0, lng: 35.2 },
  "primeira liga": { lat: 39.5, lng: -8.0 }, "liga nos": { lat: 39.5, lng: -8.0 },
  "super league": { lat: 46.8, lng: 8.2 },
  "super league greece": { lat: 39.0, lng: 22.0 },
  "scottish premiership": { lat: 56.5, lng: -4.2 },
  "allsvenskan": { lat: 62.0, lng: 15.0 },
  "eliteserien": { lat: 64.5, lng: 17.9 },
  "superligaen": { lat: 56.3, lng: 9.5 },
  "brasileirao": { lat: -10.0, lng: -55.0 }, "brasileirão": { lat: -10.0, lng: -55.0 },
  "liga profesional": { lat: -34.0, lng: -64.0 },
  "mls": { lat: 39.8, lng: -98.5 },
  "j league": { lat: 36.2, lng: 138.2 }, "j-league": { lat: 36.2, lng: 138.2 },
  "k league": { lat: 35.9, lng: 127.7 },
  "ukrainian premier league": { lat: 49.0, lng: 31.4 },
  "russian premier league": { lat: 61.5, lng: 105.3 },
  "polish ekstraklasa": { lat: 51.9, lng: 19.1 }, "ekstraklasa": { lat: 51.9, lng: 19.1 },
  "czech liga": { lat: 49.8, lng: 15.5 },
  "austrian bundesliga": { lat: 47.5, lng: 14.5 },
};

const norm = (s: string) =>
  s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(fc|cf|ac|as|us|sc|cd|ud|rc|ssc|ssd|asd|aps|spa|srl|calcio|club|football|football club|fussball|fussballclub|cfc|afc)\b/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Normalize a club name for grouping/matching across variants like:
 *  "A.C. Milan", "AC Milan U19", "Milan Primavera", "Milan B" → "Milan"
 *  "Internazionale Milano" / "F.C. Inter" → "Inter"
 *  "Hellas Verona FC" → "Hellas Verona"
 * Returns a Title Case canonical label.
 */
const SUFFIX_RE = /\b(u15|u16|u17|u18|u19|u20|u21|u23|primavera|youth|giovanili|giovanissimi|allievi|berretti|reserves?|riserve|ii|b|2|women|femminile|femminil|fem|w)\b/g;
const ALIASES: Record<string, string> = {
  "internazionale": "Inter",
  "internazionale milano": "Inter",
  "fc internazionale": "Inter",
  "ac milan": "Milan",
  "as roma": "Roma",
  "ssc napoli": "Napoli",
  "ss lazio": "Lazio",
  "hellas verona": "Hellas Verona",
  "verona": "Hellas Verona",
  "juventus fc": "Juventus",
  "torino fc": "Torino",
  "udinese calcio": "Udinese",
  "bologna fc": "Bologna",
  "genoa cfc": "Genoa",
  "sampdoria": "Sampdoria",
  "uc sampdoria": "Sampdoria",
  "parma calcio": "Parma",
  "spezia calcio": "Spezia",
  "us cremonese": "Cremonese",
  "us salernitana": "Salernitana",
  "us sassuolo": "Sassuolo",
  "ssd sudtirol": "Südtirol",
  "sudtirol": "Südtirol",
  "südtirol": "Südtirol",
  "feralpisalo": "FeralpiSalò",
  "feralpisalò": "FeralpiSalò",
  "manchester utd": "Manchester United",
  "man utd": "Manchester United",
  "man city": "Manchester City",
  "psg": "Paris Saint-Germain",
  "paris sg": "Paris Saint-Germain",
  "paris saint germain": "Paris Saint-Germain",
  "bayern munich": "Bayern München",
  "bayern munchen": "Bayern München",
  "atletico madrid": "Atlético Madrid",
  "atletico de madrid": "Atlético Madrid",
};

const titleCase = (s: string) =>
  s.split(" ").filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

export function normalizeClubName(raw?: string | null): string {
  if (!raw) return "";
  let k = norm(raw).replace(SUFFIX_RE, " ").replace(/\s+/g, " ").trim();
  if (!k) return "";
  if (ALIASES[k]) return ALIASES[k];
  // alias key may be a prefix of k after suffix strip
  for (const [alias, canon] of Object.entries(ALIASES)) {
    if (k === alias || k.startsWith(alias + " ") || k.endsWith(" " + alias)) return canon;
  }
  // Match against known club dictionaries to recover canonical form
  for (const name of Object.keys(ITALIAN_CLUBS)) {
    if (k === name || k.startsWith(name + " ") || k.endsWith(" " + name) || k.includes(" " + name + " ")) {
      return titleCase(name);
    }
  }
  for (const name of Object.keys(FOREIGN_CLUBS)) {
    if (k === name || k.startsWith(name + " ") || k.endsWith(" " + name) || k.includes(" " + name + " ")) {
      return titleCase(name);
    }
  }
  return titleCase(k);
}

export function normalizeNationality(raw?: string | null): string {
  if (!raw) return "";
  const k = norm(raw);
  const map: Record<string, string> = {
    italia: "Italia", italy: "Italia", italiana: "Italia", italiano: "Italia", ita: "Italia",
    spain: "Spagna", spagna: "Spagna", esp: "Spagna",
    france: "Francia", francia: "Francia", fra: "Francia",
    germany: "Germania", germania: "Germania", ger: "Germania", deu: "Germania",
    england: "Inghilterra", inghilterra: "Inghilterra", eng: "Inghilterra",
    portugal: "Portogallo", portogallo: "Portogallo", por: "Portogallo",
    netherlands: "Paesi Bassi", "paesi bassi": "Paesi Bassi", olanda: "Paesi Bassi", ned: "Paesi Bassi",
    belgium: "Belgio", belgio: "Belgio", bel: "Belgio",
    brazil: "Brasile", brasile: "Brasile", bra: "Brasile",
    argentina: "Argentina", arg: "Argentina",
  };
  return map[k] || titleCase(k);
}

function lookupClub(club: string): GeoInfo | null {
  if (!club) return null;
  const k = norm(club);
  if (ITALIAN_CLUBS[k]) return ITALIAN_CLUBS[k];
  if (FOREIGN_CLUBS[k]) return FOREIGN_CLUBS[k];
  // partial contains match (e.g. "Inter Milano U19")
  for (const [name, info] of Object.entries(ITALIAN_CLUBS)) {
    if (name.length >= 4 && (k.includes(name) || name.includes(k))) return info;
  }
  for (const [name, info] of Object.entries(FOREIGN_CLUBS)) {
    if (name.length >= 4 && (k.includes(name) || name.includes(k))) return info;
  }
  // Try matching an Italian city embedded in club name
  for (const [name, info] of Object.entries(ITALIAN_CITIES)) {
    if (k.includes(name)) return info;
  }
  return null;
}

function lookupCountry(nationality: string): GeoInfo | null {
  if (!nationality) return null;
  const k = norm(nationality);
  return COUNTRIES[k] || null;
}

export function isItalian(nationality?: string): boolean {
  if (!nationality) return false;
  const k = norm(nationality);
  return k === "italia" || k === "italy" || k === "italiana" || k === "italiano" || k === "ita";
}

/**
 * Resolve geographic info for a player.
 * Rule: smistamento prima per NAZIONALITÀ. Se la nazionalità è italiana,
 * smistiamo per REGIONE usando il club (o città) di militanza.
 */
export function resolveGeo(opts: {
  club?: string;
  league?: string;
  nationality?: string;
  seed?: string;
}): GeoInfo | null {
  let base: GeoInfo | null = null;

  if (isItalian(opts.nationality)) {
    // Italiani → priorità al club (per regione), poi nazione
    base = lookupClub(opts.club || "") || lookupCountry(opts.nationality || "");
  } else if (opts.nationality) {
    // Stranieri → priorità nazione, poi club estero
    base = lookupCountry(opts.nationality) || lookupClub(opts.club || "");
  } else {
    // Senza nazionalità → club, poi campionato
    base = lookupClub(opts.club || "");
  }

  // Fallback campionato (es. "Eredivisie" → Olanda) quando né nazione né club sono risolti
  if (!base && opts.league) {
    const lk = norm(opts.league);
    base = LEAGUE_COUNTRIES[lk] ?? null;
  }

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

