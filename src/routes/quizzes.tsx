import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Brain, Loader2, Timer } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { CosmicBackground } from "@/components/CosmicBackground";

export const Route = createFileRoute("/quizzes")({
  head: () => ({ meta: [{ title: "الاختبارات — Assuit SciDream" }] }),
  component: QuizzesPage,
});

interface Quiz {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  is_published: boolean;
  subject_id: string;
  subjects?: { name: string } | null;
}

function QuizzesPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Quiz[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  useEffect(() => {
    (async () => {
      setBusy(true);
      const { data } = await supabase
        .from("quizzes")
        .select("id,title,description,duration_minutes,is_published,subject_id, subjects(name)")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      setItems((data as any as Quiz[]) ?? []);
      setBusy(false);
    })();
  }, []);

  return (
    <div className="relative min-h-screen" dir="rtl">
      <CosmicBackground density={18} />
      <main className="relative z-10 mx-auto max-w-4xl px-6 py-8">
        <header className="mb-6 flex items-center justify-between">
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-accent">
            <ArrowRight className="h-4 w-4" /> الرئيسية
          </Link>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-accent" />
            <h1 className="font-display text-xl">كل الاختبارات</h1>
          </div>
          <span />
        </header>

        {busy ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
        ) : items.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-20">لا توجد اختبارات منشورة. ادخل المادة لإنشاء اختبار.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((q) => (
              <Link key={q.id} to="/subjects/$subjectId/quizzes/$quizId" params={{ subjectId: q.subject_id, quizId: q.id }}
                className="cosmic-card group rounded-2xl p-5 transition hover:-translate-y-0.5 hover:shadow-glow">
                <div className="text-[11px] uppercase tracking-widest text-accent">{q.subjects?.name ?? "اختبار"}</div>
                <h3 className="mt-1 font-display text-lg">{q.title}</h3>
                {q.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{q.description}</p>}
                {q.duration_minutes && (
                  <div className="mt-3 inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[11px] text-muted-foreground">
                    <Timer className="h-3 w-3" /> {q.duration_minutes} دقيقة
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
