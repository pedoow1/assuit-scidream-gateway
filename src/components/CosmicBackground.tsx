import { useEffect, useRef } from "react";

export function CosmicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    let W = window.innerWidth;
    let H = window.innerHeight;
    let raf = 0;
    let t = 0;
    let scrollY = 0;

    const resize = () => {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", () => { scrollY = window.scrollY; }, { passive: true });

    // ── Seeded random ──
    const sv = (s: number, m: number, r: number) => Math.abs(Math.sin(s * m)) * r;

    // ── Stars ──
    const STARS = Array.from({ length: 320 }, (_, i) => ({
      x: sv(i, 137.5, 1),
      y: sv(i, 97.3,  1),
      r: sv(i, 73.1, i % 7 === 0 ? 2.2 : i % 3 === 0 ? 1.3 : 0.7) + 0.3,
      spd: sv(i, 53.7, 2) + 1.5,
      del: sv(i, 31.4, 6),
      bright: i % 9 === 0,
      colorIdx: i % 5,
    }));
    const STAR_COLORS = ["#ffffff", "#ccd6ff", "#ffddb3", "#b3d9ff", "#e8c8ff"];

    // ── Shooting stars ──
    const SHOOTS = Array.from({ length: 5 }, (_, i) => ({
      x: sv(i, 41.2, 0.8) + 0.05,
      y: sv(i, 29.7, 0.4) + 0.03,
      len: sv(i, 23.5, 180) + 100,
      dur: sv(i, 11.3, 3) + 3,
      del: sv(i, 89.1, 15),
    }));

    // ── Planets ──
    const PLANETS = [
      // Big lava planet bottom-left
      { xr: 0.02, yr: 0.78, r: 80, c1: "#1a1a2e", c2: "#ff6b00", c3: "#ff4500", atm: "#ff4500", hasRing: false, floatSpd: 0.3, floatAmp: 4 },
      // Blue planet top-left
      { xr: 0.05, yr: 0.06, r: 55, c1: "#0a1628", c2: "#1e40af", c3: "#3b82f6", atm: "#60a5fa", hasRing: false, floatSpd: 0.25, floatAmp: 5 },
      // Red-lava planet top-right
      { xr: 0.82, yr: 0.08, r: 42, c1: "#1a0a0a", c2: "#991b1b", c3: "#ef4444", atm: "#f87171", hasRing: false, floatSpd: 0.28, floatAmp: 4 },
      // Saturn bottom-right
      { xr: 0.84, yr: 0.78, r: 52, c1: "#1a1228", c2: "#6d28d9", c3: "#8b5cf6", atm: "#a78bfa", hasRing: true,  floatSpd: 0.22, floatAmp: 6 },
      // Small grey moon top-center
      { xr: 0.48, yr: 0.02, r: 18, c1: "#1e293b", c2: "#475569", c3: "#94a3b8", atm: "#cbd5e1", hasRing: false, floatSpd: 0.35, floatAmp: 3 },
      // Small blue moon center-right
      { xr: 0.62, yr: 0.48, r: 14, c1: "#0c1a2e", c2: "#1d4ed8", c3: "#60a5fa", atm: "#93c5fd", hasRing: false, floatSpd: 0.40, floatAmp: 2 },
    ];

    function drawPlanet(p: typeof PLANETS[0], px: number, py: number) {
      const { r, c1, c2, c3, atm, hasRing } = p;

      // Atmosphere glow
      const atmGrad = ctx.createRadialGradient(px, py, r * 0.85, px, py, r * 1.45);
      atmGrad.addColorStop(0, atm.replace(")", ",0.35)").replace("rgb", "rgba").replace("#", "rgba(").replace(")", ",0.35)"));
      atmGrad.addColorStop(1, "rgba(0,0,0,0)");
      // simpler approach:
      ctx.save();
      ctx.beginPath();
      ctx.arc(px, py, r * 1.45, 0, Math.PI * 2);
      ctx.fillStyle = atm + "44";
      ctx.fill();
      ctx.restore();

      // Ring back half (behind planet)
      if (hasRing) {
        ctx.save();
        ctx.translate(px, py);
        ctx.scale(1, 0.28);
        ctx.beginPath();
        ctx.arc(0, 0, r * 2.1, Math.PI, 0);
        ctx.strokeStyle = "rgba(196,181,253,0.45)";
        ctx.lineWidth = r * 0.38 / 0.28;
        ctx.stroke();
        ctx.restore();
      }

      // Planet body
      const grad = ctx.createRadialGradient(px - r * 0.28, py - r * 0.28, r * 0.05, px, py, r);
      grad.addColorStop(0, c3);
      grad.addColorStop(0.4, c2);
      grad.addColorStop(1, c1);
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Surface texture (bands for lava planets)
      if (c2.includes("b1b") || c2.includes("40af") || c2.includes("28d9") || c2.includes("991b")) {
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.clip();
        for (let b = -r; b < r; b += r * 0.22) {
          ctx.beginPath();
          ctx.ellipse(px, py + b, r, r * 0.08, 0, 0, Math.PI * 2);
          ctx.fillStyle = c3;
          ctx.fill();
        }
        ctx.restore();
      }

      // Highlight
      const hl = ctx.createRadialGradient(px - r * 0.32, py - r * 0.32, 0, px - r * 0.1, py - r * 0.1, r * 0.65);
      hl.addColorStop(0, "rgba(255,255,255,0.28)");
      hl.addColorStop(1, "rgba(255,255,255,0)");
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = hl;
      ctx.fill();

      // Ring front half (in front of planet)
      if (hasRing) {
        ctx.save();
        ctx.translate(px, py);
        ctx.scale(1, 0.28);
        ctx.beginPath();
        ctx.arc(0, 0, r * 2.1, 0, Math.PI);
        ctx.strokeStyle = "rgba(216,180,254,0.60)";
        ctx.lineWidth = r * 0.38 / 0.28;
        ctx.stroke();
        ctx.restore();
      }
    }

    function drawGalaxy(cx: number, cy: number, r: number, angle: number) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);

      // Outer haze
      const haze = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r * 1.1);
      haze.addColorStop(0, "rgba(109,40,217,0.0)");
      haze.addColorStop(0.5, "rgba(79,70,229,0.07)");
      haze.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.1, 0, Math.PI * 2);
      ctx.fillStyle = haze;
      ctx.fill();

      // Spiral arms
      const arms = 3;
      for (let arm = 0; arm < arms; arm++) {
        const armAngle = (arm / arms) * Math.PI * 2;
        for (let i = 0; i < 300; i++) {
          const frac = i / 300;
          const spiral = frac * Math.PI * 3.5 + armAngle + t * 0.04;
          const dist = frac * r;
          const x = Math.cos(spiral) * dist;
          const y = Math.sin(spiral) * dist * 0.38; // flatten
          const alpha = (1 - frac) * 0.22 * (0.6 + 0.4 * Math.sin(frac * 8));
          const size = (1 - frac * 0.7) * 3.5;

          // color varies: purple → blue → white at core
          let color: string;
          if (frac < 0.15) color = `rgba(255,248,230,${alpha * 1.4})`;
          else if (frac < 0.35) color = `rgba(192,162,252,${alpha * 1.2})`;
          else if (frac < 0.6) color = `rgba(129,140,248,${alpha})`;
          else color = `rgba(88,28,220,${alpha * 0.8})`;

          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
        }
      }

      // Dust lanes
      ctx.save();
      ctx.scale(1, 0.38);
      const dust = ctx.createRadialGradient(0, 0, r * 0.05, 0, 0, r * 0.55);
      dust.addColorStop(0, "rgba(20,10,40,0.55)");
      dust.addColorStop(0.4, "rgba(10,5,25,0.30)");
      dust.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = dust;
      ctx.fill();
      ctx.restore();

      // Bright core
      const core = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.22);
      core.addColorStop(0, "rgba(255,252,220,0.95)");
      core.addColorStop(0.2, "rgba(255,220,130,0.70)");
      core.addColorStop(0.5, "rgba(200,150,255,0.40)");
      core.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = core;
      ctx.fill();

      // Core star
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.04, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fill();

      ctx.restore();
    }

    function draw() {
      t += 0.008;
      ctx.clearRect(0, 0, W, H);

      // ── Deep space background ──
      const bg = ctx.createRadialGradient(W * 0.55, H * 0.35, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.85);
      bg.addColorStop(0,   "#0d0520");
      bg.addColorStop(0.3, "#080118");
      bg.addColorStop(0.7, "#040010");
      bg.addColorStop(1,   "#000000");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // ── Nebula clouds ──
      const nebulas = [
        { x: 0.55, y: 0.32, rx: 0.28, ry: 0.18, c: "rgba(88,28,220,", a: 0.09 },
        { x: 0.30, y: 0.20, rx: 0.20, ry: 0.12, c: "rgba(29,78,216,",  a: 0.08 },
        { x: 0.72, y: 0.58, rx: 0.18, ry: 0.11, c: "rgba(6,182,212,",  a: 0.07 },
        { x: 0.20, y: 0.55, rx: 0.15, ry: 0.09, c: "rgba(139,92,246,", a: 0.08 },
        { x: 0.68, y: 0.22, rx: 0.16, ry: 0.10, c: "rgba(219,39,119,", a: 0.06 },
      ];
      nebulas.forEach(n => {
        const ng = ctx.createRadialGradient(n.x*W, n.y*H, 0, n.x*W, n.y*H, n.rx*W);
        ng.addColorStop(0, n.c + (n.a * 1.5) + ")");
        ng.addColorStop(0.5, n.c + n.a + ")");
        ng.addColorStop(1, "rgba(0,0,0,0)");
        ctx.save();
        ctx.scale(1, n.ry / n.rx);
        ctx.beginPath();
        ctx.arc(n.x*W, n.y*H / (n.ry/n.rx), n.rx*W, 0, Math.PI*2);
        ctx.fillStyle = ng;
        ctx.fill();
        ctx.restore();
      });

      // ── Galaxy ──
      const gx = W * 0.54, gy = H * 0.34;
      const gr = Math.min(W, H) * 0.30;
      drawGalaxy(gx, gy, gr, -0.4);

      // ── Stars (parallax) ──
      const pOffset = scrollY * 0.08;
      STARS.forEach(s => {
        const tw = 0.3 + 0.7 * Math.sin(t / s.spd + s.del);
        const op = 0.2 + 0.8 * tw;
        const px = s.x * W;
        const py = (s.y * H * 1.3 - pOffset) % (H * 1.2);
        const col = STAR_COLORS[s.colorIdx];

        if (s.bright) {
          // Cross sparkle
          ctx.save();
          ctx.globalAlpha = op * 0.6;
          ctx.strokeStyle = col;
          ctx.lineWidth = 0.5;
          const cs = s.r * 4;
          ctx.beginPath(); ctx.moveTo(px - cs, py); ctx.lineTo(px + cs, py); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(px, py - cs); ctx.lineTo(px, py + cs); ctx.stroke();
          ctx.restore();
        }

        // Glow
        const sg = ctx.createRadialGradient(px, py, 0, px, py, s.r * 3);
        sg.addColorStop(0, col.replace("#", "rgba(").replace(/(..)(..)(..)/, (_, r, g, b) =>
          `${parseInt(r,16)},${parseInt(g,16)},${parseInt(b,16)},`) + (op * 0.18) + ")");
        sg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.arc(px, py, s.r * 3, 0, Math.PI * 2);
        ctx.fillStyle = sg;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, s.r * 0.9, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.globalAlpha = op;
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // ── Planets ──
      PLANETS.forEach(p => {
        const px = p.xr * W;
        const py = p.yr * H + Math.sin(t * p.floatSpd) * p.floatAmp;
        drawPlanet(p, px, py);
      });

      // ── Shooting stars ──
      SHOOTS.forEach(s => {
        const cycle = (t + s.del) % s.dur;
        const frac  = cycle / s.dur;
        if (frac > 0.85) return;
        const alpha = frac < 0.06 ? frac / 0.06 : frac > 0.7 ? 1 - (frac - 0.7) / 0.15 : 1;
        const sx = (s.x + frac * 0.55) * W;
        const sy = (s.y + frac * 0.28) * H;
        const ex = sx - s.len * Math.cos(0.38);
        const ey = sy - s.len * Math.sin(0.38);
        const sg = ctx.createLinearGradient(sx, sy, ex, ey);
        sg.addColorStop(0, `rgba(255,255,255,${alpha * 0.95})`);
        sg.addColorStop(0.3, `rgba(200,180,255,${alpha * 0.5})`);
        sg.addColorStop(1, "rgba(255,255,255,0)");
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = sg;
        ctx.lineWidth = 1.8;
        ctx.stroke();
      });

      // ── Vignette ──
      const vig = ctx.createRadialGradient(W/2, H/2, H*0.25, W/2, H/2, H*0.85);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.65)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 0, display: "block" }}
    />
  );
}
