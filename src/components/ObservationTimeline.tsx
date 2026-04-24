import type { Observation } from "@/lib/types";
import { useMemo } from "react";

interface Props {
  observations: Observation[];
}

/**
 * Compact SVG timeline of overall ratings across observations.
 * Renders a min-max normalised line + markers + textual log below.
 */
export default function ObservationTimeline({ observations }: Props) {
  const sorted = useMemo(
    () => [...observations].sort((a, b) => a.date.localeCompare(b.date)),
    [observations],
  );

  if (sorted.length === 0) {
    return (
      <div className="text-sm text-gray-soft italic">
        Nessuna osservazione registrata.
      </div>
    );
  }

  const W = 600;
  const H = 140;
  const padX = 30;
  const padY = 18;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;

  const overallVals = sorted.map((o) => o.overall);
  const min = Math.min(...overallVals, 0);
  const max = Math.max(...overallVals, 10);
  const span = Math.max(0.1, max - min);

  const points = sorted.map((o, i) => {
    const x = padX + (sorted.length === 1 ? innerW / 2 : (i / (sorted.length - 1)) * innerW);
    const y = padY + innerH - ((o.overall - min) / span) * innerH;
    return { x, y, o };
  });

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  return (
    <div className="space-y-4">
      <div className="bg-gray-light/40 border-hairline p-3">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
          {/* baseline */}
          <line x1={padX} x2={W - padX} y1={H - padY} y2={H - padY}
                stroke="hsl(var(--border))" strokeWidth={0.5} />
          {/* line */}
          {points.length > 1 && (
            <path d={path} fill="none" stroke="hsl(var(--accent))" strokeWidth={1.5} />
          )}
          {/* markers */}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={4} fill="hsl(var(--accent))" />
              <text x={p.x} y={p.y - 8} textAnchor="middle"
                    fontSize="10" fontFamily="monospace"
                    fill="hsl(var(--accent))">
                {p.o.overall.toFixed(1)}
              </text>
              <text x={p.x} y={H - 4} textAnchor="middle"
                    fontSize="9" fontFamily="monospace"
                    fill="hsl(var(--muted-foreground))">
                {p.o.date.slice(5)}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <ol className="space-y-3">
        {[...sorted].reverse().map((o, i) => {
          const idx = sorted.length - 1 - i;
          const prev = idx > 0 ? sorted[idx - 1] : null;
          const delta = prev ? +(o.overall - prev.overall).toFixed(2) : 0;
          const deltaColor =
            delta > 0 ? "text-accent-lime" :
            delta < 0 ? "text-[hsl(var(--red))]" : "text-gray-soft";
          return (
            <li key={`${o.date}-${i}`} className="border-hairline-l pl-4 py-1">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <span className="font-mono text-xs text-gray-soft">{o.date}</span>
                <span className="font-display font-semibold uppercase text-sm">
                  Overall {o.overall.toFixed(1)}
                </span>
                {prev && (
                  <span className={`font-mono text-xs ${deltaColor}`}>
                    {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}
                  </span>
                )}
                <span className="font-mono text-[0.6rem] uppercase tracking-[0.12rem] text-gray-soft">
                  {o.type}
                </span>
              </div>
              <div className="text-sm text-foreground/80">{o.note}</div>
              <div className="mt-1 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-0.5 text-[0.7rem] font-mono text-gray-soft">
                <span>TEC {o.ratings.technical.toFixed(1)}</span>
                <span>TAT {o.ratings.tactical.toFixed(1)}</span>
                <span>FIS {o.ratings.physical.toFixed(1)}</span>
                <span>MEN {o.ratings.mental.toFixed(1)}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
