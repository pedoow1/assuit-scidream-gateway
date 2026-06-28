import { useEffect, useRef, useState } from "react";

// ═══════════════════════════════════════════════════════
//  5 sky phases: فجر → ضحى → ظهر → عصر → غروب
// ═══════════════════════════════════════════════════════
const PHASES = [
  { sky: ["#0d001a","#2a0845","#6b1870","#c04890","#f5a0c0"],
    sunCol:"#ff80b0", sunGlow:"rgba(255,100,160,0.65)", horizonGlow:"rgba(220,80,130,0.5)",
    cloudCol:"rgba(255,190,220,0.55)", starOp:0.95, planetOp:0.85, moonOp:0.8 },
  { sky: ["#0a1540","#1a3a80","#3a7ec8","#88c8f0","#fce8d0"],
    sunCol:"#fff8d0", sunGlow:"rgba(255,240,180,0.5)", horizonGlow:"rgba(255,200,120,0.35)",
    cloudCol:"rgba(255,255,255,0.72)", starOp:0, planetOp:0.15, moonOp:0 },
  { sky: ["#082040","#1a50a8","#3a90e0","#80c8f0","#d0eeff"],
    sunCol:"#fffde8", sunGlow:"rgba(255,255,210,0.4)", horizonGlow:"rgba(200,235,255,0.2)",
    cloudCol:"rgba(255,255,255,0.84)", starOp:0, planetOp:0.05, moonOp:0 },
  { sky: ["#18103a","#382870","#b04828","#f07838","#ffd070"],
    sunCol:"#ffb030", sunGlow:"rgba(255,160,50,0.65)", horizonGlow:"rgba(255,110,40,0.55)",
    cloudCol:"rgba(255,195,145,0.65)", starOp:0.1, planetOp:0.45, moonOp:0.2 },
  { sky: ["#080010","#200535","#58104a","#b03860","#f06040"],
    sunCol:"#ff3820", sunGlow:"rgba(255,70,30,0.75)", horizonGlow:"rgba(200,40,70,0.6)",
    cloudCol:"rgba(255,155,175,0.5)", starOp:1, planetOp:1, moonOp:0.9 },
];

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function hexToRgb(h: string) {
  h = h.replace("#","");
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}
function lerpHex(c1: string, c2: string, t: number) {
  const a = hexToRgb(c1), b = hexToRgb(c2);
  return `rgb(${Math.round(lerp(a[0],b[0],t))},${Math.round(lerp(a[1],b[1],t))},${Math.round(lerp(a[2],b[2],t))})`;
}
function lerpRgba(c1: string, c2: string, t: number) {
  const p = (s: string) => s.match(/[\d.]+/g)!.map(Number);
  const a = p(c1), b = p(c2);
  return `rgba(${Math.round(lerp(a[0],b[0],t))},${Math.round(lerp(a[1],b[1],t))},${Math.round(lerp(a[2],b[2],t))},${lerp(a[3],b[3],t).toFixed(2)})`;
}
function getColors(prog: number) {
  const total = PHASES.length - 1;
  const raw = prog * total;
  const idx = Math.min(Math.floor(raw), total - 1);
  const t = raw - idx;
  const A = PHASES[idx], B = PHASES[idx + 1];
  return {
    sky: A.sky.map((s, i) => lerpHex(s, B.sky[i], t)),
    sunCol: lerpHex(A.sunCol, B.sunCol, t),
    sunGlow: lerpRgba(A.sunGlow, B.sunGlow, t),
    horizonGlow: lerpRgba(A.horizonGlow, B.horizonGlow, t),
    cloudCol: lerpRgba(A.cloudCol, B.cloudCol, t),
    starOp: lerp(A.starOp, B.starOp, t),
    planetOp: lerp(A.planetOp, B.planetOp, t),
    moonOp: lerp(A.moonOp, B.moonOp, t),
  };
}

// 130 stars, fully deterministic — no Math.random() to avoid SSR hydration mismatch
function seededVal(seed: number, mul: number, offset: number) {
  return Math.abs(Math.sin(seed * mul)) * offset;
}
const STARS = Array.from({ length: 130 }, (_, i) => ({
  x: ((Math.sin(i * 137.508) * 0.5 + 0.5) * 100).toFixed(2),
  y: ((Math.cos(i * 97.3) * 0.5 + 0.5) * 75).toFixed(2),
  r: (seededVal(i, 73.1, 1.5) + 0.5).toFixed(2),
  spd: (seededVal(i, 53.7, 1.5) + 1.2).toFixed(2),
  del: (seededVal(i, 31.4, 4)).toFixed(2),
}));

