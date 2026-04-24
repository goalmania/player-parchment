import { useCallback, useRef, useState } from "react";
import {
  HEATMAP_COLS,
  HEATMAP_ROWS,
  HEATMAP_SIZE,
  emptyHeatmap,
  type Heatmap,
} from "@/lib/types";

interface Props {
  value?: Heatmap;
  onChange?: (next: Heatmap) => void;
  readOnly?: boolean;
  height?: number;
  /** Show editing toolbar when not readOnly */
  showToolbar?: boolean;
}

const VIEW_W = 400;
const VIEW_H = 600;
const CELL_W = VIEW_W / HEATMAP_COLS;
const CELL_H = VIEW_H / HEATMAP_ROWS;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function colorFor(intensity: number): string {
  // 0 -> transparent. 1..100 -> green to yellow to red blend with lime accent base.
  if (intensity <= 0) return "rgba(0,0,0,0)";
  const i = clamp(intensity, 0, 100) / 100;
  // hue from 200 (cool blue, low) -> 71 (lime) -> 12 (red, hot)
  const hue = 200 - 188 * i;
  const sat = 90;
  const light = 50;
  const alpha = 0.25 + i * 0.55;
  return `hsla(${hue.toFixed(0)}, ${sat}%, ${light}%, ${alpha.toFixed(2)})`;
}

/**
 * Editor + viewer for a 6x10 player heatmap painted on a top-down pitch.
 * - Click or drag to add intensity (brush mode).
 * - Right-click or "Cancella" to clear cells.
 * - readOnly disables interaction.
 */
