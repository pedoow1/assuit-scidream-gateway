import { useEffect, useRef, useState } from "react";

function sv(seed: number, mul: number, range: number) {
  return Math.abs(Math.sin(seed * mul)) * range;
}

// 200 stars
const STARS = Array.from({ length: 200 }, (_, i) => ({
  x: sv(i, 137.508, 98) + 1,
  y: sv(i, 97.3, 98) + 1,
  r: sv(i, 73.1, i % 8 === 0 ? 1.6 : i % 4 === 0 ? 1.0 : 0.55) + 0.3,
  spd: sv(i, 53.7, 2.5) + 2,
  del: sv(i, 31.4, 6),
  isBright: i % 10 === 0,
}));

// Shooting stars — stored as angles so they look like meteors crossing the sky
const SHOOTS = Array.from({ length: 6 }, (_, i) => ({
  startX: sv(i, 41.2, 70) + 5,
  startY: sv(i, 29.7, 30) + 2,
  dur: sv(i, 11.3, 3) + 3.5,
  del: sv(i, 89.1, 14),
  len: sv(i, 23.5, 80) + 60,
}));

export function CosmicBackground() {
  const [time, setTime] = useState(0);
  const [scrollY, setScrollY] = useState(0);
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

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      aria-hidden
      style={{
        background: "radial-gradient(ellipse at 55% 20%, #110820 0%, #05010f 55%, #000000 100%)",
        zIndex: 0,
      }}
    >
      {/* ── Stars layer — parallax on scroll ── */}
      <svg
        width="100%" height="100%"
        style={{ position: "absolute", inset: 0, overflow: "hidden" }}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <filter id="star-glow">
            <feGaussianBlur stdDeviation="0.5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="planet-glow">
            <feGaussianBlur stdDeviation="1.5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="nebula-blur">
            <feGaussianBlur stdDeviation="3"/>
          </filter>

          {/* Saturn ring clip */}
          <clipPath id="ring-clip-front">
            <rect x="68" y="17" width="30" height="10"/>
          </clipPath>

          {/* Galaxy gradient */}
          <radialGradient id="galaxy" cx="60%" cy="38%" r="30%">
            <stop offset="0%"   stopColor="#ddd6fe" stopOpacity="0.30"/>
            <stop offset="25%"  stopColor="#a78bfa" stopOpacity="0.15"/>
            <stop offset="60%"  stopColor="#7c3aed" stopOpacity="0.07"/>
            <stop offset="100%" stopColor="black"   stopOpacity="0"/>
          </radialGradient>

          {/* Planet gradients */}
          <radialGradient id="sat-grad" cx="38%" cy="30%" r="65%">
            <stop offset="0%"   stopColor="#e9d5ff"/>
            <stop offset="45%"  stopColor="#8b5cf6"/>
            <stop offset="100%" stopColor="#3b0764"/>
          </radialGradient>
          <radialGradient id="orange-grad" cx="35%" cy="30%" r="65%">
            <stop offset="0%"   stopColor="#fed7aa"/>
            <stop offset="50%"  stopColor="#f97316"/>
            <stop offset="100%" stopColor="#7c2d12"/>
          </radialGradient>
          <radialGradient id="teal-grad" cx="35%" cy="30%" r="65%">
            <stop offset="0%"   stopColor="#a5f3fc"/>
            <stop offset="50%"  stopColor="#06b6d4"/>
            <stop offset="100%" stopColor="#164e63"/>
          </radialGradient>
          <radialGradient id="white-grad" cx="35%" cy="30%" r="65%">
            <stop offset="0%"   stopColor="#f1f5f9"/>
            <stop offset="60%"  stopColor="#94a3b8"/>
            <stop offset="100%" stopColor="#334155"/>
          </radialGradient>
        </defs>

        {/* Nebula blobs */}
        <ellipse cx="28" cy="22" rx="20" ry="12" fill="rgba(109,40,217,0.10)" filter="url(#nebula-blur)"/>
        <ellipse cx="72" cy="14" rx="16" ry="9"  fill="rgba(219,39,119,0.08)" filter="url(#nebula-blur)"/>
        <ellipse cx="55" cy="58" rx="22" ry="11" fill="rgba(6,182,212,0.07)"  filter="url(#nebula-blur)"/>

        {/* Galaxy core */}
        <ellipse cx="60" cy="38" rx="28" ry="18" fill="url(#galaxy)"/>
        <ellipse cx="60" cy="38" rx="38" ry="7"
          fill="none" stroke="rgba(167,139,250,0.06)" strokeWidth="6" filter="url(#nebula-blur)"/>

        {/* ── Stars with parallax ── */}
        <g transform={`translate(0, ${-scrollY * 0.018})`}>
          {STARS.map((s, i) => {
            const tw = 0.35 + 0.65 * Math.sin(time / s.spd + s.del);
            const op = 0.25 + 0.75 * tw;
            const r  = s.r * 0.08;
            return (
              <g key={i}>
                {s.isBright && (
                  <circle cx={s.x} cy={s.y} r={r * 3.5}
                    fill="white" opacity={op * 0.13} filter="url(#star-glow)"/>
                )}
                <circle cx={s.x} cy={s.y} r={r} fill="white" opacity={op}/>
              </g>
            );
          })}
        </g>

        {/* ── Saturn (ringed planet) ── */}
        {/* Ring back half */}
        <ellipse cx="83" cy="19" rx="8.5" ry="2.2"
          fill="none" stroke="rgba(196,181,253,0.40)" strokeWidth="2.0"/>
        {/* Planet body */}
        <circle cx="83" cy="19" r="5.5" fill="url(#sat-grad)" filter="url(#planet-glow)"/>
        {/* Highlight */}
        <circle cx="81" cy="17" r="2.0" fill="white" opacity="0.18"/>
        {/* Ring front half — clipped to appear in front of planet */}
        <ellipse cx="83" cy="19" rx="8.5" ry="2.2"
          fill="none" stroke="rgba(216,180,254,0.55)" strokeWidth="2.0"
          clipPath="url(#ring-clip-front)"/>

        {/* ── Orange planet ── */}
        <circle cx="13" cy="38" r="3.8" fill="url(#orange-grad)" filter="url(#planet-glow)"/>
        <circle cx="11.5" cy="36.5" r="1.3" fill="white" opacity="0.18"/>
        {/* Atmosphere glow */}
        <circle cx="13" cy="38" r="5.5" fill="rgba(249,115,22,0.18)" filter="url(#nebula-blur)"/>

        {/* ── Teal small planet ── */}
        <circle cx="91" cy="62" r="2.2" fill="url(#teal-grad)" filter="url(#planet-glow)"/>
        <circle cx="90.2" cy="61.2" r="0.7" fill="white" opacity="0.20"/>
        <circle cx="91" cy="62" r="3.5" fill="rgba(6,182,212,0.18)" filter="url(#nebula-blur)"/>

        {/* ── Small grey moon ── */}
        <circle cx="7" cy="72" r="1.6" fill="url(#white-grad)"/>
        <circle cx="6.4" cy="71.4" r="0.5" fill="white" opacity="0.22"/>

        {/* Vignette */}
        <defs>
          <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
            <stop offset="0%"   stopColor="black" stopOpacity="0"/>
            <stop offset="100%" stopColor="black" stopOpacity="0.70"/>
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="100" height="100" fill="url(#vignette)"/>
      </svg>

      {/* ── Shooting stars (CSS only, no stretching) ── */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        {SHOOTS.map((s, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: `${s.startY}%`,
              left: `${s.startX}%`,
              width: `${s.len}px`,
              height: "2px",
              borderRadius: "999px",
              background: "linear-gradient(to right, rgba(255,255,255,0.9), rgba(255,255,255,0))",
              transform: "rotate(-20deg)",
              animation: `shoot ${s.dur}s ease-in-out ${s.del}s infinite`,
              opacity: 0,
            }}
          />
        ))}
      </div>

      {/* Saturn floating animation (HTML layer for smooth translateY) */}
      <div style={{
        position: "absolute",
        top: "10%", right: "8%",
        animation: "floatPlanet 7s ease-in-out infinite",
        pointerEvents: "none",
        width: 0, height: 0, // visual handled in SVG above
      }}/>

      <style>{`
        @keyframes shoot {
          0%   { opacity: 0;   transform: rotate(-20deg) translateX(0); }
          5%   { opacity: 0.9; }
          70%  { opacity: 0.6; }
          100% { opacity: 0;   transform: rotate(-20deg) translateX(${typeof window !== 'undefined' ? window.innerWidth * 0.7 : 600}px); }
        }
        @keyframes floatPlanet {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}
