import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { usePlayers } from "@/lib/usePlayers";
import PlayerCard, { TagPill, VerdictBadge } from "@/components/PlayerCard";
import { ALL_TAGS, POSITION_LABEL, POSITION_CODES } from "@/lib/types";
import { exportJSON, importJSON } from "@/lib/storage";
import { getShortlist, subscribeShortlist } from "@/lib/shortlist";
import { toast } from "sonner";

type ViewMode = "grid" | "list";
type AgeBucket = "all" | "U18" | "U20" | "U23" | "Senior";

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

  useEffect(() => subscribeShortlist(() => setShortlistTick((t) => t + 1)), []);

  const tacticalRoleOptions = useMemo(() => {
    const set = new Set<string>();
    players.forEach((p) => p.tactical_roles.forEach((r) => set.add(r.role)));
    return Array.from(set).sort();
  }, [players]);

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
        if (age === "U18" && p.age > 17) return false;
        if (age === "U20" && p.age > 19) return false;
        if (age === "U23" && p.age > 22) return false;
        if (age === "Senior" && p.age < 23) return false;
      }
      if (tag !== "all" && !p.tags.includes(tag)) return false;
      if (verdict !== "all" && p.verdict_type !== verdict) return false;
      if (tactical !== "all" && !p.tactical_roles.some((r) => r.role === tactical)) return false;
      if (league !== "all" && p.league !== league) return false;
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
  }, [players, search, pos, foot, age, tag, verdict, tactical, sort, onlyShortlist, shortlistTick]);

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
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            <input
              className="dm-input col-span-2 lg:col-span-2"
              placeholder="Cerca nome, club, ruolo…"
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
              <option value="U18">U18</option>
              <option value="U20">U20</option>
              <option value="U23">U23</option>
              <option value="Senior">Senior</option>
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
              </div>
              <button
                onClick={() => setOnlyShortlist((v) => !v)}
                className={`px-3 py-1.5 border-hairline font-mono text-xs uppercase tracking-[0.12rem] ${onlyShortlist ? "bg-accent text-background" : "text-gray-soft"}`}
                aria-pressed={onlyShortlist}
              >★ Solo Shortlist</button>
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
              <Link to="/ai-report" className="dm-btn-primary !py-1.5 !px-3 text-xs">⚡ Report AI</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="container py-8">
        {filtered.length === 0 && (
          <div className="dm-card p-10 text-center text-gray-soft">Nessun giocatore corrisponde ai filtri.</div>
        )}

        {view === "grid" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border/10 border-hairline">
            {filtered.map((p, i) => (
              <div key={p.id} className="bg-background"><PlayerCard p={p} delay={i} /></div>
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
      </section>
    </PageShell>
  );
}
