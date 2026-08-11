import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { usePlayers } from "@/lib/usePlayers";
import PlayerCard, { TagPill, VerdictBadge } from "@/components/PlayerCard";
import { ALL_TAGS, POSITION_LABEL, POSITION_CODES, REGIONS, BODY_TYPES, STATS_GROUPS, type Player, type PlayerStats } from "@/lib/types";
import { exportJSON, importJSON } from "@/lib/storage";
import { getShortlist, subscribeShortlist } from "@/lib/shortlist";
import { getAllFieldMappings } from "@/lib/csvExport";
import { toast } from "sonner";
import RangeFilter from "@/components/RangeFilter";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

type ViewMode = "grid" | "list" | "mapping";
type AgeBucket = "all" | string; // "all" oppure età singola es. "17"

interface RangeDef {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  get: (p: Player) => number | undefined;
}

/** Range ragionevole (max, step) per un campo statistico, dedotto da nome/unità. Copre tutti
 *  e 114 i campi stagionali di STATS_GROUPS senza doverli elencare uno per uno a mano. */
function statFieldBounds(key: string, unit?: string): { max: number; step: number } {
  if (unit === "%" || /_(pct|accuracy|success|conversion)$/.test(key)) return { max: 100, step: 1 };
  if (unit === "km/h") return { max: 40, step: 0.5 };
  if (unit === "km") return { max: 400, step: 5 };
  if (key.endsWith("_per_90")) return { max: 5, step: 0.1 };
  if (key === "avg_rating") return { max: 10, step: 0.1 };
  if (key === "instat_index") return { max: 1000, step: 10 };
  if (key === "minutes") return { max: 4000, step: 50 };
  if (key === "minutes_per_match") return { max: 95, step: 1 };
  if (["passes", "passes_completed", "touches", "progressive_passes"].includes(key)) return { max: 3000, step: 25 };
  if (["matches", "matches_started", "matches_subbed_in", "matches_subbed_out"].includes(key)) return { max: 50, step: 1 };
  if (["yellow_cards", "red_cards", "yellow_red_cards"].includes(key)) return { max: 20, step: 1 };
  if (["fouls_per_match", "sprints_per_match", "high_intensity_runs"].includes(key)) return { max: 20, step: 0.5 };
  if (["goals", "non_penalty_goals", "assists", "goal_contributions", "shots_on_target", "shots_blocked", "shots_off_target",
       "big_chances_created", "big_chances_missed", "penalties_scored", "penalties_taken", "free_kick_goals", "headed_goals",
       "xg_overperformance"].includes(key)) return { max: 40, step: 1 };
  if (["shots"].includes(key)) return { max: 150, step: 1 };
  if (["xg", "xa", "npxg"].includes(key)) return { max: 30, step: 0.5 };
  if (["clean_sheets", "offsides", "errors_leading_to_goal", "errors_leading_to_shot"].includes(key)) return { max: 20, step: 1 };
  if (["saves", "goals_conceded", "punches", "high_claims", "sweeper_actions", "goal_kicks"].includes(key)) return { max: 200, step: 2 };
  if (["psxg", "psxg_minus_goals"].includes(key)) return { max: 40, step: 1 };
  if (["distance_km"].includes(key)) return { max: 400, step: 5 };
  // Fallback per contatori di volume non elencati esplicitamente (passaggi/tocchi/azioni minori)
  return { max: 300, step: 5 };
}

/** Genera un gruppo di RangeDef per ciascuna sezione di STATS_GROUPS (Apparizioni, Offensive,
 *  Passaggi, Possesso & Dribbling, Difensive, Atletici, Portiere) — copre tutti i 114 campi
 *  stagionali senza doverli scrivere a mano, riusando etichette italiane già esistenti. */
function statRangeGroups(): { title: string; defs: RangeDef[] }[] {
  return STATS_GROUPS.map((group) => ({
    title: `Statistiche · ${group.label}`,
    defs: group.fields.map((f) => {
      const { max, step } = statFieldBounds(f.k, f.unit);
      return {
        key: `stat_${f.k}`,
        label: f.label,
        min: 0,
        max,
        step,
        unit: f.unit === "%" ? "%" : f.unit ? ` ${f.unit}` : "",
        get: (p: Player) => (p.stats as PlayerStats | undefined)?.[f.k],
      };
    }),
  }));
}

