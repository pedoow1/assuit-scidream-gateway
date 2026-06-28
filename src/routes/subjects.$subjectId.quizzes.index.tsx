import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Plus, Brain, Clock, Trash2, Edit, Eye, EyeOff, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, isAdminRole } from "@/lib/auth";
import { CosmicBackground } from "@/components/CosmicBackground";

export const Route = createFileRoute("/subjects/$subjectId/quizzes/")({
  head: () => ({ meta: [{ title: "اختبارات المادة — Assuit SciDream" }] }),
  component: QuizzesListPage,
});

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  time_limit_min: number | null;
  pass_score: number;
  is_published: boolean;
  created_at: string;
}

function QuizzesListPage() {
  const { subjectId } = Route.useParams();
  const { user, profile, roles, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isAdmin = isAdminRole(roles);
  const [showCreate, setShowCreate] = useState(false);

  const { data: subject } = useQuery({
    queryKey: ["subject", subjectId],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("subjects").select("id,name_ar,code").eq("id", subjectId).maybeSingle();
      return data;
    },
  });

  const { data: quizzes, isLoading } = useQuery({
    queryKey: ["quizzes", subjectId],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("*")
        .eq("subject_id", subjectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Quiz[];
    },
  });

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;
  }
  if (!user) { navigate({ to: "/auth" }); return null; }
  if (profile?.verification_status !== "verified" && !isAdmin) {
    navigate({ to: "/pending" });
    return null;
  }

  async function togglePublish(q: Quiz) {
    const { error } = await supabase.from("quizzes").update({ is_published: !q.is_published }).eq("id", q.id);
    if (error) toast.error("فشل التعديل");
    else { toast.success(q.is_published ? "تم إخفاء الاختبار" : "تم نشر الاختبار"); qc.invalidateQueries({ queryKey: ["quizzes", subjectId] }); }
  }

  async function deleteQuiz(q: Quiz) {
    if (!confirm(`تأكيد حذف "${q.title}"؟ هيتم حذف كل أسئلته ومحاولاته.`)) return;
    const { error } = await supabase.from("quizzes").delete().eq("id", q.id);
    if (error) toast.error("فشل الحذف");
    else { toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["quizzes", subjectId] }); }
  }

  return (
    <div className="relative min-h-screen">
      <CosmicBackground density={22} />
      <header className="relative z-10 border-b border-border/60 bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/subjects/$subjectId" params={{ subjectId }} className="flex items-center gap-2 text-sm text-foreground/75 hover:text-foreground">
            <ArrowLeft className="h-4 w-4 rotate-180" /> {subject?.name_ar ?? "المادة"}
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 py-10">
        <div className="cosmic-card rounded-3xl p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-accent">{subject?.code}</div>
              <h1 className="mt-2 font-display text-3xl md:text-4xl">اختبارات {subject?.name_ar}</h1>
              <p className="mt-2 text-sm text-foreground/75">اختار اختبار وابدأ — هتلاقي تفسير لكل إجابة بعد التسليم.</p>
            </div>
            {isAdmin && (
              <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-full bg-gradient-cosmic px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-rose">
                <Plus className="h-4 w-4" /> اختبار جديد
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="mt-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
        ) : !quizzes?.length ? (
          <div className="mt-6 cosmic-card rounded-2xl p-8 text-center text-sm text-foreground/75">
            مفيش اختبارات لسه في المادة دي.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {quizzes.map((q) => (
              <div key={q.id} className="cosmic-card rounded-2xl p-5 transition hover:shadow-glow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-cosmic text-primary-foreground">
                      <Brain className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg leading-tight">{q.title}</h3>
                      {q.description && <p className="mt-0.5 text-xs text-foreground/75 line-clamp-1">{q.description}</p>}
                    </div>
                  </div>
                  {!q.is_published && <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px]">مسودة</span>}
                </div>

                <div className="mt-3 flex flex-wrap gap-3 text-xs text-foreground/75">
                  {q.time_limit_min && (
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {q.time_limit_min} دقيقة</span>
                  )}
                  <span>نجاح: {q.pass_score}%</span>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link
                    to="/subjects/$subjectId/quizzes/$quizId"
                    params={{ subjectId, quizId: q.id }}
                    className="flex-1 rounded-full bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground hover:shadow-glow"
                  >
                    {isAdmin ? "إدارة" : "ابدأ الاختبار"}
                  </Link>
                  {isAdmin && (
                    <>
                      <button onClick={() => togglePublish(q)} title={q.is_published ? "إخفاء" : "نشر"} className="rounded-full border border-border p-2 hover:border-accent">
                        {q.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                      <button onClick={() => deleteQuiz(q)} className="rounded-full border border-border p-2 text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showCreate && isAdmin && (
        <CreateQuizModal
          subjectId={subjectId}
          userId={user.id}
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            setShowCreate(false);
            qc.invalidateQueries({ queryKey: ["quizzes", subjectId] });
            navigate({ to: "/subjects/$subjectId/quizzes/$quizId", params: { subjectId, quizId: id } });
          }}
        />
      )}
    </div>
  );
}

function CreateQuizModal({ subjectId, userId, onClose, onCreated }: { subjectId: string; userId: string; onClose: () => void; onCreated: (id: string) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeLimit, setTimeLimit] = useState<string>("");
  const [passScore, setPassScore] = useState(50);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return toast.error("اكتب عنوان الاختبار");
    setSaving(true);
    const { data, error } = await supabase
      .from("quizzes")
      .insert({
        subject_id: subjectId,
        title: title.trim(),
        description: description.trim() || null,
        time_limit_min: timeLimit ? Number(timeLimit) : null,
        pass_score: passScore,
        created_by: userId,
      })
      .select("id")
      .single();
    setSaving(false);
    if (error || !data) { toast.error("فشل الإنشاء"); return; }
    toast.success("تم الإنشاء — أضف الأسئلة دلوقتي");
    onCreated(data.id);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur">
      <div className="cosmic-card w-full max-w-md rounded-2xl bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl">اختبار جديد</h2>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان الاختبار" className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-accent" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="وصف مختصر (اختياري)" rows={2} className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-accent" />
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-foreground/75">المدة (دقيقة)</span>
              <input type="number" value={timeLimit} onChange={(e) => setTimeLimit(e.target.value)} placeholder="بدون حد" className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 outline-none focus:border-accent" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-foreground/75">درجة النجاح %</span>
              <input type="number" min={0} max={100} value={passScore} onChange={(e) => setPassScore(Number(e.target.value))} className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 outline-none focus:border-accent" />
            </label>
          </div>
          <button disabled={saving} className="mt-2 w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {saving ? "جاري الإنشاء..." : "إنشاء"}
          </button>
        </form>
      </div>
    </div>
  );
}
