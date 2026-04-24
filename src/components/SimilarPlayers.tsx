import { Link } from "react-router-dom";
import { findSimilar } from "@/lib/similarity";
import type { Player } from "@/lib/types";

export default function SimilarPlayers({ target, pool }: { target: Player; pool: Player[] }) {
  const list = findSimilar(target, pool, 5);
  if (list.length === 0) {
    return <div className="text-gray-soft text-sm">Aggiungi più giocatori per attivare il motore di similarità.</div>;
  }
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-px bg-border/10 border-hairline">
      {list.map(({ player, score }) => (
        <Link
          key={player.id}
          to={`/player?id=${player.id}`}
          className="bg-background p-4 hover:bg-gray-light transition-colors flex flex-col gap-2"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-gray-soft">#{player.num}</span>
            <span className="font-mono text-xs text-accent-lime">{score}%</span>
          </div>
          <div className="font-display font-bold uppercase text-sm leading-tight">{player.name}</div>
          <div className="text-xs text-gray-soft">{player.position_code} · {player.club}</div>
          <div className="skill-bar mt-auto"><span style={{ width: `${score}%` }} /></div>
        </Link>
      ))}
    </div>
  );
}
