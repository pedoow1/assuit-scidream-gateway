import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, BookOpen, Brain, Calculator, FileText, Sparkles, Bell, ShieldCheck, LogOut, MapPin, FlaskConical, LayoutGrid, GraduationCap } from "lucide-react";
import { useAuth, isAdminRole } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { CosmicBackground } from "@/components/CosmicBackground";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "الرئيسية — Assuit SciDream" }] }),
  component: Dashboard,
});

const QUICK: { icon: typeof BookOpen; label: string; color: string; to?: string }[] = [
  { icon: BookOpen, label: "المواد", color: "from-rose/60 to-gold/40", to: "/subjects" },
  { icon: Brain, label: "الاختبارات", color: "from-gold/60 to-rose/40", to: "/quizzes" },
  { icon: Calculator, label: "حاسبة GPA", color: "from-cosmic/40 to-rose/40", to: "/gpa" },
  { icon: FileText, label: "ملاحظاتي", color: "from-rose/40 to-cosmic/40", to: "/notes" },
  { icon: Sparkles, label: "المساعد الذكي", color: "from-gold/40 to-cosmic/40", to: "/assistant" },
  { icon: Bell, label: "الإعلانات", color: "from-cosmic/40 to-gold/40", to: "/announcements" },
  { icon: GraduationCap, label: "دورات تدريبية", color: "from-gold/60 to-rose/60", to: "/courses" },
];

const AUDITORIUMS = [
  { id: "مدرج 1", location: "الدور الثاني بين رياضيات ونبات" },
  { id: "مدرج 2", location: "الدور الثاني بين نبات وحيوان" },
  { id: "مدرج 3", location: "الدور الأرضي بين رياضيات ونبات" },
  { id: "مدرج 4", location: "الدور الأرضي بين نبات وحيوان" },
  { id: "مدرج 5", location: "الدور الثاني بين جيولوجيا وفيزياء" },
  { id: "مدرج 6", location: "الدور الثاني بين فيزياء وكيمياء" },
  { id: "مدرج 7", location: "الدور الأرضي بين جيولوجيا وفيزياء" },
  { id: "مدرج 8", location: "الدور الأرضي بين فيزياء وكيمياء" },
  { id: "مدرج 9", location: "الدور الثاني بين رياضيات ونبات" },
  { id: "مدرج 10", location: "الدور الثاني بين جيولوجيا وفيزياء" },
  { id: "مدرج 11", location: "الدور الثاني بين رياضيات ونبات" },
  { id: "مدرج 12", location: "الدور الثاني بين رياضيات ونبات" },
  { id: "مدرج B – A", location: "في قسم الكيمياء الجديد (كيمياء ب)" },
];

const CLASSROOMS = [
  { id: "فصل 1 - 2", location: "الدور الثاني بين حيوان ونبات" },
  { id: "فصل 3 - 4", location: "الدور الثالث بين رياضيات ونبات" },
  { id: "فصل 5 - 6", location: "الدور الثالث بين حيوان ونبات" },
];

const LABS = [
  { id: "معمل كيمياء الفرقة الأولى", location: "الدور الأرضي — قسم كيمياء" },
  { id: "معمل نبات 1 , 2 , 3", location: "الدور الثاني — قسم نبات" },
  { id: "معمل نبات 5", location: "الدور الرابع — قسم نبات" },
  { id: "معمل حيوان 1 , 2", location: "الدور الثاني — قسم حيوان" },
  { id: "معمل حيوان 3 , 4", location: "الدور الثالث — قسم حيوان" },
  { id: "معمل جيولوجيا 1 , 2", location: "الدور الأرضي — قسم جيولوجيا" },
  { id: "معمل جيولوجيا 3 , 4", location: "الدور الثاني — قسم جيولوجيا" },
  { id: "معمل الفيزياء للفرقة الأولى", location: "الدور الثاني — قسم فيزياء" },
  { id: "معمل الحاسب", location: "الدور الأرضي — قسم رياضيات" },
];

const LOCATION_TABS = [
  { key: "auditoriums", label: "المدرجات", icon: LayoutGrid },
  { key: "classrooms", label: "الفصول", icon: BookOpen },
  { key: "labs", label: "المعامل", icon: FlaskConical },
] as const;

