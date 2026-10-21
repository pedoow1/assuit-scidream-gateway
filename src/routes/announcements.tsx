import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Bell, Loader2, Pin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth, isAdminRole } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { StarsBackground } from "@/components/IntroSequence";
import { uploadToB2 } from "@/lib/b2";

export const Route = createFileRoute("/announcements")({
  head: () => ({ meta: [{ title: "الإعلانات — Assuit SciDream" }] }),
  component: AnnouncementsPage,
});

interface Announcement {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
  author_id: string | null;
  image_url: string | null;
  expires_at: string | null;
}

// مدة ظهور الإعلان من وقت النشر. بعدها بيختفي عن الطلبة، والأدمن بيفضل شايفه ومكتوب عليه "منتهي".
const DURATIONS: { k: string; label: string; hours: number | null }[] = [
  { k: "1d", label: "24 ساعة", hours: 24 },
  { k: "3d", label: "3 أيام", hours: 72 },
  { k: "7d", label: "أسبوع", hours: 168 },
  { k: "14d", label: "أسبوعين", hours: 336 },
  { k: "30d", label: "شهر", hours: 720 },
  { k: "never", label: "بدون انتهاء", hours: null },
];
type Cust = { y: string; mo: string; d: string; h: string; mi: string; s: string };
const EMPTY_CUST: Cust = { y: "", mo: "", d: "", h: "", mi: "", s: "" };
const CUST_FIELDS: { k: keyof Cust; label: string }[] = [
  { k: "y", label: "سنين" }, { k: "mo", label: "شهور" }, { k: "d", label: "أيام" },
  { k: "h", label: "ساعات" }, { k: "mi", label: "دقايق" }, { k: "s", label: "ثواني" },
];
const num = (v: string) => Math.min(100000, Math.max(0, Math.floor(Number(v) || 0)));

function addDuration(c: Cust): Date | null {
  const y = num(c.y), mo = num(c.mo), d = num(c.d), h = num(c.h), mi = num(c.mi), s = num(c.s);
  if (!(y || mo || d || h || mi || s)) return null;
  const dt = new Date();
  dt.setFullYear(dt.getFullYear() + y);
  dt.setMonth(dt.getMonth() + mo);
  dt.setDate(dt.getDate() + d);
  dt.setHours(dt.getHours() + h);
  dt.setMinutes(dt.getMinutes() + mi);
  dt.setSeconds(dt.getSeconds() + s);
  return Number.isNaN(dt.getTime()) || dt.getFullYear() > 9999 ? null : dt;
}

function expiryLabel(iso: string | null): string {
  if (!iso) return "بدون انتهاء";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "منتهي (مخفي عن الطلبة)";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `ينتهي بعد ${sec} ثانية`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `ينتهي بعد ${min} دقيقة`;
  const h = Math.floor(min / 60);
  if (h < 48) return `ينتهي بعد ${h} ساعة`;
  const d = Math.floor(h / 24);
  if (d < 60) return `ينتهي بعد ${d} يوم`;
  if (d < 730) return `ينتهي بعد ${Math.floor(d / 30)} شهر`;
  return `ينتهي بعد ${Math.floor(d / 365)} سنة`;
}

