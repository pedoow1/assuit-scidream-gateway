import { useEffect, useRef, useState } from "react";

// ── Deterministic helpers ──
function sv(seed: number, mul: number, range: number) {
  return Math.abs(Math.sin(seed * mul)) * range;
}

// ── Stars: 200 stars with varied sizes ──
const STARS = Array.from({ length: 200 }, (_, i) => ({
  x: sv(i, 137.508, 100).toFixed(2),
  y: sv(i, 97.3,   100).toFixed(2),
  r: (sv(i, 73.1, i % 8 === 0 ? 1.8 : i % 4 === 0 ? 1.2 : 0.7) + 0.3).toFixed(2),
  spd: (sv(i, 53.7, 3) + 2).toFixed(2),
  del: (sv(i, 31.4, 6)).toFixed(2),
  isBright: i % 10 === 0,
}));

// ── Shooting stars ──
const SHOOTS = Array.from({ length: 5 }, (_, i) => ({
  x: sv(i, 41.2, 80) + 10,
  y: sv(i, 67.8, 40) + 5,
  len: sv(i, 23.5, 120) + 60,
  dur: sv(i, 11.3, 4) + 3,
  del: sv(i, 89.1, 12),
  angle: -30 - sv(i, 17.4, 20),
}));

// ── Planets ──
const PLANETS = [
  { cx: 82, cy: 18, r: 3.2,  color: "#8B5CF6", ringColor: "#7C3AED", hasRing: true,  glowColor: "rgba(139,92,246,0.4)" },
  { cx: 15, cy: 35, r: 1.8,  color: "#F97316", ringColor: "",        hasRing: false, glowColor: "rgba(249,115,22,0.3)" },
  { cx: 90, cy: 60, r: 1.2,  color: "#06B6D4", ringColor: "",        hasRing: false, glowColor: "rgba(6,182,212,0.25)" },
  { cx: 8,  cy: 72, r: 0.9,  color: "#E2E8F0", ringColor: "",        hasRing: false, glowColor: "rgba(226,232,240,0.2)" },
];

// ── Nebula clouds (static SVG blobs) ──
const NEBULAS = [
  { cx: 30, cy: 25, rx: 22, ry: 14, color: "rgba(88,28,220,0.12)",  blur: 8 },
  { cx: 70, cy: 15, rx: 18, ry: 10, color: "rgba(219,39,119,0.10)", blur: 6 },
  { cx: 55, cy: 55, rx: 25, ry: 12, color: "rgba(6,182,212,0.08)",  blur: 9 },
  { cx: 20, cy: 80, rx: 20, ry: 10, color: "rgba(139,92,246,0.09)", blur: 7 },
];

