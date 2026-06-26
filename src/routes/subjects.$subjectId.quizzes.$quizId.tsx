import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Plus, Trash2, Upload, X, Clock, CheckCircle2, XCircle, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, isAdminRole } from "@/lib/auth";
import { CosmicBackground } from "@/components/CosmicBackground";

export const Route = createFileRoute("/subjects/$subjectId/quizzes/$quizId")({
  head: () => ({ meta: [{ title: "اختبار — Assuit SciDream" }] }),
  component: QuizPage,
});

type QType = "mcq" | "true_false" | "essay";

interface Question {
  id: string;
  quiz_id: string;
  type: QType;
  prompt: string;
  options: string[] | null;
  correct_answer: string | null;
  explanation: string | null;
  points: number;
  order_index: number;
}

interface Quiz {
  id: string;
  subject_id: string;
  title: string;
  description: string | null;
  time_limit_min: number | null;
  pass_score: number;
  is_published: boolean;
}

function QuizPage() {
  const { subjectId, quizId } = Route.useParams();
  const { user, roles, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isAdmin = isAdminRole(roles);

  const { data: quiz, isLoading: quizLoading } = useQuery({
    queryKey: ["quiz", quizId],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("quizzes").select("*").eq("id", quizId).maybeSingle();
      if (error) throw error;
      return data as Quiz | null;
    },
  });

  const { data: questions, isLoading: qLoading } = useQuery({
    queryKey: ["quiz-questions", quizId],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("quiz_questions").select("*").eq("quiz_id", quizId).order("order_index");
      if (error) throw error;
      return (data ?? []).map((q) => ({ ...q, options: q.options as string[] | null })) as Question[];
    },
  });

  if (authLoading || quizLoading || qLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;
  }
  if (!user) { navigate({ to: "/auth" }); return null; }
  if (!quiz) return <NotFound subjectId={subjectId} />;

  return (
    <div className="relative min-h-screen">
      <CosmicBackground density={22} />
      <header className="relative z-10 border-b border-border/60 bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/subjects/$subjectId/quizzes" params={{ subjectId }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 rotate-180" /> رجوع للاختبارات
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-6 py-10">
        {isAdmin ? (
          <AdminQuizManager quiz={quiz} questions={questions ?? []} />
        ) : (
          <TakeQuiz quiz={quiz} questions={questions ?? []} userId={user.id} subjectId={subjectId} />
        )}
      </main>
    </div>
  );
}

function NotFound({ subjectId }: { subjectId: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="cosmic-card rounded-2xl p-6 text-center text-sm text-muted-foreground">
        الاختبار مش موجود.
        <Link to="/subjects/$subjectId/quizzes" params={{ subjectId }} className="mt-3 block text-accent">رجوع</Link>
      </div>
    </div>
  );
}

/* =============== ADMIN =============== */

