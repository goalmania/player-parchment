import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { usePlayers } from "@/lib/usePlayers";
import { TagPill, VerdictBadge } from "@/components/PlayerCard";
import type { Player } from "@/lib/types";
import { POSITION_CODES, POSITION_LABEL } from "@/lib/types";
import { normalizeClubName, normalizeNationality, isItalian } from "@/lib/geo";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

type View = "world" | "italy";

const verdictColor = (v: Player["verdict_type"]) =>
  v === "buy" ? "#bfff00" : v === "monitor" ? "#ff8a00" : "#888888";

const ITALY_CENTER: [number, number] = [42.5, 12.5];
const WORLD_CENTER: [number, number] = [25, 10];

function makeMarker(p: Player): L.Marker {
  const color = verdictColor(p.verdict_type);
  const icon = L.divIcon({
    className: "dm-marker",
    html: `<span style="
      display:block;width:18px;height:18px;border-radius:50%;
      background:${color};border:2px solid #0a0a0a;
      box-shadow:0 0 0 1px ${color}88;"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
  const m = L.marker([p.lat, p.lng], { icon });
  const popup = `
    <div style="font-family:system-ui;min-width:180px">
      <div style="font-weight:700;text-transform:uppercase;font-size:13px;margin-bottom:2px">${p.name}</div>
      <div style="color:#888;font-size:11px;margin-bottom:6px">${p.club || ""} · ${p.league || ""}</div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-family:monospace;color:${color};font-size:16px">${p.ratings.overall.toFixed(1)}</span>
        <a href="/player?id=${p.id}" style="color:#bfff00;text-decoration:none;font-size:11px">Apri →</a>
      </div>
    </div>`;
  m.bindPopup(popup);
  return m;
}

export default function MapPage() {
  const players = usePlayers();
  const [view, setView] = useState<View>("italy");
  const [filterVerdict, setFilterVerdict] = useState<string>("all");
  const [filterRegion, setFilterRegion] = useState<string>("all");
  const [filterPosition, setFilterPosition] = useState<string>("all");
  const [filterClub, setFilterClub] = useState<string>("all");
  const [filterNationality, setFilterNationality] = useState<string>("all");

  // Pre-compute normalized fields per player (memoized)
  const enriched = useMemo(
    () => players.map((p) => ({
      p,
      clubKey: normalizeClubName(p.club),
      natKey: normalizeNationality(p.nationality),
    })),
    [players]
  );

  const regionOptions = useMemo(
    () => Array.from(new Set(players.map((p) => p.region).filter(Boolean))).sort(),
    [players]
  );
  const clubOptions = useMemo(
    () => Array.from(new Set(enriched.map((e) => e.clubKey).filter(Boolean))).sort(),
    [enriched]
  );
  const nationalityOptions = useMemo(
    () => Array.from(new Set(enriched.map((e) => e.natKey).filter(Boolean))).sort(),
    [enriched]
  );

  const filtered = useMemo(
    () => enriched.filter(({ p, clubKey, natKey }) =>
      Number.isFinite(p.lat) && Number.isFinite(p.lng) &&
      (filterVerdict === "all" || p.verdict_type === filterVerdict) &&
      (filterRegion === "all" || p.region === filterRegion) &&
      (filterPosition === "all" || p.position_code === filterPosition) &&
      (filterClub === "all" || clubKey === filterClub) &&
      (filterNationality === "all" || natKey === filterNationality)
    ).map((e) => e.p),
    [enriched, filterVerdict, filterRegion, filterPosition, filterClub, filterNationality]
  );

  const stats = useMemo(() => {
    const regions = new Set(filtered.map((p) => p.region).filter(Boolean));
    const leagues = new Set(filtered.map((p) => p.league).filter(Boolean));
    return { regions: regions.size, leagues: leagues.size };
  }, [filtered]);

  const resetFilters = () => {
    setFilterVerdict("all"); setFilterRegion("all"); setFilterPosition("all");
    setFilterClub("all"); setFilterNationality("all");
  };

  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const clusterRef = useRef<any>(null);

  // Init map once
  useEffect(() => {
    if (!mapDivRef.current || mapRef.current) return;
    const map = L.map(mapDivRef.current, {
      center: view === "italy" ? ITALY_CENTER : WORLD_CENTER,
      zoom: view === "italy" ? 6 : 2,
      worldCopyJump: true,
      preferCanvas: true,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: "abcd",
    }).addTo(map);

    const cluster = (L as any).markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
      iconCreateFunction: (c: any) => {
        const count = c.getChildCount();
        const size = count < 10 ? 36 : count < 50 ? 44 : 54;
        return L.divIcon({
          html: `<div style="
            width:${size}px;height:${size}px;border-radius:50%;
            background:rgba(191,255,0,0.85);color:#0a0a0a;
            display:flex;align-items:center;justify-content:center;
            font-family:'Space Mono',monospace;font-weight:700;font-size:13px;
            border:2px solid #0a0a0a;box-shadow:0 0 0 2px rgba(191,255,0,0.35);
          ">${count}</div>`,
          className: "dm-cluster",
          iconSize: [size, size],
        });
      },
    });
    map.addLayer(cluster);
    mapRef.current = map;
    clusterRef.current = cluster;

    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapRef.current = null;
      clusterRef.current = null;
    };
  }, []);

  // Switch view: re-center & zoom
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    if (view === "italy") m.setView(ITALY_CENTER, 6);
    else m.setView(WORLD_CENTER, 2);
    setTimeout(() => m.invalidateSize(), 50);
  }, [view]);

  // Sync markers
  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;
    cluster.clearLayers();
    const markers = filtered.map(makeMarker);
    if (markers.length) cluster.addLayers(markers);
  }, [filtered]);

  return (
    <PageShell>
      <section className="container py-10">
        <div className="section-label mb-3">// MAPPA GEOGRAFICA</div>
        <h1 className="font-display font-black uppercase text-4xl md:text-5xl mb-2">Distribuzione Profili</h1>
        <p className="text-gray-soft mb-6">{filtered.length} giocatori · {stats.regions} regioni · {stats.leagues} campionati</p>

        <div className="border-hairline p-3 mb-4 space-y-3 bg-gray-light/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex border-hairline">
              <button onClick={() => setView("italy")} className={`px-4 py-2 font-mono text-xs uppercase tracking-[0.12rem] ${view === "italy" ? "bg-accent text-background" : "text-gray-soft"}`}>🇮🇹 Italia</button>
              <button onClick={() => setView("world")} className={`px-4 py-2 font-mono text-xs uppercase tracking-[0.12rem] ${view === "world" ? "bg-accent text-background" : "text-gray-soft"}`}>🌍 Mondo</button>
            </div>
            <button onClick={resetFilters} className="dm-btn-outline !py-1.5 !px-3 text-xs">↺ Reset filtri</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <label className="block">
              <span className="text-[0.6rem] font-mono uppercase tracking-[0.12rem] text-gray-soft mb-1 block">Verdetto</span>
              <select className="dm-input" value={filterVerdict} onChange={(e) => setFilterVerdict(e.target.value)}>
                <option value="all">Tutti</option>
                <option value="buy">BUY</option>
                <option value="monitor">MONITOR</option>
                <option value="pass">PASS</option>
              </select>
            </label>
            <label className="block">
              <span className="text-[0.6rem] font-mono uppercase tracking-[0.12rem] text-gray-soft mb-1 block">Regione</span>
              <select className="dm-input" value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)}>
                <option value="all">Tutte le regioni</option>
                {regionOptions.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-[0.6rem] font-mono uppercase tracking-[0.12rem] text-gray-soft mb-1 block">Ruolo</span>
              <select className="dm-input" value={filterPosition} onChange={(e) => setFilterPosition(e.target.value)}>
                <option value="all">Tutti i ruoli</option>
                {POSITION_CODES.map((c) => <option key={c} value={c}>{c} · {POSITION_LABEL[c]}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-[0.6rem] font-mono uppercase tracking-[0.12rem] text-gray-soft mb-1 block">Club</span>
              <select className="dm-input" value={filterClub} onChange={(e) => setFilterClub(e.target.value)}>
                <option value="all">Tutti i club</option>
                {clubOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-[0.6rem] font-mono uppercase tracking-[0.12rem] text-gray-soft mb-1 block">Nazionalità</span>
              <select className="dm-input" value={filterNationality} onChange={(e) => setFilterNationality(e.target.value)}>
                <option value="all">Tutte</option>
                {nationalityOptions.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-px bg-border/10 border-hairline">
          <div className="bg-background p-2">
            <div
              ref={mapDivRef}
              className="w-full"
              style={{ height: "min(72vh, 720px)", background: "#0a0a0a" }}
            />
            <div className="border-hairline-t mt-3 pt-3 px-2">
              <div className="section-label mb-2">// LEGENDA</div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-mono text-gray-soft">
                {[["BUY", "#bfff00"], ["MONITOR", "#ff8a00"], ["PASS", "#888888"]].map(([l, c]) => (
                  <span key={l} className="flex items-center gap-2">
                    <span style={{ width: 12, height: 12, background: c, display: "inline-block", borderRadius: "50%", border: "2px solid #0a0a0a" }} />
                    <span className="text-foreground">{l}</span>
                  </span>
                ))}
                <span className="flex items-center gap-2">
                  <span style={{ width: 18, height: 18, background: "rgba(191,255,0,0.85)", display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", border: "2px solid #0a0a0a", color: "#0a0a0a", fontSize: 9, fontWeight: 700 }}>N</span>
                  <span>Cluster (zoom per espandere)</span>
                </span>
                <span className="ml-auto">{filtered.length} marker visibili</span>
              </div>
            </div>
          </div>

          <aside className="bg-background p-4">
            <div className="section-label mb-3">// LISTA</div>
            <div className="space-y-2 max-h-[68vh] overflow-y-auto pr-1">
              {filtered.length === 0 && <div className="text-gray-soft text-sm">Nessun giocatore con coordinate.</div>}
              {filtered.map((p) => (
                <Link
                  key={p.id}
                  to={`/player?id=${p.id}`}
                  className="block dm-card p-3"
                  onMouseEnter={() => mapRef.current?.flyTo([p.lat, p.lng], Math.max(mapRef.current.getZoom(), 8), { duration: 0.5 })}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="font-display font-semibold uppercase text-sm truncate">{p.name}</div>
                      <div className="text-xs text-gray-soft truncate">{p.club}{isItalian(p.nationality) && p.region ? ` · ${p.region}` : ""}</div>
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
      </section>
    </PageShell>
  );
}