// Filtri avanzati a intervallo, organizzati per sezione. Configurazione dichiarativa: per
// aggiungere un nuovo filtro numerico basta aggiungere una voce qui, la UI e la logica di
// filtraggio si aggiornano da sole (vedi ALL_RANGE_DEFS / DEFAULT_RANGES sotto).
const RANGE_GROUPS: { title: string; defs: RangeDef[] }[] = [
  {
    title: "Fisico",
    defs: [
      { key: "height", label: "Altezza", min: 150, max: 210, step: 1, unit: " cm", get: (p) => p.height },
      { key: "weight", label: "Peso", min: 50, max: 110, step: 1, unit: " kg", get: (p) => p.weight },
    ],
  },
  {
    title: "Valutazioni",
    defs: [
      { key: "overall", label: "Overall", min: 0, max: 10, step: 0.1, get: (p) => p.ratings?.overall },
      { key: "technical", label: "Tecnica", min: 0, max: 10, step: 0.1, get: (p) => p.ratings?.technical },
      { key: "tactical_rating", label: "Tattica", min: 0, max: 10, step: 0.1, get: (p) => p.ratings?.tactical },
      { key: "physical_rating", label: "Fisico", min: 0, max: 10, step: 0.1, get: (p) => p.ratings?.physical },
      { key: "mental", label: "Mentale", min: 0, max: 10, step: 0.1, get: (p) => p.ratings?.mental },
      { key: "technique_stars", label: "Stelle Tecnica", min: 1, max: 5, step: 1, get: (p) => p.stars?.technique },
      { key: "athleticism_stars", label: "Stelle Atletismo", min: 1, max: 5, step: 1, get: (p) => p.stars?.athleticism },
      { key: "mentality_stars", label: "Stelle Mentalità", min: 1, max: 5, step: 1, get: (p) => p.stars?.mentality },
      { key: "potential_stars", label: "Stelle Potenziale", min: 1, max: 5, step: 1, get: (p) => p.stars?.potential },
      { key: "market_value_stars", label: "Stelle Valore", min: 1, max: 5, step: 1, get: (p) => p.stars?.market_value },
    ],
  },
  {
    title: "Skills",
    defs: [
      { key: "ball_control", label: "Controllo Palla", min: 0, max: 100, step: 1, get: (p) => p.skills?.ball_control },
      { key: "passing", label: "Passaggio", min: 0, max: 100, step: 1, get: (p) => p.skills?.passing },
      { key: "dribbling", label: "Dribbling", min: 0, max: 100, step: 1, get: (p) => p.skills?.dribbling },
      { key: "finishing", label: "Finalizzazione", min: 0, max: 100, step: 1, get: (p) => p.skills?.finishing },
      { key: "defensive_work", label: "Lavoro Difensivo", min: 0, max: 100, step: 1, get: (p) => p.skills?.defensive_work },
      { key: "tactical_iq", label: "QI Tattico", min: 0, max: 100, step: 1, get: (p) => p.skills?.tactical_iq },
      { key: "decision_making", label: "Scelte", min: 0, max: 100, step: 1, get: (p) => p.skills?.decision_making },
      { key: "aerial", label: "Gioco Aereo", min: 0, max: 100, step: 1, get: (p) => p.skills?.aerial },
      { key: "pace", label: "Velocità", min: 0, max: 100, step: 1, get: (p) => p.skills?.pace },
      { key: "stamina", label: "Resistenza", min: 0, max: 100, step: 1, get: (p) => p.skills?.stamina },
      { key: "crossing", label: "Cross", min: 0, max: 100, step: 1, get: (p) => p.skills?.crossing },
      { key: "heading", label: "Colpo di Testa", min: 0, max: 100, step: 1, get: (p) => p.skills?.heading },
      { key: "marking", label: "Marcatura", min: 0, max: 100, step: 1, get: (p) => p.skills?.marking },
      { key: "vision", label: "Visione di Gioco", min: 0, max: 100, step: 1, get: (p) => p.skills?.vision },
      { key: "work_rate", label: "Work Rate", min: 0, max: 100, step: 1, get: (p) => p.skills?.work_rate },
    ],
  },
  {
    title: "Mercato & Osservazioni",
    defs: [
      { key: "market_value", label: "Valore di mercato (max)", min: 0, max: 500000, step: 5000, unit: "€", get: (p) => p.market?.value_max },
      { key: "observation_count", label: "N. osservazioni", min: 0, max: 20, step: 1, get: (p) => p.observation_count },
    ],
  },
  ...statRangeGroups(),
];

