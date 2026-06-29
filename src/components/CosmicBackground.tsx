import { useEffect, useRef, useState } from "react";

function sv(seed: number, mul: number, range: number) {
  return Math.abs(Math.sin(seed * mul)) * range;
}

const STARS = Array.from({ length: 200 }, (_, i) => ({
  x: sv(i, 137.508, 96) + 2,
  y: sv(i, 97.3,    96) + 2,
  r: sv(i, 73.1, i % 8 === 0 ? 1.5 : i % 4 === 0 ? 0.9 : 0.5) + 0.25,
  spd: sv(i, 53.7, 2.5) + 2,
  del: sv(i, 31.4, 6),
  bright: i % 10 === 0,
}));

const SHOOTS = Array.from({ length: 5 }, (_, i) => ({
  top:  sv(i, 41.2, 35) + 3,
  left: sv(i, 29.7, 60) + 5,
  dur:  sv(i, 11.3, 3) + 4,
  del:  sv(i, 89.1, 15),
  len:  sv(i, 23.5, 100) + 80,
}));

export function CosmicBackground() {
  const [time, setTime]     = useState(0);
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
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // floating animation offset
  const float = Math.sin(time * 0.5) * 6;

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      aria-hidden
      style={{
        background: "radial-gradient(ellipse at 50% 10%, #120825 0%, #060012 50%, #000000 100%)",
        zIndex: 0,
      }}
    >
      {/* ─── STARS + GALAXY SVG (full viewport, % coords) ─── */}
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Nebula blur */}
          <filter id="nb"><feGaussianBlur stdDeviation="2.5"/></filter>
          <filter id="nb2"><feGaussianBlur stdDeviation="1.2"/></filter>
          {/* Star glow */}
          <filter id="sg"><feGaussianBlur stdDeviation="0.4" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>

          {/* ── Galaxy gradients ── */}
          <radialGradient id="gcore" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#fff8e7" stopOpacity="0.55"/>
            <stop offset="15%"  stopColor="#fde68a" stopOpacity="0.40"/>
            <stop offset="40%"  stopColor="#c084fc" stopOpacity="0.22"/>
            <stop offset="70%"  stopColor="#7c3aed" stopOpacity="0.10"/>
            <stop offset="100%" stopColor="#000"    stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="garm1" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#a78bfa" stopOpacity="0.28"/>
            <stop offset="100%" stopColor="#000"    stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="garm2" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#818cf8" stopOpacity="0.22"/>
            <stop offset="100%" stopColor="#000"    stopOpacity="0"/>
          </radialGradient>

          {/* ── Planet gradients ── */}
          <radialGradient id="pg-saturn" cx="36%" cy="30%" r="68%">
            <stop offset="0%"   stopColor="#ede9fe"/>
            <stop offset="40%"  stopColor="#8b5cf6"/>
            <stop offset="100%" stopColor="#2e1065"/>
          </radialGradient>
          <radialGradient id="pg-orange" cx="34%" cy="28%" r="68%">
            <stop offset="0%"   stopColor="#ffedd5"/>
            <stop offset="45%"  stopColor="#f97316"/>
            <stop offset="100%" stopColor="#7c2d12"/>
          </radialGradient>
          <radialGradient id="pg-teal" cx="34%" cy="28%" r="68%">
            <stop offset="0%"   stopColor="#cffafe"/>
            <stop offset="45%"  stopColor="#06b6d4"/>
            <stop offset="100%" stopColor="#164e63"/>
          </radialGradient>

          {/* Vignette */}
          <radialGradient id="vig" cx="50%" cy="50%" r="72%">
            <stop offset="0%"   stopColor="black" stopOpacity="0"/>
            <stop offset="100%" stopColor="black" stopOpacity="0.72"/>
          </radialGradient>
        </defs>

        {/* ── Nebula clouds ── */}
        <ellipse cx="58" cy="32" rx="24" ry="14" fill="rgba(109,40,217,0.12)" filter="url(#nb)"/>
        <ellipse cx="25" cy="20" rx="18" ry="10" fill="rgba(219,39,119,0.09)" filter="url(#nb)"/>
        <ellipse cx="72" cy="65" rx="20" ry="10" fill="rgba(6,182,212,0.08)"  filter="url(#nb)"/>
        <ellipse cx="42" cy="55" rx="16" ry="8"  fill="rgba(139,92,246,0.10)" filter="url(#nb)"/>

        {/* ── Galaxy — centered at 58,32, tilted ── */}
        <g transform="translate(58,32) rotate(-28) scale(1,0.42)">
          {/* Outer dust halo */}
          <ellipse cx="0" cy="0" rx="42" ry="42" fill="rgba(124,58,237,0.04)" filter="url(#nb)"/>
          {/* Far arms */}
          <ellipse cx="0" cy="0" rx="36" ry="36" fill="url(#garm2)" filter="url(#nb2)" opacity="0.6"/>
          <ellipse cx="0" cy="0" rx="28" ry="28" fill="url(#garm1)" filter="url(#nb2)" opacity="0.75"/>
          {/* Dust lane */}
          <ellipse cx="0" cy="0" rx="22" ry="5"  fill="rgba(0,0,0,0.25)"/>
          {/* Bright core */}
          <ellipse cx="0" cy="0" rx="12" ry="12" fill="url(#gcore)" filter="url(#nb2)"/>
          {/* Core sparkle */}
          <circle  cx="0" cy="0" r="2.5"  fill="#fff9e6" opacity="0.65"/>
          <circle  cx="0" cy="0" r="1.0"  fill="white"   opacity="0.90"/>
        </g>

        {/* ── Stars (parallax via translateY) ── */}
        <g transform={`translate(0,${-scrollY * 0.016})`}>
          {STARS.map((s, i) => {
            const tw = 0.35 + 0.65 * Math.sin(time / s.spd + s.del);
            const op = 0.25 + 0.75 * tw;
            const r  = s.r * 0.082;
            return (
              <g key={i}>
                {s.bright && (
                  <circle cx={s.x} cy={s.y} r={r * 3.8}
                    fill="white" opacity={op * 0.12} filter="url(#sg)"/>
                )}
                <circle cx={s.x} cy={s.y} r={r} fill="white" opacity={op}/>
              </g>
            );
          })}
        </g>

        {/* ── Orange planet (left side) ── */}
        <g transform={`translate(0,${Math.sin(time * 0.4) * 0.8})`}>
          <circle cx="12" cy="42" r="7" fill="rgba(249,115,22,0.18)" filter="url(#nb)"/>
          <circle cx="12" cy="42" r="4.5" fill="url(#pg-orange)"/>
          <circle cx="10.5" cy="40.5" r="1.5" fill="white" opacity="0.20"/>
        </g>

        {/* ── Teal small planet (right bottom) ── */}
        <g transform={`translate(0,${Math.sin(time * 0.35 + 1) * 0.6})`}>
          <circle cx="88" cy="70" r="4" fill="rgba(6,182,212,0.18)" filter="url(#nb)"/>
          <circle cx="88" cy="70" r="2.5" fill="url(#pg-teal)"/>
          <circle cx="87" cy="69" r="0.8" fill="white" opacity="0.22"/>
        </g>

        {/* Vignette overlay */}
        <rect x="0" y="0" width="100" height="100" fill="url(#vig)"/>
      </svg>

      {/* ── Saturn (HTML layer for smooth float + proper ring) ── */}
      <div style={{
        position: "absolute",
        top: `calc(8% + ${float}px)`,
        right: "6%",
        width: 90,
        height: 90,
        pointerEvents: "none",
        transition: "top 0.1s linear",
      }}>
        <svg width="90" height="90" viewBox="-45 -45 90 90" overflow="visible">
          <defs>
            <radialGradient id="sat2" cx="36%" cy="30%" r="68%">
              <stop offset="0%"   stopColor="#ede9fe"/>
              <stop offset="40%"  stopColor="#8b5cf6"/>
              <stop offset="100%" stopColor="#2e1065"/>
            </radialGradient>
            <filter id="sat-glow">
              <feGaussianBlur stdDeviation="4" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <clipPath id="ring-front"><rect x="-32" y="-5" width="64" height="22"/></clipPath>
          </defs>
          {/* Glow */}
          <circle cx="0" cy="0" r="22" fill="rgba(139,92,246,0.22)" filter="url(#sat-glow)"/>
          {/* Ring — back half */}
          <ellipse cx="0" cy="0" rx="32" ry="8"
            fill="none" stroke="rgba(196,181,253,0.42)" strokeWidth="5"/>
          {/* Planet */}
          <circle cx="0" cy="0" r="16" fill="url(#sat2)" filter="url(#sat-glow)"/>
          {/* Highlight */}
          <circle cx="-5" cy="-5" r="5.5" fill="white" opacity="0.18"/>
          {/* Ring — front half */}
          <ellipse cx="0" cy="0" rx="32" ry="8"
            fill="none" stroke="rgba(216,180,254,0.60)" strokeWidth="5"
            clipPath="url(#ring-front)"/>
        </svg>
      </div>

      {/* ── Shooting stars ── */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {SHOOTS.map((s, i) => (
          <div key={i} style={{
            position: "absolute",
            top: `${s.top}%`,
            left: `${s.left}%`,
            width: `${s.len}px`,
            height: "2px",
            borderRadius: "999px",
            background: "linear-gradient(to right, white 0%, rgba(255,255,255,0.6) 30%, transparent 100%)",
            transform: "rotate(-22deg)",
            opacity: 0,
            animation: `shoot ${s.dur}s ease-in ${s.del}s infinite`,
          }}/>
        ))}
      </div>

      <style>{`
        @keyframes shoot {
          0%   { opacity: 0;   transform: rotate(-22deg) translateX(-20px); }
          4%   { opacity: 0.9; }
          80%  { opacity: 0.5; }
          100% { opacity: 0;   transform: rotate(-22deg) translateX(700px); }
        }
      `}</style>
    </div>
  );
}
