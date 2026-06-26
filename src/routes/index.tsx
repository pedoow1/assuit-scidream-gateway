import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
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

const DEPARTMENTS = [
  { name: "الرياضيات", code: "ر" },
  { name: "الفيزياء", code: "ف" },
  { name: "الكيمياء", code: "ك" },
  { name: "الجيولوجيا", code: "ج" },
  { name: "النبات والميكروبيولوجي", code: "ن" },
  { name: "علم الحيوان", code: "د" },
];

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
  return (
    <div className="relative min-h-screen overflow-hidden" dir="rtl">
      <CosmicBackground density={50} />

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
            صدر القرار الوزاري رقم 1375 بتاريخ 13/7/2008م بإصدار اللائحة الداخلية للكلية بنظام الساعات المعتمدة.
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
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        <div className="cosmic-card rounded-3xl p-8 md:p-10">
          <div className="mb-6 text-center">
            <h2 className="font-display text-3xl">أقسام الكلية</h2>
            <p className="mt-2 text-sm text-muted-foreground">ستة أقسام علمية — مادة (1) من اللائحة الداخلية</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {DEPARTMENTS.map((d) => (
              <div key={d.name} className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-background/40 p-4 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-cosmic text-primary-foreground text-sm font-bold">
                  {d.code}
                </div>
                <span className="text-sm font-medium">{d.name}</span>
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
                  { grade: "جيد جداً -", symbol: "A-", points: "3.7", range: "85 – <90%" },
                  { grade: "جيد جداً +", symbol: "B+", points: "3.3", range: "80 – <85%" },
                  { grade: "جيد جداً", symbol: "B", points: "3.0", range: "75 – <80%" },
                  { grade: "جيد -", symbol: "B-", points: "2.7", range: "70 – <75%" },
                  { grade: "مقبول +", symbol: "C+", points: "2.3", range: "65 – <70%" },
                  { grade: "مقبول", symbol: "C", points: "2.0", range: "60 – <65%" },
                  { grade: "مقبول -", symbol: "C-", points: "1.7", range: "57 – <60%" },
                  { grade: "ضعيف +", symbol: "D+", points: "1.3", range: "55 – <57%" },
                  { grade: "ضعيف", symbol: "D", points: "1.0", range: "50 – <55%" },
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
    </div>
  );
}
