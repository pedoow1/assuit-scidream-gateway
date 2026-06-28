import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Sparkles, ArrowLeft, ShieldCheck, BookOpen, Target, Eye, Users, GraduationCap, FlaskConical, Globe } from "lucide-react";
import { CosmicBackground } from "@/components/CosmicBackground";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Assuit SciDream — بوابة عباقرة كلية العلوم" },
      { name: "description", content: "منصة Dream Team لطلاب كلية العلوم جامعة أسيوط — مواد، اختبارات، حاسبة GPA، مساعد ذكي، وإعلانات الكلية." },
      { property: "og:title", content: "Assuit SciDream" },
      { property: "og:description", content: "بوابة عباقرة كلية العلوم — جامعة أسيوط" },
    ],
  }),
  component: LandingPage,
});


const DEGREES_SINGLE = [
  "الرياضيات", "الإحصاء", "علوم الحاسب", "الفيزياء",
  "الكيمياء", "الجيولوجيا", "الجيوفيزياء", "جيولوجيا البترول",
  "النبات", "الميكروبيولوجي", "علم الحيوان", "الحشرات", "علم المصايد",
];

const DEGREES_DOUBLE = [
  "الفيزياء والإلكترونيات", "الرياضيات والفيزياء", "الفيزياء والكيمياء",
  "الكيمياء والجيولوجيا", "الكيمياء والنبات", "الكيمياء والميكروبيولوجي",
  "الكيمياء وعلم الحيوان", "الكيمياء والحشرات",
];

const GOALS = [
  { icon: BookOpen, text: "بناء مؤسسة تعليمية قادرة على مواكبة التطور المستمر في العلوم الأساسية وتطبيقاتها." },
  { icon: GraduationCap, text: "تخريج أجيال متميزة قادرة على المنافسة في سوق العمل واستيعاب التكنولوجيا الحديثة." },
  { icon: FlaskConical, text: "التطوير والتحديث المستمر للبرامج التعليمية والبحثية." },
  { icon: Users, text: "القيام بدور مؤثر في تنمية المجتمع عبر برامج التدريب والتوعية والاستشارات." },
  { icon: Globe, text: "العمل على خلق وتنمية العلاقات الدولية وخاصة العربية والأفريقية من خلال التبادل العلمي والثقافي." },
  { icon: Target, text: "تعميق الولاء الوطني والمحافظة على مبادئ المجتمع والقيم الإسلامية النبيلة." },
];

