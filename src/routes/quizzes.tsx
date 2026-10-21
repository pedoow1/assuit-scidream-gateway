import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Brain, Eye, EyeOff, Loader2, Plus, Timer, Trash2, Users } from "lucide-react";
import { useAuth, isAdminRole } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { StarsBackground } from "@/components/IntroSequence";
import { AudienceModal, QuizCreateModal } from "@/components/QuizForms";

export const Route = createFileRoute("/quizzes")({
  head: () => ({ meta: [{ title: "الاختبارات — Assuit SciDream" }] }),
  component: QuizzesPage,
});

const db = supabase as any;
interface Quiz {
  id: string;
  title: string;
  description: string | null;
  time_limit_min: number | null;
  pass_score: number;
  is_published: boolean;
  subject_id: string | null;
  audience: string;
  subjects?: { name_ar: string; department: string | null; year: number | null } | null;
}
const NO_SUBJECT = "بدون مادة";
const chip = (on: boolean) => `shrink-0 rounded-full border px-3 py-1.5 text-xs ${on ? "border-accent bg-accent/20 text-accent" : "border-border bg-card/40"}`;

function QuizzesPage() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const isAdmin = isAdminRole(roles) || user?.email?.trim().toLowerCase() === "abdalahkotp31@gmail.com";
  const [items, setItems] = useState<Quiz[]>([]);
  const [busy, setBusy] = useState(true);
  const [dept, setDept] = useState("الكل");
  const [year, setYear] = useState(0);
  const [q, setQ] = useState("");
  const [create, setCreate] = useState(false);
  const [aud, setAud] = useState<Quiz | null>(null);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  const load = useCallback(async () => {
    setBusy(true);
    const { data } = await db
      .from("quizzes")
      .select("id,title,description,time_limit_min,pass_score,is_published,subject_id,audience,subjects(name_ar,department,year)")
      .order("created_at", { ascending: false });
    setItems((data as Quiz[]) ?? []);
    setBusy(false);
  }, []);
  useEffect(() => { if (user) void load(); }, [user, load]);

  const visible = useMemo(() => (isAdmin ? items : items.filter((x) => x.is_published)), [items, isAdmin]);
  const depts = useMemo(() => Array.from(new Set(visible.map((x) => x.subjects?.department).filter(Boolean) as string[])), [visible]);
  const hasNoSubject = visible.some((x) => !x.subject_id);
  const filtered = useMemo(() => visible.filter((x) => {
    if (dept === NO_SUBJECT) return !x.subject_id;
    if (dept !== "الكل" && x.subjects?.department !== dept) return false;
    if (year && x.subjects?.year !== year) return false;
    if (q && !`${x.title} ${x.subjects?.name_ar ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [visible, dept, year, q]);

  async function togglePublish(x: Quiz) {
    const { error } = await db.from("quizzes").update({ is_published: !x.is_published }).eq("id", x.id);
    if (error) return toast.error("فشل التعديل");
    toast.success(x.is_published ? "تم إخفاء الاختبار" : "تم نشر الاختبار");
    await load();
  }
  async function del(x: Quiz) {
    if (!confirm(`تأكيد حذف "${x.title}"؟ هيتم حذف كل أسئلته ومحاولاته.`)) return;
    const { error } = await db.from("quizzes").delete().eq("id", x.id);
    if (error) return toast.error("فشل الحذف");
    await load();
  }

  return (
    <div className="relative min-h-screen" dir="rtl">
      <StarsBackground />
      <header className="relative z-10 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm hover:text-accent">
            <ArrowRight className="h-4 w-4" /> الرئيسية
          </Link>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-accent" />
            <h1 className="font-display text-xl font-semibold">كل الاختبارات</h1>
          </div>
          {isAdmin ? (
            <button onClick={() => setCreate(true)} className="inline-flex items-center gap-1 rounded-full bg-gradient-cosmic px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-rose">
              <Plus className="h-3.5 w-3.5" /> جديد
            </button>
          ) : <span />}
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl space-y-3 px-6 py-8">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث عن اختبار أو مادة..."
          className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {["الكل", ...depts, ...(hasNoSubject ? [NO_SUBJECT] : [])].map((d) => (
            <button key={d} className={chip(dept === d)} onClick={() => setDept(d)}>{d}</button>
          ))}
        </div>
        {dept !== NO_SUBJECT && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[0, 1, 2, 3, 4].map((y) => (
              <button key={y} className={chip(year === y)} onClick={() => setYear(y)}>{y === 0 ? "كل السنوات" : `السنة ${y}`}</button>
            ))}
          </div>
        )}

        {busy ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
        ) : filtered.length === 0 ? (
          <p className="py-20 text-center text-sm text-foreground/75">لا توجد اختبارات بالفلتر ده.</p>
        ) : (
          <div className="grid gap-3 pt-3 sm:grid-cols-2">
            {filtered.map((x) => (
              <div key={x.id} className="cosmic-card rounded-2xl p-5 transition hover:-translate-y-0.5 hover:shadow-glow">
                <Link to="/subjects/$subjectId/quizzes/$quizId" params={{ subjectId: x.subject_id ?? "general", quizId: x.id }} className="block">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[11px] uppercase tracking-widest text-accent">{x.subjects?.name_ar ?? "اختبار عام"}</div>
                    <div className="flex gap-1.5">
                      {isAdmin && !x.is_published && <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px]">مسودة</span>}
                      {x.audience === "specific" && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] text-accent">مخصص</span>}
                    </div>
                  </div>
                  <h3 className="mt-1 font-display text-lg">{x.title}</h3>
                  {x.description && <p className="mt-1 line-clamp-2 text-xs text-foreground/75">{x.description}</p>}
                  {x.time_limit_min && (
                    <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[11px] text-foreground/75">
                      <Timer className="h-3 w-3" /> {x.time_limit_min} دقيقة
                    </div>
                  )}
                </Link>
                {isAdmin && (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => togglePublish(x)} title={x.is_published ? "إخفاء" : "نشر"} className="rounded-full border border-border p-2 hover:border-accent">
                      {x.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button onClick={() => setAud(x)} title="الجمهور" className="rounded-full border border-border p-2 hover:border-accent"><Users className="h-4 w-4" /></button>
                    <button onClick={() => del(x)} title="حذف" className="rounded-full border border-border p-2 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {create && user && (
        <QuizCreateModal
          userId={user.id}
          onClose={() => setCreate(false)}
          onCreated={(id, sid) => {
            setCreate(false);
            navigate({ to: "/subjects/$subjectId/quizzes/$quizId", params: { subjectId: sid ?? "general", quizId: id } });
          }}
        />
      )}
      {aud && <AudienceModal quiz={aud} onClose={() => setAud(null)} onSaved={() => void load()} />}
    </div>
  );
}
