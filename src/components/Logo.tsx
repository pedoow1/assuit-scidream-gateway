const LOGO_URL = "/images/logo.png";

interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export function Logo({ size = 64, className = "" }: LogoProps) {
  return (
    <img
      src={LOGO_URL}
      alt="Dream Team — Faculty of Science"
      width={size}
      height={size}
      className={`inline-block object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
