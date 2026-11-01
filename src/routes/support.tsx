import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, LifeBuoy, MessageCircle, Trash2, X } from "lucide-react";
import { useAuth, isSuperAdminEmail } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { StarsBackground } from "@/components/IntroSequence";

export const Route = createFileRoute("/support")({
  head: () => ({ meta: [{ title: "قسم الدعم — Assuit SciDream" }] }),
  component: SupportPage,
});

const SUPPORT_PHONE = "201030380348";
const MAX_IMAGES = 6;
const BUCKET = "support-images";

const CATEGORIES: { k: string; label: string }[] = [
  { k: "account", label: "حسابي" },
  { k: "registration", label: "التسجيل" },
  { k: "grades", label: "الدرجات" },
  { k: "content", label: "المحتوى" },
  { k: "technical", label: "مشكلة تقنية" },
  { k: "other", label: "أخرى" },
];
const STATUSES: { k: string; label: string }[] = [
  { k: "open", label: "مفتوحة" },
  { k: "in_progress", label: "جاري الحل" },
  { k: "resolved", label: "تم الحل" },
];
const catLabel = (k: string) => CATEGORIES.find((c) => c.k === k)?.label ?? k;
const stLabel = (k: string) => STATUSES.find((c) => c.k === k)?.label ?? k;

type Ticket = {
  id: string; category: string; message: string; images: string[]; status: string;
  admin_note: string | null; created_at: string; user_id?: string;
  full_name?: string | null; email?: string | null; phone?: string | null; whatsapp?: string | null;
};

