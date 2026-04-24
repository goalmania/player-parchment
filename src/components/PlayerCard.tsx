import { Link } from "react-router-dom";
import type { Player } from "@/lib/types";
import Stars from "./Stars";
import ShortlistButton from "./ShortlistButton";

const tagTone: Record<string, "accent" | "orange" | "red" | "teal"> = {
  "HIGH POTENTIAL": "accent",
  "TOP PROSPECT": "accent",
  "READY": "teal",
  "LOW COST": "teal",
  "MONITOR": "orange",
  "RISKY": "red",
};

export function TagPill({ tag }: { tag: string }) {
  return <span className="tag-pill" data-tone={tagTone[tag] || "accent"}>{tag}</span>;
}

export function VerdictBadge({ type }: { type: Player["verdict_type"] }) {
  const label = type === "buy" ? "BUY" : type === "monitor" ? "MONITOR" : "PASS";
  return <span className="verdict-badge" data-type={type}>{label}</span>;
}

export function MiniBar({ label, value, max = 10 }: { label: string; value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex justify-between text-[0.65rem] font-mono uppercase tracking-[0.12rem] text-gray-soft mb-1">
        <span>{label}</span>
        <span className="text-foreground">{value.toFixed(1)}</span>
      </div>
      <div className="skill-bar"><span style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export default function PlayerCard({ p, delay = 0 }: { p: Player; delay?: number }) {
  return (
    <Link
      to={`/player?id=${p.id}`}
      className="dm-card p-5 block anim-fade-up"
      style={{ animationDelay: `${delay * 40}ms` }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="font-mono text-xs text-gray-soft">#{p.num}</span>
        <div className="flex flex-wrap items-center gap-1.5 justify-end">
          {p.tags.slice(0, 2).map((t) => <TagPill key={t} tag={t} />)}
          <VerdictBadge type={p.verdict_type} />
        </div>
      </div>

      <h3 className="font-display font-extrabold text-2xl uppercase leading-none mb-1">{p.name}</h3>
      <div className="text-sm text-gray-soft mb-1">{p.club}</div>
      <div className="text-xs text-gray-soft mb-4">{p.flag} {p.position_main} · {p.birth_year}</div>

      <div className="flex items-end justify-between mb-4">
        <div>
          <div className="section-label">Overall</div>
          <div className="font-mono text-4xl text-accent-lime leading-none">{p.ratings.overall.toFixed(1)}</div>
        </div>
        <Stars value={p.stars.potential} size={14} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <MiniBar label="Tecnica" value={p.ratings.technical} />
        <MiniBar label="Tattica" value={p.ratings.tactical} />
        <MiniBar label="Fisico" value={p.ratings.physical} />
        <MiniBar label="Mentalità" value={p.ratings.mental} />
      </div>

      <div className="flex items-center justify-between border-hairline-t pt-3 text-[0.65rem] font-mono uppercase tracking-[0.12rem] text-gray-soft gap-2">
        <span className="truncate">{p.observation_type} · {p.date}</span>
        <ShortlistButton id={p.id} />
      </div>
    </Link>
  );
}
