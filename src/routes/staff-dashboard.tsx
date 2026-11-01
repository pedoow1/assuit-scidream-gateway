import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Image as ImageIcon, Pin, Trash2, Users, X } from "lucide-react";
import { useAuth, isAdminRole, isSubjectStaffRole } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { uploadToB2 } from "@/lib/b2";
import { StarsBackground } from "@/components/IntroSequence";

export const Route = createFileRoute("/staff-dashboard")({
  head: () => ({ meta: [{ title: "لوحة الدكتور — Assuit SciDream" }] }),
  component: StaffDashboardPage,
});

type Subject = { id: string; name_ar: string; code: string };
type FeedItem = {
  id: string; title: string; body: string; image_url: string | null; pinned: boolean;
  created_at: string; audience_type: "subject" | "batch" | "specific";
  batch_year: number | null; subject_id: string; subject_name: string;
  mine: boolean; can_manage: boolean;
  author: { id: string; name: string; avatar_url: string | null; label: string | null };
};
type Person = { id: string; full_name: string; avatar_url: string | null };

function StaffDashboardPage() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const admin = isAdminRole(roles);
  const isStaff = isSubjectStaffRole(roles);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth" });
    else if (!isStaff) navigate({ to: "/dashboard" });
  }, [loading, user, isStaff, navigate]);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);

  async function loadSubjects() {
    if (!user) return;
    setSubjectsLoading(true);
    if (admin) {
      const { data } = await supabase.from("subjects").select("id,name_ar,code").order("name_ar");
      setSubjects((data as Subject[]) ?? []);
    } else {
      const { data } = await supabase.from("subject_staff").select("subjects(id,name_ar,code)").eq("user_id", user.id);
      setSubjects((((data as any[]) ?? []).map((r) => r.subjects).filter(Boolean)) as Subject[]);
    }
    setSubjectsLoading(false);
  }
  async function loadFeed() {
    if (!user) return;
    setFeedLoading(true);
    const { data } = await supabase.rpc("subject_announcements_feed");
    setFeed((((data as FeedItem[]) ?? []).filter((a) => a.mine || a.can_manage)));
    setFeedLoading(false);
  }
  useEffect(() => { if (user && isStaff) { void loadSubjects(); void loadFeed(); } }, [user?.id, isStaff]);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FeedItem | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"subject" | "batch" | "specific">("subject");
  const [batchYear, setBatchYear] = useState("");
  const [peopleQuery, setPeopleQuery] = useState("");
  const [peopleResults, setPeopleResults] = useState<Person[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<Person[]>([]);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function openNew() {
    setEditing(null);
    setSubjectId(subjects[0]?.id ?? null);
    setTitle(""); setBody(""); setAudience("subject"); setBatchYear("");
    setSelectedPeople([]); setPeopleQuery(""); setPeopleResults([]); setImgFile(null);
    setOpen(true);
  }
  function openEdit(a: FeedItem) {
    setEditing(a);
    setSubjectId(a.subject_id);
    setTitle(a.title); setBody(a.body);
    setAudience(a.audience_type); setBatchYear(a.batch_year ? String(a.batch_year) : "");
    setSelectedPeople([]); setPeopleQuery(""); setPeopleResults([]); setImgFile(null);
    setOpen(true);
  }

  async function searchPeople(q: string) {
    setPeopleQuery(q);
    if (q.trim().length < 2) { setPeopleResults([]); return; }
    setSearching(true);
    const { data } = await supabase.rpc("search_profiles", { p_query: q.trim() } as never);
    setSearching(false);
    setPeopleResults((((data as Person[]) ?? []).filter((p) => !selectedPeople.some((s) => s.id === p.id))));
  }
  function addPerson(p: Person) {
    setSelectedPeople((cur) => [...cur, p]);
    setPeopleResults((cur) => cur.filter((x) => x.id !== p.id));
  }
  function removePerson(id: string) {
    setSelectedPeople((cur) => cur.filter((p) => p.id !== id));
  }

  async function submit() {
    if (!user || !subjectId) { toast.error("اختار المادة الأول"); return; }
    if (!title.trim() || !body.trim()) { toast.error("اكتب العنوان والنص"); return; }
    if (audience === "batch" && !batchYear.trim()) { toast.error("اكتب الدفعة (سنة الالتحاق)"); return; }
    if (audience === "specific" && selectedPeople.length === 0) { toast.error("اختار طالب واحد على الأقل"); return; }

    setBusy(true);
    let image_url: string | null = editing?.image_url ?? null;
    if (imgFile) {
      try {
        image_url = (await uploadToB2("announcement", user.id, imgFile)).ref;
      } catch (e) {
        setBusy(false);
        toast.error(e instanceof Error ? e.message : "فشل رفع الصورة");
        return;
      }
    }
    const payload: any = {
      subject_id: subjectId, title: title.trim(), body: body.trim(), image_url,
      audience_type: audience,
      batch_year: audience === "batch" ? Number(batchYear) : null,
      target_user_ids: audience === "specific" ? selectedPeople.map((p) => p.id) : [],
    };

    let error;
    if (editing) {
      ({ error } = await supabase.from("subject_announcements").update(payload).eq("id", editing.id));
    } else {
      payload.author_id = user.id;
      ({ error } = await supabase.from("subject_announcements").insert(payload));
    }
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "تم حفظ التعديل" : "تم النشر ✨");
    setOpen(false);
    await loadFeed();
  }

  async function togglePin(a: FeedItem) {
    await supabase.from("subject_announcements").update({ pinned: !a.pinned } as never).eq("id", a.id);
    await loadFeed();
  }
  async function del(id: string) {
    if (!confirm("حذف هذا الإعلان؟")) return;
    await supabase.from("subject_announcements").delete().eq("id", id);
    await loadFeed();
  }

  const audienceLabel = (a: FeedItem) =>
    a.audience_type === "subject" ? "كل طلبة المادة المسجلين"
      : a.audience_type === "batch" ? `دفعة ${a.batch_year ?? ""}`
      : "طلبة محددين";

  if (loading || !user || !isStaff) {
    return <div className="flex min-h-screen items-center justify-center" dir="rtl"><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>;
  }

  return (
    <div className="relative min-h-screen" dir="rtl">
      <StarsBackground />
      <header className="relative z-10 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm hover:text-accent">
            <ArrowRight className="h-4 w-4" /> الرئيسية
          </Link>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-accent" />
            <h1 className="font-display text-xl font-semibold">لوحة الدكتور</h1>
          </div>
          {subjects.length > 0 ? (
            <button onClick={openNew} className="rounded-full bg-gradient-cosmic px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-rose">
              + إعلان جديد
            </button>
          ) : <span />}
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-6 py-8 space-y-5">
        {subjectsLoading || feedLoading ? (
          <div className="flex justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>
        ) : subjects.length === 0 ? (
          <p className="py-16 text-center text-sm text-foreground/75">مفيش مواد متسجلة لك حالياً — كلّم الأدمن.</p>
        ) : (
          <>
            <div className="cosmic-card rounded-2xl p-5">
              <h3 className="font-display text-base">موادك</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {subjects.map((sub) => (
                  <Link key={sub.id} to="/subjects/$subjectId/quizzes" params={{ subjectId: sub.id }} className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/20">
                    {sub.name_ar}
                  </Link>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-foreground/50">دوس على مادة عشان تضيف أو تدير اختباراتها</p>
            </div>

            <h3 className="font-display text-base">إعلاناتك</h3>
            {feed.length === 0 ? (
              <p className="py-10 text-center text-sm text-foreground/75">لسه مفيش إعلانات منك.</p>
            ) : (
              <div className="space-y-3">
                {feed.map((a) => (
                  <div key={a.id} className="cosmic-card overflow-hidden rounded-2xl">
                    {a.image_url && <img src={a.image_url} className="h-44 w-full object-cover" />}
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            {a.pinned && <Pin className="h-3.5 w-3.5 text-accent" />}
                            <p className="font-semibold">{a.title}</p>
                          </div>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/80">{a.body}</p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-[11px] text-accent">{a.subject_name}</span>
                            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px]">{audienceLabel(a)}</span>
                          </div>
                        </div>
                        {a.can_manage && (
                          <div className="flex shrink-0 gap-1.5">
                            <button onClick={() => togglePin(a)} className="rounded-full border border-border p-1.5 hover:border-accent"><Pin className="h-3.5 w-3.5" /></button>
                            <button onClick={() => del(a.id)} className="rounded-full border border-destructive/50 p-1.5 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        )}
                      </div>
                      {a.can_manage && (
                        <button onClick={() => openEdit(a)} className="mt-3 text-xs font-semibold text-accent hover:underline">تعديل</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => !busy && setOpen(false)}>
          <div className="cosmic-card max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg">{editing ? "تعديل الإعلان" : "إعلان جديد"}</h3>
              <button onClick={() => !busy && setOpen(false)} className="text-foreground/75 hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>

            <p className="text-sm text-foreground/75">المادة</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {subjects.map((sub) => (
                <button key={sub.id} onClick={() => setSubjectId(sub.id)} className={`rounded-full border px-3 py-1 text-xs ${subjectId === sub.id ? "border-accent bg-accent/15 text-accent" : "border-border"}`}>{sub.name_ar}</button>
              ))}
            </div>

            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="العنوان" className="mt-4 w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm focus:border-accent focus:outline-none" />
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="نص الإعلان..." className="mt-3 w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm focus:border-accent focus:outline-none" />

            <p className="mt-4 text-sm text-foreground/75">مين يشوف الإعلان؟</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <button onClick={() => setAudience("subject")} className={`rounded-full border px-3 py-1 text-xs ${audience === "subject" ? "border-accent bg-accent/15 text-accent" : "border-border"}`}>كل طلبة المادة</button>
              <button onClick={() => setAudience("batch")} className={`rounded-full border px-3 py-1 text-xs ${audience === "batch" ? "border-accent bg-accent/15 text-accent" : "border-border"}`}>دفعة معينة</button>
              <button onClick={() => setAudience("specific")} className={`rounded-full border px-3 py-1 text-xs ${audience === "specific" ? "border-accent bg-accent/15 text-accent" : "border-border"}`}>طلبة محددين</button>
            </div>

            {audience === "batch" && (
              <input value={batchYear} onChange={(e) => setBatchYear(e.target.value)} placeholder="سنة الدفعة، مثال: 2023" inputMode="numeric" className="mt-3 w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm focus:border-accent focus:outline-none" />
            )}

            {audience === "specific" && (
              <div className="mt-3 space-y-2">
                <input value={peopleQuery} onChange={(e) => searchPeople(e.target.value)} placeholder="دوّر بالاسم..." className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm focus:border-accent focus:outline-none" />
                {searching && <p className="text-xs text-foreground/60">بيدوّر...</p>}
                {peopleResults.length > 0 && (
                  <div className="space-y-1.5">
                    {peopleResults.map((p) => (
                      <button key={p.id} onClick={() => addPerson(p)} className="flex w-full items-center gap-2 rounded-lg border border-border/60 px-2.5 py-1.5 text-right text-sm hover:border-accent">
                        {p.avatar_url ? <img src={p.avatar_url} className="h-7 w-7 rounded-full object-cover" /> : <div className="flex h-7 w-7 items-center justify-center rounded-full bg-rose/30 text-xs">{p.full_name?.trim()?.[0] ?? "؟"}</div>}
                        {p.full_name}
                      </button>
                    ))}
                  </div>
                )}
                {selectedPeople.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedPeople.map((p) => (
                      <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs">
                        {p.full_name}
                        <button onClick={() => removePerson(p.id)}><X className="h-3 w-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mt-4">
              {imgFile ? (
                <div className="relative">
                  <img src={URL.createObjectURL(imgFile)} className="h-40 w-full rounded-xl object-cover" />
                  <button onClick={() => setImgFile(null)} className="absolute -top-1.5 -left-1.5 rounded-full bg-black/70 p-1"><X className="h-3 w-3 text-white" /></button>
                </div>
              ) : editing?.image_url ? (
                <img src={editing.image_url} className="h-40 w-full rounded-xl object-cover" />
              ) : (
                <button onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm hover:border-accent">
                  <ImageIcon className="h-4 w-4 text-accent" /> إضافة صورة للإعلان
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setImgFile(e.target.files?.[0] ?? null)} />
            </div>

            <button onClick={submit} disabled={busy} className="mt-5 w-full rounded-full bg-gradient-cosmic py-2.5 text-sm font-semibold text-primary-foreground shadow-rose disabled:opacity-60">
              {busy ? "جاري الحفظ..." : editing ? "حفظ التعديل" : "نشر"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