/** بيحوّل أي رقم موبايل (مصري أو دولي) لرابط واتساب */
function waLink(raw?: string | null, text?: string): string | null {
  let d = (raw ?? "").replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632)).replace(/[^0-9]/g, "");
  if (!d) return null;
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = "20" + d.slice(1);
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("ar-EG"); } catch { return ""; }
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] ${status === "resolved" ? "bg-secondary text-foreground/70" : "bg-accent/15 text-accent"}`}>
      {stLabel(status)}
    </span>
  );
}

function TicketImages({ paths }: { paths: string[] }) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    let live = true;
    if (!paths?.length) { setUrls([]); return; }
    void supabase.storage.from(BUCKET).createSignedUrls(paths, 3600).then(({ data }) => {
      if (live) setUrls(((data as any[]) ?? []).map((d) => d.signedUrl).filter(Boolean));
    });
    return () => { live = false; };
  }, [paths?.join("|")]);
  if (!urls.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {urls.map((u) => (
        <a key={u} href={u} target="_blank" rel="noreferrer">
          <img src={u} className="h-20 w-20 rounded-lg object-cover" />
        </a>
      ))}
    </div>
  );
}

function SupportPage() {
  const { user, profile, roles, loading } = useAuth();
  const navigate = useNavigate();
  const isSuper = isSuperAdminEmail(user?.email) || (roles as string[]).includes("super_admin");
  const [tab, setTab] = useState<"new" | "mine" | "admin">("new");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  // ===== مشكلة جديدة =====
  const [category, setCategory] = useState("technical");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const picked = Array.from(list).filter((f) => f.type.startsWith("image/"));
    setFiles((cur) => [...cur, ...picked].slice(0, MAX_IMAGES));
  }

  async function send() {
    if (!user) return;
    const msg = message.trim();
    if (!msg) return toast.error("اكتب رسالة المشكلة");
    if (msg.length > 3000) return toast.error("الرسالة طويلة (الحد 3000 حرف)");
    setBusy(true);
    const paths: string[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user.id}/${Date.now()}_${i}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, f, { contentType: f.type, upsert: false });
      if (error) { setBusy(false); return toast.error(`فشل رفع صورة ${i + 1}: ${error.message}`); }
      paths.push(path);
    }
    const { error } = await supabase.from("support_tickets").insert({ category, message: msg, images: paths } as never);
    setBusy(false);
    if (error) return toast.error(error.message);
    setMessage(""); setFiles([]); setCategory("technical");
    toast.success("تم إرسال رسالتك، هنرد عليك قريب");
    await loadMine();
    setTab("mine");
  }

  // ===== رسايلي =====
  const [mine, setMine] = useState<Ticket[]>([]);
  const [mineLoading, setMineLoading] = useState(true);
  async function loadMine() {
    if (!user) return;
    setMineLoading(true);
    const { data } = await supabase.from("support_tickets").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setMine((data as Ticket[]) ?? []);
    setMineLoading(false);
  }
  useEffect(() => { if (user) void loadMine(); }, [user?.id]);

  // ===== السوبر أدمن: كل التذاكر =====
  const [filter, setFilter] = useState("all");
  const [all, setAll] = useState<Ticket[]>([]);
  const [allLoading, setAllLoading] = useState(true);
  async function loadAll() {
    if (!isSuper) return;
    setAllLoading(true);
    const { data, error } = await supabase.rpc("support_tickets_admin_list", { p_status: filter === "all" ? null : filter, p_limit: 200 } as never);
    if (error) toast.error(error.message);
    setAll((data as Ticket[]) ?? []);
    setAllLoading(false);
  }
  useEffect(() => { if (isSuper && tab === "admin") void loadAll(); }, [isSuper, tab, filter]);

  async function setStatus(t: Ticket, status: string) {
    const { error } = await supabase.from("support_tickets").update({ status, updated_at: new Date().toISOString() } as never).eq("id", t.id);
    if (error) return toast.error(error.message);
    await loadAll();
  }
  async function saveNote(t: Ticket, note: string) {
    const { error } = await supabase.from("support_tickets").update({ admin_note: note.trim() || null, updated_at: new Date().toISOString() } as never).eq("id", t.id);
    if (error) return toast.error(error.message);
    toast.success("تم حفظ الملاحظة");
    await loadAll();
  }
  async function del(t: Ticket) {
    if (!confirm("حذف هذه التذكرة؟")) return;
    if (t.images?.length) await supabase.storage.from(BUCKET).remove(t.images);
    const { error } = await supabase.from("support_tickets").delete().eq("id", t.id);
    if (error) return toast.error(error.message);
    await loadAll();
  }

  if (loading || !user) {
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
            <LifeBuoy className="h-5 w-5 text-accent" />
            <h1 className="font-display text-xl font-semibold">قسم الدعم</h1>
          </div>
          <span />
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-6 py-8 space-y-5">
        <div className="cosmic-card rounded-2xl p-5">
          <h3 className="font-display text-base">تواصل مباشر على واتساب</h3>
          <p className="mt-1 text-sm text-foreground/75">لو مشكلتك مستعجلة كلمنا على طول.</p>
          <a
            href={waLink(SUPPORT_PHONE, "أهلاً، محتاج مساعدة في منصة Assuit SciDream") ?? "#"}
            target="_blank" rel="noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-cosmic px-5 py-2 text-sm font-semibold text-primary-foreground shadow-rose"
          >
            <MessageCircle className="h-4 w-4" /> +20 103 038 0348
          </a>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => setTab("new")} className={`rounded-full border px-4 py-1.5 text-xs font-semibold ${tab === "new" ? "border-accent bg-accent/15 text-accent" : "border-border"}`}>مشكلة جديدة</button>
          <button onClick={() => setTab("mine")} className={`rounded-full border px-4 py-1.5 text-xs font-semibold ${tab === "mine" ? "border-accent bg-accent/15 text-accent" : "border-border"}`}>رسايلي</button>
          {isSuper && (
            <button onClick={() => setTab("admin")} className={`rounded-full border px-4 py-1.5 text-xs font-semibold ${tab === "admin" ? "border-accent bg-accent/15 text-accent" : "border-border"}`}>كل التذاكر</button>
          )}
        </div>

        {tab === "new" && (
          <div className="cosmic-card rounded-2xl p-5 space-y-3">
            <p className="text-sm text-foreground/75">تصنيف المشكلة</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button key={c.k} onClick={() => setCategory(c.k)} className={`rounded-full border px-3 py-1 text-xs ${category === c.k ? "border-accent bg-accent/15 text-accent" : "border-border"}`}>{c.label}</button>
              ))}
            </div>
            <p className="text-sm text-foreground/75">رسالة المشكلة</p>
            <textarea
              value={message} onChange={(e) => setMessage(e.target.value)} rows={5}
              placeholder="اشرح المشكلة بالتفصيل..."
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
            <p className="text-[11px] text-foreground/60">{message.length}/3000</p>

            <p className="text-sm text-foreground/75">صور المشكلة ({files.length}/{MAX_IMAGES})</p>
            {files.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <div key={i} className="relative">
                    <img src={URL.createObjectURL(f)} className="h-20 w-20 rounded-lg object-cover" />
                    <button onClick={() => setFiles((cur) => cur.filter((_, j) => j !== i))} className="absolute -top-1.5 -left-1.5 rounded-full bg-black/70 p-1">
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {files.length < MAX_IMAGES && (
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-dashed border-border px-4 py-1.5 text-xs">
                إضافة صور
                <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
              </label>
            )}

            <button
              onClick={send} disabled={busy}
              className="rounded-full bg-gradient-cosmic px-5 py-2 text-sm font-semibold text-primary-foreground shadow-rose disabled:opacity-60"
            >
              {busy ? "جاري الإرسال..." : "إرسال"}
            </button>
          </div>
        )}

        {tab === "mine" && (
          mineLoading ? (
            <div className="flex justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>
          ) : mine.length === 0 ? (
            <p className="py-16 text-center text-sm text-foreground/75">لسه ما بعتش أي رسالة.</p>
          ) : (
            <div className="space-y-3">
              {mine.map((t) => (
                <div key={t.id} className="cosmic-card rounded-2xl p-5">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px]">{catLabel(t.category)}</span>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/85">{t.message}</p>
                  <TicketImages paths={t.images} />
                  {t.admin_note && (
                    <div className="mt-3 rounded-xl border border-accent/30 bg-accent/5 p-3">
                      <p className="text-[11px] font-semibold text-accent">رد الدعم</p>
                      <p className="mt-1 text-sm text-foreground/85">{t.admin_note}</p>
                    </div>
                  )}
                  <p className="mt-2 text-[11px] text-foreground/50">{fmtDate(t.created_at)}</p>
                </div>
              ))}
            </div>
          )
        )}

        {tab === "admin" && isSuper && (
          <>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setFilter("all")} className={`rounded-full border px-3 py-1 text-xs ${filter === "all" ? "border-accent bg-accent/15 text-accent" : "border-border"}`}>الكل</button>
              {STATUSES.map((st) => (
                <button key={st.k} onClick={() => setFilter(st.k)} className={`rounded-full border px-3 py-1 text-xs ${filter === st.k ? "border-accent bg-accent/15 text-accent" : "border-border"}`}>{st.label}</button>
              ))}
            </div>
            {allLoading ? (
              <div className="flex justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>
            ) : all.length === 0 ? (
              <p className="py-16 text-center text-sm text-foreground/75">مفيش تذاكر.</p>
            ) : (
              <div className="space-y-3">
                {all.map((t) => (
                  <AdminTicket key={t.id} t={t} onStatus={setStatus} onNote={saveNote} onDelete={del} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function AdminTicket({ t, onStatus, onNote, onDelete }: {
  t: Ticket; onStatus: (t: Ticket, s: string) => void; onNote: (t: Ticket, n: string) => void; onDelete: (t: Ticket) => void;
}) {
  const [note, setNote] = useState(t.admin_note ?? "");
  const wa = waLink(t.whatsapp || t.phone, `أهلاً ${t.full_name ?? ""}، بخصوص رسالتك في قسم الدعم:`);
  return (
    <div className="cosmic-card rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{t.full_name ?? "مستخدم"}</p>
          {t.email && <p className="truncate text-[11px] text-foreground/60">{t.email}</p>}
          {(t.whatsapp || t.phone) && <p className="truncate text-[11px] text-foreground/60">{t.whatsapp || t.phone}</p>}
        </div>
        <button onClick={() => onDelete(t)} className="shrink-0 rounded-full border border-destructive/50 p-1.5 text-destructive hover:bg-destructive/10">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px]">{catLabel(t.category)}</span>
        <StatusBadge status={t.status} />
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/85">{t.message}</p>
      <TicketImages paths={t.images} />
      <p className="mt-2 text-[11px] text-foreground/50">{fmtDate(t.created_at)}</p>

      {wa && (
        <a href={wa} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs hover:border-accent">
          <MessageCircle className="h-3.5 w-3.5" /> كلّمه على واتساب
        </a>
      )}

      <p className="mt-4 text-xs text-foreground/75">الحالة</p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {STATUSES.map((st) => (
          <button key={st.k} onClick={() => onStatus(t, st.k)} className={`rounded-full border px-3 py-1 text-xs ${t.status === st.k ? "border-accent bg-accent/15 text-accent" : "border-border"}`}>{st.label}</button>
        ))}
      </div>
      <p className="mt-3 text-xs text-foreground/75">رد / ملاحظة (بتظهر للطالب)</p>
      <textarea
        value={note} onChange={(e) => setNote(e.target.value)} rows={3}
        placeholder="اكتب الرد..."
        className="mt-1.5 w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm focus:border-accent focus:outline-none"
      />
      <button onClick={() => onNote(t, note)} className="mt-2 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground">حفظ الملاحظة</button>
    </div>
  );
}
