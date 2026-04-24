import { useEffect, useRef } from "react";

export interface RadarSeries {
  values: number[]; // length must equal axes.length, scale 0-10
  fill: string;
  stroke: string;
  label?: string;
}

interface Props {
  axes: string[];
  values?: number[];           // single-series shortcut
  series?: RadarSeries[];      // multi-series
  size?: number;
}

export default function RadarChart({ axes, values, series, size = 400 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const maxR = size / 2 - 60;
    const n = axes.length;

    const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;

    // Background polygons (5 levels)
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    for (let lvl = 1; lvl <= 5; lvl++) {
      const r = (maxR * lvl) / 5;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const a = angle(i);
        const x = cx + r * Math.cos(a);
        const y = cy + r * Math.sin(a);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // Axes spokes
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    for (let i = 0; i < n; i++) {
      const a = angle(i);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + maxR * Math.cos(a), cy + maxR * Math.sin(a));
      ctx.stroke();
    }

    const all: RadarSeries[] = series ?? (values ? [{
      values, fill: "rgba(200,240,0,0.12)", stroke: "rgba(200,240,0,1)",
    }] : []);

    all.forEach((s) => {
      ctx.beginPath();
      s.values.forEach((v, i) => {
        const r = (Math.max(0, Math.min(10, v)) / 10) * maxR;
        const a = angle(i);
        const x = cx + r * Math.cos(a);
        const y = cy + r * Math.sin(a);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = s.fill;
      ctx.fill();
      ctx.strokeStyle = s.stroke;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Vertices
      s.values.forEach((v, i) => {
        const r = (Math.max(0, Math.min(10, v)) / 10) * maxR;
        const a = angle(i);
        const x = cx + r * Math.cos(a);
        const y = cy + r * Math.sin(a);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = s.stroke;
        ctx.fill();
      });
    });

    // Labels
    ctx.font = "600 11px 'Barlow Condensed', sans-serif";
    ctx.fillStyle = "rgba(245,243,238,0.85)";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    axes.forEach((label, i) => {
      const a = angle(i);
      const lx = cx + (maxR + 26) * Math.cos(a);
      const ly = cy + (maxR + 26) * Math.sin(a);
      ctx.fillStyle = "rgba(245,243,238,0.85)";
      ctx.fillText(label.toUpperCase(), lx, ly - 6);
      if (all.length === 1) {
        ctx.font = "700 12px 'Space Mono', monospace";
        ctx.fillStyle = "hsl(71 100% 47%)";
        ctx.fillText(all[0].values[i].toFixed(1), lx, ly + 8);
        ctx.font = "600 11px 'Barlow Condensed', sans-serif";
      }
    });
  }, [axes, values, series, size]);

  return <canvas ref={ref} />;
}
