import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2, BookOpen, Brain, Calculator, FileText, Sparkles, Bell, ShieldCheck, LogOut } from "lucide-react";
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
  { icon: Brain, label: "الاختبارات", color: "from-gold/60 to-rose/40" },
  { icon: Calculator, label: "حاسبة GPA", color: "from-cosmic/40 to-rose/40", to: "/gpa" },
  { icon: FileText, label: "ملاحظاتي", color: "from-rose/40 to-cosmic/40" },
  { icon: Sparkles, label: "المساعد الذكي", color: "from-gold/40 to-cosmic/40" },
  { icon: Bell, label: "الإعلانات", color: "from-cosmic/40 to-gold/40" },
];

function Dashboard() {
  const { user, profile, roles, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth" });
    else if (!profile) navigate({ to: "/complete-profile" });
    else if (profile?.verification_status === "incomplete") navigate({ to: "/complete-profile" });
    else if (profile?.verification_status === "pending" || profile?.verification_status === "rejected") {
      navigate({ to: "/pending" });
    }
  }, [user, profile, loading, navigate]);

  if (loading || !user || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const isAdmin = isAdminRole(roles);

  return (
    <div className="relative min-h-screen">
      <CosmicBackground density={26} />

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

      <main className="relative z-10 mx-auto max-w-7xl px-6 py-10">
        {/* Welcome */}
        <div className="cosmic-card rounded-3xl p-8 md:p-10">
          <div className="text-xs font-semibold uppercase tracking-widest text-accent">أهلاً بيك</div>
          <h1 className="mt-2 font-display text-3xl md:text-4xl">
            {profile.full_name?.split(" ")[0] ?? "يا عبقري"} ✨
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            رحلتك في كلية العلوم بدأت — اختار قسم وابدأ.
          </p>
        </div>

        {/* Quick actions */}
        <div className="mt-8">
          <h2 className="font-display text-xl">الأقسام</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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
          <p className="mt-6 text-center text-xs text-muted-foreground">
            ✨ باقي الأقسام بتيتم تجهيزها — المواد جاهزة دلوقتي.
          </p>
        </div>
      </main>
    </div>
  );
}