function AdminQuizManager({ quiz, questions }: { quiz: Quiz; questions: Question[] }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);

  async function deleteQ(id: string) {
    if (!confirm("حذف السؤال؟")) return;
    const { error } = await supabase.from("quiz_questions").delete().eq("id", id);
    if (error) toast.error("فشل الحذف");
    else { toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["quiz-questions", quiz.id] }); }
  }

  return (
    <>
      <div className="cosmic-card rounded-3xl p-6 md:p-8">
        <h1 className="font-display text-2xl md:text-3xl">{quiz.title}</h1>
        {quiz.description && <p className="mt-2 text-sm text-muted-foreground">{quiz.description}</p>}
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-secondary px-3 py-1">{questions.length} سؤال</span>
          {quiz.time_limit_min && <span className="rounded-full bg-secondary px-3 py-1">{quiz.time_limit_min} دقيقة</span>}
          <span className="rounded-full bg-secondary px-3 py-1">نجاح: {quiz.pass_score}%</span>
          <span className={`rounded-full px-3 py-1 ${quiz.is_published ? "bg-gold/30" : "bg-secondary"}`}>{quiz.is_published ? "منشور" : "مسودة"}</span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          <Plus className="h-4 w-4" /> إضافة سؤال
        </button>
        <button onClick={() => setShowImport(true)} className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:border-accent">
          <Upload className="h-4 w-4" /> استيراد جماعي (JSON/CSV)
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {questions.length === 0 ? (
          <div className="cosmic-card rounded-2xl p-8 text-center text-sm text-muted-foreground">لسه مفيش أسئلة.</div>
        ) : (
          questions.map((q, i) => (
            <div key={q.id} className="cosmic-card rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded-full bg-gradient-cosmic px-2 py-0.5 font-semibold text-primary-foreground">{i + 1}</span>
                    <span className="rounded-full bg-secondary px-2 py-0.5">
                      {q.type === "mcq" ? "اختيار" : q.type === "true_false" ? "صح/خطأ" : "مقالي"}
                    </span>
                    <span className="text-muted-foreground">{q.points} درجة</span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">{q.prompt}</p>
                  {q.type === "mcq" && q.options && (
                    <ul className="mt-2 space-y-1 text-xs">
                      {q.options.map((o, idx) => (
                        <li key={idx} className={`rounded px-2 py-1 ${String(idx) === q.correct_answer ? "bg-gold/20 font-semibold" : "bg-background/40"}`}>
                          {String.fromCharCode(0x0623 + idx)}. {o}
                        </li>
                      ))}
                    </ul>
                  )}
                  {q.type === "true_false" && (
                    <div className="mt-2 text-xs">الإجابة: <span className="font-semibold">{q.correct_answer === "true" ? "صح" : "خطأ"}</span></div>
                  )}
                  {q.explanation && <div className="mt-2 rounded bg-secondary/40 p-2 text-xs text-muted-foreground">💡 {q.explanation}</div>}
                </div>
                <button onClick={() => deleteQ(q.id)} className="rounded p-1.5 text-destructive hover:bg-destructive/10">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showAdd && <AddQuestionModal quizId={quiz.id} nextOrder={questions.length} onClose={() => setShowAdd(false)} />}
      {showImport && <BulkImportModal quizId={quiz.id} startOrder={questions.length} onClose={() => setShowImport(false)} />}
    </>
  );
}

function AddQuestionModal({ quizId, nextOrder, onClose }: { quizId: string; nextOrder: number; onClose: () => void }) {
  const qc = useQueryClient();
  const [type, setType] = useState<QType>("mcq");
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState<string[]>(["", "", "", ""]);
  const [correctMcq, setCorrectMcq] = useState(0);
  const [correctTf, setCorrectTf] = useState<"true" | "false">("true");
  const [modelAnswer, setModelAnswer] = useState("");
  const [explanation, setExplanation] = useState("");
  const [points, setPoints] = useState(1);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return toast.error("اكتب السؤال");
    let opts: string[] | null = null;
    let correct: string | null = null;
    if (type === "mcq") {
      opts = options.map((o) => o.trim()).filter(Boolean);
      if (opts.length < 2) return toast.error("لازم خيارين على الأقل");
      if (correctMcq >= opts.length) return toast.error("الإجابة الصحيحة برة المدى");
      correct = String(correctMcq);
    } else if (type === "true_false") {
      correct = correctTf;
    } else {
      correct = modelAnswer.trim() || null;
    }
    setSaving(true);
    const { error } = await supabase.from("quiz_questions").insert({
      quiz_id: quizId,
      type,
      prompt: prompt.trim(),
      options: opts,
      correct_answer: correct,
      explanation: explanation.trim() || null,
      points,
      order_index: nextOrder,
    });
    setSaving(false);
    if (error) { toast.error("فشل الحفظ"); return; }
    toast.success("تم");
    qc.invalidateQueries({ queryKey: ["quiz-questions", quizId] });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur">
      <div className="cosmic-card max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl">سؤال جديد</h2>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3 text-sm">
          <select value={type} onChange={(e) => setType(e.target.value as QType)} className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 outline-none focus:border-accent">
            <option value="mcq">اختيار من متعدد</option>
            <option value="true_false">صح / خطأ</option>
            <option value="essay">مقالي</option>
          </select>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="نص السؤال" rows={3} className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 outline-none focus:border-accent" />

          {type === "mcq" && (
            <div className="space-y-2">
              {options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={correctMcq === i}
                    onChange={() => setCorrectMcq(i)}
                    className="h-4 w-4 accent-[color:var(--accent)]"
                  />
                  <input
                    value={o}
                    onChange={(e) => setOptions((arr) => arr.map((x, idx) => (idx === i ? e.target.value : x)))}
                    placeholder={`الخيار ${i + 1}`}
                    className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 outline-none focus:border-accent"
                  />
                  {options.length > 2 && (
                    <button type="button" onClick={() => setOptions((arr) => arr.filter((_, idx) => idx !== i))} className="text-destructive">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              {options.length < 6 && (
                <button type="button" onClick={() => setOptions((arr) => [...arr, ""])} className="text-xs text-accent">+ خيار</button>
              )}
              <p className="text-[11px] text-muted-foreground">اختار الدائرة على يمين الإجابة الصحيحة.</p>
            </div>
          )}

          {type === "true_false" && (
            <div className="flex gap-2">
              <label className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center ${correctTf === "true" ? "border-accent bg-accent/10" : "border-border"}`}>
                <input type="radio" className="hidden" checked={correctTf === "true"} onChange={() => setCorrectTf("true")} /> صح
              </label>
              <label className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center ${correctTf === "false" ? "border-accent bg-accent/10" : "border-border"}`}>
                <input type="radio" className="hidden" checked={correctTf === "false"} onChange={() => setCorrectTf("false")} /> خطأ
              </label>
            </div>
          )}

          {type === "essay" && (
            <textarea value={modelAnswer} onChange={(e) => setModelAnswer(e.target.value)} placeholder="الإجابة النموذجية (للمراجعة)" rows={2} className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 outline-none focus:border-accent" />
          )}

          <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder="شرح الإجابة (اختياري)" rows={2} className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 outline-none focus:border-accent" />
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">الدرجة</span>
            <input type="number" min={1} value={points} onChange={(e) => setPoints(Number(e.target.value) || 1)} className="w-32 rounded-lg border border-border bg-background/60 px-3 py-2 outline-none focus:border-accent" />
          </label>

          <button disabled={saving} className="w-full rounded-full bg-primary py-2.5 font-semibold text-primary-foreground disabled:opacity-60">
            {saving ? "جاري الحفظ..." : "حفظ السؤال"}
          </button>
        </form>
      </div>
    </div>
  );
}

function BulkImportModal({ quizId, startOrder, onClose }: { quizId: string; startOrder: number; onClose: () => void }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const sample = useMemo(() => JSON.stringify([
    { type: "mcq", prompt: "ما هو رمز الذهب؟", options: ["Au", "Ag", "Fe", "Cu"], correct_answer: "0", explanation: "Au من اللاتينية Aurum", points: 1 },
    { type: "true_false", prompt: "الماء يتكون من H2O", correct_answer: "true", points: 1 },
    { type: "essay", prompt: "اشرح قانون نيوتن الأول", correct_answer: "كل جسم يبقى على حالته...", points: 3 },
  ], null, 2), []);

  function parseCSV(csv: string) {
    // headers: type,prompt,option1,option2,option3,option4,correct,explanation,points
    const lines = csv.split(/\r?\n/).filter((l) => l.trim());
    if (!lines.length) return [];
    const [header, ...rows] = lines;
    const cols = header.split(",").map((c) => c.trim().toLowerCase());
    return rows.map((line) => {
      const cells = splitCsvLine(line);
      const obj: Record<string, string> = {};
      cols.forEach((c, i) => (obj[c] = (cells[i] ?? "").trim()));
      const opts = [obj.option1, obj.option2, obj.option3, obj.option4, obj.option5, obj.option6].filter(Boolean);
      return {
        type: obj.type as QType,
        prompt: obj.prompt,
        options: obj.type === "mcq" ? opts : null,
        correct_answer: obj.correct || null,
        explanation: obj.explanation || null,
        points: Number(obj.points) || 1,
      };
    });
  }

  function splitCsvLine(line: string) {
    const out: string[] = [];
    let cur = "", inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQ = !inQ;
      else if (ch === "," && !inQ) { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  }

  async function handleFile(f: File) {
    const t = await f.text();
    setText(t);
  }

  async function importAll() {
    if (!text.trim()) return toast.error("الصق المحتوى أو ارفع ملف");
    let items: Array<{ type: QType; prompt: string; options: string[] | null; correct_answer: string | null; explanation: string | null; points: number }>;
    try {
      items = text.trim().startsWith("[") ? JSON.parse(text) : parseCSV(text);
    } catch {
      toast.error("صيغة الملف غير صحيحة");
      return;
    }
    const valid = items.filter((q) => q.type && q.prompt);
    if (!valid.length) return toast.error("مفيش أسئلة صالحة");

    setBusy(true);
    const rows = valid.map((q, i) => ({
      quiz_id: quizId,
      type: q.type,
      prompt: q.prompt,
      options: q.type === "mcq" ? q.options : null,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      points: q.points || 1,
      order_index: startOrder + i,
    }));
    const { error } = await supabase.from("quiz_questions").insert(rows);
    setBusy(false);
    if (error) { toast.error("فشل الاستيراد: " + error.message); return; }
    toast.success(`تم استيراد ${rows.length} سؤال ✨`);
    qc.invalidateQueries({ queryKey: ["quiz-questions", quizId] });
    onClose();
  }

  function downloadTemplate() {
    const csv = "type,prompt,option1,option2,option3,option4,correct,explanation,points\nmcq,ما هو رمز الذهب؟,Au,Ag,Fe,Cu,0,Au من اللاتينية,1\ntrue_false,الماء H2O,,,,,true,,1\nessay,اشرح قانون نيوتن,,,,,القانون ينص...,,3\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "questions-template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur">
      <div className="cosmic-card max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl">استيراد جماعي</h2>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <p className="text-xs text-muted-foreground">
          ارفع <strong>CSV</strong> أو الصق <strong>JSON array</strong>. الأعمدة المدعومة: type, prompt, option1..6, correct, explanation, points.
          <br />للأسئلة MCQ <code>correct</code> = رقم الخيار (يبدأ من 0). صح/خطأ = <code>true</code>/<code>false</code>.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs hover:border-accent">
            <Upload className="h-3.5 w-3.5" /> رفع ملف
          </button>
          <button onClick={downloadTemplate} className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs hover:border-accent">
            <Download className="h-3.5 w-3.5" /> قالب CSV
          </button>
          <button onClick={() => setText(sample)} className="rounded-full border border-border px-3 py-1.5 text-xs hover:border-accent">عينة JSON</button>
        </div>
        <input ref={fileRef} type="file" accept=".csv,.json,.txt" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="الصق هنا CSV أو JSON..."
          rows={10}
          className="mt-3 w-full rounded-lg border border-border bg-background/60 p-3 font-mono text-xs outline-none focus:border-accent"
          dir="ltr"
        />

        <button disabled={busy} onClick={importAll} className="mt-3 w-full rounded-full bg-gradient-cosmic py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {busy ? "جاري الاستيراد..." : "استيراد"}
        </button>
      </div>
    </div>
  );
}

/* =============== STUDENT TAKE QUIZ =============== */

function TakeQuiz({ quiz, questions, userId, subjectId }: { quiz: Quiz; questions: Question[]; userId: string; subjectId: string }) {
  const qc = useQueryClient();
  const [started, setStarted] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<null | { score: number; total: number; pct: number; details: Array<{ q: Question; given: string; correct: boolean }> }>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!started || !quiz.time_limit_min) return;
    setRemaining(quiz.time_limit_min * 60);
    const iv = setInterval(() => {
      setRemaining((r) => {
        if (r === null) return r;
        if (r <= 1) { clearInterval(iv); submit(); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, quiz.time_limit_min]);

  async function submit() {
    let earned = 0;
    let total = 0;
    const details: Array<{ q: Question; given: string; correct: boolean }> = [];
    questions.forEach((q) => {
      total += q.points;
      const given = answers[q.id] ?? "";
      let correct = false;
      if (q.type === "essay") {
        // not auto-graded — show given vs model
      } else if (q.correct_answer != null) {
        correct = given.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
        if (correct) earned += q.points;
      }
      details.push({ q, given, correct });
    });
    const pct = total ? (earned / total) * 100 : 0;
    setSubmitted({ score: earned, total, pct, details });

    await supabase.from("quiz_attempts").insert({
      quiz_id: quiz.id,
      user_id: userId,
      submitted_at: new Date().toISOString(),
      score: earned,
      total_points: total,
      answers: details.map((d) => ({ question_id: d.q.id, response: d.given, is_correct: d.correct, points: d.correct ? d.q.points : 0 })),
    });
    qc.invalidateQueries({ queryKey: ["quiz-attempts"] });
  }

  if (!quiz.is_published) {
    return (
      <div className="cosmic-card rounded-2xl p-8 text-center text-sm text-muted-foreground">
        الاختبار ده مش منشور لسه.
      </div>
    );
  }

  if (!questions.length) {
    return <div className="cosmic-card rounded-2xl p-8 text-center text-sm text-muted-foreground">الاختبار فاضي.</div>;
  }

  if (submitted) {
    const passed = submitted.pct >= quiz.pass_score;
    return (
      <>
        <div className={`cosmic-card rounded-3xl p-8 text-center ${passed ? "shadow-glow" : ""}`}>
          <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${passed ? "bg-gold/30" : "bg-destructive/15"}`}>
            {passed ? <CheckCircle2 className="h-8 w-8 text-foreground" /> : <XCircle className="h-8 w-8 text-destructive" />}
          </div>
          <h2 className="mt-4 font-display text-3xl">{passed ? "مبروك ✨" : "حاول تاني"}</h2>
          <div className="mt-2 text-5xl font-bold text-gradient-cosmic">{submitted.pct.toFixed(0)}%</div>
          <div className="mt-1 text-sm text-muted-foreground">{submitted.score} / {submitted.total} درجة</div>
        </div>

        <div className="mt-6 space-y-3">
          {submitted.details.map((d, i) => (
            <div key={d.q.id} className="cosmic-card rounded-2xl p-4">
              <div className="flex items-start gap-2">
                <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-primary-foreground ${d.q.type === "essay" ? "bg-secondary text-foreground" : d.correct ? "bg-green-600" : "bg-destructive"}`}>{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm">{d.q.prompt}</p>
                  {d.q.type === "mcq" && d.q.options && (
                    <div className="mt-2 space-y-1 text-xs">
                      {d.q.options.map((o, idx) => {
                        const isCorrect = String(idx) === d.q.correct_answer;
                        const isGiven = String(idx) === d.given;
                        return (
                          <div key={idx} className={`rounded px-2 py-1 ${isCorrect ? "bg-green-100 dark:bg-green-900/30" : isGiven ? "bg-destructive/10" : "bg-background/40"}`}>
                            {String.fromCharCode(0x0623 + idx)}. {o} {isCorrect && "✓"} {isGiven && !isCorrect && "✗"}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {d.q.type === "true_false" && (
                    <div className="mt-2 text-xs">
                      إجابتك: <span className={d.correct ? "text-green-600 font-semibold" : "text-destructive font-semibold"}>{d.given === "true" ? "صح" : d.given === "false" ? "خطأ" : "—"}</span>
                      {!d.correct && <span className="ml-2 text-muted-foreground">(الصح: {d.q.correct_answer === "true" ? "صح" : "خطأ"})</span>}
                    </div>
                  )}
                  {d.q.type === "essay" && (
                    <div className="mt-2 space-y-2 text-xs">
                      <div className="rounded bg-background/40 p-2"><div className="text-muted-foreground">إجابتك:</div>{d.given || "—"}</div>
                      {d.q.correct_answer && <div className="rounded bg-gold/20 p-2"><div className="text-muted-foreground">الإجابة النموذجية:</div>{d.q.correct_answer}</div>}
                    </div>
                  )}
                  {d.q.explanation && <div className="mt-2 rounded bg-secondary/40 p-2 text-xs">💡 {d.q.explanation}</div>}
                </div>
              </div>
            </div>
          ))}
        </div>

        <Link to="/subjects/$subjectId/quizzes" params={{ subjectId }} className="mt-6 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">
          رجوع للاختبارات
        </Link>
      </>
    );
  }

  if (!started) {
    return (
      <div className="cosmic-card rounded-3xl p-8 text-center">
        <h1 className="font-display text-3xl">{quiz.title}</h1>
        {quiz.description && <p className="mt-2 text-sm text-muted-foreground">{quiz.description}</p>}
        <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
          <span className="rounded-full bg-secondary px-3 py-1">{questions.length} سؤال</span>
          {quiz.time_limit_min && <span className="rounded-full bg-secondary px-3 py-1">{quiz.time_limit_min} دقيقة</span>}
          <span className="rounded-full bg-secondary px-3 py-1">النجاح: {quiz.pass_score}%</span>
        </div>
        <button onClick={() => setStarted(true)} className="mt-6 rounded-full bg-gradient-cosmic px-8 py-3 font-semibold text-primary-foreground shadow-rose">
          ابدأ الاختبار ✨
        </button>
      </div>
    );
  }

  return (
    <>
      {remaining !== null && (
        <div className="sticky top-2 z-10 mb-4 inline-flex items-center gap-2 rounded-full bg-gradient-cosmic px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow-rose">
          <Clock className="h-4 w-4" /> {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
        </div>
      )}
      <div className="space-y-4">
        {questions.map((q, i) => (
          <div key={q.id} className="cosmic-card rounded-2xl p-5">
            <div className="flex items-start gap-2">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-cosmic text-xs font-bold text-primary-foreground">{i + 1}</span>
              <p className="flex-1 text-sm leading-relaxed">{q.prompt}</p>
            </div>
            <div className="mt-3 space-y-2">
              {q.type === "mcq" && q.options && q.options.map((o, idx) => (
                <label key={idx} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${answers[q.id] === String(idx) ? "border-accent bg-accent/10" : "border-border hover:border-accent/50"}`}>
                  <input type="radio" name={q.id} checked={answers[q.id] === String(idx)} onChange={() => setAnswers((a) => ({ ...a, [q.id]: String(idx) }))} className="accent-[color:var(--accent)]" />
                  <span>{String.fromCharCode(0x0623 + idx)}. {o}</span>
                </label>
              ))}
              {q.type === "true_false" && (
                <div className="flex gap-2">
                  {["true", "false"].map((v) => (
                    <label key={v} className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm ${answers[q.id] === v ? "border-accent bg-accent/10" : "border-border"}`}>
                      <input type="radio" name={q.id} checked={answers[q.id] === v} onChange={() => setAnswers((a) => ({ ...a, [q.id]: v }))} className="hidden" />
                      {v === "true" ? "صح" : "خطأ"}
                    </label>
                  ))}
                </div>
              )}
              {q.type === "essay" && (
                <textarea
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  rows={3}
                  placeholder="اكتب إجابتك..."
                  className="w-full rounded-lg border border-border bg-background/60 p-3 text-sm outline-none focus:border-accent"
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <button onClick={submit} className="mt-6 w-full rounded-full bg-gradient-cosmic py-3 font-semibold text-primary-foreground shadow-rose">
        تسليم الاختبار
      </button>
    </>
  );
}
