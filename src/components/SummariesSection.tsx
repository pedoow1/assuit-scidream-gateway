import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  BookOpen, FileText, Globe, ImagePlus, Loader2, Lock, Paperclip, Pencil, Plus, Save, Star, Trash2, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { deleteFromB2, mu, resolveFileUrl, uploadToB2, useB2Urls } from "@/lib/b2";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Stars, notifyRatingChanged, useUserRating } from "@/components/RatingBadge";

const db = supabase as any;
const MAX_FILES = 10;
const MAX_FILE = 100 * 1024 * 1024;

type FileItem = { ref: string; name: string; mime: string };
type Sum = {
  id: string; user_id: string; title: string; subject_name: string | null; body: string | null;
  files: FileItem[] | null; file_ref: string | null; file_name: string | null; is_public: boolean; created_at: string;
};
type Stat = { avg: number; votes: number; mine: number | null };
type Draft = { id?: string; title: string; subject: string; body: string; isPublic: boolean; files: FileItem[] };
const EMPTY: Draft = { title: "", subject: "", body: "", isPublic: true, files: [] };

const isImg = (f: FileItem) => f.mime.startsWith("image") || /\.(jpe?g|png|webp|gif|heic)$/i.test(f.name);
// تلخيصات النسخة الأولى كان فيها ملف واحد في file_ref
const filesOf = (s: Sum): FileItem[] =>
  s.files && s.files.length ? s.files : s.file_ref ? [{ ref: s.file_ref, name: s.file_name || "ملف مرفق", mime: "" }] : [];
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" });

