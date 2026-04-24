interface Props {
  value: number; // 0-5
  size?: number;
  onChange?: (v: number) => void;
  color?: string;
}

export default function Stars({ value, size = 16, onChange, color }: Props) {
  const fill = color || "hsl(var(--accent))";
  return (
    <div className="inline-flex gap-1" role={onChange ? "radiogroup" : undefined}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= value;
        const Component: any = onChange ? "button" : "span";
        return (
          <Component
            key={i}
            type={onChange ? "button" : undefined}
            onClick={onChange ? () => onChange(i) : undefined}
            aria-label={onChange ? `${i} stelle` : undefined}
            style={{ cursor: onChange ? "pointer" : "default", lineHeight: 0 }}
          >
            <svg width={size} height={size} viewBox="0 0 24 24">
              <polygon
                points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9"
                fill={filled ? fill : "none"}
                stroke={filled ? fill : "hsl(var(--gray))"}
                strokeWidth={1}
              />
            </svg>
          </Component>
        );
      })}
    </div>
  );
}
