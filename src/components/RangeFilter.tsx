import { Slider } from "@/components/ui/slider";

interface Props {
  label: string;
  min: number;
  max: number;
  step: number;
  value: [number, number];
  unit?: string;
  onChange: (value: [number, number]) => void;
}

/** Slider a doppio cursore con etichetta e valori correnti, per i filtri numerici del database. */
export default function RangeFilter({ label, min, max, step, value, unit = "", onChange }: Props) {
  const active = value[0] !== min || value[1] !== max;
  const fmt = (n: number) => (step < 1 ? n.toFixed(1) : String(Math.round(n)));

  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-2">
        <span className={`font-mono text-xs uppercase tracking-[0.08rem] ${active ? "text-accent-lime" : "text-gray-soft"}`}>
          {label}
        </span>
        <span className="font-mono text-xs text-foreground">
          {fmt(value[0])}{unit} – {fmt(value[1])}{unit}
        </span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={value}
        onValueChange={(v) => onChange([v[0], v[1]] as [number, number])}
      />
    </div>
  );
}
