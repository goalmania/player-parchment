import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { usePlayers } from "@/lib/usePlayers";
import { TagPill, VerdictBadge } from "@/components/PlayerCard";
import type { Player } from "@/lib/types";

type View = "world" | "italy";

// Naive equirectangular projection to a 1000x500 canvas
const proj = (lat: number, lng: number) => ({
  x: ((lng + 180) / 360) * 1000,
  y: ((90 - lat) / 180) * 500,
});

// Italy regions: simplified bounding boxes (lng_min,lat_min,lng_max,lat_max).
// Used only as click targets and label anchors — not geographically accurate.
const ITALY_REGIONS: { name: string; box: [number, number, number, number] }[] = [
  { name: "Valle d'Aosta", box: [6.6, 45.4, 7.9, 46.0] },
  { name: "Piemonte", box: [6.7, 44.0, 9.2, 46.4] },
  { name: "Liguria", box: [7.4, 43.7, 10.0, 44.6] },
  { name: "Lombardia", box: [8.5, 44.7, 11.4, 46.6] },
  { name: "Trentino-Alto Adige", box: [10.4, 45.6, 12.5, 47.1] },
  { name: "Friuli-Venezia Giulia", box: [12.3, 45.6, 13.9, 46.7] },
  { name: "Veneto", box: [10.6, 44.7, 13.1, 46.7] },
  { name: "Emilia-Romagna", box: [9.2, 43.7, 12.7, 45.1] },
  { name: "Toscana", box: [9.7, 42.2, 12.4, 44.5] },
  { name: "Marche", box: [12.2, 42.7, 13.9, 43.9] },
  { name: "Umbria", box: [11.9, 42.4, 13.3, 43.6] },
  { name: "Lazio", box: [11.4, 41.2, 14.1, 42.8] },
  { name: "Abruzzo", box: [13.0, 41.6, 14.8, 42.9] },
  { name: "Molise", box: [14.0, 41.4, 15.2, 42.1] },
  { name: "Campania", box: [13.7, 39.9, 15.8, 41.5] },
  { name: "Puglia", box: [14.9, 39.7, 18.6, 42.2] },
  { name: "Basilicata", box: [15.3, 39.8, 16.9, 41.1] },
  { name: "Calabria", box: [15.6, 37.9, 17.3, 40.1] },
  { name: "Sicilia", box: [12.4, 36.6, 15.7, 38.4] },
  { name: "Sardegna", box: [8.1, 38.8, 9.9, 41.3] },
];

const ITALY_BOX = { lngMin: 6.5, lngMax: 19.0, latMin: 36.5, latMax: 47.2 };
const projectItaly = (lat: number, lng: number, w = 600, h = 720) => ({
  x: ((lng - ITALY_BOX.lngMin) / (ITALY_BOX.lngMax - ITALY_BOX.lngMin)) * w,
  y: ((ITALY_BOX.latMax - lat) / (ITALY_BOX.latMax - ITALY_BOX.latMin)) * h,
});

const verdictColor = (v: Player["verdict_type"]) =>
  v === "buy" ? "hsl(71 100% 47%)" : v === "monitor" ? "hsl(33 100% 50%)" : "hsl(0 0% 53%)";

