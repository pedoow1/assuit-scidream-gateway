import logoAsset from "@/assets/dream-team-logo.asset.json";

interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export function Logo({ size = 64, className = "" }: LogoProps) {
  return (
    <img
      src={logoAsset.url}
      alt="Dream Team — Faculty of Science"
      width={size}
      height={size}
      className={`inline-block object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
