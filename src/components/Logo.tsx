interface LogoProps {
  size?: number;
  variant?: "light" | "dark";
  className?: string;
}

export default function Logo({ size = 32, variant = "light", className = "" }: LogoProps) {
  const outerRing = variant === "light" ? "#ffffff" : "#1a1a1a";
  const innerFill  = variant === "light" ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.08)";
  const crosshair  = variant === "light" ? "#cccccc" : "#333333";
  const text       = variant === "light" ? "#ffffff" : "#1a1a1a";
  const dot        = "#c8f135";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="DM Scout"
    >
      {/* Outer ring */}
      <circle cx="50" cy="50" r="44" stroke={outerRing} strokeWidth="7" />

      {/* Inner ring */}
      <circle cx="50" cy="50" r="28" stroke={crosshair} strokeWidth="4" fill={innerFill} />

      {/* Crosshair lines — top */}
      <line x1="50" y1="6"  x2="50" y2="22" stroke={outerRing} strokeWidth="6" strokeLinecap="round" />
      {/* bottom */}
      <line x1="50" y1="78" x2="50" y2="94" stroke={outerRing} strokeWidth="6" strokeLinecap="round" />
      {/* left */}
      <line x1="6"  y1="50" x2="22" y2="50" stroke={outerRing} strokeWidth="6" strokeLinecap="round" />
      {/* right */}
      <line x1="78" y1="50" x2="94" y2="50" stroke={outerRing} strokeWidth="6" strokeLinecap="round" />

      {/* D text */}
      <text
        x="35"
        y="55"
        textAnchor="middle"
        fontFamily="'Barlow Condensed', 'Barlow', sans-serif"
        fontWeight="900"
        fontSize="18"
        fill={text}
        letterSpacing="0"
      >
        D
      </text>

      {/* Lime dot separator */}
      <circle cx="50" cy="50" r="4" fill={dot} />

      {/* M text */}
      <text
        x="65"
        y="55"
        textAnchor="middle"
        fontFamily="'Barlow Condensed', 'Barlow', sans-serif"
        fontWeight="900"
        fontSize="18"
        fill={text}
        letterSpacing="0"
      >
        M
      </text>
    </svg>
  );
}
