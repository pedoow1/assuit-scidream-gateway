import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Plus, Trash2, Calculator } from "lucide-react";
import { StarsBackground } from "@/components/IntroSequence";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/gpa")({
  head: () => ({
    meta: [
      { title: "حاسبة GPA — Assuit SciDream" },
      { name: "description", content: "احسب معدلك الفصلي والتراكمي على النظام المصري بسهولة." },
    ],
  }),
  component: GpaPage,
});

// النظام المصري الصح — بدون A+
const GRADES: { label: string; ar: string; value: number }[] = [
  { label: "A  (4.0)",  ar: "ممتاز",    value: 4.0 },
  { label: "A- (3.7)",  ar: "ممتاز",    value: 3.7 },
  { label: "B+ (3.3)",  ar: "جيد جداً", value: 3.3 },
  { label: "B  (3.0)",  ar: "جيد جداً", value: 3.0 },
  { label: "B- (2.7)",  ar: "جيد",      value: 2.7 },
  { label: "C+ (2.3)",  ar: "جيد",      value: 2.3 },
  { label: "C  (2.0)",  ar: "مقبول",    value: 2.0 },
  { label: "C- (1.7)",  ar: "مقبول",    value: 1.7 },
  { label: "D+ (1.3)",  ar: "مقبول",    value: 1.3 },
  { label: "D  (1.0)",  ar: "مقبول",    value: 1.0 },
  { label: "F  (0.0)",  ar: "راسب",     value: 0.0 },
];

function gradeLabel(gpa: number): string {
  if (gpa >= 4.0) return "A";
  if (gpa >= 3.7) return "A-";
  if (gpa >= 3.3) return "B+";
  if (gpa >= 3.0) return "B";
  if (gpa >= 2.7) return "B-";
  if (gpa >= 2.3) return "C+";
  if (gpa >= 2.0) return "C";
  if (gpa >= 1.7) return "C-";
  if (gpa >= 1.3) return "D+";
  if (gpa >= 1.0) return "D";
  return "F";
}

interface Course { id: string; name: string; credits: number; grade: number; }
interface Term   { id: string; name: string; courses: Course[]; }

const rid = () => Math.random().toString(36).slice(2, 9);
function newCourse(): Course { return { id: rid(), name: "", credits: 3, grade: 4.0 }; }
function newTerm(name: string): Term { return { id: rid(), name, courses: [newCourse()] }; }

function gpaOf(courses: Course[]) {
  const valid = courses.filter((c) => c.credits > 0);
  const totalCredits = valid.reduce((s, c) => s + c.credits, 0);
  if (!totalCredits) return { gpa: 0, credits: 0, points: 0 };
  const points = valid.reduce((s, c) => s + c.credits * c.grade, 0);
  return { gpa: points / totalCredits, credits: totalCredits, points };
}