function AnnouncementsPage() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const isOwner = user?.email?.trim().toLowerCase() === "abdalahkotp31@gmail.com";
  const isAdmin = isOwner || isAdminRole(roles);
  const [items, setItems] = useState<Announcement[]>([]);
  const [busy, setBusy] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", pinned: false });
  const [dur, setDur] = useState("never");
  const [cust, setCust] = useState<Cust>(EMPTY_CUST);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  async function load() {
    setBusy(true);
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    setItems((data as Announcement[]) ?? []);
    setBusy(false);
  }
  useEffect(() => {
    void load();
  }, []);

  async function submit() {
    if (!form.title.trim() || !form.body.trim() || !user) return;
    let expires_at: string | null = null;
    if (dur === "custom") {
      const when = addDuration(cust);
      if (!when) return toast.error("اكتب المدة: سنين أو شهور أو أيام أو ساعات أو دقايق أو ثواني");
      expires_at = when.toISOString();
    } else {
      const hours = DURATIONS.find((x) => x.k === dur)?.hours ?? null;
      expires_at = hours ? new Date(Date.now() + hours * 3600000).toISOString() : null;
    }
    setUploading(true);
    let image_url: string | null = null;
    if (imageFile) {
      try {
        image_url = (await uploadToB2("announcement", user.id, imageFile)).ref;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "فشل رفع الصورة");
        setUploading(false);
        return;
      }
    }
    const { error } = await supabase.from("announcements").insert({
      title: form.title,
      body: form.body,
      pinned: form.pinned,
      author_id: user.id,
      image_url,
      expires_at,
    } as never);
    setUploading(false);
    if (!error) {
      setForm({ title: "", body: "", pinned: false });
      setDur("never");
      setCust(EMPTY_CUST);
      setImageFile(null);
      setCreating(false);
      await load();
    } else alert(error.message);
  }

  async function togglePin(a: Announcement) {
    await supabase.from("announcements").update({ pinned: !a.pinned }).eq("id", a.id);
    await load();
  }
  async function del(id: string) {
    if (!confirm("حذف هذا الإعلان؟")) return;
    await supabase.from("announcements").delete().eq("id", id);
    await load();
  }

  return (
    <div className="relative min-h-screen" dir="rtl">
      <StarsBackground />
      <header className="relative z-10 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 text-sm hover:text-accent"
          >
            <ArrowRight className="h-4 w-4" /> الرئيسية
          </Link>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-accent" />
            <h1 className="font-display text-xl font-semibold">الإعلانات</h1>
          </div>
          {isAdmin ? (
            <button
              onClick={() => setCreating((v) => !v)}
              className="inline-flex items-center gap-1 rounded-full bg-gradient-cosmic px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-rose"
            >
              <Plus className="h-3.5 w-3.5" /> إضافة
            </button>
          ) : (
            <span />
          )}
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-3xl px-6 py-8">
        {isAdmin && creating && (
          <div className="cosmic-card mb-6 rounded-3xl p-5 space-y-3">
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="العنوان"
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
            <textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="نص الإعلان..."
              rows={4}
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={form.pinned}
                onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
              />
              تثبيت في الأعلى
            </label>
            <div className="space-y-2">
              <p className="text-xs text-foreground/75">مدة ظهور الإعلان (من دلوقتي):</p>
              <div className="flex flex-wrap gap-2">
                {[...DURATIONS, { k: "custom", label: "مدة مخصصة", hours: null }].map((d) => (
                  <button
                    key={d.k}
                    type="button"
                    onClick={() => setDur(d.k)}
                    className={`rounded-full border px-3 py-1 text-xs ${dur === d.k ? "border-accent bg-accent/20 text-accent" : "border-border"}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              {dur === "custom" && (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    {CUST_FIELDS.map((f) => (
                      <label key={f.k} className="block text-[11px] text-foreground/70">
                        {f.label}
                        <input
                          inputMode="numeric"
                          value={cust[f.k]}
                          onChange={(e) => setCust({ ...cust, [f.k]: e.target.value.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632)).replace(/[^0-9]/g, "") })}
                          placeholder="0"
                          className="mt-1 w-full rounded-lg border border-border bg-background/60 px-2 py-1.5 text-center text-sm focus:border-accent focus:outline-none"
                        />
                      </label>
                    ))}
                  </div>
                  <p className="text-[11px] text-foreground/60">
                    {(() => {
                      const when = addDuration(cust);
                      return when ? `هيختفي يوم ${when.toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" })}` : "اكتب رقم في خانة واحدة على الأقل";
                    })()}
                  </p>
                </div>
              )}
            </div>
            <label className="flex items-center gap-2 text-xs">
              <span className="text-foreground/75">صورة (اختياري):</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                className="text-xs"
              />
            </label>
            <button
              onClick={submit}
              disabled={uploading}
              className="rounded-full bg-gradient-cosmic px-5 py-1.5 text-xs font-semibold text-primary-foreground shadow-rose disabled:opacity-60"
            >
              {uploading ? "جاري النشر..." : "نشر"}
            </button>
          </div>
        )}

        {busy ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-sm text-foreground/75 py-20">لا توجد إعلانات حالياً.</p>
        ) : (
          <div className="space-y-3">
            {items.map((a) => (
              <article
                key={a.id}
                className={`cosmic-card overflow-hidden rounded-2xl p-5 ${a.pinned ? "ring-1 ring-accent/50" : ""}`}
              >
                {a.image_url && (
                  <img
                    src={a.image_url}
                    alt={a.title}
                    className="-mx-5 -mt-5 mb-4 w-[calc(100%+2.5rem)] max-h-64 object-cover"
                  />
                )}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {a.pinned && <Pin className="h-3.5 w-3.5 text-accent" />}
                      <h3 className="font-display text-lg">{a.title}</h3>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/75">{a.body}</p>
                    <div className="mt-2 text-[11px] text-foreground/75">
                      {new Date(a.created_at).toLocaleDateString("ar-EG")}
                    </div>
                    {isAdmin && (
                      <span className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[10px] ${a.expires_at && new Date(a.expires_at).getTime() <= Date.now() ? "bg-secondary text-foreground/60" : "bg-accent/15 text-accent"}`}>
                        {expiryLabel(a.expires_at)}
                      </span>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => togglePin(a)}
                        className="rounded-full border border-border p-1.5 hover:border-accent"
                        title="تثبيت"
                      >
                        <Pin className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => del(a.id)}
                        className="rounded-full border border-destructive/50 p-1.5 text-destructive hover:bg-destructive/10"
                        title="حذف"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
