import type { Player } from "@/lib/types";
import { PITCH_COORDS } from "@/lib/types";

interface Props {
  player?: Player | null;
  pairs?: { player: Player; color: string; initials: string }[];
  height?: number;
}

export default function Pitch({ player, pairs, height = 320 }: Props) {
  const stroke = "rgba(255,255,255,0.3)";
  const grass = "#0e1f0e";

  return (
    <svg viewBox="0 0 400 300" width="100%" height={height} preserveAspectRatio="xMidYMid meet" style={{ background: grass }}>
      {/* Touchlines */}
      <rect x="10" y="10" width="380" height="280" fill="none" stroke={stroke} strokeWidth={1} />
      <line x1="200" y1="10" x2="200" y2="290" stroke={stroke} strokeWidth={1} />
      <circle cx="200" cy="150" r="40" fill="none" stroke={stroke} strokeWidth={1} />
      <circle cx="200" cy="150" r="2" fill={stroke} />
      {/* Penalty areas */}
      <rect x="10" y="80" width="60" height="140" fill="none" stroke={stroke} strokeWidth={1} />
      <rect x="330" y="80" width="60" height="140" fill="none" stroke={stroke} strokeWidth={1} />
      {/* Goal areas */}
      <rect x="10" y="115" width="25" height="70" fill="none" stroke={stroke} strokeWidth={1} />
      <rect x="365" y="115" width="25" height="70" fill="none" stroke={stroke} strokeWidth={1} />

      {/* Single-player markers */}
      {player && (
        <>
          {player.position_secondary?.map((sec, i) => {
            // Find a code matching by label-ish; if not found, skip
            const codeEntry = Object.entries({
              Portiere: "GK", "Difensore Centrale": "CB", "Terzino Sinistro": "LB", "Terzino Destro": "RB",
              Mediano: "CDM", Mezzala: "CM", Trequartista: "CAM",
              "Ala Sinistra": "LW", "Ala Destra": "RW", "Prima Punta": "ST", "Seconda Punta": "CF",
            }).find(([k]) => sec.includes(k));
            if (!codeEntry) return null;
            const c = PITCH_COORDS[codeEntry[1] as keyof typeof PITCH_COORDS];
            return (
              <circle key={i} cx={c.x} cy={c.y} r={9}
                fill="hsl(var(--accent))" fillOpacity={0.35}
                stroke="hsl(var(--accent))" strokeOpacity={0.5} strokeWidth={1} />
            );
          })}
          {(() => {
            const c = PITCH_COORDS[player.position_code];
            if (!c) return null;
            return (
              <g>
                <circle cx={c.x} cy={c.y} r={20} fill="hsl(var(--accent))" opacity={0.18}>
                  <animate attributeName="r" values="14;22;14" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle cx={c.x} cy={c.y} r={14} fill="hsl(var(--accent))" stroke="white" strokeWidth={2} />
                <text x={c.x} y={c.y + 4} textAnchor="middle" fontSize="10" fontFamily="Space Mono" fontWeight={700} fill="hsl(var(--background))">
                  {player.position_code}
                </text>
              </g>
            );
          })()}
        </>
      )}

      {/* Pair compare markers */}
      {pairs?.map((pp, i) => {
        const c = PITCH_COORDS[pp.player.position_code];
        if (!c) return null;
        const offset = (i - (pairs.length - 1) / 2) * 22;
        return (
          <g key={pp.player.id}>
            <circle cx={c.x + offset} cy={c.y} r={14} fill={pp.color} stroke="white" strokeWidth={1.5} />
            <text x={c.x + offset} y={c.y + 4} textAnchor="middle" fontSize="9" fontFamily="Space Mono" fontWeight={700} fill="hsl(var(--background))">
              {pp.initials}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
