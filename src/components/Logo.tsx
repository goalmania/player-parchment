import logoLight from "@/assets/dmscout-logo-light.png";
import logoDark from "@/assets/dmscout-logo-dark.png";

interface LogoProps {
  size?: number;
  variant?: "light" | "dark";
  className?: string;
}

/**
 * DM Scout crosshair mark.
 * - "light" = white strokes + lime dot (for dark UIs).
 * - "dark"  = black strokes (for print on white paper).
 */
export default function Logo({ size = 32, variant = "light", className = "" }: LogoProps) {
  const src = variant === "dark" ? logoDark : logoLight;
  return (
    <img
      src={src}
      alt="DM Scout"
      width={size}
      height={size}
      className={className}
      style={{ display: "block", objectFit: "contain" }}
    />
  );
}
