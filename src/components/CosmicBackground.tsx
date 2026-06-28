import { useEffect, useRef, useState, useMemo } from "react";

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

// 130 stars, precomputed
const STARS = Array.from({ length: 130 }, (_, i) => ({
  x: ((Math.sin(i * 137.508) * 0.5 + 0.5) * 100).toFixed(2),
  y: ((Math.cos(i * 97.3) * 0.5 + 0.5) * 75).toFixed(2),
  r: (Math.random() * 1.5 + 0.5).toFixed(2),
  spd: (Math.random() * 1.5 + 1.2).toFixed(2),
  del: (Math.random() * 4).toFixed(2),
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

function FlyingBoy({ glow }: { glow: string }) {
  return (
    <svg width={130} height={155} viewBox="-65 -80 130 155"
      style={{ filter: `drop-shadow(0 6px 20px ${glow})` }}>
      {/* Aura rings */}
      <ellipse cx={0} cy={0} rx={58} ry={58} fill="none" stroke={glow} strokeWidth={14} opacity={0.18}/>
      <ellipse cx={0} cy={0} rx={42} ry={42} fill="none" stroke={glow} strokeWidth={8}  opacity={0.12}/>
      {/* Body jacket */}
      <ellipse cx={0} cy={2} rx={20} ry={26} fill="#160828"/>
      <path d="M-12,20 Q0,34 12,20" stroke="#4a1060" strokeWidth={3} fill="none" strokeLinecap="round"/>
      <path d="M-8,-6 Q0,8 8,-6"    stroke="#d04060" strokeWidth={2.5} fill="none" strokeLinecap="round"/>
      {/* Cape */}
      <path d="M12,-10 Q38,2 40,24 Q30,35 18,22 Q20,8 12,-10 Z" fill="rgba(180,40,70,0.72)"/>
      {/* Head */}
      <circle cx={0} cy={-36} r={17} fill="#f0c878"/>
      {/* Hair spiky */}
      <ellipse cx={0}   cy={-48} rx={16} ry={9}  fill="#120810"/>
      <ellipse cx={-10} cy={-44} rx={7}  ry={12} fill="#120810"/>
      <ellipse cx={10}  cy={-44} rx={6}  ry={10} fill="#120810" transform="rotate(12,10,-44)"/>
      <ellipse cx={0}   cy={-50} rx={5}  ry={7}  fill="#120810" transform="rotate(-8,0,-50)"/>
      <ellipse cx={-16} cy={-34} rx={4}  ry={5}  fill="#e0b860"/>
      {/* Right arm up */}
      <path d="M14,-12 Q32,-28 44,-42" stroke="#160828" strokeWidth={11} fill="none" strokeLinecap="round"/>
      <ellipse cx={46} cy={-44} rx={8} ry={10} fill="#f0c878" transform="rotate(-35,46,-44)"/>
      {/* Left arm back */}
      <path d="M-14,-6 Q-24,10 -28,24" stroke="#100620" strokeWidth={10} fill="none" strokeLinecap="round"/>
      <ellipse cx={-28} cy={26} rx={7} ry={9} fill="#e0b860" transform="rotate(18,-28,26)"/>
      {/* Legs */}
      <path d="M-7,22 Q-18,40 -24,58" stroke="#160828" strokeWidth={11} fill="none" strokeLinecap="round"/>
      <path d="M7,22 Q18,34 26,48"    stroke="#100620" strokeWidth={10} fill="none" strokeLinecap="round"/>
      {/* Shoes */}
      <ellipse cx={-26} cy={62} rx={11} ry={7} fill="#080808" transform="rotate(-22,-26,62)"/>
      <ellipse cx={28}  cy={52} rx={11} ry={7} fill="#080808" transform="rotate(18,28,52)"/>
    </svg>
  );
}

// ═══ Sparkle Trail ═══
function SparkleTrail({ boyX, boyY, time }: { boyX: number; boyY: number; time: number }) {
  const sparks = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => ({
      ox: 2 + i * 1.8,
      oy: Math.sin(i * 1.3) * 3,
      sz: 3 + i * 0.8,
      dp: i * 0.12,
    })), []);

  return (
    <>
      {sparks.map((s, i) => {
        const alpha = 0.25 + 0.45 * Math.sin(time * 2.8 + s.dp * 10);
        const sc   = 0.4  + 0.6  * Math.sin(time * 2.2 + s.dp * 8);
        return (
          <div key={i} style={{
            position:"absolute",
            left:`${boyX + s.ox}%`,
            top:`${boyY + s.oy - 4}%`,
            width:s.sz, height:s.sz,
            borderRadius:"50%",
            background:`rgba(255,215,100,${alpha})`,
            transform:`translate(-50%,-50%) scale(${sc})`,
            boxShadow:`0 0 ${s.sz * 2.5}px rgba(255,200,80,${alpha * 0.6})`,
            pointerEvents:"none",
          }}/>
        );
      })}
    </>
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
  const [boyX,   setBoyX]     = useState(108);
  const boyTargetRef = useRef(108);
  const rafRef       = useRef<number>(0);

  // If no external progress, drive from window scroll
  useEffect(() => {
    if (extProg !== undefined) return;
    const onScroll = () => {
      const el  = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      const p   = max > 0 ? Math.min(el.scrollTop / max, 1) : 0;
      setScroll(p);
      boyTargetRef.current = 108 - p * 128;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [extProg]);

  // Sync external progress
  useEffect(() => {
    if (extProg === undefined) return;
    setScroll(extProg);
    boyTargetRef.current = 108 - extProg * 128;
  }, [extProg]);

  // RAF loop
  useEffect(() => {
    let prev = performance.now();
    const tick = (now: number) => {
      const dt = (now - prev) / 1000; prev = now;
      setTime(t => t + dt);
      setBoyX(x => x + (boyTargetRef.current - x) * 0.035);
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

  const boyY  = 38 + Math.sin(time * 0.7) * 2.8;

  const skyGrad = `linear-gradient(180deg,
    ${c.sky[0]} 0%, ${c.sky[1]} 20%, ${c.sky[2]} 45%,
    ${c.sky[3]} 70%, ${c.sky[4]} 100%)`;

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden
      style={{ background: skyGrad, zIndex: 0 }}>

      {/* SVG layer — stars, sun, moon, planets, glows */}
      <svg width="100%" height="100%" viewBox="0 0 100 100"
        preserveAspectRatio="none" style={{ position:"absolute", inset:0 }}>
        <defs>
          <radialGradient id="csbg_sg" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor={c.sunCol} stopOpacity="1"/>
            <stop offset="45%"  stopColor={c.sunCol} stopOpacity="0.55"/>
            <stop offset="100%" stopColor={c.sunCol} stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="csbg_mg" cx="35%" cy="35%" r="65%">
            <stop offset="0%"   stopColor="#f0eaff" stopOpacity="1"/>
            <stop offset="100%" stopColor="#b0a8d8" stopOpacity="0.8"/>
          </radialGradient>
          <filter id="csbg_blur1"><feGaussianBlur stdDeviation="0.6"/></filter>
          <filter id="csbg_blur2"><feGaussianBlur stdDeviation="1.2"/></filter>
          <filter id="csbg_glow">
            <feGaussianBlur stdDeviation="1.0" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
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

        {/* Sun halo + body */}
        <ellipse cx={sunX} cy={sunY} rx={10} ry={9}
          fill="url(#csbg_sg)" opacity={0.55} filter="url(#csbg_blur2)"/>
        <circle cx={sunX} cy={sunY} r={3.8}
          fill={c.sunCol} opacity={0.96} filter="url(#csbg_glow)"/>
        <circle cx={sunX} cy={sunY} r={2.2} fill="white" opacity={0.4}/>

        {/* Moon */}
        <g opacity={c.moonOp}>
          <circle cx={moonX} cy={moonY} r={2.8} fill="url(#csbg_mg)" filter="url(#csbg_glow)"/>
          <circle cx={moonX + 1.1} cy={moonY - 0.4} r={2.2} fill={c.sky[1]} opacity={0.9}/>
        </g>

        {/* Horizon glow */}
        <ellipse cx={50} cy={100} rx={65} ry={22}
          fill={c.horizonGlow} filter="url(#csbg_blur2)"/>
        <rect x={0} y={72} width={100} height={28}
          fill="url(#csbg_haze)" opacity={0.35} filter="url(#csbg_blur1)"/>
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

      {/* Flying boy */}
      <div style={{
        position:"absolute",
        left:`${boyX}%`,
        top:`${boyY}%`,
        transform:"translate(-50%,-50%)",
        zIndex:10,
        pointerEvents:"none",
      }}>
        <FlyingBoy glow={c.sunGlow}/>
        {/* Speed lines */}
        {scroll > 0.02 && (
          <svg width={80} height={60} viewBox="0 0 80 60" style={{
            position:"absolute", right:"100%", top:"30%",
            opacity: Math.min(0.7, scroll * 3),
          }}>
            {([
              [10,55],[25,42],[35,60],[45,35],[5,48],
            ] as [number,number][]).map(([y,len],i) => (
              <line key={i} x1={80} y1={y} x2={80-len} y2={y}
                stroke="rgba(255,220,140,0.28)" strokeWidth={1.5} strokeLinecap="round"/>
            ))}
          </svg>
        )}
      </div>

      {/* Sparkle trail */}
      <SparkleTrail boyX={boyX} boyY={boyY} time={time}/>

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
