import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
export type Person = { id: string; name: string; sub?: string };
type SubjectLite = { id: string; name_ar: string; department: string | null; year: number | null };

const input = "w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm focus:border-accent focus:outline-none";
const chip = (on: boolean) => `rounded-full border px-3 py-1 text-xs ${on ? "border-accent bg-accent/20 text-accent" : "border-border"}`;

/** اختيار أشخاص بالبحث (اسم / إيميل / رقم أكاديمي) من الطلبة الموثّقين */
export function PeoplePicker({ selected, onChange }: { selected: Person[]; onChange: (p: Person[]) => void }) {
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Person[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const term = q.trim().replace(/[%,()]/g, "");
    if (term.length < 2) { setFound([]); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      const { data } = await db.from("profiles").select("id,full_name,email,academic_id")
        .eq("verification_status", "verified")
        .or(`full_name.ilike.%${term}%,email.ilike.%${term}%,academic_id.ilike.%${term}%`).limit(12);
      setFound(((data as any[]) ?? []).map((r) => ({ id: r.id, name: r.full_name || r.email || "بدون اسم", sub: r.email || r.academic_id || "" })));
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const ids = useMemo(() => new Set(selected.map((p) => p.id)), [selected]);
  return (
    <div className="space-y-2">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو الإيميل أو الرقم الأكاديمي" className={input} />
      {q.trim().length >= 2 && (
        searching ? <p className="text-xs text-foreground/60">بيدوّر...</p>
        : found.length === 0 ? <p className="text-xs text-foreground/60">مفيش نتايج</p>
        : found.filter((p) => !ids.has(p.id)).map((p) => (
          <button key={p.id} type="button" onClick={() => { onChange([...selected, p]); setQ(""); }}
            className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-right hover:border-accent">
            <span className="text-xs text-accent">إضافة +</span>
            <span>
              <span className="block text-sm">{p.name}</span>
              {p.sub && <span className="block text-[11px] text-foreground/60">{p.sub}</span>}
            </span>
          </button>
        ))
      )}
      {selected.length > 0 && <p className="text-xs text-foreground/60">المختارين ({selected.length}):</p>}
      <div className="flex flex-wrap gap-2">
        {selected.map((p) => (
          <button key={p.id} type="button" onClick={() => onChange(selected.filter((x) => x.id !== p.id))}
            className="inline-flex items-center gap-1 rounded-full border border-accent px-3 py-1 text-xs">
            <X className="h-3 w-3 text-destructive" /> {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function Shell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur" dir="rtl">
      <div className="cosmic-card max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl">{title}</h2>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** إنشاء اختبار: مرتبط بمادة أو من غير مادة، ولكل الطلبة أو لأشخاص محددين */
export function QuizCreateModal({ userId, fixedSubjectId, onClose, onCreated }: {
  userId: string; fixedSubjectId?: string; onClose: () => void; onCreated: (id: string, subjectId: string | null) => void;
}) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [limit, setLimit] = useState("");
  const [pass, setPass] = useState("50");
  const [subjectId, setSubjectId] = useState<string | null>(fixedSubjectId ?? null);
  const [subjects, setSubjects] = useState<SubjectLite[]>([]);
  const [sq, setSq] = useState("");
  const [audience, setAudience] = useState<"all" | "specific">("all");
  const [people, setPeople] = useState<Person[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (fixedSubjectId) return;
    void db.from("subjects").select("id,name_ar,department,year").order("year").order("name_ar").then(({ data }: any) => setSubjects((data as SubjectLite[]) ?? []));
  }, [fixedSubjectId]);

  const matches = useMemo(() => {
    const t = sq.trim().toLowerCase();
    return subjects.filter((x) => !t || x.name_ar.toLowerCase().includes(t)).slice(0, 8);
  }, [subjects, sq]);
  const chosen = subjects.find((x) => x.id === subjectId);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return toast.error("اكتب عنوان الاختبار");
    if (audience === "specific" && people.length === 0) return toast.error("اختار شخص واحد على الأقل");
    setBusy(true);
    try {
      const { data, error } = await db.from("quizzes").insert({
        subject_id: subjectId, title: title.trim(), description: desc.trim() || null,
        time_limit_min: limit ? Number(limit) : null, pass_score: Number(pass) || 50, created_by: userId, audience,
      }).select("id").single();
      if (error || !data) throw error ?? new Error("فشل الإنشاء");
      if (audience === "specific") {
        const { error: e2 } = await db.from("quiz_audience").insert(people.map((p) => ({ quiz_id: data.id, user_id: p.id })));
        if (e2) throw e2;
      }
      toast.success("تم الإنشاء — أضف الأسئلة دلوقتي");
      onCreated(data.id, subjectId);
    } catch (err: any) {
      toast.error(err?.message ?? "فشل الإنشاء");
    } finally { setBusy(false); }
  }

  return (
    <Shell title="اختبار جديد" onClose={() => !busy && onClose()}>
      <form onSubmit={submit} className="space-y-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان الاختبار" className={input} />
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="وصف مختصر (اختياري)" rows={2} className={input} />
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs text-foreground/75">المدة (دقيقة)
            <input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="بدون حد" className={`${input} mt-1`} />
          </label>
          <label className="block text-xs text-foreground/75">درجة النجاح %
            <input type="number" min={0} max={100} value={pass} onChange={(e) => setPass(e.target.value)} className={`${input} mt-1`} />
          </label>
        </div>

        {!fixedSubjectId && (
          <div className="space-y-2">
            <p className="text-xs font-semibold">المادة</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={chip(!subjectId)} onClick={() => setSubjectId(null)}>بدون مادة</button>
              {chosen && <button type="button" className={chip(true)} onClick={() => setSubjectId(null)}>{chosen.name_ar}</button>}
            </div>
            <input value={sq} onChange={(e) => setSq(e.target.value)} placeholder="ابحث عن مادة..." className={input} />
            {sq.trim() && (
              <div className="flex flex-wrap gap-2">
                {matches.map((x) => (
                  <button key={x.id} type="button" className={chip(subjectId === x.id)} onClick={() => { setSubjectId(x.id); setSq(""); }}>{x.name_ar}</button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold">مين يقدر يشوف الاختبار؟</p>
          <div className="flex gap-2">
            <button type="button" className={chip(audience === "all")} onClick={() => setAudience("all")}>كل الطلبة</button>
            <button type="button" className={chip(audience === "specific")} onClick={() => setAudience("specific")}>أشخاص محددين</button>
          </div>
          {audience === "specific" && <PeoplePicker selected={people} onChange={setPeople} />}
        </div>

        <button disabled={busy} className="mt-2 w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "إنشاء"}
        </button>
      </form>
    </Shell>
  );
}

/** تعديل جمهور اختبار موجود */
export function AudienceModal({ quiz, onClose, onSaved }: { quiz: { id: string; title: string; audience?: string }; onClose: () => void; onSaved: () => void }) {
  const [audience, setAudience] = useState<"all" | "specific">(quiz.audience === "specific" ? "specific" : "all");
  const [people, setPeople] = useState<Person[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data: rows } = await db.from("quiz_audience").select("user_id").eq("quiz_id", quiz.id);
      const ids = ((rows as any[]) ?? []).map((r) => r.user_id);
      if (!ids.length) return;
      const { data: profs } = await db.from("profiles").select("id,full_name,email").in("id", ids);
      setPeople(((profs as any[]) ?? []).map((r) => ({ id: r.id, name: r.full_name || r.email || "بدون اسم", sub: r.email || "" })));
    })();
  }, [quiz.id]);

  async function save() {
    if (audience === "specific" && people.length === 0) return toast.error("اختار شخص واحد على الأقل");
    setBusy(true);
    try {
      const { error } = await db.from("quizzes").update({ audience }).eq("id", quiz.id);
      if (error) throw error;
      const del = await db.from("quiz_audience").delete().eq("quiz_id", quiz.id);
      if (del.error) throw del.error;
      if (audience === "specific") {
        const ins = await db.from("quiz_audience").insert(people.map((p) => ({ quiz_id: quiz.id, user_id: p.id })));
        if (ins.error) throw ins.error;
      }
      toast.success("اتحفظ جمهور الاختبار");
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? "فشل الحفظ");
    } finally { setBusy(false); }
  }

  return (
    <Shell title={`جمهور: ${quiz.title}`} onClose={() => !busy && onClose()}>
      <div className="space-y-3">
        <div className="flex gap-2">
          <button type="button" className={chip(audience === "all")} onClick={() => setAudience("all")}>كل الطلبة</button>
          <button type="button" className={chip(audience === "specific")} onClick={() => setAudience("specific")}>أشخاص محددين</button>
        </div>
        {audience === "specific" && <PeoplePicker selected={people} onChange={setPeople} />}
        <button onClick={() => void save()} disabled={busy} className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "حفظ"}
        </button>
      </div>
    </Shell>
  );
}
