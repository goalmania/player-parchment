import logoImg from "../assets/dmscout-logo-new.png";

interface LogoProps {
  size?: number;
  variant?: "light" | "dark";
  className?: string;
}

export default function Logo({ size = 32, className = "" }: LogoProps) {
  return (
    <img
      src={logoImg}
      width={size}
      height={size}
      alt="DM Scout"
      className={className}
      style={{ objectFit: "contain" }}
    />
  );
}
