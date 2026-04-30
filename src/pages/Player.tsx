import { Link, useNavigate, useSearchParams } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { usePlayers } from "@/lib/usePlayers";
import { getPlayer, savePlayer, setCompareSeed } from "@/lib/storage";
import Stars from "@/components/Stars";
import { TagPill, VerdictBadge } from "@/components/PlayerCard";
import Pitch from "@/components/Pitch";
import RadarChart from "@/components/RadarChart";
import HeatmapEditor from "@/components/HeatmapEditor";
import ObservationTimeline from "@/components/ObservationTimeline";
import ObservationForm from "@/components/ObservationForm";
import SimilarPlayers from "@/components/SimilarPlayers";
import ShortlistButton from "@/components/ShortlistButton";
import VideoGallery from "@/components/VideoGallery";
import StatsDisplay from "@/components/StatsDisplay";
import { buildShareLink } from "@/lib/share";
import { playerToCsv, downloadCsv, safeFilename } from "@/lib/csvExport";
import { useAuth } from "@/lib/auth";
import type { Observation } from "@/lib/types";
import { toast } from "sonner";

export default function Player() {
  const [params] = useSearchParams();
  const id = params.get("id") || "";
  const players = usePlayers();
  const player = getPlayer(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOwner = !!player && !!user && player.owner_id === user.id;

  if (!player) {
    return (
      <PageShell>
        <div className="container py-24">
          <div className="dm-card p-10 max-w-xl mx-auto text-center">
            <div className="section-label mb-3">// 404</div>
            <h2 className="font-display font-bold text-3xl uppercase mb-3">Giocatore non trovato</h2>
            <p className="text-gray-soft mb-6">Il profilo richiesto non esiste o è stato rimosso.</p>
            <Link to="/database" className="dm-btn-primary">← Torna al Database</Link>
          </div>
        </div>
      </PageShell>
    );
  }

  const idx = players.findIndex((p) => p.id === player.id);
  const prev = players[idx - 1];
  const next = players[idx + 1];

  const fitColor = (s: number) =>
    s >= 80 ? "hsl(var(--accent))" : s >= 60 ? "hsl(var(--orange))" : "hsl(var(--red))";

  const radarValues = [
    player.ratings.technical,
    player.ratings.tactical,
    player.ratings.physical,
    player.ratings.mental,
    player.skills.decision_making / 10,
    player.stars.potential * 2,
  ];

  const skillsLeft = [
    ["Ball Control", player.skills.ball_control],
    ["Passaggio", player.skills.passing],
    ["Dribbling", player.skills.dribbling],
    ["Finalizzazione", player.skills.finishing],
    ["Intelligenza Tattica", player.skills.tactical_iq],
  ] as const;
  const skillsRight = [
    ["Lavoro Difensivo", player.skills.defensive_work],
    ["Gioco Aereo", player.skills.aerial],
    ["Velocità", player.skills.pace],
    ["Resistenza", player.skills.stamina],
    ["Decision Making", player.skills.decision_making],
  ] as const;

  const verdictBox =
    player.verdict_type === "buy"
      ? { border: "hsl(var(--accent))", bg: "hsl(var(--accent) / 0.08)", text: "hsl(var(--accent))", label: "VERDETTO: BUY" }
      : player.verdict_type === "monitor"
      ? { border: "hsl(var(--orange))", bg: "hsl(var(--orange) / 0.08)", text: "hsl(var(--orange))", label: "VERDETTO: MONITOR" }
      : { border: "hsl(var(--red))", bg: "hsl(var(--red) / 0.08)", text: "hsl(var(--red))", label: "VERDETTO: PASS" };

  const starItems = [
    ["Tecnica", player.stars.technique],
    ["Atletismo", player.stars.athleticism],
    ["Mentalità", player.stars.mentality],
    ["Potenziale", player.stars.potential],
    ["Valore di Mercato", player.stars.market_value],
  ] as const;

  return (
    <PageShell>
      {/* Header */}
      <section className="container pt-10 pb-8">
        <div className="section-label mb-4">// SCHEDA GIOCATORE · #{player.num}</div>
        <div className="grid md:grid-cols-[auto_1fr_auto] gap-6 items-end">
          {player.photo ? (
            <img src={player.photo} alt={player.name}
              className="w-[120px] h-[120px] object-cover border-hairline" />
          ) : (
            <div className="w-[120px] h-[120px] border-hairline bg-gray-light flex items-center justify-center font-display font-black text-4xl text-accent-lime">
              {player.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
            </div>
          )}
          <div>
            <h1 className="font-display font-black uppercase leading-[0.95] mb-2"
                style={{ fontSize: "clamp(2.25rem, 6vw, 5rem)" }}>{player.name}</h1>
            <div className="text-gray-soft mb-3">
              {player.flag} {player.nationality} · {player.club} · {player.league} · {player.birth_year}
            </div>
            <div className="flex flex-wrap gap-2">
              {player.tags.map((t) => <TagPill key={t} tag={t} />)}
              <VerdictBadge type={player.verdict_type} />
            </div>
          </div>
          <div className="text-right">
            <div className="section-label mb-1">// OVERALL</div>
            <div className="font-mono text-accent-lime leading-none" style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}>
              {player.ratings.overall.toFixed(1)}
            </div>
          </div>
        </div>
      </section>

      {/* Pitch + Tactical roles */}
      <section className="container pb-10 grid lg:grid-cols-2 gap-px bg-border/10 border-hairline">
        <div className="bg-background p-6">
          <div className="section-label mb-4">// POSIZIONE IN CAMPO</div>
          <Pitch player={player} />
          <div className="mt-3 flex flex-wrap gap-3 text-xs font-mono text-gray-soft">
            <span className="flex items-center gap-2"><span style={{ width:10, height:10, background:"hsl(var(--accent))", display:"inline-block", borderRadius:"50%" }} />Principale</span>
            <span className="flex items-center gap-2"><span style={{ width:10, height:10, background:"hsl(var(--accent) / 0.35)", border:"1px solid hsl(var(--accent) / 0.5)", display:"inline-block", borderRadius:"50%" }} />Secondaria</span>
          </div>
        </div>

        <div className="bg-background p-6">
          <div className="section-label mb-4">// RUOLI TATTICI</div>
          <div className="space-y-5">
            {player.tactical_roles.map((r, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs px-2 py-1 bg-gray-light border-hairline">{r.formation}</span>
                    <span className="font-display font-semibold uppercase">{r.role}</span>
                  </div>
                  <span className="font-mono" style={{ color: fitColor(r.fit_score) }}>{r.fit_score}%</span>
                </div>
                <div className="skill-bar">
                  <span style={{ width: `${r.fit_score}%`, background: fitColor(r.fit_score) }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Radar + Info grid */}
      <section className="container pb-10 grid lg:grid-cols-[1fr_1fr] gap-px bg-border/10 border-hairline">
        <div className="bg-background p-6 flex flex-col items-center">
          <div className="section-label self-start mb-4">// RADAR</div>
          <RadarChart
            axes={["Tecnica", "Tattica", "Fisico", "Mentalità", "Decisioni", "Potenziale"]}
            values={radarValues}
            size={380}
          />
        </div>
        <div className="bg-background p-6">
          <div className="section-label mb-4">// SCHEDA</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border/10 border-hairline">
            {[
              ["Età", player.age],
              ["Piede", player.foot],
              ["Altezza", `${player.height} cm`],
              ["Peso", `${player.weight} kg`],
              ["Osservazioni", player.observation_count],
              ["Tipo Obs", player.observation_type],
              ["Categoria", player.league],
              ["Nazionalità", `${player.flag} ${player.nationality}`],
            ].map(([k, v], i) => (
              <div key={i} className="bg-background p-3">
                <div className="text-[0.6rem] font-mono uppercase tracking-[0.12rem] text-gray-soft mb-1">{k}</div>
                <div className="font-display font-semibold text-sm truncate">{v}</div>
              </div>
            ))}
          </div>

          <div className="section-label mt-8 mb-4">// VALUTAZIONE A STELLE</div>
          <div className="space-y-2">
            {starItems.map(([label, v]) => (
              <div key={label} className="flex items-center justify-between border-hairline-b pb-2">
                <span className="font-display font-semibold uppercase text-sm">{label}</span>
                <div className="flex items-center gap-3">
                  <Stars value={v} />
                  <span className="font-mono text-xs text-gray-soft">{v}/5</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Skills bars */}
      <section className="container pb-10">
        <div className="section-label mb-4">// ABILITÀ TECNICHE</div>
        <div className="grid md:grid-cols-2 gap-x-10 gap-y-4">
          {[...skillsLeft, ...skillsRight].map(([label, v]) => (
            <div key={label}>
              <div className="flex justify-between mb-1.5">
                <span className="font-display font-semibold uppercase text-sm">{label}</span>
                <span className="font-mono text-xs text-accent-lime">{v}</span>
              </div>
              <div className="skill-bar"><span style={{ width: `${v}%` }} /></div>
            </div>
          ))}
        </div>
      </section>

      {/* Statistiche */}
      {player.stats && Object.keys(player.stats).length > 0 && (
        <section className="container pb-10">
          <div className="section-label mb-3">// STATISTICHE STAGIONALI</div>
          <StatsDisplay stats={player.stats} source={player.stats_source} season={player.stats_season} />
        </section>
      )}

      {/* Analisi */}
      <section className="container pb-10 grid lg:grid-cols-3 gap-px bg-border/10 border-hairline">
        <div className="bg-background p-6 lg:col-span-1">
          <div className="section-label mb-3">// SUMMARY</div>
          <p className="text-foreground/90 leading-relaxed">{player.summary}</p>
        </div>
        <div className="bg-background p-6">
          <div className="section-label mb-4">// PUNTI DI FORZA</div>
          <ul className="space-y-2">
            {player.strengths.map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-2 inline-block" style={{ width:6, height:6, background:"hsl(var(--accent))", borderRadius:"50%" }} />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-background p-6">
          <div className="section-label mb-4">// AREE DI MIGLIORAMENTO</div>
          <ul className="space-y-2">
            {player.weaknesses.map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-2 inline-block" style={{ width:6, height:6, background:"hsl(var(--red))", borderRadius:"50%" }} />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Mercato */}
      <section className="container pb-10">
        <div className="section-label mb-3">// MERCATO</div>
        <div className="bg-gray-light p-6" style={{ border: "0.5px solid hsl(var(--accent2) / 0.5)" }}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-px bg-border/10">
            {[
              ["Valore", `€${player.market.value_min.toLocaleString("it-IT")} – €${player.market.value_max.toLocaleString("it-IT")}`],
              ["Potenziale", player.market.potential],
              ["Rischio", player.market.risk],
              ["Timeline", player.market.timeline],
              ["Pronta inseribilità", player.market.ready_level],
            ].map(([k, v]) => (
              <div key={k} className="bg-gray-light p-4">
                <div className="text-[0.6rem] font-mono uppercase tracking-[0.12rem] text-gray-soft mb-1.5">{k}</div>
                <div className="font-display font-semibold uppercase text-sm">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Verdetto */}
      <section className="container pb-10">
        <div
          className="p-6"
          style={{
            borderLeft: `4px solid ${verdictBox.border}`,
            background: verdictBox.bg,
          }}
        >
          <div className="font-mono text-xs uppercase tracking-[0.18rem] mb-3" style={{ color: verdictBox.text }}>
            {verdictBox.label}
          </div>
          <p className="text-foreground/95 leading-relaxed">{player.verdict}</p>
        </div>
      </section>

      {/* Heatmap */}
      {player.heatmap && player.heatmap.length > 0 && (
        <section className="container pb-10">
          <div className="section-label mb-3">// MAPPA DI CALORE</div>
          <div className="grid lg:grid-cols-[420px_1fr] gap-6 items-start">
            <HeatmapEditor value={player.heatmap} readOnly height={460} />
            <div className="text-sm text-gray-soft space-y-2">
              <p>Zone in cui il giocatore opera con maggiore frequenza, dedotte dalle osservazioni.</p>
              <p>Vista <strong className="text-foreground">top-down</strong>: porta avversaria in alto, propria in basso.</p>
              <p>Modificabile dalla scheda di <Link to={`/edit-report?id=${player.id}`} className="text-accent-lime">modifica report</Link>.</p>
            </div>
          </div>
        </section>
      )}

      {/* Timeline osservazioni */}
      <section className="container pb-10">
        <div className="section-label mb-3">// TIMELINE OSSERVAZIONI</div>
        <ObservationTimeline observations={player.observations || []} />
        {isOwner && (
          <div className="mt-6">
            <div className="section-label mb-3">// NUOVA OSSERVAZIONE</div>
            <ObservationForm
              defaultRatings={{
                technical: player.ratings.technical,
                tactical: player.ratings.tactical,
                physical: player.ratings.physical,
                mental: player.ratings.mental,
              }}
              onAdd={async (obs: Observation) => {
                const next = {
                  ...player,
                  observations: [...(player.observations || []), obs],
                  observation_count: (player.observation_count || 0) + 1,
                  date: obs.date,
                  ratings: { ...player.ratings, ...obs.ratings, overall: obs.overall },
                };
                try {
                  await savePlayer(next);
                  toast.success("Osservazione aggiunta ✓");
                } catch (e: any) { toast.error(e?.message || "Errore"); }
              }}
            />
          </div>
        )}
      </section>

      {/* Video gallery */}
      {((player.videos && player.videos.length > 0) || player.video_url) && (
        <section className="container pb-10">
          <div className="section-label mb-3">// VIDEO</div>
          <VideoGallery
            videos={
              player.videos && player.videos.length > 0
                ? player.videos
                : [{ url: player.video_url!, kind: "external" as const }]
            }
          />
        </section>
      )}

      {/* Similar players */}
      <section className="container pb-10">
        <div className="section-label mb-3">// PROFILI SIMILI · TACTICAL DNA</div>
        <SimilarPlayers target={player} pool={players} />
      </section>

      <section className="container pb-16 flex flex-wrap items-center justify-between gap-3">
        <Link to="/database" className="dm-btn-outline">← Database</Link>
        <div className="flex flex-wrap gap-2">
          <ShortlistButton id={player.id} />
          <button
            onClick={() => {
              const url = buildShareLink(player);
              navigator.clipboard?.writeText(url).then(
                () => toast.success("Link condivisibile copiato ✓ (contiene il profilo completo)"),
                () => toast.error("Impossibile copiare il link"),
              );
            }}
            className="dm-btn-outline"
            title="Genera un link autonomo che chiunque può aprire senza accesso"
          >🔗 Condividi</button>
          <button
            onClick={() => window.open(`/player-print?id=${player.id}`, "_blank", "noopener")}
            className="dm-btn-outline"
          >⬇ Scarica PDF</button>
          <button
            onClick={() => {
              try {
                const csv = playerToCsv(player);
                downloadCsv(`dmscout-${safeFilename(player.name)}.csv`, csv);
                toast.success("CSV esportato ✓");
              } catch (e: any) {
                toast.error(e?.message || "Esportazione CSV fallita");
              }
            }}
            className="dm-btn-outline"
            title="Esporta scheda completa, statistiche e verdetto in CSV"
          >📊 Esporta CSV</button>
          <Link to={`/edit-report?id=${player.id}`} className="dm-btn-outline">✏ Modifica</Link>
          <button
            onClick={() => { setCompareSeed(player.id); navigate("/compare"); }}
            className="dm-btn-outline"
          >⚡ Confronta</button>
          {prev && <Link to={`/player?id=${prev.id}`} className="dm-btn-outline">← Prev</Link>}
          {next && <Link to={`/player?id=${next.id}`} className="dm-btn-primary">Next →</Link>}
        </div>
      </section>
    </PageShell>
  );
}
