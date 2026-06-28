import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowLeft, ShieldCheck, BookOpen, Target, Eye, Users, GraduationCap, FlaskConical, Globe, X, Send, Loader2 } from "lucide-react";
import { CosmicBackground } from "@/components/CosmicBackground";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setScrollProgress(max > 0 ? Math.min(el.scrollTop / max, 1) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div ref={containerRef} className="relative min-h-screen overflow-hidden" dir="rtl">

      <CosmicBackground scrollProgress={scrollProgress} />

            {/* Nav */}
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <Logo size={44} />
          <div className="hidden sm:block">
            <div className="font-display text-lg font-semibold leading-tight">Assuit SciDream</div>
            <div className="text-[11px] text-foreground/75">Dream Team · Faculty of Science</div>
          </div>
        </div>
        <nav className="flex items-center gap-3">
          <Link to="/auth" className="hidden text-sm text-foreground/75 hover:text-foreground sm:inline">تسجيل الدخول</Link>
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
          <p className="mx-auto mt-5 max-w-2xl text-lg text-foreground/75">
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

      {/* Quick Nav */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="flex flex-wrap justify-center gap-2"
        >
          {[
            { label: "الرؤية والرسالة", href: "#vision", icon: "◈" },
            { label: "أهداف الكلية", href: "#goals", icon: "◈" },
            { label: "الأقسام", href: "#departments", icon: "◈" },
            { label: "الفريق والقيادة", href: "#team", icon: "◈" },
            { label: "انضم إلى Dream Team", href: "#join", icon: "✦" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-medium transition hover:scale-105 ${
                item.href === "#join"
                  ? "border-transparent bg-gradient-cosmic text-primary-foreground shadow-soft hover:shadow-glow"
                  : "border-border bg-card/50 text-foreground/75 hover:text-foreground hover:bg-card/80"
              }`}
            >
              <span className="text-[10px] opacity-60">{item.icon}</span>
              {item.label}
            </a>
          ))}
        </motion.div>
      </section>

      {/* Vision & Mission */}
      <section id="vision" className="relative z-10 mx-auto max-w-6xl px-6 py-10">
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
              <p className="text-sm leading-relaxed text-foreground/75">
                كلية العلوم جامعة أسيوط كلية متميزة على المستوى القومي تمد المجتمع بخريجين مؤهلين قادرين على الإبداع والابتكار. وتتميز بإجراء أبحاث عالية الجودة التي تقابل الاحتياجات التكنولوجية والعلمية والصناعية والحكومية والمجتمعية.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-gradient-to-tl from-card to-secondary/40 p-6">
              <div className="flex items-center gap-2 text-accent font-semibold text-sm mb-3">
                <Target className="h-4 w-4" />
                رسالة الكلية
              </div>
              <ul className="text-sm leading-relaxed text-foreground/75 space-y-2">
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
      <section id="goals" className="relative z-10 mx-auto max-w-6xl px-6 py-10">
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
              <p className="text-sm leading-relaxed text-foreground/75">{g.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Departments */}
      <section id="departments" className="relative z-10 mx-auto max-w-6xl px-6 py-10 space-y-6">

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
            <p className="mt-2 text-sm text-foreground/75">أقسام متخصصة داخل الكلية</p>
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
            <p className="mb-3 text-xs text-foreground/75">138 ساعة معتمدة على الأقل — مادة (7) و(8) من اللائحة</p>
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
            <p className="mb-3 text-xs text-foreground/75">39 ساعة لكل فرع + 21 ساعة مشتركة — مادة (8) ب</p>
            <div className="grid gap-2">
              {DEGREES_DOUBLE.map((d) => (
                <div key={d} className="flex items-center gap-1.5 rounded-lg bg-background/40 border border-border/50 px-2 py-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
                  <span className="text-xs">{d}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg bg-card/60 border border-border/50 p-3">
              <p className="text-xs text-foreground/75">كما تمنح الجامعة: <span className="text-foreground font-medium">دبلوم الدراسات العليا · الماجستير · دكتوراه الفلسفة · الدكتوراه في العلوم</span></p>
            </div>
          </div>
        </div>
      </section>

      {/* Credit Hours System */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        <div className="cosmic-card rounded-3xl p-8 md:p-10">
          <div className="mb-6 text-center">
            <h2 className="font-display text-3xl">نظام الساعات المعتمدة</h2>
            <p className="mt-2 text-sm text-foreground/75">المواد من (3) إلى (18) من اللائحة الداخلية</p>
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
                <div className="mt-1 text-xs text-foreground/75">{s.sub}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-background/30 p-4">
              <div className="text-xs font-semibold text-accent mb-2">متطلبات الجامعة</div>
              <p className="text-xs text-foreground/75">8 ساعات معتمدة: 4 إجبارية (إنجليزي + حقوق الإنسان) + 4 اختيارية من مقررات الثقافة العامة.</p>
            </div>
            <div className="rounded-xl border border-border bg-background/30 p-4">
              <div className="text-xs font-semibold text-accent mb-2">متطلبات الكلية</div>
              <p className="text-xs text-foreground/75">31 ساعة معتمدة إجبارية تشمل: رياضيات، فيزياء، كيمياء، جيولوجيا، حيوان، نبات، حاسب آلي، وأخلاقيات المهنة.</p>
            </div>
            <div className="rounded-xl border border-border bg-background/30 p-4">
              <div className="text-xs font-semibold text-accent mb-2">التدريب الصيفي</div>
              <p className="text-xs text-foreground/75">6 أسابيع في المجالات التطبيقية قبل التخرج — بعد إنجاز 90 ساعة معتمدة على الأقل.</p>
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
                <tr className="border-b border-border text-foreground/85 text-xs uppercase tracking-wider">
                  <th className="pb-3 font-bold">التقدير</th>
                  <th className="pb-3 font-bold">الرمز</th>
                  <th className="pb-3 font-bold">النقاط</th>
                  <th className="pb-3 font-bold">النسبة المئوية</th>
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
                    <td className="py-2 font-semibold text-foreground">{row.grade}</td>
                    <td className="py-2 font-bold text-accent">{row.symbol}</td>
                    <td className="py-2 font-medium text-foreground">{row.points}</td>
                    <td className="py-2 font-medium text-foreground/85">{row.range}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Leadership & Team */}
      <section id="team" className="relative z-10 mx-auto max-w-6xl px-6 py-10">
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
                  <div className="mt-1 text-sm text-foreground/75">{p.role}</div>
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
            <p className="text-sm text-foreground/75 leading-relaxed">
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
                <p className="text-xs leading-relaxed text-foreground/75">{p.bio}</p>
              </motion.div>
            ))}
          </div>

          {/* انضم إلى فريق Dream Team */}
          <div id="join" />
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-8"
          >
            <CommitteeApplicationSection />
          </motion.div>

          {/* نبذة عن الأسرة */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="cosmic-card rounded-2xl p-6 mt-6 text-center"
          >
            <h3 className="font-display text-xl mb-3">Dream Team – كلية العلوم</h3>
            <p className="text-sm text-foreground/75 leading-relaxed">
              <strong className="text-foreground">Dream Team</strong> أسرة طلابية في كلية العلوم — جامعة أسيوط، تسعى إلى بناء بيئة جامعية قائمة على التعاون والإبداع والتطوير المستمر.
              {" "}ندعم الطلاب من خلال الأنشطة العلمية والثقافية والرياضية والاجتماعية، ونوفر لهم فرصاً حقيقية لاكتساب مهارات جديدة وتنمية روح القيادة والعمل الجماعي.
            </p>
            <p className="mt-4 font-semibold text-accent italic">We Dream. We Explore. We Discover.</p>
            <p className="mt-2 text-xs text-foreground/75">
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
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-6 text-xs text-foreground/75 sm:flex-row">
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


/* ── Committee Application Section ── */
function CommitteeApplicationSection() {
  const [selectedCommittee, setSelectedCommittee] = useState<string | null>(null);

  const committees = [
    { name: "PR Committee", img: "https://zkojnnxqxbjbdxtniucp.supabase.co/storage/v1/object/public/images/bhgnnvg.jpeg" },
    { name: "Media Committee", img: "https://zkojnnxqxbjbdxtniucp.supabase.co/storage/v1/object/public/images/hgbjyvv.jpeg" },
    { name: "HR Committee", img: "https://zkojnnxqxbjbdxtniucp.supabase.co/storage/v1/object/public/images/hvgghgvv.jpeg" },
    { name: "OC Committee", img: "https://zkojnnxqxbjbdxtniucp.supabase.co/storage/v1/object/public/images/ojjgthn.jpeg" },
    { name: "AC Committee", img: "https://zkojnnxqxbjbdxtniucp.supabase.co/storage/v1/object/public/images/ooooo.jpeg" },
  ];

  return (
    <>
      <div className="text-xs font-semibold uppercase tracking-widest text-accent text-center mb-2">انضم إلينا</div>
      <h3 className="font-display text-2xl md:text-3xl text-center mb-2">انضم إلى فريق Dream Team</h3>
      <p className="text-sm text-foreground/75 text-center mb-6 max-w-lg mx-auto">
        كن جزءاً من أسرة Dream Team وساهم في صنع تجربة جامعية استثنائية — اضغط على اللجنة المناسبة لك وقدّم طلبك فوراً.
      </p>

      {/* Join Us Banner */}
      <div className="flex justify-center mb-8">
        <img
          src="https://zkojnnxqxbjbdxtniucp.supabase.co/storage/v1/object/public/images/ggfghbbb.jpeg"
          alt="انضم إلى Dream Team"
          className="w-full max-w-sm rounded-2xl object-cover shadow-lg"
        />
      </div>

      {/* اللجان */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {committees.map((committee) => (
          <motion.button
            key={committee.name}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setSelectedCommittee(committee.name)}
            className="rounded-2xl overflow-hidden shadow-md cursor-pointer text-left w-full focus:outline-none focus:ring-2 focus:ring-accent/50"
          >
            <img
              src={committee.img}
              alt={committee.name}
              className="w-full h-auto object-cover"
            />
          </motion.button>
        ))}
      </div>

      <p className="text-center text-xs text-foreground/50 mt-4">اضغط على أي لجنة لتقديم طلب الانضمام</p>

      {selectedCommittee && (
        <CommitteeModal
          committee={selectedCommittee}
          onClose={() => setSelectedCommittee(null)}
        />
      )}
    </>
  );
}

/* ── Committee Application Modal ── */
const COMMITTEES = ["PR Committee", "Media Committee", "HR Committee", "OC Committee", "AC Committee"];

const COMMITTEE_INFO: Record<string, { fullName: string; description: string; traits: string }> = {
  "HR Committee": {
    fullName: "لجنة الموارد البشرية — Human Resources",
    description:
      "تُعدّ لجنة الموارد البشرية من أبرز لجان الأسرة وأكثرها أهميةً؛ إذ تضطلع بمهمة متابعة أداء الأعضاء وتقييمه، وتطوير مهاراتهم، وإجراء المقابلات، وتنظيم مسار العمل داخل الأسرة. تقوم هذه اللجنة على ركيزتَي الانضباط وإدارة الوقت، وتؤمن بأن تحسين آليات العمل مقدَّمٌ على العمل ذاته.",
    traits: "الشخصية القيادية، الانضباط في المواعيد، القدرة على إدارة الوقت والفرق.",
  },
  "OC Committee": {
    fullName: "لجنة التنظيم — Organization Committee",
    description:
      "تتولى لجنة التنظيم الإشراف على تخطيط المؤتمرات والفعاليات الجامعية وتنفيذها بصورة احترافية. تعمل هذه اللجنة خلف الكواليس لضمان سير كل تفصيلة على أكمل وجه، مما يجعلها العمود الفقري لأي نشاط تُقيمه الأسرة.",
    traits: "تحمُّل المسؤولية، المرونة في التعامل، الصبر، وحل المشكلات.",
  },
  "PR Committee": {
    fullName: "لجنة العلاقات العامة — Public Relations",
    description:
      "تمثّل لجنة العلاقات العامة الواجهة الرسمية للأسرة في تعاملاتها الخارجية؛ فهي المسؤولة عن بناء الشراكات، وتمثيل الأسرة في المحافل، وإيصال رسالتها إلى أوسع الآفاق. أعضاؤها هم السُّفراء الذين يعكسون هوية Dream Team وقيمها أمام العالم الخارجي.",
    traits: "الكاريزما، الفصاحة، القدرة على الإقناع، وبناء العلاقات.",
  },
  "Media Committee": {
    fullName: "لجنة الإعلام — Media Committee",
    description:
      "تتكفّل لجنة الإعلام بتوثيق فعاليات الأسرة ونشاطاتها، سواء أكان ذلك عبر التصوير الفوتوغرافي أم مقاطع الفيديو أم محتوى وسائل التواصل الاجتماعي. تحوّل هذه اللجنة اللحظات العابرة إلى ذكريات راسخة، وتُبرز إنجازات الأسرة بأسلوب إبداعي يليق بطموحاتها.",
    traits: "الرؤية الإبداعية، إتقان التصوير والمونتاج، الاهتمام بالتفاصيل البصرية.",
  },
  "AC Committee": {
    fullName: "لجنة الأنشطة — Activities Committee",
    description:
      "تُعدّ لجنة الأنشطة المحرّك الرئيسي للحيوية داخل الأسرة؛ إذ تتولى ابتكار الأنشطة والفعاليات الترفيهية والثقافية والتعليمية وتنفيذها. تعمل هذه اللجنة على تحويل الأفكار البسيطة إلى تجارب لا تُنسى، وتُعيد كسر الروتين في كل مرة.",
    traits: "الإبداع، روح الفريق، حب المشاركة، والقدرة على بثّ الطاقة الإيجابية.",
  },
};

interface CommitteeModalProps {
  committee: string;
  onClose: () => void;
}

function CommitteeModal({ committee, onClose }: CommitteeModalProps) {
  const [form, setForm] = useState({
    full_name: "",
    academic_id: "",
    whatsapp: "",
    academic_year: "",
    why_join: "",
    skills: "",
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const info = COMMITTEE_INFO[committee];

  const handleSubmit = async () => {
    if (!form.full_name || !form.academic_id || !form.whatsapp || !form.academic_year || !form.why_join) {
      toast.error("من فضلك أكمل جميع الحقول المطلوبة");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("committee_applications").insert({
      full_name: form.full_name,
      email: form.academic_id,   // reusing email column for academic_id
      phone: form.whatsapp,      // reusing phone column for whatsapp
      academic_year: form.academic_year,
      committee,
      why_join: form.why_join,
      skills: form.skills || null,
    });
    setLoading(false);
    if (error) {
      toast.error("حدث خطأ، يُرجى المحاولة مجدداً");
    } else {
      setDone(true);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        {/* Modal */}
        <motion.div
          className="relative w-full max-w-md bg-background border border-border rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
        >
          <button onClick={onClose} className="absolute top-4 left-4 text-foreground/50 hover:text-foreground transition">
            <X className="h-5 w-5" />
          </button>

          {done ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">✦</div>
              <h3 className="font-display text-2xl mb-2">تم إرسال طلبك</h3>
              <p className="text-sm text-foreground/75">
                تلقّينا طلبك للانضمام إلى {committee}، وسيتواصل معك الفريق في أقرب وقت.
              </p>
              <button
                onClick={onClose}
                className="mt-6 px-6 py-2.5 rounded-full bg-accent text-background font-semibold text-sm"
              >
                حسناً
              </button>
            </div>
          ) : (
            <>
              {/* Committee Info */}
              {info && (
                <div className="mb-6 rounded-2xl bg-accent/8 border border-accent/20 p-4 text-right">
                  <div className="text-xs font-semibold uppercase tracking-widest text-accent mb-2 text-center">انضم إلينا</div>
                  <h3 className="font-display text-lg text-center mb-3">{info.fullName}</h3>
                  <p className="text-xs text-foreground/75 leading-relaxed mb-3">{info.description}</p>
                  <div className="text-xs bg-background/40 rounded-xl p-3">
                    <span className="font-semibold text-foreground/80">السمات المطلوبة: </span>
                    <span className="text-foreground/65">{info.traits}</span>
                  </div>
                </div>
              )}

              <p className="text-xs text-foreground/50 text-center mb-4">أدخل بياناتك وسيتواصل معك الفريق</p>

              <div className="flex flex-col gap-3">
                {[
                  { key: "full_name", label: "الاسم الكامل *", placeholder: "محمد أحمد علي", type: "text" },
                  { key: "academic_id", label: "الرقم الأكاديمي *", placeholder: "2024XXXXXX", type: "text" },
                  { key: "whatsapp", label: "رقم الواتساب *", placeholder: "01xxxxxxxxx", type: "tel" },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="text-xs font-medium text-foreground/75 block mb-1">{f.label}</label>
                    <input
                      type={f.type}
                      placeholder={f.placeholder}
                      value={(form as any)[f.key]}
                      onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                      className="w-full rounded-xl border border-border bg-background/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 text-right"
                      dir="rtl"
                    />
                  </div>
                ))}

                <div>
                  <label className="text-xs font-medium text-foreground/75 block mb-1">السنة الدراسية *</label>
                  <select
                    value={form.academic_year}
                    onChange={(e) => setForm((prev) => ({ ...prev, academic_year: e.target.value }))}
                    className="w-full rounded-xl border border-border bg-background/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 text-right"
                    dir="rtl"
                  >
                    <option value="">اختر السنة</option>
                    <option value="الأولى">الأولى</option>
                    <option value="الثانية">الثانية</option>
                    <option value="الثالثة">الثالثة</option>
                    <option value="الرابعة">الرابعة</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground/75 block mb-1">ليه عايز تنضم؟ *</label>
                  <textarea
                    placeholder="اكتب سبب انضمامك والي عايز تقدمه للفريق..."
                    value={form.why_join}
                    onChange={(e) => setForm((prev) => ({ ...prev, why_join: e.target.value }))}
                    rows={3}
                    className="w-full rounded-xl border border-border bg-background/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 text-right resize-none"
                    dir="rtl"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground/75 block mb-1">مهاراتك (اختياري)</label>
                  <textarea
                    placeholder="تصميم، تصوير، كتابة محتوى، تنظيم فعاليات..."
                    value={form.skills}
                    onChange={(e) => setForm((prev) => ({ ...prev, skills: e.target.value }))}
                    rows={2}
                    className="w-full rounded-xl border border-border bg-background/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 text-right resize-none"
                    dir="rtl"
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="mt-2 flex items-center justify-center gap-2 w-full rounded-full bg-gradient-cosmic text-primary-foreground font-semibold py-3 text-sm transition hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {loading ? "جاري الإرسال..." : "أرسل طلبك"}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
