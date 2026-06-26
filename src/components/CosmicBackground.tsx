import { useMemo } from "react";

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}

export function CosmicBackground({ density = 40 }: { density?: number }) {
  const stars = useMemo<Star[]>(() => {
    return Array.from({ length: density }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2.5 + 0.5,
      delay: Math.random() * 4,
      duration: 2 + Math.random() * 4,
    }));
  }, [density]);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-aurora opacity-60" />
      {stars.map((s) => (
        <span
          key={s.id}
          className="absolute rounded-full bg-foreground/80"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animation: `twinkle ${s.duration}s ease-in-out ${s.delay}s infinite`,
            boxShadow: s.size > 1.5 ? "0 0 6px currentColor" : undefined,
          }}
        />
      ))}
      {/* Floating gold orb */}
      <div
        className="absolute -top-32 -right-32 h-96 w-96 rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--gold), transparent 70%)" }}
      />
      <div
        className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--rose), transparent 70%)" }}
      />
    </div>
  );
}