export default function HeatmapEditor({
  value,
  onChange,
  readOnly = false,
  height = 380,
  showToolbar = true,
}: Props) {
  const data = value && value.length === HEATMAP_SIZE ? value : emptyHeatmap();
  const svgRef = useRef<SVGSVGElement>(null);
  const [isPainting, setIsPainting] = useState(false);
  const [intensity, setIntensity] = useState(70);
  const [erasing, setErasing] = useState(false);

  const paintAt = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * VIEW_W;
      const y = ((clientY - rect.top) / rect.height) * VIEW_H;
      const col = clamp(Math.floor(x / CELL_W), 0, HEATMAP_COLS - 1);
      const row = clamp(Math.floor(y / CELL_H), 0, HEATMAP_ROWS - 1);
      const idx = row * HEATMAP_COLS + col;
      const next = [...data];
      if (erasing) {
        next[idx] = 0;
      } else {
        // Additive painting capped at intensity, plus light bleed on neighbors.
        next[idx] = clamp(Math.max(next[idx], intensity), 0, 100);
        const neighbors = [
          [row - 1, col],
          [row + 1, col],
          [row, col - 1],
          [row, col + 1],
        ];
        for (const [r, c] of neighbors) {
          if (r >= 0 && r < HEATMAP_ROWS && c >= 0 && c < HEATMAP_COLS) {
            const nIdx = r * HEATMAP_COLS + c;
            next[nIdx] = clamp(Math.max(next[nIdx], intensity * 0.4), 0, 100);
          }
        }
      }
      onChange?.(next);
    },
    [data, intensity, erasing, onChange],
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    if (readOnly) return;
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    setIsPainting(true);
    paintAt(e.clientX, e.clientY);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (readOnly || !isPainting) return;
    paintAt(e.clientX, e.clientY);
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    if (readOnly) return;
    setIsPainting(false);
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
  };

  const clearAll = () => onChange?.(emptyHeatmap());

  return (
    <div>
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: (height * VIEW_W) / VIEW_H,
          margin: "0 auto",
          aspectRatio: `${VIEW_W} / ${VIEW_H}`,
        }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          width="100%"
          height="100%"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            display: "block",
            background: "hsl(120, 30%, 8%)",
            border: "0.5px solid hsl(0 0% 100% / 0.08)",
            cursor: readOnly ? "default" : erasing ? "cell" : "crosshair",
            touchAction: "none",
            userSelect: "none",
          }}
        >
          {/* Pitch lines (top-down) */}
          <g stroke="hsl(120 25% 60% / 0.55)" strokeWidth={1.2} fill="none">
            <rect x={6} y={6} width={VIEW_W - 12} height={VIEW_H - 12} />
            <line x1={6} y1={VIEW_H / 2} x2={VIEW_W - 6} y2={VIEW_H / 2} />
            <circle cx={VIEW_W / 2} cy={VIEW_H / 2} r={42} />
            <circle cx={VIEW_W / 2} cy={VIEW_H / 2} r={2.5} fill="hsl(120 25% 60% / 0.55)" />
            {/* Top penalty area */}
            <rect x={(VIEW_W - 200) / 2} y={6} width={200} height={70} />
            <rect x={(VIEW_W - 90) / 2} y={6} width={90} height={28} />
            {/* Bottom penalty area */}
            <rect x={(VIEW_W - 200) / 2} y={VIEW_H - 76} width={200} height={70} />
            <rect x={(VIEW_W - 90) / 2} y={VIEW_H - 34} width={90} height={28} />
          </g>

          {/* Heat cells */}
          <g pointerEvents="none">
            {data.map((v, idx) => {
              const row = Math.floor(idx / HEATMAP_COLS);
              const col = idx % HEATMAP_COLS;
              return (
                <rect
                  key={idx}
                  x={col * CELL_W}
                  y={row * CELL_H}
                  width={CELL_W}
                  height={CELL_H}
                  fill={colorFor(v)}
                />
              );
            })}
          </g>

          {/* Subtle grid overlay (only when editing) */}
          {!readOnly && (
            <g stroke="hsl(0 0% 100% / 0.06)" strokeWidth={0.5} pointerEvents="none">
              {Array.from({ length: HEATMAP_COLS - 1 }).map((_, i) => (
                <line key={`v${i}`} x1={(i + 1) * CELL_W} y1={0} x2={(i + 1) * CELL_W} y2={VIEW_H} />
              ))}
              {Array.from({ length: HEATMAP_ROWS - 1 }).map((_, i) => (
                <line key={`h${i}`} x1={0} y1={(i + 1) * CELL_H} x2={VIEW_W} y2={(i + 1) * CELL_H} />
              ))}
            </g>
          )}
        </svg>
      </div>

      {!readOnly && showToolbar && (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono uppercase tracking-[0.12rem] text-gray-soft">Intensità</span>
            <input
              type="range"
              min={20}
              max={100}
              value={intensity}
              onChange={(e) => setIntensity(parseInt(e.target.value))}
              className="accent-[hsl(var(--accent))]"
              style={{ width: 140 }}
            />
            <span className="font-mono text-accent-lime w-8">{intensity}</span>
          </div>
          <button
            type="button"
            onClick={() => setErasing((v) => !v)}
            className="dm-btn-outline !py-1.5 !px-3 text-xs"
            style={erasing ? { borderColor: "hsl(var(--accent))", color: "hsl(var(--accent))" } : undefined}
          >
            {erasing ? "✓ Gomma attiva" : "Gomma"}
          </button>
          <button type="button" onClick={clearAll} className="dm-btn-outline !py-1.5 !px-3 text-xs">
            Cancella tutto
          </button>
          <span className="text-gray-soft font-mono">
            Click o trascina per dipingere le zone in cui il giocatore opera di più.
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Build a plausible heatmap from a position code.
 * Used as a baseline when AI doesn't return one.
 */
export function heatmapFromPosition(code: string): Heatmap {
  // Pitch is top-down: row 0 = opponent goal, row 5 = own goal.
  // Returns a soft blob centered on canonical zones for the role.
  const focus: Record<string, { row: number; col: number; spread: number }[]> = {
    GK: [{ row: 5, col: 4.5, spread: 1 }],
    CB: [{ row: 4, col: 3, spread: 1.2 }, { row: 4, col: 6, spread: 1.2 }],
    LB: [{ row: 3, col: 0.8, spread: 1.5 }, { row: 4, col: 1, spread: 1.2 }],
    RB: [{ row: 3, col: 8.2, spread: 1.5 }, { row: 4, col: 8, spread: 1.2 }],
    CDM: [{ row: 3, col: 4.5, spread: 1.6 }],
    CM: [{ row: 2.5, col: 4.5, spread: 1.8 }],
    CAM: [{ row: 1.5, col: 4.5, spread: 1.8 }],
    LW: [{ row: 1, col: 1, spread: 1.6 }, { row: 2, col: 1.2, spread: 1.2 }],
    RW: [{ row: 1, col: 8, spread: 1.6 }, { row: 2, col: 7.8, spread: 1.2 }],
    ST: [{ row: 0.5, col: 4.5, spread: 1.4 }],
    CF: [{ row: 1, col: 4.5, spread: 1.8 }],
  };
  const blobs = focus[code] || focus.CM;
  const out = emptyHeatmap();
  for (let r = 0; r < HEATMAP_ROWS; r++) {
    for (let c = 0; c < HEATMAP_COLS; c++) {
      let v = 0;
      for (const b of blobs) {
        const dr = r - b.row;
        const dc = c - b.col;
        const dist2 = dr * dr + dc * dc;
        const intensity = 90 * Math.exp(-dist2 / (2 * b.spread * b.spread));
        v = Math.max(v, intensity);
      }
      out[r * HEATMAP_COLS + c] = Math.round(v);
    }
  }
  return out;
}