/** قسم التلخيصات في البروفايل. own = صاحب البروفايل (يضيف ويعدّل ويمسح ويشوف الخاص). غيره بيشوف العام ويقيّم. */
export function SummariesSection({ userId, own }: { userId: string; own: boolean }) {
  useB2Urls();
  const ur = useUserRating(userId);
  const ratable = !ur.isSuper; // السوبر أدمن: مفيش تقييم خالص

  const [rows, setRows] = useState<Sum[]>([]);
  const [stats, setStats] = useState<Record<string, Stat>>({});
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<"new" | "top">("new");

  const [viewId, setViewId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [picked, setPicked] = useState<File[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState("");
  const mediaInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    let q = db.from("summaries").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    if (!own) q = q.eq("is_public", true);
    const { data, error } = await q;
    if (error) { setLoading(false); return; }
    const list = (data as Sum[]) ?? [];
    const st: Record<string, Stat> = {};
    if (list.length) {
      const { data: s } = await db.rpc("summary_rating_stats", { p_ids: list.map((r) => r.id) });
      for (const r of (s as any[]) ?? []) {
        st[r.summary_id] = { avg: Number(r.avg_stars), votes: Number(r.votes), mine: r.my_stars != null ? Number(r.my_stars) : null };
      }
    }
    setRows(list); setStats(st); setLoading(false);
  }, [userId, own]);
  useEffect(() => { setLoading(true); void load(); }, [load]);

  const sorted = useMemo(() => {
    if (sort === "new") return rows;
    return [...rows].sort((a, b) => (stats[b.id]?.avg ?? 0) - (stats[a.id]?.avg ?? 0) || (stats[b.id]?.votes ?? 0) - (stats[a.id]?.votes ?? 0));
  }, [rows, stats, sort]);

  const view = rows.find((r) => r.id === viewId) ?? null;

  const openEditor = (s?: Sum) => {
    setPicked([]); setRemoved([]); setViewId(null); setProgress("");
    setDraft(s ? { id: s.id, title: s.title, subject: s.subject_name ?? "", body: s.body ?? "", isPublic: s.is_public, files: filesOf(s) } : EMPTY);
  };

  const room = () => MAX_FILES - (draft?.files.length ?? 0) - picked.length;
  function addPicked(list: FileList | null) {
    if (!list || !list.length) return;
    const all = Array.from(list);
    const ok = all.filter((f) => f.size <= MAX_FILE);
    if (ok.length < all.length) toast.error("في ملفات أكبر من 100 ميجا اتتجاهلت");
    const left = room();
    if (ok.length > left) toast.error(`الحد الأقصى ${MAX_FILES} مرفقات`);
    setPicked((p) => [...p, ...ok.slice(0, Math.max(0, left))]);
  }

  async function save() {
    if (!draft) return;
    const title = draft.title.trim();
    if (!title) return toast.error("اكتب عنوان للتلخيص");
    if (!draft.body.trim() && draft.files.length === 0 && picked.length === 0) return toast.error("اكتب نص أو ارفع ملفات");
    setSaving(true);
    const uploaded: FileItem[] = [];
    try {
      for (let i = 0; i < picked.length; i++) {
        setProgress(`جاري رفع ${i + 1} من ${picked.length}...`);
        const f = picked[i];
        const up = await uploadToB2("group-media", `sum-${userId}`, f);
        uploaded.push({ ref: up.ref, name: f.name, mime: f.type });
      }
      const row = {
        title, subject_name: draft.subject.trim() || null, body: draft.body.trim() || null,
        files: [...draft.files, ...uploaded], file_ref: null, file_name: null, is_public: draft.isPublic,
      };
      const res = draft.id
        ? await db.from("summaries").update(row).eq("id", draft.id)
        : await db.from("summaries").insert({ ...row, user_id: userId });
      if (res.error) throw res.error;
      if (removed.length) { try { await deleteFromB2(removed); } catch { /* مش مشكلة */ } }
      toast.success("اتحفظ التلخيص ✨");
      setDraft(null); setPicked([]); setRemoved([]);
      await load(); notifyRatingChanged();
    } catch (e: any) {
      if (uploaded.length) { try { await deleteFromB2(uploaded.map((u) => u.ref)); } catch { /* مش مشكلة */ } }
      toast.error(e?.message ?? "فشل الحفظ");
    } finally { setSaving(false); setProgress(""); }
  }

  async function remove(s: Sum) {
    if (!window.confirm("هل تريد حذف التلخيص ده؟")) return;
    const refs = filesOf(s).map((f) => f.ref);
    const { error } = await db.from("summaries").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    if (refs.length) { try { await deleteFromB2(refs); } catch { /* مش مشكلة */ } }
    setViewId(null); await load(); notifyRatingChanged();
  }

  async function openFile(f: FileItem) {
    const w = window.open("", "_blank"); // نفتح التاب الأول عشان البوب أب ما يتحجبش
    const url = await resolveFileUrl(f.ref);
    if (!url) { w?.close(); return toast.error("مقدرتش أفتح الملف"); }
    if (w) w.location.href = url; else window.location.href = url;
  }

  async function rate(sm: Sum, n: number) {
    const { error } = await db.rpc("rate_summary", { p_summary: sm.id, p_stars: n });
    if (error) return toast.error(error.message);
    toast.success("شكرًا على تقييمك ⭐");
    await load(); notifyRatingChanged();
  }

  if (!own && !loading && rows.length === 0) return null;

  const vFiles = view ? filesOf(view) : [];
  const vImgs = vFiles.filter(isImg);
  const vOthers = vFiles.filter((f) => !isImg(f));
  const vStat = view ? stats[view.id] : undefined;

  return (
    <div className="cosmic-card mt-6 rounded-3xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-lg">
          <BookOpen className="h-4 w-4 text-accent" />
          {own ? "تلخيصاتي" : "التلخيصات"} {rows.length > 0 && <span className="text-sm text-foreground/50">({rows.length})</span>}
        </h2>
        <div className="flex items-center gap-2">
          {rows.length > 1 && (
            <div className="flex overflow-hidden rounded-full border border-border/60 text-xs">
              <button onClick={() => setSort("new")} className={`px-3 py-1 ${sort === "new" ? "bg-accent/20 text-accent" : "text-foreground/60"}`}>الأحدث</button>
              {ratable && (
                <button onClick={() => setSort("top")} className={`px-3 py-1 ${sort === "top" ? "bg-accent/20 text-accent" : "text-foreground/60"}`}>الأعلى تقييمًا</button>
              )}
            </div>
          )}
          {own && (
            <Button size="sm" onClick={() => openEditor()}>
              <Plus className="ml-1 h-4 w-4" /> تلخيص جديد
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {loading && rows.length === 0 ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-foreground/60">لسه معندكش تلخيصات. ابدأ بأول تلخيص وشاركه مع زمايلك 📚</p>
        ) : (
          sorted.map((it) => {
            const st = stats[it.id];
            const n = filesOf(it).length;
            return (
              <button
                key={it.id}
                onClick={() => setViewId(it.id)}
                className="block w-full rounded-2xl border border-border/60 bg-card/40 p-3 text-right transition hover:border-accent/50"
              >
                <div className="flex items-center justify-between gap-2 text-[11px] text-foreground/50">
                  <span className="flex items-center gap-1.5">
                    {own && (it.is_public ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3 text-accent" />)}
                    {fmtDate(it.created_at)}
                  </span>
                  {it.subject_name && <span className="rounded-full bg-accent/15 px-2 py-0.5 text-accent">{it.subject_name}</span>}
                </div>
                <p className="mt-1.5 font-semibold">{it.title}</p>
                {it.body && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-foreground/70">{it.body}</p>}
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  {ratable && st ? (
                    <span className="flex items-center gap-1 text-foreground/60">
                      <Star className="h-3 w-3 fill-accent text-accent" /> {st.avg.toFixed(1)} ({st.votes})
                    </span>
                  ) : <span />}
                  {n > 0 && (
                    <span className="flex items-center gap-1 text-accent">
                      <Paperclip className="h-3 w-3" /> {n} {n === 1 ? "مرفق" : "مرفقات"}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* عرض التلخيص */}
      <Dialog open={!!view} onOpenChange={(o) => !o && setViewId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {view && (
            <>
              <DialogHeader><DialogTitle className="text-right leading-relaxed">{view.title}</DialogTitle></DialogHeader>
              <div className="space-y-3 text-right">
                {view.subject_name && <p className="text-xs text-foreground/60">المادة: {view.subject_name}</p>}
                {view.body && <p className="whitespace-pre-wrap text-sm leading-7">{view.body}</p>}
                {vImgs.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {vImgs.map((f) => (
                      <button key={f.ref} onClick={() => void openFile(f)} className="aspect-square overflow-hidden rounded-xl bg-card/60">
                        <img src={mu(f.ref)} alt={f.name} className="h-full w-full object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                )}
                {vOthers.map((f) => (
                  <Button key={f.ref} variant="outline" className="w-full justify-start" onClick={() => void openFile(f)}>
                    <FileText className="ml-2 h-4 w-4 shrink-0 text-accent" /> <span className="truncate">{f.name}</span>
                  </Button>
                ))}

                {ratable && (
                  <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-card/40 p-3">
                    {vStat && <p className="text-xs text-foreground/60">التقييم: {vStat.avg.toFixed(1)} من 5 ({vStat.votes} تقييم)</p>}
                    {!own && (
                      <>
                        <Stars value={vStat?.mine ?? 0} onChange={(n) => void rate(view, n)} size={30} />
                        <p className="text-[11px] text-foreground/50">{vStat?.mine ? "تقييمك: اضغط على نجمة لتغييره" : "قيّم التلخيص ده"}</p>
                      </>
                    )}
                    {own && !vStat && <p className="text-xs text-foreground/50">لسه محدش قيّمه</p>}
                  </div>
                )}

                {own && (
                  <div className="flex gap-2 pt-1">
                    <Button variant="outline" className="flex-1 text-destructive" onClick={() => void remove(view)}>
                      <Trash2 className="ml-1.5 h-4 w-4" /> حذف
                    </Button>
                    <Button className="flex-[2]" onClick={() => openEditor(view)}>
                      <Pencil className="ml-1.5 h-4 w-4" /> تعديل
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* إضافة / تعديل */}
      <Dialog open={!!draft} onOpenChange={(o) => !o && !saving && setDraft(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {draft && (
            <>
              <DialogHeader><DialogTitle className="text-right">{draft.id ? "تعديل التلخيص" : "تلخيص جديد"}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="عنوان التلخيص" maxLength={120} />
                <Input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} placeholder="المادة (اختياري)" maxLength={80} />
                <Textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} placeholder="اكتب التلخيص هنا... (أو ارفع صور وملفات تحت)" rows={6} maxLength={20000} />

                <p className="text-xs text-foreground/55">المرفقات ({draft.files.length + picked.length}/{MAX_FILES}): اختار أكتر من صورة أو ملف مرة واحدة</p>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => mediaInput.current?.click()}>
                    <ImagePlus className="ml-1.5 h-4 w-4" /> صور / فيديو
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => fileInput.current?.click()}>
                    <Paperclip className="ml-1.5 h-4 w-4" /> ملفات
                  </Button>
                </div>
                <input ref={mediaInput} type="file" multiple accept="image/*,video/*" className="hidden"
                  onChange={(e) => { addPicked(e.target.files); e.target.value = ""; }} />
                <input ref={fileInput} type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar,image/*" className="hidden"
                  onChange={(e) => { addPicked(e.target.files); e.target.value = ""; }} />

                {draft.files.map((f) => (
                  <div key={f.ref} className="flex items-center justify-between gap-2 rounded-xl border border-border/60 px-3 py-2 text-sm">
                    <span className="truncate">{f.name}</span>
                    <button type="button" className="shrink-0 text-destructive"
                      onClick={() => { setDraft({ ...draft, files: draft.files.filter((x) => x.ref !== f.ref) }); setRemoved((r) => [...r, f.ref]); }}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {picked.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 rounded-xl border border-accent/40 px-3 py-2 text-sm text-accent">
                    <span className="truncate">{f.name}</span>
                    <button type="button" className="shrink-0 text-destructive" onClick={() => setPicked((p) => p.filter((_, j) => j !== i))}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                <div className="flex items-center justify-between gap-3 rounded-xl bg-card/40 px-3 py-2">
                  <p className="text-sm">{draft.isPublic ? "عام: زمايلك يشوفوه ويقيّموه" : "خاص: انت بس اللي تشوفه"}</p>
                  <Switch checked={draft.isPublic} onCheckedChange={(v) => setDraft({ ...draft, isPublic: v })} />
                </div>

                <Button className="w-full" onClick={() => void save()} disabled={saving}>
                  {saving ? <><Loader2 className="ml-1.5 h-4 w-4 animate-spin" /> {progress || "جاري الحفظ..."}</> : <><Save className="ml-1.5 h-4 w-4" /> حفظ</>}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
