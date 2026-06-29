import { useEffect, useRef, useState } from "react";

function sv(seed: number, mul: number, range: number) {
  return Math.abs(Math.sin(seed * mul)) * range;
}

const STARS = Array.from({ length: 80 }, (_, i) => ({
  x: sv(i, 137.508, 96) + 2,
  y: sv(i, 97.3,    96) + 2,
  r: sv(i, 73.1, i % 6 === 0 ? 1.4 : 0.7) + 0.3,
  spd: sv(i, 53.7, 2.5) + 2,
  del: sv(i, 31.4, 6),
  bright: i % 8 === 0,
}));

const SHOOTS = Array.from({ length: 4 }, (_, i) => ({
  top:  sv(i, 41.2, 30) + 3,
  left: sv(i, 29.7, 55) + 5,
  dur:  sv(i, 11.3, 3) + 4,
  del:  sv(i, 89.1, 16),
  len:  sv(i, 23.5, 90) + 80,
}));

const BG = "https://zkojnnxqxbjbdxtniucp.supabase.co/storage/v1/object/public/images/file_000000002d7471f48731970c686d6c76.png";

export function CosmicBackground() {
  const [time, setTime]       = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const rafRef                = useRef<number>(0);

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

  const float = Math.sin(time * 0.45) * 5;

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      aria-hidden
      style={{ zIndex: 0 }}
    >
      {/* ── Background image with parallax ── */}
      <div style={{
        position: "absolute",
        inset: "-10%",
        backgroundImage: `url(${BG})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        transform: `translateY(${scrollY * 0.12}px)`,
        willChange: "transform",
      }}/>

      {/* ── Dark overlay so text stays readable ── */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(180deg, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.55) 100%)",
      }}/>

      {/* ── Twinkling star overlay (extra sparkle on top of image) ── */}
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <filter id="sg2">
            <feGaussianBlur stdDeviation="0.35" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <g transform={`translate(0,${-scrollY * 0.01})`}>
          {STARS.map((s, i) => {
            const tw = 0.3 + 0.7 * Math.sin(time / s.spd + s.del);
            const op = 0.2 + 0.8 * tw;
            const r  = s.r * 0.075;
            return (
              <g key={i}>
                {s.bright && (
                  <circle cx={s.x} cy={s.y} r={r * 3.5}
                    fill="white" opacity={op * 0.15} filter="url(#sg2)"/>
                )}
                <circle cx={s.x} cy={s.y} r={r} fill="white" opacity={op * 0.7}/>
              </g>
            );
          })}
        </g>
      </svg>

      {/* ── Shooting stars ── */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        {SHOOTS.map((s, i) => (
          <div key={i} style={{
            position: "absolute",
            top:  `${s.top}%`,
            left: `${s.left}%`,
            width: `${s.len}px`,
            height: "1.5px",
            borderRadius: "999px",
            background: "linear-gradient(to right, white 0%, rgba(255,255,255,0.5) 40%, transparent 100%)",
            transform: "rotate(-22deg)",
            opacity: 0,
            animation: `shoot ${s.dur}s ease-in ${s.del}s infinite`,
          }}/>
        ))}
      </div>

      <style>{`
        @keyframes shoot {
          0%   { opacity: 0;   transform: rotate(-22deg) translateX(-10px); }
          5%   { opacity: 1; }
          85%  { opacity: 0.4; }
          100% { opacity: 0;   transform: rotate(-22deg) translateX(650px); }
        }
      `}</style>
    </div>
  );
}
