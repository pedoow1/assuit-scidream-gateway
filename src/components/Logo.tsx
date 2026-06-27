const LOGO_URL = "https://zkojnnxqxbjbdxtniucp.supabase.co/storage/v1/object/public/images/file_0000000027c071f49c65b8643e91549e%20(1).png";

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
