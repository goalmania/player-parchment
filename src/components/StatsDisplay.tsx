import { STATS_GROUPS } from "@/lib/types";
import type { PlayerStats } from "@/lib/types";

interface Props {
  stats: PlayerStats;
  source?: string;
  season?: string;
}

export default function StatsDisplay({ stats, source, season }: Props) {
  const hasAny = Object.values(stats || {}).some((v) => v !== undefined && v !== null);
  if (!hasAny) return null;

  return (
    <div className="space-y-6">
      {(season || source) && (
        <div className="flex flex-wrap gap-3 text-xs font-mono text-gray-soft">
          {season && <span>Stagione <span className="text-foreground">{season}</span></span>}
          {source && <span>Fonte <span className="text-foreground">{source}</span></span>}
        </div>
      )}
      {STATS_GROUPS.map((group) => {
        const cells = group.fields.filter(({ k }) => stats[k] !== undefined && stats[k] !== null);
        if (cells.length === 0) return null;
        return (
          <div key={group.key}>
            <div className="section-label mb-2">// {group.label.toUpperCase()}</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-px bg-border/10 border-hairline">
              {cells.map(({ k, label, unit }) => (
                <div key={k as string} className="bg-background p-3">
                  <div className="text-[0.6rem] font-mono uppercase tracking-[0.12rem] text-gray-soft mb-1">{label}</div>
                  <div className="font-mono text-lg text-accent-lime">
                    {stats[k]}<span className="text-gray-soft text-xs ml-1">{unit || ""}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