const ALL_RANGE_DEFS = RANGE_GROUPS.flatMap((g) => g.defs);
const DEFAULT_RANGES: Record<string, [number, number]> = Object.fromEntries(
  ALL_RANGE_DEFS.map((d) => [d.key, [d.min, d.max] as [number, number]]),
);

export default function Database() {
  const players = usePlayers();
  const [search, setSearch] = useState("");
  const [pos, setPos] = useState<string>("all");
  const [foot, setFoot] = useState<string>("all");
  const [age, setAge] = useState<AgeBucket>("all");
  const [tag, setTag] = useState<string>("all");
  const [verdict, setVerdict] = useState<string>("all");
  const [tactical, setTactical] = useState<string>("all");
  const [league, setLeague] = useState<string>("all");
  const [sort, setSort] = useState<string>("overall_desc");
  const [view, setView] = useState<ViewMode>("grid");
  const [onlyShortlist, setOnlyShortlist] = useState(false);
  const [shortlistTick, setShortlistTick] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // Filtri avanzati: intervalli numerici + selezioni aggiuntive (nazionalità, regione, mercato)
  const [ranges, setRanges] = useState<Record<string, [number, number]>>(DEFAULT_RANGES);
  const [nationality, setNationality] = useState<string>("all");
  const [region, setRegion] = useState<string>("all");
  const [bodyType, setBodyType] = useState<string>("all");
  const [marketPotential, setMarketPotential] = useState<string>("all");
  const [marketRisk, setMarketRisk] = useState<string>("all");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => subscribeShortlist(() => setShortlistTick((t) => t + 1)), []);

  const nationalityOptions = useMemo(() => {
    const set = new Set<string>();
    players.forEach((p) => { if (p.nationality) set.add(p.nationality); });
    return Array.from(set).sort();
  }, [players]);

  const activeAdvancedCount = useMemo(() => {
    let n = 0;
    for (const def of ALL_RANGE_DEFS) {
      const [lo, hi] = ranges[def.key];
      if (lo !== def.min || hi !== def.max) n++;
    }
    if (nationality !== "all") n++;
    if (region !== "all") n++;
    if (bodyType !== "all") n++;
    if (marketPotential !== "all") n++;
    if (marketRisk !== "all") n++;
    return n;
  }, [ranges, nationality, region, bodyType, marketPotential, marketRisk]);

  const resetAdvancedFilters = () => {
    setRanges(DEFAULT_RANGES);
    setNationality("all");
    setRegion("all");
    setBodyType("all");
    setMarketPotential("all");
    setMarketRisk("all");
  };

  const tacticalRoleOptions = useMemo(() => {
    const set = new Set<string>();
    players.forEach((p) => p.tactical_roles.forEach((r) => set.add(r.role)));
    return Array.from(set).sort();
  }, [players]);

  // Lista fissa completa campionati italiani (professionistici, dilettanti, giovanili)
  const LEAGUE_OPTIONS: { group: string; leagues: string[] }[] = [
    {
      group: "Professionistici",
      leagues: ["Serie A", "Serie B", "Serie C, Girone A", "Serie C, Girone B", "Serie C, Girone C"],
    },
    {
      group: "Semi-professionistici",
      leagues: ["Serie D, Girone A", "Serie D, Girone B", "Serie D, Girone C", "Serie D, Girone D", "Serie D, Girone E", "Serie D, Girone F", "Serie D, Girone G", "Serie D, Girone H", "Serie D, Girone I"],
    },
    {
      group: "Dilettanti",
      leagues: ["Eccellenza", "Promozione", "Prima Categoria", "Seconda Categoria", "Terza Categoria"],
    },
    {
      group: "Regionali (esempi)",
      leagues: ["Eccellenza Lombardia", "Eccellenza Piemonte", "Eccellenza Veneto", "Eccellenza Toscana", "Eccellenza Campania", "Eccellenza Sicilia", "Promozione Lombardia", "Promozione Veneto", "Promozione Lazio"],
    },
    {
      group: "Giovanili Professionistici",
      leagues: ["Primavera 1", "Primavera 2", "Primavera 3", "Under 18 Professionisti", "Under 17 Professionisti", "Under 16 Professionisti", "Under 15 Professionisti"],
    },
    {
      group: "Giovanili Nazionali",
      leagues: ["Under 18 Nazionale", "Under 17 Nazionale", "Under 16 Nazionale", "Under 15 Nazionale"],
    },
    {
      group: "Giovanili Regionali",
      leagues: ["Under 19 Regionale", "Under 17 Regionale", "Under 16 Regionale", "Under 15 Regionale", "Under 14 Regionale", "Under 13 Regionale", "Under 12 Regionale", "Under 11 Regionale", "Under 10 Regionale"],
    },
    {
      group: "Altro",
      leagues: ["Lega Nazionale Dilettanti", "Campionato Nazionale Juniores", "Sconosciuto"],
    },
  ];

  const leagueOptions = useMemo(() => {
    const set = new Set<string>();
    players.forEach((p) => { if (p.league) set.add(p.league); });
    return Array.from(set).sort();
  }, [players]);

  const filtered = useMemo(() => {
    const sl = onlyShortlist ? getShortlist() : null;
    let list = players.filter((p) => {
      if (sl && !sl.has(p.id)) return false;
      if (search) {
        const s = search.toLowerCase();
        if (![p.name, p.club, p.position_main, p.league].some((v) => (v || "").toLowerCase().includes(s))) return false;
      }
      if (pos !== "all" && p.position_code !== pos) return false;
      if (foot !== "all" && p.foot !== foot) return false;
      if (age !== "all") {
        const ageNum = parseInt(age, 10);
        if (!isNaN(ageNum) && p.age !== ageNum) return false;
      }
      if (tag !== "all" && !p.tags.includes(tag)) return false;
      if (verdict !== "all" && p.verdict_type !== verdict) return false;
      if (tactical !== "all" && !p.tactical_roles.some((r) => r.role === tactical)) return false;
      if (league !== "all" && p.league !== league) return false;
      if (nationality !== "all" && p.nationality !== nationality) return false;
      if (region !== "all" && p.region !== region) return false;
      if (bodyType !== "all" && p.body_type !== bodyType) return false;
      if (marketPotential !== "all" && p.market?.potential !== marketPotential) return false;
      if (marketRisk !== "all" && p.market?.risk !== marketRisk) return false;
      for (const def of ALL_RANGE_DEFS) {
        const [lo, hi] = ranges[def.key];
        if (lo === def.min && hi === def.max) continue; // filtro non toccato
        const v = def.get(p);
        if (v == null || v < lo || v > hi) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      switch (sort) {
        case "overall_desc": return b.ratings.overall - a.ratings.overall;
        case "overall_asc":  return a.ratings.overall - b.ratings.overall;
        case "age_asc":      return a.age - b.age;
        case "age_desc":     return b.age - a.age;
        case "date_desc":    return b.date.localeCompare(a.date);
        case "name":         return a.name.localeCompare(b.name);
        default: return 0;
      }
    });
    return list;
  }, [players, search, pos, foot, age, tag, verdict, tactical, league, sort, onlyShortlist, shortlistTick, ranges, nationality, region, bodyType, marketPotential, marketRisk]);

  const handleImport = async (file: File) => {
    try {
      const n = await importJSON(file);
      toast.success(`Importati ${n} giocatori`);
    } catch (e) {
      toast.error("Import fallito: " + (e as Error).message);
    }
  };

  return (
    <PageShell>
      {/* Header */}
      <section className="container pt-10 pb-6">
        <div className="section-label mb-3">// DATABASE GIOCATORI</div>
        <h1 className="font-display font-black uppercase text-4xl md:text-6xl mb-1">Tutti i Profili</h1>
        <p className="text-gray-soft">Filtra, confronta, esporta. {filtered.length} giocatori trovati.</p>
      </section>

      {/* Filter bar */}
      <section
        className="sticky z-30 border-hairline-b backdrop-blur-md"
        style={{ top: "var(--nav-height)", background: "hsl(0 0% 4% / 0.92)" }}
      >
        <div className="container py-3">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-2">
            <input
              className="dm-input col-span-2 lg:col-span-2"
              placeholder="Cerca nome, club, ruolo, campionato…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="dm-input" value={pos} onChange={(e) => setPos(e.target.value)}>
              <option value="all">Tutti i ruoli</option>
              {POSITION_CODES.map((c) => <option key={c} value={c}>{c} · {POSITION_LABEL[c]}</option>)}
            </select>
            <select className="dm-input" value={foot} onChange={(e) => setFoot(e.target.value)}>
              <option value="all">Piede</option>
              <option value="Destro">Destro</option>
              <option value="Sinistro">Sinistro</option>
              <option value="Entrambi">Entrambi</option>
            </select>
            <select className="dm-input" value={age} onChange={(e) => setAge(e.target.value as AgeBucket)}>
              <option value="all">Età</option>
              {Array.from({ length: 36 }, (_, i) => i + 10).map((a) => (
                <option key={a} value={String(a)}>{a} anni</option>
              ))}
            </select>
            <select className="dm-input" value={tag} onChange={(e) => setTag(e.target.value)}>
              <option value="all">Tag</option>
              {ALL_TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className="dm-input" value={verdict} onChange={(e) => setVerdict(e.target.value)}>
              <option value="all">Verdetto</option>
              <option value="buy">BUY</option>
              <option value="monitor">MONITOR</option>
              <option value="pass">PASS</option>
            </select>
            <select className="dm-input" value={tactical} onChange={(e) => setTactical(e.target.value)}>
              <option value="all">Ruolo Tattico</option>
              {tacticalRoleOptions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <select className="dm-input" value={league} onChange={(e) => setLeague(e.target.value)}>
              <option value="all">Campionato</option>
              {LEAGUE_OPTIONS.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.leagues.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </optgroup>
              ))}
              {/* Campionati presenti nei dati ma non nella lista fissa */}
              {leagueOptions.filter((l) => !LEAGUE_OPTIONS.flatMap((g) => g.leagues).includes(l)).length > 0 && (
                <optgroup label="Altri (dai dati)">
                  {leagueOptions
                    .filter((l) => !LEAGUE_OPTIONS.flatMap((g) => g.leagues).includes(l))
                    .map((l) => <option key={l} value={l}>{l}</option>)}
                </optgroup>
              )}
            </select>
            <select className="dm-input" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="overall_desc">Overall ↓</option>
              <option value="overall_asc">Overall ↑</option>
              <option value="age_asc">Età ↑</option>
              <option value="age_desc">Età ↓</option>
              <option value="date_desc">Data report ↓</option>
              <option value="name">Nome A→Z</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 border-hairline">
                <button
                  onClick={() => setView("grid")}
                  className={`px-3 py-1.5 font-mono text-xs uppercase tracking-[0.12rem] ${view === "grid" ? "bg-accent text-background" : "text-gray-soft"}`}
                >Grid</button>
                <button
                  onClick={() => setView("list")}
                  className={`px-3 py-1.5 font-mono text-xs uppercase tracking-[0.12rem] ${view === "list" ? "bg-accent text-background" : "text-gray-soft"}`}
                >List</button>
                <button
                  onClick={() => setView("mapping")}
                  className={`px-3 py-1.5 font-mono text-xs uppercase tracking-[0.12rem] ${view === "mapping" ? "bg-accent text-background" : "text-gray-soft"}`}
                  title="Mapping campi statistici DM Scout ↔ InStat / Wyscout / FBref"
                >Mapping</button>
              </div>
              <button
                onClick={() => setOnlyShortlist((v) => !v)}
                className={`px-3 py-1.5 border-hairline font-mono text-xs uppercase tracking-[0.12rem] ${onlyShortlist ? "bg-accent text-background" : "text-gray-soft"}`}
                aria-pressed={onlyShortlist}
              >★ Solo Shortlist</button>

              <Sheet open={advancedOpen} onOpenChange={setAdvancedOpen}>
                <SheetTrigger asChild>
                  <button
                    className={`px-3 py-1.5 border-hairline font-mono text-xs uppercase tracking-[0.12rem] flex items-center gap-2 ${activeAdvancedCount > 0 ? "bg-accent text-background" : "text-gray-soft"}`}
                  >
                    ⚙ Filtri Avanzati
                    {activeAdvancedCount > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[1.1rem] h-[1.1rem] rounded-full bg-background text-accent-lime text-[0.65rem] px-1">
                        {activeAdvancedCount}
                      </span>
                    )}
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto border-hairline-l bg-black">
                  <SheetHeader>
                    <SheetTitle className="font-display uppercase tracking-wide">Filtri Avanzati</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="section-label">{activeAdvancedCount} filtri attivi</span>
                      <button onClick={resetAdvancedFilters} className="dm-btn-outline !py-1 !px-3 text-xs">
                        Azzera
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <select className="dm-input" value={nationality} onChange={(e) => setNationality(e.target.value)}>
                        <option value="all">Nazionalità</option>
                        {nationalityOptions.map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                      <select className="dm-input" value={region} onChange={(e) => setRegion(e.target.value)}>
                        <option value="all">Regione</option>
                        {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <select className="dm-input" value={bodyType} onChange={(e) => setBodyType(e.target.value)}>
                        <option value="all">Corporatura</option>
                        {BODY_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                      <select className="dm-input" value={marketPotential} onChange={(e) => setMarketPotential(e.target.value)}>
                        <option value="all">Potenziale mercato</option>
                        <option value="Alto">Alto</option>
                        <option value="Medio-Alto">Medio-Alto</option>
                        <option value="Medio">Medio</option>
                        <option value="Basso">Basso</option>
                      </select>
                      <select className="dm-input" value={marketRisk} onChange={(e) => setMarketRisk(e.target.value)}>
                        <option value="all">Rischio</option>
                        <option value="Basso">Basso</option>
                        <option value="Medio">Medio</option>
                        <option value="Alto">Alto</option>
                      </select>
                    </div>

                    <Accordion type="multiple" defaultValue={["Fisico", "Valutazioni"]} className="border-hairline-t">
                      {RANGE_GROUPS.map((group) => (
                        <AccordionItem key={group.title} value={group.title} className="border-hairline-b">
                          <AccordionTrigger className="section-label !no-underline hover:!no-underline">
                            {group.title}
                          </AccordionTrigger>
                          <AccordionContent>
                            {group.defs.map((def) => (
                              <RangeFilter
                                key={def.key}
                                label={def.label}
                                min={def.min}
                                max={def.max}
                                step={def.step}
                                unit={def.unit}
                                value={ranges[def.key]}
                                onChange={(v) => setRanges((prev) => ({ ...prev, [def.key]: v }))}
                              />
                            ))}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => exportJSON()} className="dm-btn-outline !py-1.5 !px-3 text-xs">Esporta JSON ↓</button>
              <button
                onClick={() => fileRef.current?.click()}
                className="dm-btn-outline !py-1.5 !px-3 text-xs"
              >Importa JSON ↑</button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImport(f);
                  e.target.value = "";
                }}
              />
              <Link to="/ai-report" className="dm-btn-primary !py-1.5 !px-3 text-xs">⚡ Report Auto</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="container py-8">
        {view !== "mapping" && filtered.length === 0 && (
          <div className="dm-card p-10 text-center text-gray-soft">Nessun giocatore corrisponde ai filtri.</div>
        )}

        {view === "grid" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p, i) => (
              <PlayerCard key={p.id} p={p} delay={i} />
            ))}
          </div>
        )}

        {view === "list" && (
          <div className="border-hairline overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-hairline-b bg-gray-light">
                <tr className="text-left font-mono text-xs uppercase tracking-[0.12rem] text-gray-soft">
                  <th className="p-3">#</th>
                  <th className="p-3">Nome</th>
                  <th className="p-3 hidden md:table-cell">Club</th>
                  <th className="p-3">Pos</th>
                  <th className="p-3 hidden md:table-cell">Età</th>
                  <th className="p-3">Overall</th>
                  <th className="p-3">Verdetto</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-hairline-t hover:bg-gray-light/50 transition-colors">
                    <td className="p-3 font-mono text-xs text-gray-soft">{p.num}</td>
                    <td className="p-3 font-display font-semibold uppercase">{p.name}</td>
                    <td className="p-3 text-gray-soft hidden md:table-cell">{p.club}</td>
                    <td className="p-3 font-mono text-xs">{p.position_code}</td>
                    <td className="p-3 hidden md:table-cell">{p.age}</td>
                    <td className="p-3 font-mono text-accent-lime">{p.ratings.overall.toFixed(1)}</td>
                    <td className="p-3"><VerdictBadge type={p.verdict_type} /></td>
                    <td className="p-3 text-right">
                      <Link to={`/player?id=${p.id}`} className="text-accent-lime font-mono text-xs">Apri →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === "mapping" && <MappingView />}
      </section>
    </PageShell>
  );
}

