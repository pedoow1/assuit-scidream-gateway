import { useEffect, useState, useRef } from "react";

// ── ضع هنا رابط الفيديو من Supabase بعد الرفع ──
const VIDEO_URL = "https://zkojnnxqxbjbdxtniucp.supabase.co/storage/v1/object/public/images/6151238-hd_1920_1080_30fps.mp4";

interface Props {
  onComplete: () => void;
}

export function IntroSequence({ onComplete }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // مراحل الـ intro
  // 0 = شاشة سوداء + "يوم ما"
  // 1 = الكلمات بتتقلب → "Dream Team"
  // 2 = الفيديو بيظهر
  // 3 = انتهى
  const [phase, setPhase] = useState(0);
  const [flipping, setFlipping] = useState(false);
  const [videoVisible, setVideoVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // المرحلة 0: "يوم ما" لمدة 1.2 ثانية
    const t1 = setTimeout(() => {
      setFlipping(true); // بدء animation القلب
    }, 1200);

    // المرحلة 1: بعد القلب (800ms) → إظهار الفيديو
    const t2 = setTimeout(() => {
      setFlipping(false);
      setPhase(1);
      setVideoVisible(true);
      videoRef.current?.play().catch(() => {});
    }, 2200);

    // المرحلة 2: بعد ما الفيديو اتشال شوية (2.5 ثانية) → exit
    const t3 = setTimeout(() => {
      setExiting(true);
    }, 4800);

    // المرحلة 3: انتهى
    const t4 = setTimeout(() => {
      onComplete();
    }, 5500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        opacity: exiting ? 0 : 1,
        transition: exiting ? "opacity 0.7s ease-in-out" : "none",
      }}
    >
      {/* فيديو الخلفية */}
      <video
        ref={videoRef}
        src={VIDEO_URL}
        muted
        playsInline
        loop
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: videoVisible ? 0.55 : 0,
          transition: "opacity 1.4s ease-in-out",
          pointerEvents: "none",
        }}
      />

      {/* overlay فوق الفيديو */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: videoVisible
            ? "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0.6) 100%)"
            : "transparent",
          transition: "background 1.4s ease-in-out",
        }}
      />

      {/* النص في المنتصف */}
      <div style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
        <WordFlip flipping={flipping} phase={phase} />
      </div>
    </div>
  );
}

/* ── مكون القلب ── */
function WordFlip({ flipping, phase }: { flipping: boolean; phase: number }) {
  // الكلمتين: "يوم" + "ما" تتقلبوا لـ "Dream" + "Team"
  const word1Before = "يوم";
  const word1After  = "Dream";
  const word2Before = "ما";
  const word2After  = "Team";

  const showAfter = phase === 1;

  return (
    <div
      dir="ltr"
      style={{
        fontFamily: "'Cairo', 'Helvetica Neue', sans-serif",
        fontWeight: 300,
        letterSpacing: "0.08em",
        display: "flex",
        gap: "0.5em",
        alignItems: "baseline",
        justifyContent: "center",
      }}
    >
      <FlipWord
        before={word1Before}
        after={word1After}
        flipping={flipping}
        showAfter={showAfter}
        delay={0}
      />
      <FlipWord
        before={word2Before}
        after={word2After}
        flipping={flipping}
        showAfter={showAfter}
        delay={80}
      />
    </div>
  );
}

function FlipWord({
  before,
  after,
  flipping,
  showAfter,
  delay,
}: {
  before: string;
  after: string;
  flipping: boolean;
  showAfter: boolean;
  delay: number;
}) {
  const [visible, setVisible] = useState(true);
  const [current, setCurrent] = useState(before);

  useEffect(() => {
    if (!flipping) return;
    const t1 = setTimeout(() => setVisible(false), delay);
    const t2 = setTimeout(() => {
      setCurrent(after);
      setVisible(true);
    }, delay + 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [flipping, after, delay]);

  const isAfter = current === after;

  return (
    <span
      style={{
        display: "inline-block",
        fontSize: isAfter ? "clamp(2.8rem, 8vw, 5rem)" : "clamp(1.6rem, 5vw, 2.8rem)",
        color: isAfter ? "#ffffff" : "rgba(255,255,255,0.70)",
        fontWeight: isAfter ? 700 : 300,
        letterSpacing: isAfter ? "0.04em" : "0.10em",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : flipping ? "translateY(-18px)" : "translateY(18px)",
        transition: `opacity 0.35s ease, transform 0.35s ease, font-size 0.4s ease, color 0.4s ease`,
        transitionDelay: `${delay}ms`,
        willChange: "transform, opacity",
      }}
    >
      {current}
    </span>
  );
}
