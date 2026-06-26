import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles, BookOpen, Brain, Calculator, FileText, Bell, ShieldCheck, ArrowLeft } from "lucide-react";
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
  "الرياضيات",
  "الفيزياء",
  "الكيمياء",
  "الجيولوجيا",
  "النبات والميكروبيولوجي",
  "علم الحيوان",
];

const FEATURES = [
  { icon: BookOpen, title: "مكتبة المواد", desc: "كل مواد الدفعات من أولى لرابعة بمحتوى منظم وفيديوهات شرح." },
  { icon: Brain, title: "اختبارات ذكية", desc: "MCQ، صح وخطأ، ومقالي — مع تفسيرات لكل إجابة." },
  { icon: Calculator, title: "حاسبة GPA", desc: "احسب الفصلي والتراكمي على النظام المصري في ثواني." },
  { icon: FileText, title: "ملاحظاتك الخاصة", desc: "دفترك الإلكتروني للمذاكرة — يحفظ معاك في أي وقت." },
  { icon: Sparkles, title: "مساعد Quark الذكي", desc: "بيشرحلك أي حاجة بأسلوب بسيط وممتع." },
  { icon: Bell, title: "إعلانات الكلية", desc: "متابعة لحظية لكل إعلان وموعد مهم." },
];

function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
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
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-8 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mx-auto"
        >
          <Logo size={180} className="mx-auto drop-shadow-2xl" />
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
            بوابة <span className="text-gradient-cosmic">عباقرة</span> كلية العلوم
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            منصة متكاملة تجمع كل اللي محتاجه: المواد، الاختبارات، حاسبة المعدل، ومساعد ذكي بيرد على أسئلتك في أي وقت.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/auth"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-base font-semibold text-primary-foreground shadow-soft transition hover:shadow-glow"
            >
              سجل بحساب Google
              <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
            </Link>
            <a
              href="#about"
              className="rounded-full border border-border bg-card/60 px-7 py-3 text-base backdrop-blur transition hover:border-accent"
            >
              تعرف على Dream Team
            </a>
          </div>
        </motion.div>
      </section>

      {/* About */}
      <section id="about" className="relative z-10 mx-auto max-w-6xl px-6 py-16">
        <div className="cosmic-card rounded-3xl p-8 md:p-12">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-accent">عن الكلية</div>
              <h2 className="mt-3 font-display text-3xl md:text-4xl">كلية العلوم — جامعة أسيوط</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                تأسست كلية العلوم بجامعة أسيوط في أكتوبر <span className="font-semibold text-foreground">1957</span>،
                وتُعتبر من أعرق كليات العلوم في صعيد مصر، وتضم ستة أقسام أكاديمية تخرّج منها آلاف العلماء والباحثين.
              </p>
              <ul className="mt-5 grid grid-cols-2 gap-2 text-sm">
                {DEPARTMENTS.map((d) => (
                  <li key={d} className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid gap-4">
              <div className="rounded-2xl border border-border bg-gradient-to-bl from-card to-secondary/40 p-6">
                <div className="text-xs font-semibold uppercase tracking-widest text-accent">رسالتنا</div>
                <p className="mt-2 text-sm leading-relaxed">
                  نخلق بيئة رقمية تساعد كل طالب علوم يطلع أفضل نسخة من نفسه — بالأدوات، المحتوى، والمجتمع.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-gradient-to-tl from-card to-secondary/40 p-6">
                <div className="text-xs font-semibold uppercase tracking-widest text-accent">رؤيتنا</div>
                <p className="mt-2 text-sm leading-relaxed">
                  أن نكون البوابة الأولى لكل طالب علوم في صعيد مصر — منصة تجمع المعرفة، الإلهام، والمجتمع تحت سقف واحد.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-16">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl md:text-4xl">كل اللي محتاجه في مكان واحد</h2>
          <p className="mt-3 text-muted-foreground">سبع أدوات مصممة خصيصاً لطلاب كلية العلوم.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="cosmic-card group rounded-2xl p-6 transition hover:-translate-y-1 hover:shadow-glow"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-cosmic text-primary-foreground shadow-rose">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-xl">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
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