function MappingView() {
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<"all" | "Stagione" | "Ultima partita">("all");
  const all = useMemo(() => getAllFieldMappings(), []);
  const rows = useMemo(() => {
    const s = q.toLowerCase().trim();
    return all.filter((r) => {
      if (mode !== "all" && r.mode !== mode) return false;
      if (!s) return true;
      return [r.key, r.label, r.group, r.instat, r.wyscout, r.fbref, r.also]
        .some((v) => (v || "").toLowerCase().includes(s));
    });
  }, [all, q, mode]);

  return (
    <div className="space-y-4">
      <div className="dm-card p-4">
        <div className="section-label mb-2">// MAPPING CAMPI STATISTICI</div>
        <p className="text-sm text-gray-soft mb-3">
          Per ogni statistica esportabile in CSV, vedi qui il nome usato in DM Scout e gli alias corrispondenti
          su <strong className="text-foreground">InStat</strong>, <strong className="text-foreground">Wyscout</strong> e <strong className="text-foreground">FBref</strong>.
          Le celle vuote indicano che non esiste un nome ufficiale equivalente per quella fonte.
        </p>
        <div className="flex flex-wrap gap-2">
          <input
            className="dm-input flex-1 min-w-[200px]"
            placeholder="Cerca chiave, etichetta, alias…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className="dm-input" value={mode} onChange={(e) => setMode(e.target.value as any)}>
            <option value="all">Tutte le modalità</option>
            <option value="Stagione">Stagione</option>
            <option value="Ultima partita">Ultima partita</option>
          </select>
        </div>
        <div className="text-xs text-gray-soft mt-2 font-mono">{rows.length} campi</div>
      </div>

      <div className="border-hairline overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-hairline-b bg-gray-light sticky top-0">
            <tr className="text-left font-mono text-xs uppercase tracking-[0.12rem] text-gray-soft">
              <th className="p-3">Chiave DM Scout</th>
              <th className="p-3">Etichetta</th>
              <th className="p-3 hidden md:table-cell">Gruppo</th>
              <th className="p-3">InStat</th>
              <th className="p-3">Wyscout</th>
              <th className="p-3">FBref</th>
              <th className="p-3 hidden lg:table-cell">Altri alias</th>
              <th className="p-3">Unità</th>
              <th className="p-3">Modalità</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.mode}-${r.key}`} className="border-hairline-t hover:bg-gray-light/50">
                <td className="p-3 font-mono text-xs text-accent-lime">{r.key}</td>
                <td className="p-3">{r.label}</td>
                <td className="p-3 text-gray-soft hidden md:table-cell">{r.group}</td>
                <td className="p-3">{r.instat || <span className="text-gray-soft/50">—</span>}</td>
                <td className="p-3">{r.wyscout || <span className="text-gray-soft/50">—</span>}</td>
                <td className="p-3">{r.fbref || <span className="text-gray-soft/50">—</span>}</td>
                <td className="p-3 text-gray-soft hidden lg:table-cell">{r.also || <span className="text-gray-soft/50">—</span>}</td>
                <td className="p-3 font-mono text-xs text-gray-soft">{r.unit || "—"}</td>
                <td className="p-3 font-mono text-xs">{r.mode === "Stagione" ? "S" : "M"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={9} className="p-6 text-center text-gray-soft">Nessun campo corrisponde alla ricerca.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
