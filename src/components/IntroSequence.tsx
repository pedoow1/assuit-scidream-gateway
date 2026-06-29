import { useEffect, useState, useRef } from "react";

const VIDEO_URL = "https://zkojnnxqxbjbdxtniucp.supabase.co/storage/v1/object/public/images/6151238-hd_1920_1080_30fps.mp4";

interface Props {
  onComplete: () => void;
}

export function IntroSequence({ onComplete }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [flipping, setFlipping]         = useState(false);
  const [phase, setPhase]               = useState(0); // 0=before 1=after
  const [videoVisible, setVideoVisible] = useState(false);
  const [exiting, setExiting]           = useState(false);

  useEffect(() => {
    // فيديو يبدأ على طول في الخلفية بصوت معدوم
    videoRef.current?.play().catch(() => {});

    // بعد 0.8s الفيديو يبدأ يظهر بـ fade
    const t0 = setTimeout(() => setVideoVisible(true), 800);

    // بعد 1.5s "يوما ما" تبدأ تتقلب
    const t1 = setTimeout(() => setFlipping(true), 1500);

    // بعد 400ms من بداية القلب → غيّر للكلمات الجديدة
    const t2 = setTimeout(() => {
      setPhase(1);
      setFlipping(false);
    }, 2000);

    // بعد 2s من ظهور "Dream Team" → ابدأ الخروج
    const t3 = setTimeout(() => setExiting(true), 4200);

    // اكتمل
    const t4 = setTimeout(() => onComplete(), 4900);

    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onComplete]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        background: "#000",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
        opacity: exiting ? 0 : 1,
        transition: exiting ? "opacity 0.7s ease-in-out" : "none",
      }}
    >
      {/* فيديو الخلفية */}
      <video
        ref={videoRef}
        src={VIDEO_URL}
        muted playsInline loop
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%", objectFit: "cover",
          opacity: videoVisible ? 0.60 : 0,
          transition: "opacity 1.6s ease-in-out",
          pointerEvents: "none",
        }}
      />

      {/* overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.65) 100%)",
      }} />

      {/* النص */}
      <div style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
        <WordFlip flipping={flipping} phase={phase} />
      </div>
    </div>
  );
}

/* ── VideoBackground — يُستخدم في الصفحة الرئيسية كخلفية دائمة ── */
export function VideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    videoRef.current?.play().catch(() => {});
  }, []);

  return (
    <>
      <video
        ref={videoRef}
        src={VIDEO_URL}
        muted playsInline loop autoPlay
        style={{
          position: "fixed", inset: 0, zIndex: 0,
          width: "100%", height: "100%", objectFit: "cover",
          pointerEvents: "none",
        }}
      />
      {/* overlay يخلي النص يقرأ */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 1,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.30) 40%, rgba(0,0,0,0.65) 100%)",
        pointerEvents: "none",
      }} />
    </>
  );
}

/* ── Word Flip ── */
function WordFlip({ flipping, phase }: { flipping: boolean; phase: number }) {
  return (
    <div
      dir="rtl"
      style={{
        fontFamily: "'Cairo', sans-serif",
        display: "flex", gap: "0.4em",
        alignItems: "baseline", justifyContent: "center",
        flexDirection: "row",
      }}
    >
      {/* الكلمة الأولى: "يوما" → "Dream" */}
      <FlipWord before="يوما" after="Dream" flipping={flipping} phase={phase} delay={0} />
      {/* الكلمة الثانية: "ما" → "Team" */}
      <FlipWord before="ما" after="Team"  flipping={flipping} phase={phase} delay={100} />
    </div>
  );
}

function FlipWord({
  before, after, flipping, phase, delay,
}: {
  before: string; after: string;
  flipping: boolean; phase: number; delay: number;
}) {
  const [visible, setVisible]   = useState(true);
  const [current, setCurrent]   = useState(before);

  useEffect(() => {
    if (!flipping) return;
    const t1 = setTimeout(() => setVisible(false), delay);
    const t2 = setTimeout(() => { setCurrent(after); setVisible(true); }, delay + 380);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [flipping, after, delay]);

  // لما phase يتغير للـ before مجدداً (مش هيحصل هنا بس احتياط)
  useEffect(() => {
    if (phase === 0) setCurrent(before);
  }, [phase, before]);

  const isAfter = current === after;

  return (
    <span
      style={{
        display: "inline-block",
        fontSize: isAfter ? "clamp(3rem, 9vw, 5.5rem)" : "clamp(1.8rem, 5.5vw, 3rem)",
        color: "#ffffff",
        fontWeight: isAfter ? 700 : 300,
        letterSpacing: isAfter ? "0.03em" : "0.12em",
        opacity: visible ? 1 : 0,
        transform: visible
          ? "translateY(0px)"
          : flipping ? "translateY(-20px)" : "translateY(20px)",
        transition: "opacity 0.35s ease, transform 0.35s ease, font-size 0.45s ease, font-weight 0.3s ease",
        transitionDelay: `${delay}ms`,
      }}
    >
      {current}
    </span>
  );
}