// Cloud layer configs
const CLOUDS = [
  { id:0, y:"10%", w:340, spd:32, del:0,   op:0.92, shape:0 },
  { id:1, y:"5%",  w:260, spd:50, del:-12,  op:0.78, shape:1 },
  { id:2, y:"19%", w:200, spd:65, del:-5,   op:0.72, shape:2 },
  { id:3, y:"27%", w:420, spd:25, del:-20,  op:0.65, shape:0 },
  { id:4, y:"8%",  w:180, spd:80, del:-35,  op:0.62, shape:1 },
  { id:5, y:"15%", w:300, spd:42, del:-8,   op:0.75, shape:2 },
  { id:6, y:"33%", w:150, spd:95, del:-50,  op:0.52, shape:0 },
  { id:7, y:"3%",  w:380, spd:28, del:-15,  op:0.58, shape:1 },
];

function CloudSVG({ shape, color, w }: { shape: number; color: string; w: number }) {
  const clouds = [
    <g key="0">
      <ellipse cx={150} cy={70} rx={110} ry={48} fill={color}/>
      <ellipse cx={80}  cy={82} rx={65}  ry={38} fill={color}/>
      <ellipse cx={220} cy={78} rx={72}  ry={42} fill={color}/>
      <ellipse cx={150} cy={90} rx={120} ry={32} fill={color}/>
      <ellipse cx={130} cy={52} rx={55}  ry={32} fill={color}/>
      <ellipse cx={180} cy={48} rx={45}  ry={28} fill={color}/>
    </g>,
    <g key="1">
      <ellipse cx={110} cy={60} rx={85}  ry={36} fill={color}/>
      <ellipse cx={50}  cy={72} rx={48}  ry={28} fill={color}/>
      <ellipse cx={175} cy={68} rx={60}  ry={32} fill={color}/>
      <ellipse cx={115} cy={80} rx={95}  ry={26} fill={color}/>
      <ellipse cx={95}  cy={44} rx={42}  ry={24} fill={color}/>
    </g>,
    <g key="2">
      <ellipse cx={130} cy={65} rx={100} ry={44} fill={color}/>
      <ellipse cx={60}  cy={78} rx={55}  ry={32} fill={color}/>
      <ellipse cx={200} cy={72} rx={65}  ry={36} fill={color}/>
      <ellipse cx={130} cy={88} rx={110} ry={28} fill={color}/>
      <ellipse cx={155} cy={46} rx={50}  ry={28} fill={color}/>
      <ellipse cx={95}  cy={50} rx={40}  ry={24} fill={color}/>
    </g>,
  ];
  return (
    <svg width={w} height={Math.round(w * 0.36)} viewBox="0 0 300 108" style={{ display:"block" }}>
      {clouds[shape % 3]}
    </svg>
  );
}



