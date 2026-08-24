import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, GraduationCap, Loader2, Save } from "lucide-react";
import { useAuth, isAdminRole, isInstructorRole } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { StarsBackground } from "@/components/IntroSequence";
import { DEPARTMENT_NAME } from "@/lib/department";

export const Route = createFileRoute("/department/grades")({
  head: () => ({ meta: [{ title: `درجات المواد — قسم ${DEPARTMENT_NAME}` }] }),
  component: GradesPage,
});

interface Subject {
  id: string;
  code: string;
  name_ar: string;
  instructor_id: string | null;
}

interface StudentGrade {
  student_id: string;
  full_name: string | null;
  academic_id: string | null;
  grade: string;
  points: string;
  grade_id: string | null;
}

function GradesPage() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const isStaff = isInstructorRole(roles);
  const isAdmin = isAdminRole(roles);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [rows, setRows] = useState<StudentGrade[]>([]);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth" });
    else if (!isStaff) navigate({ to: "/department" });
  }, [loading, user, isStaff, navigate]);

  const loadSubjects = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    let q = supabase
      .from("subjects")
      .select("id, code, name_ar, instructor_id")
      .eq("department", DEPARTMENT_NAME);
    if (!isAdmin) q = q.eq("instructor_id", user.id);
    const { data, error } = await q.order("name_ar");
    if (error) toast.error("ما قدرناش نحمل المواد");
    const list = (data as Subject[]) ?? [];
    setSubjects(list);
    if (list.length && !selected) setSelected(list[0].id);
    setBusy(false);
  }, [user, isAdmin, selected]);

  useEffect(() => {
    void loadSubjects();
  }, [loadSubjects]);

  const loadRoster = useCallback(async () => {
    if (!selected) {
      setRows([]);
      return;
    }
    setBusy(true);
    const [{ data: regs }, { data: grades }] = await Promise.all([
      supabase
        .from("department_registrations")
        .select("student_id, profiles(full_name, academic_id)")
        .eq("subject_id", selected)
        .eq("status", "paid"),
      supabase.from("department_grades").select("*").eq("subject_id", selected),
    ]);
    const gradeMap = new Map((grades ?? []).map((g) => [g.student_id, g]));
    const list: StudentGrade[] = (regs ?? []).map((r) => {
      const prof = (
        r as unknown as {
          profiles: { full_name: string | null; academic_id: string | null } | null;
        }
      ).profiles;
      const g = gradeMap.get(r.student_id);
      return {
        student_id: r.student_id,
        full_name: prof?.full_name ?? null,
        academic_id: prof?.academic_id ?? null,
        grade: g?.grade ?? "",
        points: g?.points != null ? String(g.points) : "",
        grade_id: g?.id ?? null,
      };
    });
    setRows(list);
    setBusy(false);
  }, [selected]);

  useEffect(() => {
    void loadRoster();
  }, [loadRoster]);

  function updateRow(studentId: string, field: "grade" | "points", value: string) {
    setRows((prev) => prev.map((r) => (r.student_id === studentId ? { ...r, [field]: value } : r)));
  }

  async function saveRow(row: StudentGrade) {
    if (!user || !selected) return;
    setSaving(row.student_id);
    const { error } = await supabase.from("department_grades").upsert(
      {
        student_id: row.student_id,
        subject_id: selected,
        grade: row.grade.trim() || null,
        points: row.points.trim() ? Number(row.points) : null,
        uploaded_by: user.id,
      },
      { onConflict: "student_id,subject_id" },
    );
    setSaving(null);
    if (error) return toast.error(error.message);
    toast.success("اتحفظت الدرجة ✅");
  }

  if (loading || !user || !isStaff) {
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
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link
            to="/department"
            className="flex items-center gap-2 text-sm text-foreground/75 hover:text-foreground"
          >
            <ArrowRight className="h-4 w-4" /> قسم {DEPARTMENT_NAME}
          </Link>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-accent" />
            <h1 className="font-display text-lg font-semibold">درجات المواد</h1>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-6 py-8">
        {subjects.length === 0 && !busy ? (
          <p className="py-16 text-center text-sm text-foreground/75">
            مفيش مواد متسجلة عليك كدكتور.
          </p>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap gap-2">
              {subjects.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelected(s.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${selected === s.id ? "border-accent bg-accent text-background" : "border-border text-foreground/70 hover:text-foreground"}`}
                >
                  {s.name_ar} ({s.code})
                </button>
              ))}
            </div>

            {busy ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-accent" />
              </div>
            ) : rows.length === 0 ? (
              <p className="py-12 text-center text-sm text-foreground/75">
                مفيش طلاب مدفوعين مسجلين في المادة دي لسه.
              </p>
            ) : (
              <div className="cosmic-card overflow-hidden rounded-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm">
                    <thead className="border-b border-border bg-secondary/30 text-xs uppercase tracking-wider text-foreground/75">
                      <tr>
                        <th className="px-4 py-3">الطالب</th>
                        <th className="px-4 py-3">الرقم الأكاديمي</th>
                        <th className="px-4 py-3">التقدير</th>
                        <th className="px-4 py-3">الدرجة</th>
                        <th className="px-4 py-3 text-center">حفظ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {rows.map((r) => (
                        <tr key={r.student_id}>
                          <td className="px-4 py-3 font-medium">{r.full_name ?? "—"}</td>
                          <td className="px-4 py-3 font-mono text-xs">{r.academic_id}</td>
                          <td className="px-4 py-3">
                            <input
                              value={r.grade}
                              onChange={(e) => updateRow(r.student_id, "grade", e.target.value)}
                              placeholder="جيد جدًا"
                              className="w-24 rounded-lg border border-border bg-background/60 px-2 py-1 text-xs focus:border-accent focus:outline-none"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              value={r.points}
                              onChange={(e) => updateRow(r.student_id, "points", e.target.value)}
                              placeholder="85"
                              type="number"
                              className="w-20 rounded-lg border border-border bg-background/60 px-2 py-1 text-xs focus:border-accent focus:outline-none"
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => saveRow(r)}
                              disabled={saving === r.student_id}
                              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                            >
                              {saving === r.student_id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Save className="h-3 w-3" />
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