export default function MapPage() {
  const players = usePlayers();
  const [view, setView] = useState<View>("italy");
  const [filterVerdict, setFilterVerdict] = useState<string>("all");
  const [region, setRegion] = useState<string | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number; p: Player } | null>(null);

  const filtered = useMemo(() => players.filter((p) => filterVerdict === "all" || p.verdict_type === filterVerdict), [players, filterVerdict]);

  const regionCounts = useMemo(() => {
    const m: Record<string, number> = {};
    filtered.forEach((p) => { m[p.region] = (m[p.region] || 0) + 1; });
    return m;
  }, [filtered]);

  const inRegion = region ? filtered.filter((p) => p.region === region) : filtered;
  const leagues = new Set(filtered.map((p) => p.league)).size;

  return (
    <PageShell>
      <section className="container py-10">
        <div className="section-label mb-3">// MAPPA GEOGRAFICA</div>
        <h1 className="font-display font-black uppercase text-4xl md:text-5xl mb-2">Distribuzione Profili</h1>
        <p className="text-gray-soft mb-6">{filtered.length} giocatori · {Object.keys(regionCounts).length} regioni · {leagues} campionati</p>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex border-hairline">
            <button onClick={() => setView("italy")} className={`px-4 py-2 font-mono text-xs uppercase tracking-[0.12rem] ${view === "italy" ? "bg-accent text-background" : "text-gray-soft"}`}>🇮🇹 Italia</button>
            <button onClick={() => setView("world")} className={`px-4 py-2 font-mono text-xs uppercase tracking-[0.12rem] ${view === "world" ? "bg-accent text-background" : "text-gray-soft"}`}>🌍 Mondo</button>
          </div>
          <select className="dm-input max-w-[200px]" value={filterVerdict} onChange={(e) => setFilterVerdict(e.target.value)}>
            <option value="all">Tutti i verdetti</option>
            <option value="buy">BUY</option>
            <option value="monitor">MONITOR</option>
            <option value="pass">PASS</option>
          </select>
        </div>

        {view === "world" && (
          <div className="border-hairline bg-gray-light/40 relative" style={{ aspectRatio: "2/1" }}>
            <svg viewBox="0 0 1000 500" width="100%" height="100%">
              <rect x="0" y="0" width="1000" height="500" fill="#0f1f0f" />
              {/* very simple equator/meridian grid */}
              {[100, 200, 300, 400].map((y) => <line key={y} x1="0" y1={y} x2="1000" y2={y} stroke="rgba(255,255,255,0.04)" />)}
              {[200, 400, 600, 800].map((x) => <line key={x} x1={x} y1="0" x2={x} y2="500" stroke="rgba(255,255,255,0.04)" />)}
              {filtered.map((p) => {
                const { x, y } = proj(p.lat, p.lng);
                return (
                  <g key={p.id}
                     onMouseEnter={() => setHover({ x, y, p })}
                     onMouseLeave={() => setHover(null)}
                     onClick={() => window.location.assign(`/player?id=${p.id}`)}
                     style={{ cursor: "pointer" }}>
                    <circle cx={x} cy={y} r={8} fill={verdictColor(p.verdict_type)} stroke="#000" strokeWidth={1} />
                  </g>
                );
              })}
            </svg>
            {hover && (
              <div className="absolute pointer-events-none bg-background border-hairline p-3 text-xs"
                style={{ left: `${(hover.x / 1000) * 100}%`, top: `${(hover.y / 500) * 100}%`, transform: "translate(10px, 10px)" }}>
                <div className="font-display font-bold uppercase">{hover.p.name}</div>
                <div className="text-gray-soft">{hover.p.club}</div>
                <div className="font-mono text-accent-lime">{hover.p.ratings.overall.toFixed(1)} · {hover.p.verdict_type.toUpperCase()}</div>
              </div>
            )}
          </div>
        )}

        {view === "italy" && (
          <div className="grid lg:grid-cols-[1fr_320px] gap-px bg-border/10 border-hairline">
            <div className="bg-background p-4 relative">
              <svg viewBox="0 0 600 720" width="100%" height="100%" style={{ maxHeight: "70vh" }}>
                <rect x="0" y="0" width="600" height="720" fill="#0a0a0a" />
                {ITALY_REGIONS.map((r) => {
                  const tl = projectItaly(r.box[3], r.box[0]);
                  const br = projectItaly(r.box[1], r.box[2]);
                  const w = br.x - tl.x;
                  const h = br.y - tl.y;
                  const count = regionCounts[r.name] || 0;
                  const active = region === r.name;
                  return (
                    <g key={r.name}
                       onClick={() => setRegion(active ? null : r.name)}
                       style={{ cursor: "pointer" }}>
                      <rect x={tl.x} y={tl.y} width={w} height={h}
                        fill={count > 0 ? "hsl(71 100% 47% / 0.18)" : "hsl(0 0% 10%)"}
                        stroke={active ? "hsl(71 100% 47%)" : "rgba(255,255,255,0.08)"}
                        strokeWidth={active ? 1.5 : 0.5} />
                      <text x={tl.x + w / 2} y={tl.y + h / 2} textAnchor="middle"
                        fontSize="9" fontFamily="Space Mono" fill="rgba(255,255,255,0.55)">
                        {r.name}
                      </text>
                      {count > 0 && (
                        <g transform={`translate(${tl.x + w - 12}, ${tl.y + 12})`}>
                          <circle r={9} fill="hsl(71 100% 47%)" />
                          <text textAnchor="middle" y={3} fontSize="10" fontFamily="Space Mono" fontWeight={700} fill="#0a0a0a">{count}</text>
                        </g>
                      )}
                    </g>
                  );
                })}
                {filtered.map((p) => {
                  const { x, y } = projectItaly(p.lat, p.lng);
                  return <circle key={p.id} cx={x} cy={y} r={4} fill={verdictColor(p.verdict_type)} stroke="#000" strokeWidth={1} />;
                })}
              </svg>
            </div>

            <aside className="bg-background p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="section-label">// {region || "TUTTE LE REGIONI"}</div>
                {region && <button onClick={() => setRegion(null)} className="text-xs text-gray-soft hover:text-foreground">reset</button>}
              </div>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {inRegion.length === 0 && <div className="text-gray-soft text-sm">Nessun giocatore.</div>}
                {inRegion.map((p) => (
                  <Link key={p.id} to={`/player?id=${p.id}`} className="block dm-card p-3">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="font-display font-semibold uppercase text-sm truncate">{p.name}</div>
                        <div className="text-xs text-gray-soft truncate">{p.club}</div>
                      </div>
                      <div className="font-mono text-lg text-accent-lime">{p.ratings.overall.toFixed(1)}</div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {p.tags.slice(0, 1).map((t) => <TagPill key={t} tag={t} />)}
                      <VerdictBadge type={p.verdict_type} />
                    </div>
                  </Link>
                ))}
              </div>
            </aside>
          </div>
        )}
      </section>
    </PageShell>
  );
}