function GpaPage() {
  const [terms, setTerms] = useState<Term[]>([newTerm("الفصل الأول")]);

  const cumulative = useMemo(() => {
    const all = terms.flatMap((t) => t.courses);
    return gpaOf(all);
  }, [terms]);

  function updateTerm(id: string, patch: Partial<Term>) {
    setTerms((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }
  function addCourse(termId: string) {
    setTerms((ts) => ts.map((t) => (t.id === termId ? { ...t, courses: [...t.courses, newCourse()] } : t)));
  }
  function updateCourse(termId: string, courseId: string, patch: Partial<Course>) {
    setTerms((ts) =>
      ts.map((t) =>
        t.id === termId ? { ...t, courses: t.courses.map((c) => (c.id === courseId ? { ...c, ...patch } : c)) } : t,
      ),
    );
  }
  function deleteCourse(termId: string, courseId: string) {
    setTerms((ts) =>
      ts.map((t) => (t.id === termId ? { ...t, courses: t.courses.filter((c) => c.id !== courseId) } : t)),
    );
  }
  function addTerm() {
    setTerms((ts) => [...ts, newTerm(`الفصل ${ts.length + 1}`)]);
  }
  function deleteTerm(id: string) {
    setTerms((ts) => (ts.length === 1 ? ts : ts.filter((t) => t.id !== id)));
  }

  const letter = gradeLabel(cumulative.gpa);

  return (
    <div className="relative min-h-screen">
      <StarsBackground />
      <header className="relative z-10 border-b border-border/60 bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 rotate-180" /> الرئيسية
          </Link>
          <div className="flex items-center gap-2">
            <Logo size={32} />
            <span className="font-display text-base">حاسبة GPA</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        <div className="cosmic-card rounded-3xl p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-accent">
                <Calculator className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-widest">النظام المصري · 4.0</span>
              </div>
              <h1 className="mt-2 font-display text-3xl md:text-4xl">المعدل التراكمي</h1>
            </div>
            <div className="text-right">
              <div className="flex items-end gap-3 justify-end">
                <div className="text-4xl font-bold text-gradient-cosmic md:text-5xl">{cumulative.gpa.toFixed(2)}</div>
                <div className="mb-1 rounded-xl bg-gradient-cosmic px-3 py-1 text-lg font-bold text-primary-foreground">
                  {letter}
                </div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {cumulative.credits} ساعة · {cumulative.points.toFixed(1)} نقطة
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {terms.map((term) => {
            const { gpa, credits } = gpaOf(term.courses);
            return (
              <div key={term.id} className="cosmic-card rounded-3xl p-5 md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <input
                    value={term.name}
                    onChange={(e) => updateTerm(term.id, { name: e.target.value })}
                    className="bg-transparent font-display text-xl outline-none focus:text-accent"
                  />
                  <div className="flex items-center gap-4">
                    <div className="text-sm">
                      <span className="text-muted-foreground">GPA الفصل: </span>
                      <span className="font-bold text-foreground">{gpa.toFixed(2)}</span>
                      <span className="mx-1 font-semibold text-accent">{gradeLabel(gpa)}</span>
                      <span className="text-xs text-muted-foreground">({credits} ساعة)</span>
                    </div>
                    {terms.length > 1 && (
                      <button
                        onClick={() => deleteTerm(term.id)}
                        className="rounded-full p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="grid grid-cols-12 gap-2 px-2 text-[11px] text-muted-foreground">
                    <div className="col-span-6 sm:col-span-7">المقرر</div>
                    <div className="col-span-2">ساعات</div>
                    <div className="col-span-3 sm:col-span-2">التقدير</div>
                    <div className="col-span-1"></div>
                  </div>
                  {term.courses.map((c) => (
                    <div key={c.id} className="grid grid-cols-12 items-center gap-2">
                      <input
                        value={c.name}
                        onChange={(e) => updateCourse(term.id, c.id, { name: e.target.value })}
                        placeholder="اسم المقرر"
                        className="col-span-6 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-accent sm:col-span-7"
                      />
                      <input
                        type="number"
                        min={0}
                        max={12}
                        value={c.credits}
                        onChange={(e) => updateCourse(term.id, c.id, { credits: Number(e.target.value) || 0 })}
                        className="col-span-2 rounded-lg border border-border bg-background/60 px-2 py-2 text-center text-sm outline-none focus:border-accent"
                      />
                      <select
                        value={c.grade}
                        onChange={(e) => updateCourse(term.id, c.id, { grade: Number(e.target.value) })}
                        className="col-span-3 rounded-lg border border-border bg-background/60 px-2 py-2 text-sm outline-none focus:border-accent sm:col-span-2"
                      >
                        {GRADES.map((g, i) => (
                          <option key={i} value={g.value}>{g.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => deleteCourse(term.id, c.id)}
                        className="col-span-1 flex justify-center rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => addCourse(term.id)}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm text-accent hover:text-foreground"
                >
                  <Plus className="h-4 w-4" /> إضافة مقرر
                </button>
              </div>
            );
          })}

          <button
            onClick={addTerm}
            className="w-full rounded-2xl border border-dashed border-border bg-background/30 py-4 text-sm text-muted-foreground transition hover:border-accent hover:text-foreground"
          >
            <Plus className="inline h-4 w-4" /> إضافة فصل دراسي
          </button>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          ✨ الحاسبة بتشتغل لحظياً — مفيش حاجة بتتحفظ على الإنترنت.
        </p>
      </main>
    </div>
  );
}