function Dashboard() {
  const { user, profile, roles, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"auditoriums" | "classrooms" | "labs">("auditoriums");
  const [scrollProgress, setScrollProgress] = useState(0);
  const isOwnerAdmin = user?.email?.trim().toLowerCase() === "abdalahkotp31@gmail.com";

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setScrollProgress(max > 0 ? Math.min(el.scrollTop / max, 1) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const timer = setTimeout(() => navigate({ to: "/auth" }), 500);
      return () => clearTimeout(timer);
    }
    if (isOwnerAdmin) return;
    if (!profile) {
      const timer = setTimeout(() => navigate({ to: "/complete-profile" }), 5000);
      return () => clearTimeout(timer);
    }
    if (profile.verification_status === "incomplete") {
      navigate({ to: "/complete-profile" });
    } else if (profile.verification_status === "pending" || profile.verification_status === "rejected") {
      navigate({ to: "/pending" });
    }
  }, [user, profile, loading, navigate, isOwnerAdmin]);

  if (loading || (!user) || (!profile && !isOwnerAdmin)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const isAdmin = isOwnerAdmin || isAdminRole(roles);

  const currentData =
    activeTab === "auditoriums" ? AUDITORIUMS :
    activeTab === "classrooms" ? CLASSROOMS :
    LABS;

  return (
    <div className="relative min-h-screen" dir="rtl">
      <CosmicBackground scrollProgress={scrollProgress} />

      <header className="relative z-10 border-b border-border/60 bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <Logo size={40} />
            <div className="hidden sm:block">
              <div className="font-display text-base font-semibold leading-tight">Assuit SciDream</div>
              <div className="text-[10px] text-muted-foreground">Dream Team</div>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 rounded-full bg-gradient-cosmic px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-rose"
              >
                <ShieldCheck className="h-3.5 w-3.5" /> لوحة الأدمن
              </Link>
            )}
            <button
              onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-xs hover:border-accent"
            >
              <LogOut className="h-3.5 w-3.5" /> خروج
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 py-10 space-y-8">

        {/* Welcome */}
        <div className="cosmic-card rounded-3xl p-8 md:p-10">
          <div className="text-xs font-semibold uppercase tracking-widest text-accent">أهلاً بيك</div>
          <h1 className="mt-2 font-display text-3xl md:text-4xl">
            {profile?.full_name?.split(" ")[0] ?? "يا أدمن"} ✨
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            رحلتك في كلية العلوم بدأت — اختار قسم وابدأ.
          </p>
        </div>

        {/* Quick Access */}
        <div>
          <h2 className="font-display text-xl mb-4">الأقسام</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {QUICK.map((q) => {
              const inner = (
                <>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${q.color} text-foreground`}>
                    <q.icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium">{q.label}</span>
                </>
              );
              const cls = "group cosmic-card flex flex-col items-center gap-2 rounded-2xl p-5 text-center transition hover:-translate-y-0.5 hover:shadow-glow";
              return q.to ? (
                <Link key={q.label} to={q.to} className={cls}>{inner}</Link>
              ) : (
                <button key={q.label} className={cls} onClick={() => alert("هذا القسم قيد التطوير في المرحلة القادمة ✨")}>
                  {inner}
                </button>
              );
            })}
          </div>
        </div>

        {/* Locations */}
        <div className="cosmic-card rounded-3xl p-6 md:p-8">
          <div className="mb-5 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-accent" />
            <h2 className="font-display text-xl">أماكن المدرجات والفصول والمعامل</h2>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {LOCATION_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  activeTab === tab.key
                    ? "bg-gradient-cosmic text-primary-foreground shadow-rose"
                    : "border border-border bg-background/40 text-muted-foreground hover:border-accent"
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-border/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card/60 text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-right font-semibold">
                    {activeTab === "auditoriums" ? "المدرج" : activeTab === "classrooms" ? "الفصل" : "المعمل"}
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">الموقع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {currentData.map((row) => (
                  <tr key={row.id} className="hover:bg-card/40 transition">
                    <td className="px-4 py-3 font-semibold text-accent">{row.id}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