function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end end"] });

  // Sky color transitions: sunrise → day → golden hour → sunset
  const skyColor = useTransform(
    scrollYProgress,
    [0, 0.25, 0.5, 0.75, 1],
    [
      "linear-gradient(180deg, #ff9a5c 0%, #ffcf77 30%, #ffe8a0 60%, #c8e8d8 100%)",   // شروق
      "linear-gradient(180deg, #87ceeb 0%, #b0dff0 35%, #d8f0f8 65%, #e8f5e0 100%)",   // نهار
      "linear-gradient(180deg, #5b9bd5 0%, #87ceeb 35%, #c5e8f5 65%, #d8f0e0 100%)",   // ظهر
      "linear-gradient(180deg, #f4a460 0%, #ff8c42 25%, #ffb347 50%, #ffd700 70%, #c8e890 100%)", // عصر
      "linear-gradient(180deg, #2c1654 0%, #8b2fc9 20%, #e05c5c 40%, #ff8c42 60%, #ffd700 80%, #4a7c59 100%)", // غروب
    ]
  );

  // Sun position: rises from bottom-right, sets to bottom-left
  const sunX = useTransform(scrollYProgress, [0, 1], ["75%", "25%"]);
  const sunY = useTransform(scrollYProgress, [0, 0.5, 1], ["60%", "8%", "55%"]);
  const sunColor = useTransform(
    scrollYProgress,
    [0, 0.25, 0.5, 0.75, 1],
    ["rgba(255,180,80,0.9)", "rgba(255,230,100,0.7)", "rgba(255,220,80,0.6)", "rgba(255,140,50,0.85)", "rgba(255,80,30,0.8)"]
  );
  const sunSize = useTransform(scrollYProgress, [0, 0.5, 1], ["80px", "60px", "90px"]);

  // Clouds parallax
  const cloudsX = useTransform(scrollYProgress, [0, 1], ["0%", "-15%"]);
  const cloudsOpacity = useTransform(scrollYProgress, [0, 0.4, 0.7, 1], [0.7, 0.9, 0.8, 0.5]);

  // River shimmer
  const riverOpacity = useTransform(scrollYProgress, [0, 0.3, 1], [0.4, 0.7, 0.9]);
  const riverColor = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    ["rgba(255,180,100,0.5)", "rgba(100,180,230,0.6)", "rgba(255,120,60,0.65)"]
  );

  // Birds appear after 20% scroll
  const birdsOpacity = useTransform(scrollYProgress, [0.15, 0.3], [0, 1]);
  const birdsY = useTransform(scrollYProgress, [0.15, 1], ["80px", "-40px"]);
  const birdsX = useTransform(scrollYProgress, [0.15, 1], ["-5%", "8%"]);

  // Trees parallax
  const treesY = useTransform(scrollYProgress, [0, 1], ["0px", "40px"]);

  return (
    <div ref={containerRef} className="relative min-h-screen overflow-hidden" dir="rtl">

      {/* ═══ ANIMATED BACKGROUND ═══ */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>

        {/* Sky — transitions with scroll */}
        <motion.div className="absolute inset-0" style={{ background: skyColor }} />

        {/* Sun */}
        <motion.div
          style={{
            position: "absolute",
            left: sunX,
            top: sunY,
            width: sunSize,
            height: sunSize,
            borderRadius: "50%",
            background: sunColor,
            filter: "blur(8px)",
            boxShadow: "0 0 60px 20px rgba(255,180,80,0.4)",
            transform: "translate(-50%, -50%)",
          }}
        />
        {/* Sun glow halo */}
        <motion.div
          style={{
            position: "absolute",
            left: sunX,
            top: sunY,
            width: "200px",
            height: "200px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,200,80,0.25) 0%, transparent 70%)",
            filter: "blur(20px)",
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* Clouds */}
        <motion.div className="absolute inset-0" style={{ x: cloudsX, opacity: cloudsOpacity }}>
          <div className="sky-cloud sc1" />
          <div className="sky-cloud sc2" />
          <div className="sky-cloud sc3" />
          <div className="sky-cloud sc4" />
          <div className="sky-cloud sc5" />
        </motion.div>

        {/* Birds — appear on scroll */}
        <motion.div
          className="absolute inset-0"
          style={{ opacity: birdsOpacity, y: birdsY, x: birdsX }}
        >
          <svg viewBox="0 0 800 300" className="absolute" style={{ top: "15%", left: "10%", width: "60%", height: "auto" }}>
            {/* Bird flock — simple M shapes */}
            <g fill="none" stroke="rgba(30,20,10,0.75)" strokeWidth="2.5" strokeLinecap="round">
              {/* Bird 1 */}
              <path d="M100,80 Q112,68 124,80"><animateTransform attributeName="transform" type="translate" values="0,0;0,-8;0,0" dur="1.8s" repeatCount="indefinite"/></path>
              {/* Bird 2 */}
              <path d="M140,60 Q152,48 164,60"><animateTransform attributeName="transform" type="translate" values="0,0;0,-10;0,0" dur="2s" begin="0.2s" repeatCount="indefinite"/></path>
              {/* Bird 3 */}
              <path d="M175,75 Q187,63 199,75"><animateTransform attributeName="transform" type="translate" values="0,0;0,-7;0,0" dur="1.6s" begin="0.4s" repeatCount="indefinite"/></path>
              {/* Bird 4 */}
              <path d="M210,55 Q222,43 234,55"><animateTransform attributeName="transform" type="translate" values="0,0;0,-12;0,0" dur="2.2s" begin="0.1s" repeatCount="indefinite"/></path>
              {/* Bird 5 */}
              <path d="M155,90 Q167,78 179,90"><animateTransform attributeName="transform" type="translate" values="0,0;0,-6;0,0" dur="1.9s" begin="0.6s" repeatCount="indefinite"/></path>
              {/* Bird 6 */}
              <path d="M245,70 Q257,58 269,70"><animateTransform attributeName="transform" type="translate" values="0,0;0,-9;0,0" dur="2.1s" begin="0.3s" repeatCount="indefinite"/></path>
              {/* Bird 7 small far */}
              <path d="M300,50 Q308,43 316,50" strokeWidth="1.8"><animateTransform attributeName="transform" type="translate" values="0,0;0,-5;0,0" dur="1.7s" begin="0.8s" repeatCount="indefinite"/></path>
              {/* Bird 8 small far */}
              <path d="M330,62 Q338,55 346,62" strokeWidth="1.8"><animateTransform attributeName="transform" type="translate" values="0,0;0,-7;0,0" dur="2s" begin="0.5s" repeatCount="indefinite"/></path>
            </g>
          </svg>
        </motion.div>

        {/* Trees layer — parallax */}
        <motion.div className="absolute bottom-0 left-0 right-0" style={{ y: treesY }}>
          <svg viewBox="0 0 1440 400" preserveAspectRatio="none" style={{ width: "100%", height: "280px", display: "block" }}>
            {/* Far trees */}
            <path d="M0,320 L50,240 L90,280 L140,210 L180,255 L230,200 L275,245 L325,200 L370,240 L420,195 L465,235 L515,195 L565,235 L620,195 L670,235 L725,195 L775,235 L830,195 L880,235 L935,195 L985,235 L1040,195 L1090,235 L1145,195 L1195,232 L1250,195 L1300,232 L1355,198 L1400,228 L1440,205 L1440,400 L0,400 Z"
              fill="rgba(60,100,55,0.25)" />
            {/* Mid trees */}
            <path d="M0,350 L45,270 L80,305 L120,255 L165,295 L210,250 L260,290 L310,252 L360,290 L415,250 L465,290 L520,250 L575,290 L630,250 L685,290 L740,250 L795,290 L850,250 L905,290 L960,250 L1015,290 L1070,250 L1125,290 L1180,250 L1235,288 L1290,250 L1345,288 L1395,252 L1440,280 L1440,400 L0,400 Z"
              fill="rgba(40,80,40,0.5)" />
            {/* Front trees dark */}
            <path d="M0,400 L25,330 L50,365 L75,320 L105,350 L135,315 L165,348 L200,315 L235,348 L275,312 L315,346 L360,312 L405,346 L455,310 L505,344 L558,310 L612,344 L665,310 L718,344 L770,310 L822,344 L874,310 L926,344 L978,310 L1030,344 L1082,310 L1134,344 L1186,310 L1238,344 L1290,312 L1340,344 L1390,316 L1440,340 L1440,400 Z"
              fill="rgba(25,55,28,0.85)" />
            {/* River at bottom */}
            <ellipse cx="720" cy="395" rx="350" ry="18" fill="rgba(100,180,220,0.35)" />
          </svg>
        </motion.div>

        {/* River shimmer overlay */}
        <motion.div
          style={{
            position: "absolute",
            bottom: "0",
            left: "25%",
            width: "50%",
            height: "28px",
            borderRadius: "50%",
            background: riverColor,
            filter: "blur(8px)",
            opacity: riverOpacity,
          }}
        />

        {/* Sunset warm glow at horizon */}
        <motion.div
          style={{
            position: "absolute",
            bottom: "15%",
            left: "0",
            right: "0",
            height: "120px",
            background: useTransform(
              scrollYProgress,
              [0, 0.5, 1],
              [
                "linear-gradient(to top, rgba(255,180,80,0.2), transparent)",
                "linear-gradient(to top, rgba(100,180,220,0.1), transparent)",
                "linear-gradient(to top, rgba(255,80,30,0.35), transparent)",
              ]
            ),
            filter: "blur(15px)",
          }}
        />
      </div>

      <style>{`
        .sky-cloud {
          position: absolute;
          border-radius: 80px;
          background: rgba(255,255,255,0.75);
          filter: blur(16px);
          animation: skyCloudDrift linear infinite;
        }
        .sc1 { top: 10%; left: -350px; width: 300px; height: 65px; animation-duration: 60s; opacity: 0.8; }
        .sc2 { top: 18%; left: -200px; width: 220px; height: 50px; animation-duration: 80s; animation-delay: -25s; opacity: 0.65; }
        .sc3 { top: 6%;  left: -500px; width: 400px; height: 80px; animation-duration: 70s; animation-delay: -40s; opacity: 0.7; }
        .sc4 { top: 24%; left: -300px; width: 180px; height: 42px; animation-duration: 95s; animation-delay: -60s; opacity: 0.55; }
        .sc5 { top: 13%; left: -450px; width: 260px; height: 58px; animation-duration: 75s; animation-delay: -15s; opacity: 0.6; }
        @keyframes skyCloudDrift {
          from { transform: translateX(0); }
          to   { transform: translateX(calc(100vw + 700px)); }
        }
      `}</style>

      {/* Nav */}
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <Logo size={44} />
          <div className="hidden sm:block">
            <div className="font-display text-lg font-semibold leading-tight">Assuit SciDream</div>
            <div className="text-[11px] text-muted-foreground">Dream Team · Faculty of Science</div>
          </div>
        </div>
        <nav className="flex items-center gap-3">
          <Link to="/auth" className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline">تسجيل الدخول</Link>
          <Link
            to="/auth"
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:shadow-glow"
          >
            ابدأ الآن
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-8 pb-16 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mx-auto"
        >
          <Logo size={160} className="mx-auto drop-shadow-2xl" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="mt-8"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span>مدعوم من فريق Dream Team — كلية العلوم جامعة أسيوط</span>
          </div>

          <h1 className="font-display text-5xl leading-tight sm:text-6xl md:text-7xl">
            كلية العلوم <span className="text-gradient-cosmic">جامعة أسيوط</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            تأسست في <span className="font-semibold text-foreground">أكتوبر 1957</span> — من أعرق كليات العلوم في صعيد مصر.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/auth"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-base font-semibold text-primary-foreground shadow-soft transition hover:shadow-glow"
            >
              سجل بحساب Google
              <ArrowLeft className="h-4 w-4 transition group-hover:translate-x-1" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Vision & Mission */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        <div className="cosmic-card rounded-3xl p-8 md:p-12">
          <div className="mb-6 text-center">
            <div className="text-xs font-semibold uppercase tracking-widest text-accent">عن الكلية</div>
            <h2 className="mt-2 font-display text-3xl md:text-4xl">الرؤية والرسالة</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-gradient-to-bl from-card to-secondary/40 p-6">
              <div className="flex items-center gap-2 text-accent font-semibold text-sm mb-3">
                <Eye className="h-4 w-4" />
                رؤية الكلية
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                كلية العلوم جامعة أسيوط كلية متميزة على المستوى القومي تمد المجتمع بخريجين مؤهلين قادرين على الإبداع والابتكار. وتتميز بإجراء أبحاث عالية الجودة التي تقابل الاحتياجات التكنولوجية والعلمية والصناعية والحكومية والمجتمعية.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-gradient-to-tl from-card to-secondary/40 p-6">
              <div className="flex items-center gap-2 text-accent font-semibold text-sm mb-3">
                <Target className="h-4 w-4" />
                رسالة الكلية
              </div>
              <ul className="text-sm leading-relaxed text-muted-foreground space-y-2">
                <li>• مؤسسة للتعليم العالي والبحث العلمي في مجالات العلوم الأساسية.</li>
                <li>• إعداد أجيال من العلماء والعاملين بالمراكز العلمية والبحثية والتعليمية.</li>
                <li>• المساهمة في تقدم العلوم الرياضية وعلوم الحاسب والفيزيائية والكيميائية والبيولوجية.</li>
                <li>• توظيف الموارد البشرية والإمكانات البحثية لخدمة المجتمع وحل مشكلاته.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Goals */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 text-center">
          <h2 className="font-display text-3xl md:text-4xl">أهداف الكلية</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GOALS.map((g, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="cosmic-card rounded-2xl p-5 flex gap-4 items-start"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-cosmic text-primary-foreground">
                <g.icon className="h-4 w-4" />
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{g.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Departments */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-10 space-y-6">

        {/* General Departments */}
        <div className="cosmic-card rounded-3xl p-8 md:p-10">
          <div className="mb-6 text-center">
            <h2 className="font-display text-3xl">الأقسام العامة</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[
              "الكيمياء", "الكيمياء وعلم الحيوان", "الفيزياء والكيمياء",
              "الكيمياء والجيولوجيا", "الكيمياء والنبات", "الكيمياء والحشرات",
              "الكيمياء والميكروبيولوجي", "الميكروبيولوجي", "الجيولوجيا",
              "علوم الحاسب", "الفيزياء والإلكترونيات", "علم الحيوان",
              "النبات", "الجيوفيزياء", "الفيزياء", "الرياضيات",
              "الإحصاء", "جيولوجيا البترول", "علم المصايد", "علم الحشرات",
              "الرياضيات والفيزياء",
            ].map((d) => (
              <div key={d} className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/40 px-3 py-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                <span className="text-xs font-medium">{d}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Special Departments */}
        <div className="cosmic-card rounded-3xl p-8 md:p-10">
          <div className="mb-6 text-center">
            <h2 className="font-display text-3xl">الأقسام المميزة ⭐</h2>
            <p className="mt-2 text-sm text-muted-foreground">أقسام متخصصة داخل الكلية</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { name: "الكيمياء الصناعية والتطبيقية", note: null },
              { name: "جيولوجيا بترول", note: null },
              { name: "بايو تكنولوجي", note: null },
              { name: "الفيزياء الإشعاعية الطبية", note: "بداية من سنة أولى فقط" },
            ].map((d) => (
              <div key={d.name} className="flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
                <span className="mt-0.5 h-2 w-2 rounded-full bg-accent shrink-0" />
                <div>
                  <span className="text-sm font-semibold">{d.name}</span>
                  {d.note && (
                    <span className="mr-2 text-xs text-accent font-medium">({d.note})</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </section>

      {/* Degrees */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Single */}
          <div className="cosmic-card rounded-2xl p-6">
            <div className="mb-4 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-accent" />
              <h3 className="font-display text-xl">درجة البكالوريوس — التخصص المنفرد</h3>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">138 ساعة معتمدة على الأقل — مادة (7) و(8) من اللائحة</p>
            <div className="grid grid-cols-2 gap-2">
              {DEGREES_SINGLE.map((d) => (
                <div key={d} className="flex items-center gap-1.5 rounded-lg bg-background/40 border border-border/50 px-2 py-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                  <span className="text-xs">{d}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Double */}
          <div className="cosmic-card rounded-2xl p-6">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              <h3 className="font-display text-xl">درجة البكالوريوس — التخصص المزدوج</h3>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">39 ساعة لكل فرع + 21 ساعة مشتركة — مادة (8) ب</p>
            <div className="grid gap-2">
              {DEGREES_DOUBLE.map((d) => (
                <div key={d} className="flex items-center gap-1.5 rounded-lg bg-background/40 border border-border/50 px-2 py-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                  <span className="text-xs">{d}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg bg-card/60 border border-border/50 p-3">
              <p className="text-xs text-muted-foreground">كما تمنح الجامعة: <span className="text-foreground font-medium">دبلوم الدراسات العليا · الماجستير · دكتوراه الفلسفة · الدكتوراه في العلوم</span></p>
            </div>
          </div>
        </div>
      </section>

      {/* Credit Hours System */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        <div className="cosmic-card rounded-3xl p-8 md:p-10">
          <div className="mb-6 text-center">
            <h2 className="font-display text-3xl">نظام الساعات المعتمدة</h2>
            <p className="mt-2 text-sm text-muted-foreground">المواد من (3) إلى (18) من اللائحة الداخلية</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "مدة الدراسة", value: "4 سنوات", sub: "8 فصول دراسية على الأقل" },
              { title: "الساعات للتخرج", value: "138 ساعة", sub: "وفقاً للخطة الدراسية لكل برنامج" },
              { title: "الحد الأقصى في الفصل", value: "18 ساعة", sub: "والحد الأدنى 12 ساعة" },
              { title: "الحد الأدنى للتخرج", value: "معدل 2.0", sub: "معدل تراكمي CGPA" },
            ].map((s) => (
              <div key={s.title} className="rounded-2xl border border-border bg-background/40 p-5 text-center">
                <div className="text-2xl font-display font-bold text-gradient-cosmic">{s.value}</div>
                <div className="mt-1 text-sm font-semibold">{s.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.sub}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-background/30 p-4">
              <div className="text-xs font-semibold text-accent mb-2">متطلبات الجامعة</div>
              <p className="text-xs text-muted-foreground">8 ساعات معتمدة: 4 إجبارية (إنجليزي + حقوق الإنسان) + 4 اختيارية من مقررات الثقافة العامة.</p>
            </div>
            <div className="rounded-xl border border-border bg-background/30 p-4">
              <div className="text-xs font-semibold text-accent mb-2">متطلبات الكلية</div>
              <p className="text-xs text-muted-foreground">31 ساعة معتمدة إجبارية تشمل: رياضيات، فيزياء، كيمياء، جيولوجيا، حيوان، نبات، حاسب آلي، وأخلاقيات المهنة.</p>
            </div>
            <div className="rounded-xl border border-border bg-background/30 p-4">
              <div className="text-xs font-semibold text-accent mb-2">التدريب الصيفي</div>
              <p className="text-xs text-muted-foreground">6 أسابيع في المجالات التطبيقية قبل التخرج — بعد إنجاز 90 ساعة معتمدة على الأقل.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Grading Scale */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        <div className="cosmic-card rounded-3xl p-8 md:p-10">
          <div className="mb-6 text-center">
            <h2 className="font-display text-3xl">نظام التقديرات — مادة (18)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-center">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="pb-3 font-semibold">التقدير</th>
                  <th className="pb-3 font-semibold">الرمز</th>
                  <th className="pb-3 font-semibold">النقاط</th>
                  <th className="pb-3 font-semibold">النسبة المئوية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {[
                  { grade: "ممتاز", symbol: "A", points: "4.0", range: "90 – 100%" },
                  { grade: "ممتاز", symbol: "A-", points: "3.7", range: "85 – <90%" },
                  { grade: "جيد جداً", symbol: "B+", points: "3.3", range: "80 – <85%" },
                  { grade: "جيد جداً", symbol: "B", points: "3.0", range: "75 – <80%" },
                  { grade: "جيد", symbol: "B-", points: "2.7", range: "70 – <75%" },
                  { grade: "جيد", symbol: "C+", points: "2.3", range: "65 – <70%" },
                  { grade: "مقبول", symbol: "C", points: "2.0", range: "60 – <65%" },
                  { grade: "مقبول", symbol: "C-", points: "1.7", range: "57 – <60%" },
                  { grade: "مقبول", symbol: "D+", points: "1.3", range: "55 – <57%" },
                  { grade: "مقبول", symbol: "D", points: "1.0", range: "50 – <55%" },
                  { grade: "راسب", symbol: "F", points: "0", range: "< 50%" },
                ].map((row) => (
                  <tr key={row.symbol} className="text-xs hover:bg-card/40 transition">
                    <td className="py-2 font-medium">{row.grade}</td>
                    <td className="py-2 font-bold text-accent">{row.symbol}</td>
                    <td className="py-2">{row.points}</td>
                    <td className="py-2 text-muted-foreground">{row.range}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Leadership & Team */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 text-center">
          <h2 className="font-display text-3xl md:text-4xl">قيادة الكلية والفريق</h2>
        </div>

        {/* College Leadership */}
        <div className="mb-6">
          <div className="text-xs font-semibold uppercase tracking-widest text-accent text-center mb-4">قيادة الكلية</div>
          <div className="grid gap-5 sm:grid-cols-2">
            {[
              { name: "أ.د أبو بكر محمد الطيب", role: "عميد الكلية", img: "https://zkojnnxqxbjbdxtniucp.supabase.co/storage/v1/object/public/images/IMG-20260627-WA0021.jpg" },
              { name: "أ.د محمد أبو العيون", role: "وكيل الكلية لشئون تعليم الطلاب", img: "https://zkojnnxqxbjbdxtniucp.supabase.co/storage/v1/object/public/images/IMG-20260627-WA0022.jpg" },
              { name: "أ.د فاطمة الزهراء عبدالحميد", role: "المشرفة الأكاديمية على الأسرة", img: "https://zkojnnxqxbjbdxtniucp.supabase.co/storage/v1/object/public/images/IMG-20260628-WA0034.jpg" },
            ].map((p) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="cosmic-card rounded-2xl p-6 flex items-center gap-5"
              >
                <img
                  src={p.img}
                  alt={p.name}
                  className="h-20 w-20 rounded-full object-cover object-top border-2 border-accent/40 shrink-0"
                />
                <div>
                  <div className="font-display text-lg leading-tight">{p.name}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{p.role}</div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* شكر قيادة الكلية */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="cosmic-card rounded-2xl p-5 mt-5 text-center"
          >
            <p className="text-sm text-muted-foreground leading-relaxed">
              نتقدم بخالص الشكر والتقدير لقيادة كلية العلوم على دعمهم المستمر للأنشطة الطلابية وحرصهم على توفير بيئة أكاديمية محفزة تُنمي مهارات الطلاب وتدعم إبداعهم.
            </p>
          </motion.div>
        </div>

        {/* Dream Team */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-accent text-center mb-4">فريق Dream Team</div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                name: "خالد عماد",
                role: "رئيس أسرة Dream Team",
                bio: "يقود فريق العمل ويضطلع بمسؤولية التخطيط والتنظيم والإشراف على تنفيذ الأنشطة والفعاليات، مع الحرص الدائم على تحقيق أهداف الأسرة وخدمة طلاب كلية العلوم. يعمل على تعزيز روح التعاون بين أعضاء الفريق، وتبني الأفكار الإبداعية، وتمثيل الأسرة بصورة مشرفة داخل الكلية — إيمانًا بأن النجاح الحقيقي يبدأ بفريق متماسك ورؤية واضحة.",
                img: "https://zkojnnxqxbjbdxtniucp.supabase.co/storage/v1/object/public/images/IMG-20260627-WA0026.jpg",
              },
              {
                name: "عبد الله قطب",
                role: "مصمم الموقع ومسؤول السوشيال ميديا",
                bio: "يتولى تصميم وتطوير الهوية الرقمية للأسرة، من بناء الموقع الإلكتروني وإدارة منظومته التقنية، إلى صياغة المحتوى الرقمي وإدارة حسابات التواصل الاجتماعي. يعمل على إيصال رسالة الأسرة بأسلوب احترافي وجذاب، ويسعى إلى تقديم تجربة رقمية متميزة تعكس قيم Dream Team وطموحاتها.",
                img: "https://zkojnnxqxbjbdxtniucp.supabase.co/storage/v1/object/public/images/6193778187.png",
              },
            ].map((p) => (
              <motion.div
                key={p.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="cosmic-card rounded-2xl p-5 flex flex-col gap-4"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={p.img}
                    alt={p.name}
                    className="h-16 w-16 rounded-full object-cover object-top border-2 border-border shrink-0"
                  />
                  <div>
                    <div className="font-semibold">{p.name}</div>
                    <div className="mt-0.5 text-sm text-accent font-medium">{p.role}</div>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{p.bio}</p>
              </motion.div>
            ))}
          </div>

          {/* نبذة عن الأسرة */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="cosmic-card rounded-2xl p-6 mt-6 text-center"
          >
            <h3 className="font-display text-xl mb-3">Dream Team – كلية العلوم</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Dream Team</strong> أسرة طلابية في كلية العلوم — جامعة أسيوط، تسعى إلى بناء بيئة جامعية قائمة على التعاون والإبداع والتطوير المستمر.
              {" "}ندعم الطلاب من خلال الأنشطة العلمية والثقافية والرياضية والاجتماعية، ونوفر لهم فرصاً حقيقية لاكتساب مهارات جديدة وتنمية روح القيادة والعمل الجماعي.
            </p>
            <p className="mt-4 font-semibold text-accent italic">We Dream. We Explore. We Discover.</p>
            <p className="mt-2 text-xs text-muted-foreground">
              لأننا نؤمن أن كل طالب يملك القدرة على تحقيق طموحه وترك بصمة حقيقية داخل الكلية وخارجها.
            </p>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-20">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-cosmic p-10 text-center text-primary-foreground shadow-rose">
          <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(circle at top, white, transparent 60%)" }} />
          <div className="relative">
            <ShieldCheck className="mx-auto h-10 w-10" />
            <h2 className="mt-3 font-display text-3xl md:text-4xl">انضم لعباقرة كلية العلوم</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm opacity-90">
              التسجيل بحساب Google — بعدها فريق Dream Team هيراجع بياناتك في أقل من 24 ساعة.
            </p>
            <Link
              to="/auth"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-background px-7 py-3 text-base font-semibold text-foreground transition hover:scale-105"
            >
              سجل الآن
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/60 bg-background/40 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-6 text-xs text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-2">
            <Logo size={28} />
            <span className="font-display text-sm">Dream Team · Faculty of Science</span>
          </div>
          <div>
            صُمم وبُني بواسطة{" "}
            <a href="mailto:abdalahkotp31@gmail.com" className="font-semibold text-foreground hover:text-accent">
              Abdullah Kotb
            </a>
          </div>
        </div>
      </footer>

      {/* Floating Fortune Cookie Bubble */}
      <Fortunecookie />
    </div>
  );
}

const MESSAGES = [
  "علوم مش بس كتب ومحاضرات — علوم هي الطريقة اللي بتشوف بيها العالم 🔬",
  "كل معادلة بتحلها دلوقتي هي خطوة نحو مستقبل أكبر منك ✨",
  "إحنا كنا في نفس المكان اللي أنت فيه — والطريق صعب، بس يستاهل 💪",
  "أصعب يوم في الكلية هيبقى قصة بتحكيها بفخر بعد سنين 🌙",
  "العالِم مش اللي عنده كل الإجابات — العالِم اللي مش بيوقف عن السؤال 🧠",
  "التعب اللي بتحس بيه دلوقتي هو ثمن الفخر اللي جاي 🌟",
  "ذاكر، اتعب، اصبر — وفجأة هتلاقي إن الصعب بقى سهل 🎯",
  "كلية العلوم بتصنع ناس بتفكر — وده أغلى من أي شهادة 🏆",
  "أنت مش بس طالب علوم — أنت عالم في طور التكوين 🌱",
];

function Fortunecookie() {
  const [broken, setBroken] = useState(false);
  const [visible, setVisible] = useState(true);
  const [msgIndex] = useState(() => Math.floor(Math.random() * MESSAGES.length));
  const [showMsg, setShowMsg] = useState(false);
  const [closing, setClosing] = useState(false);

  function handleBreak() {
    if (broken) return;
    setBroken(true);
    setTimeout(() => setShowMsg(true), 600);
  }

  function handleClose() {
    setClosing(true);
    setTimeout(() => setVisible(false), 500);
  }

  if (!visible) return null;

  return (
    <>
      {/* Floating bubble */}
      {!showMsg && (
        <button
          onClick={handleBreak}
          dir="rtl"
          style={{
            position: "fixed",
            bottom: "28px",
            right: "20px",
            zIndex: 9999,
            background: "none",
            border: "none",
            cursor: broken ? "default" : "pointer",
            padding: 0,
          }}
        >
          <motion.div
            animate={broken ? { scale: [1, 1.3, 0], rotate: [0, 15, -15, 0], opacity: [1, 1, 0] } : { y: [0, -10, 0] }}
            transition={broken ? { duration: 0.6, ease: "easeInOut" } : { duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #f5c842 0%, #e8a020 50%, #f5c842 100%)",
              boxShadow: "0 4px 24px rgba(245,200,66,0.45), 0 0 0 3px rgba(245,200,66,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 30,
              userSelect: "none",
            }}
          >
            🥠
          </motion.div>
          {!broken && (
            <motion.div
              animate={{ opacity: [0.6, 1, 0.6], y: [0, -4, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                position: "absolute",
                bottom: 70,
                right: 0,
                background: "rgba(30,20,10,0.85)",
                color: "#f5c842",
                fontSize: 11,
                borderRadius: 12,
                padding: "4px 10px",
                whiteSpace: "nowrap",
                fontWeight: 600,
                backdropFilter: "blur(8px)",
                pointerEvents: "none",
              }}
            >
              رسالة لك 💛
            </motion.div>
          )}
        </button>
      )}

      {/* Message overlay */}
      {showMsg && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={closing ? { opacity: 0 } : { opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(6px)",
            padding: 24,
          }}
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
            animate={closing ? { scale: 0.3, opacity: 0, rotate: 8 } : { scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "linear-gradient(135deg, #fffbe8 0%, #fff3c4 100%)",
              borderRadius: 28,
              padding: "36px 32px 28px",
              maxWidth: 360,
              width: "100%",
              boxShadow: "0 24px 80px rgba(245,200,66,0.25), 0 4px 24px rgba(0,0,0,0.15)",
              textAlign: "center",
              position: "relative",
              border: "2px solid rgba(245,200,66,0.4)",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>🥠</div>
            <div style={{ fontSize: 13, color: "#b8860b", fontWeight: 700, letterSpacing: 2, marginBottom: 16, textTransform: "uppercase" }}>
              رسالة لك من Dream Team
            </div>
            <p style={{ fontSize: 17, color: "#3d2800", lineHeight: 1.75, fontWeight: 600, margin: 0 }}>
              {MESSAGES[msgIndex]}
            </p>
            <p style={{ fontSize: 12, color: "#a07830", marginTop: 20, marginBottom: 0 }}>
              إحنا كنا مكانك — وبنؤمن فيك 💛
            </p>
            <button
              onClick={handleClose}
              style={{
                marginTop: 24,
                background: "linear-gradient(135deg, #f5c842, #e8a020)",
                border: "none",
                borderRadius: 50,
                padding: "10px 32px",
                fontSize: 14,
                fontWeight: 700,
                color: "#3d2800",
                cursor: "pointer",
                boxShadow: "0 4px 16px rgba(245,200,66,0.4)",
              }}
            >
              شكراً 🌟
            </button>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