// ═══════════════════════════════════════════════════════
//  MAIN EXPORT — drop-in replacement for CosmicBackground
//  Props: scrollProgress (0→1) injected from parent,
//         or it reads window.scrollY itself if omitted.
// ═══════════════════════════════════════════════════════
export function CosmicBackground({ scrollProgress: extProg }: { scrollProgress?: number; density?: number }) {
  const [scroll, setScroll]   = useState(extProg ?? 0);
  const [time,   setTime]     = useState(0);
  const rafRef                = useRef<number>(0);

  // If no external progress, drive from window scroll
  useEffect(() => {
    if (extProg !== undefined) return;
    const onScroll = () => {
      const el  = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      const p   = max > 0 ? Math.min(el.scrollTop / max, 1) : 0;
      setScroll(p);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [extProg]);

  // Sync external progress
  useEffect(() => {
    if (extProg === undefined) return;
    setScroll(extProg);
  }, [extProg]);

  // RAF loop — client-only guard required for SSR (TanStack Start)
  useEffect(() => {
    if (typeof window === "undefined" || typeof requestAnimationFrame === "undefined") return;
    let prev = performance.now();
    const tick = (now: number) => {
      const dt = (now - prev) / 1000; prev = now;
      setTime(t => t + dt);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const c = getColors(scroll);

  // Sun arc: π → 2π across scroll, rises right sets left
  const angle = Math.PI + scroll * Math.PI;
  const sunX  = 50 + Math.cos(angle) * 44;
  const sunY  = Math.max(4, 52 - Math.abs(Math.sin(angle)) * 50);
  const moonX = 50 + Math.cos(angle + Math.PI) * 38;
  const moonY = Math.max(4, 52 - Math.abs(Math.sin(angle + Math.PI)) * 46);

  const skyGrad = `linear-gradient(180deg,
    ${c.sky[0]} 0%, ${c.sky[1]} 20%, ${c.sky[2]} 45%,
    ${c.sky[3]} 70%, ${c.sky[4]} 100%)`;

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden
      style={{ background: skyGrad, zIndex: 0 }}>

      {/* SVG layer — stars, planets, horizon glows (preserveAspectRatio:none OK for these) */}
      <svg width="100%" height="100%" viewBox="0 0 100 100"
        preserveAspectRatio="none" style={{ position:"absolute", inset:0 }}>
        <defs>
          <filter id="csbg_blur1"><feGaussianBlur stdDeviation="0.6"/></filter>
          <filter id="csbg_blur2"><feGaussianBlur stdDeviation="1.2"/></filter>
          <linearGradient id="csbg_haze" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={c.sky[4]} stopOpacity="0"/>
            <stop offset="100%" stopColor={c.sky[4]} stopOpacity="0.6"/>
          </linearGradient>
        </defs>

        {/* Stars */}
        {STARS.map((s, i) => {
          const tw = 0.45 + 0.55 * Math.sin(time * (1 / parseFloat(s.spd)) + parseFloat(s.del));
          return <circle key={i} cx={s.x} cy={s.y} r={parseFloat(s.r) * 0.075}
            fill="white" opacity={c.starOp * (0.35 + 0.65 * tw)}/>;
        })}

        {/* Planets */}
        <g opacity={c.planetOp}>
          <circle cx={78} cy={20} r={2.2} fill="#3a1850"/>
          <ellipse cx={78} cy={20} rx={4.5} ry={1.0} fill="none" stroke="#3a1850" strokeWidth={0.7} opacity={0.7}/>
          <circle cx={12} cy={32} r={1.1} fill="#282848"/>
          <circle cx={88} cy={55} r={0.7} fill="#1a3828"/>
        </g>

        {/* Horizon glow */}
        <ellipse cx={50} cy={100} rx={65} ry={22}
          fill={c.horizonGlow} filter="url(#csbg_blur2)"/>
        <rect x={0} y={72} width={100} height={28}
          fill="url(#csbg_haze)" opacity={0.35} filter="url(#csbg_blur1)"/>
      </svg>

      {/* Sun — own SVG so it's never stretched by preserveAspectRatio:none */}
      <svg width={120} height={120} style={{
        position:"absolute",
        left:`${sunX}%`, top:`${sunY}%`,
        transform:"translate(-50%,-50%)",
        overflow:"visible",
        pointerEvents:"none",
      }}>
        <defs>
          <radialGradient id="csbg_sg2" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor={c.sunCol} stopOpacity="1"/>
            <stop offset="45%"  stopColor={c.sunCol} stopOpacity="0.55"/>
            <stop offset="100%" stopColor={c.sunCol} stopOpacity="0"/>
          </radialGradient>
          <filter id="csbg_sglow">
            <feGaussianBlur stdDeviation="5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <circle cx={60} cy={60} r={48} fill="url(#csbg_sg2)" opacity={0.55}/>
        <circle cx={60} cy={60} r={20} fill={c.sunCol} opacity={0.96} filter="url(#csbg_sglow)"/>
        <circle cx={60} cy={60} r={11} fill="white" opacity={0.4}/>
      </svg>

      {/* Moon — own SVG so it's never stretched */}
      <svg width={80} height={80} style={{
        position:"absolute",
        left:`${moonX}%`, top:`${moonY}%`,
        transform:"translate(-50%,-50%)",
        overflow:"visible",
        opacity: c.moonOp,
        pointerEvents:"none",
      }}>
        <defs>
          <radialGradient id="csbg_mg2" cx="35%" cy="35%" r="65%">
            <stop offset="0%"   stopColor="#f0eaff" stopOpacity="1"/>
            <stop offset="100%" stopColor="#b0a8d8" stopOpacity="0.8"/>
          </radialGradient>
          <filter id="csbg_mglow">
            <feGaussianBlur stdDeviation="4" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <circle cx={40} cy={40} r={24} fill="url(#csbg_mg2)" filter="url(#csbg_mglow)"/>
        <circle cx={50} cy={36} r={18} fill={c.sky[1]} opacity={0.88}/>
      </svg>

      {/* Clouds */}
      {CLOUDS.map(cl => (
        <div key={cl.id} style={{
          position:"absolute", top:cl.y,
          left:0, right:0, height:`${cl.w * 0.38}px`,
          overflow:"visible", opacity:cl.op,
        }}>
          {[0,1].map(inst => (
            <div key={inst} style={{
              position:"absolute", top:0,
              animation:`csbg_cloud${cl.id} ${cl.spd}s linear infinite`,
              animationDelay:`${cl.del - inst * (cl.spd / 2)}s`,
            }}>
              <CloudSVG shape={cl.shape} color={c.cloudCol} w={cl.w}/>
            </div>
          ))}
        </div>
      ))}

      {/* Cloud keyframes */}
      <style>{`
        ${CLOUDS.map(cl => `
          @keyframes csbg_cloud${cl.id} {
            from { transform: translateX(105vw); }
            to   { transform: translateX(-${cl.w + 60}px); }
          }
        `).join("")}
      `}</style>
    </div>
  );
}
