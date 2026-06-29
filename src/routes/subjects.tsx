import { createFileRoute, useNavigate, Link, Outlet } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Plus, BookOpen, Search, X, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, isAdminRole } from "@/lib/auth";
import { StarsBackground } from "@/components/IntroSequence";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/subjects")({
  head: () => ({ meta: [{ title: "المواد — Assuit SciDream" }] }),
  component: SubjectsPage,
});

const DEPARTMENTS = ["الكل", "الرياضيات", "الفيزياء", "الكيمياء", "الجيولوجيا", "النبات والميكروبيولوجي", "علم الحيوان"];
const YEARS = [0, 1, 2, 3, 4] as const;

interface Subject {
  id: string;
  code: string;
  name_ar: string;
  name_en: string | null;
  department: string;
  year: number;
  semester: number;
  credit_hours: number | null;
  description: string | null;
  cover_url: string | null;
}

function SubjectsPage() {
  const { user, profile, roles, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isAdmin = isAdminRole(roles);

  const [dept, setDept] = useState("الكل");
  const [year, setYear] = useState<number>(0);
  const [q, setQ] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  async function deleteSubject(id: string) {
    if (!confirm("متأكد إنك عايز تمسح المادة؟ هتمسح كل الفولدرات والمحتوى والاختبارات اللي جواها كمان.")) return;
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("اتمسحت المادة");
    qc.invalidateQueries({ queryKey: ["subjects"] });
  }

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth" });
    else if (profile && profile.verification_status !== "verified" && !isAdmin) navigate({ to: "/pending" });
  }, [user, profile, loading, isAdmin, navigate]);

  const { data, isLoading } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("*").order("year").order("name_ar");
      if (error) throw error;
      return data as Subject[];
    },
    enabled: !!user,
  });

  const filtered = useMemo(() => {
    return (data ?? []).filter((s) => {
      if (dept !== "الكل" && s.department !== dept) return false;
      if (year !== 0 && s.year !== year) return false;
      if (q && !`${s.name_ar} ${s.name_en} ${s.code}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [data, dept, year, q]);

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;
  }

  return (
    <div className="relative min-h-screen">
      <StarsBackground />

      <header className="relative z-10 border-b border-border/60 bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 rotate-180" /> الرجوع
          </Link>
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-accent" />
            <div>
              <div className="font-display text-base font-semibold leading-tight">المواد الدراسية</div>
              <div className="text-[10px] text-muted-foreground">كل المحتوى منظم في مكان واحد</div>
            </div>
            <Logo size={36} />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 py-8">
        <div className="cosmic-card flex flex-col gap-4 rounded-2xl p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث باسم المادة أو الكود..."
              className="w-full rounded-xl border border-border bg-background/60 py-2.5 pr-10 pl-3 text-sm outline-none focus:border-accent"
            />
          </div>
          <select value={dept} onChange={(e) => setDept(e.target.value)} className="rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm">
            {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm">
            <option value={0}>كل السنوات</option>
            {YEARS.slice(1).map((y) => <option key={y} value={y}>السنة {y}</option>)}
          </select>
          {isAdmin && (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-cosmic px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-rose"
            >
              <Plus className="h-4 w-4" /> مادة جديدة
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="mt-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
        ) : filtered.length === 0 ? (
          <div className="mt-12 text-center text-muted-foreground">
            {(data?.length ?? 0) === 0 ? "لا توجد مواد بعد." : "مفيش مادة بتطابق الفلتر."}
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => (
              <div
                key={s.id}
                className="cosmic-card group flex flex-col gap-3 rounded-2xl p-5 transition hover:-translate-y-0.5 hover:shadow-glow"
              >
                <Link
                  to="/subjects/$subjectId"
                  params={{ subjectId: s.id }}
                  className="flex flex-1 flex-col gap-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="rounded-lg bg-gradient-cosmic px-2.5 py-1 text-[10px] font-semibold text-primary-foreground">
                      {s.code}
                    </div>
                    <div className="text-xs text-muted-foreground">السنة {s.year} · ف{s.semester}</div>
                  </div>
                  <div>
                    <h3 className="font-display text-lg leading-tight">{s.name_ar}</h3>
                    {s.name_en && <div className="text-xs text-muted-foreground">{s.name_en}</div>}
                  </div>
                  <div className="mt-auto flex items-center justify-between text-xs">
                    <span className="rounded-full bg-secondary px-2.5 py-1">{s.department}</span>
                    <span className="text-muted-foreground">{s.credit_hours ?? 3} ساعة</span>
                  </div>
                </Link>
                {isAdmin && (
                  <div className="flex items-center gap-2 border-t border-border/50 pt-3">
                    <button
                      onClick={() => setEditingSubject(s)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5 text-xs font-medium hover:border-accent"
                    >
                      <Pencil className="h-3.5 w-3.5" /> تعديل
                    </button>
                    <button
                      onClick={() => deleteSubject(s.id)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> حذف
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {showCreate && (
        <SubjectModal
          onClose={() => setShowCreate(false)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["subjects"] }); setShowCreate(false); }}
        />
      )}
      {editingSubject && (
        <SubjectModal
          subject={editingSubject}
          onClose={() => setEditingSubject(null)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["subjects"] }); setEditingSubject(null); }}
        />
      )}
      <Outlet />
    </div>
  );
}

function SubjectModal({ subject, onClose, onSaved }: { subject?: Subject; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!subject;
  const [code, setCode] = useState(subject?.code ?? "");
  const [nameAr, setNameAr] = useState(subject?.name_ar ?? "");
  const [nameEn, setNameEn] = useState(subject?.name_en ?? "");
  const [department, setDepartment] = useState(subject?.department ?? "الرياضيات");
  const [year, setYear] = useState(subject?.year ?? 1);
  const [semester, setSemester] = useState(subject?.semester ?? 1);
  const [creditHours, setCreditHours] = useState(subject?.credit_hours ?? 3);
  const [description, setDescription] = useState(subject?.description ?? "");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !nameAr.trim()) return toast.error("الكود والاسم العربي مطلوبين");
    setSaving(true);
    const payload = {
      code: code.trim(), name_ar: nameAr.trim(), name_en: nameEn.trim() || null,
      department, year, semester, credit_hours: creditHours, description: description.trim() || null,
    };
    const { error } = isEdit
      ? await supabase.from("subjects").update(payload).eq("id", subject!.id)
      : await supabase.from("subjects").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(isEdit ? "اتحفظ التعديل ✨" : "اتضافت المادة ✨");
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="cosmic-card w-full max-w-lg rounded-2xl bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl">{isEdit ? "تعديل المادة" : "إضافة مادة جديدة"}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <input className="modal-input" placeholder="الكود (مثل MATH101)" value={code} onChange={(e) => setCode(e.target.value)} required />
          <input className="modal-input" placeholder="الاسم بالعربي" value={nameAr} onChange={(e) => setNameAr(e.target.value)} required />
          <input className="modal-input sm:col-span-2" placeholder="الاسم بالإنجليزي (اختياري)" value={nameEn ?? ""} onChange={(e) => setNameEn(e.target.value)} />
          <select className="modal-input" value={department} onChange={(e) => setDepartment(e.target.value)}>
            {DEPARTMENTS.slice(1).map((d) => <option key={d}>{d}</option>)}
          </select>
          <select className="modal-input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[1, 2, 3, 4].map((y) => <option key={y} value={y}>السنة {y}</option>)}
          </select>
          <select className="modal-input" value={semester} onChange={(e) => setSemester(Number(e.target.value))}>
            <option value={1}>الفصل الأول</option><option value={2}>الفصل الثاني</option>
          </select>
          <input type="number" min={1} max={6} className="modal-input" value={creditHours ?? 3} onChange={(e) => setCreditHours(Number(e.target.value))} />
          <textarea className="modal-input sm:col-span-2" placeholder="وصف مختصر (اختياري)" rows={2} value={description ?? ""} onChange={(e) => setDescription(e.target.value)} />
          <button type="submit" disabled={saving} className="sm:col-span-2 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {saving ? "جاري الحفظ..." : isEdit ? "حفظ التعديل" : "حفظ"}
          </button>
        </form>
        <style>{`.modal-input { width: 100%; background: color-mix(in oklch, var(--background) 60%, transparent); border: 1px solid var(--border); border-radius: 0.6rem; padding: 0.55rem 0.75rem; font-size: 0.9rem; outline: none; font-family: inherit; }
        .modal-input:focus { border-color: var(--accent); }`}</style>
      </div>
    </div>
  );
}