export function CosmicBackground() {
  const [time, setTime] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let prev = performance.now();
    const tick = (now: number) => {
      setTime(t => t + (now - prev) / 1000);
      prev = now;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      aria-hidden
      style={{
        background: "radial-gradient(ellipse at 50% 0%, #0d0520 0%, #060010 40%, #000000 100%)",
        zIndex: 0,
      }}
    >
      {/* Main SVG layer */}
      <svg width="100%" height="100%" viewBox="0 0 100 100"
        preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="blur-sm"><feGaussianBlur stdDeviation="0.4"/></filter>
          <filter id="blur-md"><feGaussianBlur stdDeviation="1.0"/></filter>
          <filter id="blur-lg"><feGaussianBlur stdDeviation="2.5"/></filter>

          {/* Galaxy gradient */}
          <radialGradient id="galaxy-core" cx="60%" cy="40%" r="35%">
            <stop offset="0%"   stopColor="#e8d5ff" stopOpacity="0.35"/>
            <stop offset="30%"  stopColor="#a855f7" stopOpacity="0.18"/>
            <stop offset="60%"  stopColor="#7c3aed" stopOpacity="0.10"/>
            <stop offset="100%" stopColor="#000000" stopOpacity="0"/>
          </radialGradient>

          {/* Galaxy arm gradient */}
          <linearGradient id="galaxy-arm1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#c084fc" stopOpacity="0"/>
            <stop offset="40%"  stopColor="#a855f7" stopOpacity="0.22"/>
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0"/>
          </linearGradient>
          <linearGradient id="galaxy-arm2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#818cf8" stopOpacity="0"/>
            <stop offset="40%"  stopColor="#6366f1" stopOpacity="0.18"/>
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0"/>
          </linearGradient>

          {/* Planet glow filters */}
          {PLANETS.map((p, i) => (
            <filter key={i} id={`planet-glow-${i}`}>
              <feGaussianBlur stdDeviation="0.8" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          ))}
        </defs>

        {/* ── Nebulas ── */}
        {NEBULAS.map((n, i) => (
          <ellipse key={i} cx={n.cx} cy={n.cy} rx={n.rx} ry={n.ry}
            fill={n.color} filter="url(#blur-lg)"/>
        ))}

        {/* ── Galaxy ── */}
        <g transform="translate(60,38) rotate(-25) scale(1,0.45)">
          {/* Core glow */}
          <ellipse cx={0} cy={0} rx={18} ry={18} fill="url(#galaxy-core)" filter="url(#blur-md)"/>
          {/* Arms */}
          <ellipse cx={0} cy={0} rx={32} ry={8}  fill="url(#galaxy-arm1)" filter="url(#blur-sm)" opacity={0.8}/>
          <ellipse cx={0} cy={0} rx={8}  ry={32} fill="url(#galaxy-arm2)" filter="url(#blur-sm)" opacity={0.6}/>
          {/* Outer dust */}
          <ellipse cx={0} cy={0} rx={44} ry={10} fill="none"
            stroke="rgba(168,85,247,0.08)" strokeWidth={6} filter="url(#blur-md)"/>
        </g>

        {/* ── Stars ── */}
        {STARS.map((s, i) => {
          const tw = 0.4 + 0.6 * Math.sin(time / parseFloat(s.spd) + parseFloat(s.del));
          const op = 0.3 + 0.7 * tw;
          const r  = parseFloat(s.r) * 0.09;
          return (
            <g key={i}>
              {s.isBright && (
                <circle cx={s.x} cy={s.y} r={r * 4}
                  fill="white" opacity={op * 0.12} filter="url(#blur-sm)"/>
              )}
              <circle cx={s.x} cy={s.y} r={r} fill="white" opacity={op}/>
            </g>
          );
        })}

        {/* ── Planets ── */}
        {PLANETS.map((p, i) => (
          <g key={i} filter={`url(#planet-glow-${i})`}>
            {/* Glow halo */}
            <circle cx={p.cx} cy={p.cy} r={p.r * 2.5} fill={p.glowColor} filter="url(#blur-md)"/>
            {/* Ring (for ringed planet) */}
            {p.hasRing && (
              <ellipse cx={p.cx} cy={p.cy} rx={p.r * 2.2} ry={p.r * 0.55}
                fill="none" stroke={p.ringColor} strokeWidth={0.5} opacity={0.7}/>
            )}
            {/* Planet body */}
            <circle cx={p.cx} cy={p.cy} r={p.r} fill={p.color}/>
            {/* Highlight */}
            <circle cx={p.cx - p.r * 0.3} cy={p.cy - p.r * 0.3} r={p.r * 0.4}
              fill="white" opacity={0.25}/>
          </g>
        ))}

        {/* ── Horizon vignette ── */}
        <defs>
          <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
            <stop offset="0%"   stopColor="black" stopOpacity="0"/>
            <stop offset="100%" stopColor="black" stopOpacity="0.65"/>
          </radialGradient>
        </defs>
        <rect x={0} y={0} width={100} height={100} fill="url(#vignette)"/>
      </svg>

      {/* ── Shooting stars (CSS animated) ── */}
      <style>{`
        ${SHOOTS.map((s, i) => `
          @keyframes shoot${i} {
            0%   { opacity: 0; transform: translateX(0) translateY(0); }
            5%   { opacity: 1; }
            100% { opacity: 0; transform: translateX(${s.len}px) translateY(${s.len * 0.5}px); }
          }
          .shoot${i} {
            position: absolute;
            left: ${s.x}%;
            top: ${s.y}%;
            width: ${s.len * 0.6}px;
            height: 1.5px;
            background: linear-gradient(90deg, white, rgba(255,255,255,0));
            border-radius: 999px;
            transform: rotate(${s.angle}deg);
            animation: shoot${i} ${s.dur}s ease-in-out ${s.del}s infinite;
            opacity: 0;
          }
        `).join("")}

        /* Floating planet animations */
        .planet-float {
          animation: planetFloat 8s ease-in-out infinite;
        }
        @keyframes planetFloat {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }

        /* Cosmic dust particles */
        @keyframes dustDrift {
          0%   { transform: translateX(0) translateY(0); opacity: 0; }
          20%  { opacity: 0.6; }
          80%  { opacity: 0.4; }
          100% { transform: translateX(30px) translateY(-20px); opacity: 0; }
        }
      `}</style>

      {SHOOTS.map((_, i) => <div key={i} className={`shoot${i}`}/>)}

      {/* Floating ringed planet (HTML layer for better control) */}
      <div className="planet-float" style={{
        position: "absolute", top: "12%", right: "10%",
        width: 64, height: 64, pointerEvents: "none",
      }}>
        <svg width={64} height={64} viewBox="0 0 64 64" overflow="visible">
          <defs>
            <radialGradient id="sat-grad" cx="38%" cy="35%" r="60%">
              <stop offset="0%"  stopColor="#d8b4fe"/>
              <stop offset="50%" stopColor="#8B5CF6"/>
              <stop offset="100%" stopColor="#4c1d95"/>
            </radialGradient>
            <filter id="sat-glow">
              <feGaussianBlur stdDeviation="3" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          {/* Glow */}
          <circle cx={32} cy={32} r={20} fill="rgba(139,92,246,0.25)" filter="url(#sat-glow)"/>
          {/* Ring back */}
          <ellipse cx={32} cy={32} rx={28} ry={7} fill="none"
            stroke="rgba(196,181,253,0.45)" strokeWidth={4}
            strokeDasharray="44 88" strokeDashoffset="0"/>
          {/* Body */}
          <circle cx={32} cy={32} r={14} fill="url(#sat-grad)"/>
          {/* Highlight */}
          <circle cx={26} cy={26} r={5} fill="white" opacity={0.2}/>
          {/* Ring front */}
          <ellipse cx={32} cy={32} rx={28} ry={7} fill="none"
            stroke="rgba(196,181,253,0.35)" strokeWidth={3.5}
            strokeDasharray="44 88" strokeDashoffset="44"/>
        </svg>
      </div>

      {/* Cosmic dust overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(ellipse 80% 50% at 60% 35%, rgba(139,92,246,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }}/>
    </div>
  );
}
