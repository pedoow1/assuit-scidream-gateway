import { useEffect, useState, useRef } from "react";

const VIDEO_INTRO = "https://zkojnnxqxbjbdxtniucp.supabase.co/storage/v1/object/public/images/6151238-hd_1920_1080_30fps.mp4";
const VIDEO_BG    = "https://zkojnnxqxbjbdxtniucp.supabase.co/storage/v1/object/public/images/12665387_2088_720_60fps.mp4";

interface Props {
  onComplete: () => void;
}

export function IntroSequence({ onComplete }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [flipping, setFlipping]         = useState(false);
  const [phase, setPhase]               = useState(0);
  const [videoVisible, setVideoVisible] = useState(false);
  const [exiting, setExiting]           = useState(false);

  useEffect(() => {
    videoRef.current?.play().catch(() => {});
    const t0 = setTimeout(() => setVideoVisible(true), 800);
    const t1 = setTimeout(() => setFlipping(true), 1500);
    const t2 = setTimeout(() => { setPhase(1); setFlipping(false); }, 2000);
    const t3 = setTimeout(() => setExiting(true), 4200);
    const t4 = setTimeout(() => onComplete(), 4900);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onComplete]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      background: "#000",
      display: "flex", alignItems: "center", justifyContent: "center",
      overflow: "hidden",
      opacity: exiting ? 0 : 1,
      transition: exiting ? "opacity 0.7s ease-in-out" : "none",
    }}>
      <video
        ref={videoRef} src={VIDEO_INTRO} muted playsInline loop
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%", objectFit: "cover",
          opacity: videoVisible ? 0.60 : 0,
          transition: "opacity 1.6s ease-in-out",
          pointerEvents: "none",
        }}
      />
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.65) 100%)",
      }} />
      <div style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
        <WordFlip flipping={flipping} phase={phase} />
      </div>
    </div>
  );
}

/* ── خلفية الصفحة الرئيسية ── */
export function VideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => { videoRef.current?.play().catch(() => {}); }, []);
  return (
    <>
      <video
        ref={videoRef} src={VIDEO_BG}
        muted playsInline loop autoPlay
        style={{
          position: "fixed", inset: 0, zIndex: 0,
          width: "100%", height: "100%", objectFit: "cover",
          pointerEvents: "none",
        }}
      />
      <div style={{
        position: "fixed", inset: 0, zIndex: 1,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.30) 40%, rgba(0,0,0,0.65) 100%)",
        pointerEvents: "none",
      }} />
    </>
  );
}

/* ── خلفية سوداء + نجوم للصفحات الداخلية ── */
export function StarsBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let W = 0, H = 0, raf = 0, t = 0;

    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);

    const sv = (i: number, m: number) => Math.abs(Math.sin(i * m));

    const STARS = Array.from({ length: 260 }, (_, i) => {
      const big    = i < 12;
      const medium = i < 60;
      return {
        x:   sv(i, 137.508),
        y:   sv(i, 97.321),
        r:   big    ? sv(i, 73.1) * 1.8 + 1.2
           : medium ? sv(i, 73.1) * 0.9 + 0.5
           :          sv(i, 73.1) * 0.4 + 0.15,
        spd: big    ? sv(i, 53.7) * 1.2 + 0.8
           : medium ? sv(i, 53.7) * 2.5 + 1.5
           :          sv(i, 53.7) * 4.0 + 2.5,
        del: sv(i, 31.4) * Math.PI * 2,
        hue: i % 9 === 0 ? 220 : i % 7 === 0 ? 45 : 0,
        big, medium,
      };
    });

    function draw() {
      t += 0.006;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, W, H);

      STARS.forEach(s => {
        const tw = 0.5 + 0.5 * Math.sin(t / s.spd + s.del);
        const op = s.big    ? 0.35 + 0.65 * tw
                 : s.medium ? 0.10 + 0.65 * tw
                 :            0.04 + 0.40 * tw;
        const px = s.x * W;
        const py = s.y * H;
        const col = s.hue === 220 ? `rgba(180,200,255,${op})`
                  : s.hue === 45  ? `rgba(255,240,180,${op})`
                  :                 `rgba(255,255,255,${op})`;

        // glow للنجوم الكبيرة
        if (s.big) {
          const g = ctx.createRadialGradient(px, py, 0, px, py, s.r * 6);
          g.addColorStop(0, `rgba(255,255,255,${op * 0.3})`);
          g.addColorStop(1, "rgba(0,0,0,0)");
          ctx.beginPath(); ctx.arc(px, py, s.r * 6, 0, Math.PI * 2);
          ctx.fillStyle = g; ctx.fill();

          // وميض صليبي لما النجمة في أوج لمعانها
          if (tw > 0.80) {
            const len = s.r * 5 * (tw - 0.80) * 5;
            ctx.save();
            ctx.globalAlpha = (tw - 0.80) * 3;
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 0.6;
            ctx.beginPath(); ctx.moveTo(px - len, py); ctx.lineTo(px + len, py); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(px, py - len); ctx.lineTo(px, py + len); ctx.stroke();
            ctx.restore();
          }
        }

        ctx.beginPath();
        ctx.arc(px, py, s.r, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.fill();
      });

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 0, background: "#000" }}
    />
  );
}

/* ── Word Flip ── */
function WordFlip({ flipping, phase }: { flipping: boolean; phase: number }) {
  return (
    <div dir="ltr" style={{
      fontFamily: "'Cairo', sans-serif",
      display: "flex", gap: "0.4em",
      alignItems: "baseline", justifyContent: "center",
    }}>
      <FlipWord before="يوما" after="Dream" flipping={flipping} phase={phase} delay={0} />
      <FlipWord before="ما"   after="Team"  flipping={flipping} phase={phase} delay={100} />
    </div>
  );
}

function FlipWord({ before, after, flipping, phase, delay }: {
  before: string; after: string; flipping: boolean; phase: number; delay: number;
}) {
  const [visible, setVisible] = useState(true);
  const [current, setCurrent] = useState(before);

  useEffect(() => {
    if (!flipping) return;
    const t1 = setTimeout(() => setVisible(false), delay);
    const t2 = setTimeout(() => { setCurrent(after); setVisible(true); }, delay + 380);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [flipping, after, delay]);

  useEffect(() => { if (phase === 0) setCurrent(before); }, [phase, before]);

  const isAfter = current === after;
  return (
    <span style={{
      display: "inline-block",
      fontSize: isAfter ? "clamp(3rem, 9vw, 5.5rem)" : "clamp(1.8rem, 5.5vw, 3rem)",
      color: "#ffffff",
      fontWeight: isAfter ? 700 : 300,
      letterSpacing: isAfter ? "0.03em" : "0.12em",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0px)" : flipping ? "translateY(-20px)" : "translateY(20px)",
      transition: "opacity 0.35s ease, transform 0.35s ease, font-size 0.45s ease",
      transitionDelay: `${delay}ms`,
    }}>
      {current}
    </span>
  );
}
