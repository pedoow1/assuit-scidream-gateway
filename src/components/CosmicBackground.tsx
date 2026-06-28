import { useEffect, useRef } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
}

export function CosmicBackground({ density = 40 }: { density?: number }) {
  const particles: Particle[] = Array.from({ length: Math.floor(density * 0.6) }).map((_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    delay: Math.random() * 6,
    duration: 6 + Math.random() * 8,
    opacity: Math.random() * 0.4 + 0.1,
  }));

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
      {/* Base forest gradient */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(180deg, #c8dfc8 0%, #e8f0e8 30%, #f0ede8 70%, #e8e0d8 100%)"
      }} />

      {/* Fog layers */}
      <div className="forest-fog fog-1" />
      <div className="forest-fog fog-2" />
      <div className="forest-fog fog-3" />

      {/* Clouds */}
      <div className="cloud cloud-1" />
      <div className="cloud cloud-2" />
      <div className="cloud cloud-3" />
      <div className="cloud cloud-4" />

      {/* Floating dust particles */}
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: `radial-gradient(circle, rgba(120,160,100,${p.opacity}), transparent)`,
            animation: `forestDrift ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}

      {/* Tree silhouettes bottom */}
      <svg
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        className="absolute bottom-0 left-0 right-0 w-full"
        style={{ height: "220px" }}
      >
        {/* Back trees - lighter */}
        <path d="M0,280 L40,200 L80,240 L120,180 L160,220 L200,160 L240,210 L280,170 L320,200 L360,150 L400,190 L440,160 L480,200 L520,170 L560,210 L600,155 L640,195 L680,165 L720,205 L760,155 L800,190 L840,160 L880,200 L920,165 L960,195 L1000,155 L1040,190 L1080,160 L1120,200 L1160,165 L1200,190 L1240,155 L1280,185 L1320,165 L1360,195 L1400,170 L1440,200 L1440,320 L0,320 Z"
          fill="rgba(80,110,70,0.25)" />
        {/* Mid trees */}
        <path d="M0,300 L60,230 L100,260 L150,200 L190,240 L240,190 L290,230 L340,200 L390,235 L440,195 L490,230 L540,195 L600,230 L660,195 L720,230 L780,195 L840,228 L900,195 L960,228 L1020,192 L1080,226 L1140,195 L1200,226 L1260,195 L1320,225 L1380,200 L1440,230 L1440,320 L0,320 Z"
          fill="rgba(60,90,55,0.45)" />
        {/* Front trees - darkest */}
        <path d="M0,320 L30,260 L55,290 L80,250 L110,275 L140,245 L170,270 L200,250 L240,275 L280,248 L320,272 L370,248 L410,272 L460,248 L510,272 L560,248 L610,272 L660,248 L710,272 L760,248 L810,272 L860,248 L910,272 L960,248 L1010,272 L1060,248 L1110,272 L1160,248 L1210,272 L1260,248 L1310,272 L1360,252 L1400,272 L1440,255 L1440,320 Z"
          fill="rgba(40,70,40,0.7)" />
      </svg>

      {/* Sun rays top */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2" style={{
        width: "600px",
        height: "300px",
        background: "radial-gradient(ellipse at 50% 0%, rgba(255,220,120,0.25) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Green glow bottom left */}
      <div className="absolute -bottom-20 -left-20" style={{
        width: "400px",
        height: "400px",
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(80,130,70,0.2), transparent 70%)",
        filter: "blur(40px)",
      }} />

      <style>{`
        .forest-fog {
          position: absolute;
          left: -20%;
          width: 140%;
          border-radius: 50%;
          filter: blur(40px);
          animation: fogMove linear infinite;
        }
        .fog-1 {
          top: 20%;
          height: 80px;
          background: rgba(220,235,220,0.35);
          animation-duration: 30s;
        }
        .fog-2 {
          top: 45%;
          height: 60px;
          background: rgba(210,228,210,0.28);
          animation-duration: 45s;
          animation-direction: reverse;
        }
        .fog-3 {
          top: 65%;
          height: 90px;
          background: rgba(200,220,200,0.22);
          animation-duration: 38s;
        }
        @keyframes fogMove {
          0% { transform: translateX(0); }
          50% { transform: translateX(8%); }
          100% { transform: translateX(0); }
        }
        .cloud {
          position: absolute;
          border-radius: 50px;
          background: rgba(255,255,255,0.55);
          filter: blur(18px);
          animation: cloudDrift linear infinite;
        }
        .cloud::before, .cloud::after {
          content: '';
          position: absolute;
          background: inherit;
          border-radius: 50%;
        }
        .cloud-1 {
          top: 8%;
          left: -200px;
          width: 280px;
          height: 70px;
          animation-duration: 55s;
          opacity: 0.7;
        }
        .cloud-2 {
          top: 14%;
          left: -300px;
          width: 220px;
          height: 55px;
          animation-duration: 75s;
          animation-delay: -20s;
          opacity: 0.5;
        }
        .cloud-3 {
          top: 6%;
          left: -400px;
          width: 350px;
          height: 80px;
          animation-duration: 65s;
          animation-delay: -35s;
          opacity: 0.6;
        }
        .cloud-4 {
          top: 18%;
          left: -250px;
          width: 200px;
          height: 50px;
          animation-duration: 85s;
          animation-delay: -50s;
          opacity: 0.45;
        }
        @keyframes cloudDrift {
          from { transform: translateX(0); }
          to { transform: translateX(calc(100vw + 500px)); }
        }
        @keyframes forestDrift {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          33% { transform: translateY(-15px) translateX(6px); opacity: 0.7; }
          66% { transform: translateY(-8px) translateX(-4px); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
