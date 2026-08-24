import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  FlaskConical,
  Loader2,
  ClipboardList,
  ShieldCheck,
  GraduationCap,
  CalendarDays,
} from "lucide-react";
import { useAuth, isDepartmentStaffRole, isInstructorRole } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { StarsBackground } from "@/components/IntroSequence";
import { Logo } from "@/components/Logo";
import { DEPARTMENT_NAME, DEPARTMENT_FEATURES, type DepartmentApplication } from "@/lib/department";

export const Route = createFileRoute("/department/")({
  head: () => ({ meta: [{ title: `قسم ${DEPARTMENT_NAME} — Assuit SciDream` }] }),
  component: DepartmentPage,
});

const SCHEDULE = [
  { year: "الفرقة الأولى", day: "السبت والاثنين", note: "محاضرات عامة + معمل كيمياء أساسي" },
  { year: "الفرقة الثانية", day: "الأحد والثلاثاء", note: "بداية مواد التخصص الصناعي" },
  { year: "الفرقة الثالثة", day: "الاثنين والأربعاء", note: "معامل عمليات صناعية" },
  { year: "الفرقة الرابعة", day: "الثلاثاء والخميس", note: "مشروع التخرج + مواد اختيارية" },
];

function DepartmentPage() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const [app, setApp] = useState<DepartmentApplication | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("department_applications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setApp((data as DepartmentApplication) ?? null);
      setBusy(false);
    })();
  }, [user]);

  const isStaff = isDepartmentStaffRole(roles);
  const isInstructor = isInstructorRole(roles);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen" dir="rtl">
      <StarsBackground />
      <header className="relative z-10 border-b border-border/60 bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-sm text-foreground/75 hover:text-foreground"
          >
            <ArrowRight className="h-4 w-4" /> الرئيسية
          </Link>
          <div className="flex items-center gap-3">
            <FlaskConical className="h-5 w-5 text-accent" />
            <div>
              <div className="font-display text-base font-semibold leading-tight">
                قسم {DEPARTMENT_NAME}
              </div>
              <div className="text-[10px] text-foreground/75">كلية العلوم — جامعة أسيوط</div>
            </div>
            <Logo size={36} />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-6 py-8 space-y-8">
        {/* Status-aware CTA */}
        <div className="cosmic-card rounded-3xl p-6">
          {busy ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-accent" />
            </div>
          ) : !app ? (
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-lg">لسه معندكش طلب انضمام للقسم</h2>
                <p className="mt-1 text-sm text-foreground/75">
                  قدّم طلبك وهيراجعه المشرف الأكاديمي.
                </p>
              </div>
              <Link
                to="/department/apply"
                className="whitespace-nowrap rounded-full bg-gradient-cosmic px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-rose"
              >
                قدّم للانضمام
              </Link>
            </div>
          ) : app.status === "pending" ? (
            <div className="flex items-center gap-3">
              <ClipboardList className="h-6 w-6 text-accent" />
              <div>
                <h2 className="font-display text-lg">طلبك قيد المراجعة</h2>
                <p className="mt-1 text-sm text-foreground/75">
                  هيراجعه المشرف الأكاديمي في أقرب وقت.
                </p>
              </div>
            </div>
          ) : app.status === "approved" ? (
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-green-600" />
                <div>
                  <h2 className="font-display text-lg">أنت طالب مؤكد في القسم ✨</h2>
                  <p className="mt-1 text-sm text-foreground/75">
                    تقدر تسجل موادك وترتب أولوياتك دلوقتي.
                  </p>
                </div>
              </div>
              <Link
                to="/department/register"
                className="whitespace-nowrap rounded-full bg-gradient-cosmic px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-rose"
              >
                تسجيل المواد
              </Link>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-lg">للأسف طلبك السابق اتشال/اترفض</h2>
                <p className="mt-1 text-sm text-foreground/75">تقدر تقدم طلب جديد كطالب عادي.</p>
              </div>
              <Link
                to="/department/apply"
                className="whitespace-nowrap rounded-full bg-gradient-cosmic px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-rose"
              >
                إعادة التقديم
              </Link>
            </div>
          )}
        </div>

        {isStaff && (
          <Link
            to="/department/advisor"
            className="cosmic-card flex items-center gap-3 rounded-2xl p-4 hover:border-accent"
          >
            <ShieldCheck className="h-5 w-5 text-accent" />
            <span className="text-sm font-medium">لوحة المشرف الأكاديمي</span>
          </Link>
        )}
        {isInstructor && (
          <Link
            to="/department/grades"
            className="cosmic-card flex items-center gap-3 rounded-2xl p-4 hover:border-accent"
          >
            <GraduationCap className="h-5 w-5 text-accent" />
            <span className="text-sm font-medium">رفع درجات مادتي</span>
          </Link>
        )}

        {/* Features */}
        <section>
          <h3 className="mb-3 font-display text-lg">مميزات القسم</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {DEPARTMENT_FEATURES.map((f) => (
              <div key={f.title} className="cosmic-card rounded-2xl p-4">
                <div className="font-medium">{f.title}</div>
                <div className="mt-1 text-sm text-foreground/75">{f.body}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Schedule */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-accent" />
            <h3 className="font-display text-lg">الجدول الدراسي</h3>
          </div>
          <div className="cosmic-card overflow-hidden rounded-2xl">
            <table className="w-full text-right text-sm">
              <thead className="border-b border-border bg-secondary/30 text-xs uppercase tracking-wider text-foreground/75">
                <tr>
                  <th className="px-4 py-3">الفرقة</th>
                  <th className="px-4 py-3">أيام المحاضرات</th>
                  <th className="px-4 py-3">ملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {SCHEDULE.map((row) => (
                  <tr key={row.year}>
                    <td className="px-4 py-3 font-medium">{row.year}</td>
                    <td className="px-4 py-3">{row.day}</td>
                    <td className="px-4 py-3 text-foreground/75">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
