import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const db = supabase as any;
type Release = { id: string; version: string; download_url: string; note: string | null; created_at: string };

/** نشر تحديث للتطبيق: أي جهاز إصداره أقدم بيشوف رسالة فيها رابط التحميل (نفس الجدول بتاع التطبيق) */
export function UpdateReleaseAdmin() {
  const { user } = useAuth();
  const [cur, setCur] = useState<Release | null>(null);
  const [version, setVersion] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const { data } = await db.from("app_releases").select("*").eq("is_active", true).order("created_at", { ascending: false }).limit(1);
    setCur(((data as Release[]) ?? [])[0] ?? null);
    setReady(true);
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function publish() {
    const v = version.trim();
    const link = url.trim();
    if (!v) return toast.error("اكتب رقم الإصدار الجديد");
    if (!/^https?:\/\//i.test(link)) return toast.error("اكتب رابط تحميل صحيح (يبدأ بـ https://)");
    setBusy(true);
    try {
      await db.from("app_releases").update({ is_active: false }).eq("is_active", true);
      const { error } = await db.from("app_releases").insert({ version: v, download_url: link, note: note.trim() || null, created_by: user?.id ?? null });
      if (error) throw error;
      toast.success("اتنشر التحديث ✨");
      setVersion(""); setUrl(""); setNote("");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "فشل النشر");
    } finally { setBusy(false); }
  }

  async function stop() {
    if (!confirm("إيقاف رسالة التحديث عن كل المستخدمين؟")) return;
    const { error } = await db.from("app_releases").update({ is_active: false }).eq("is_active", true);
    if (error) return toast.error(error.message);
    toast.success("اتوقفت رسالة التحديث");
    await load();
  }

  const input = "w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm focus:border-accent focus:outline-none";
  return (
    <section className="cosmic-card space-y-3 rounded-2xl p-5">
      <h3 className="font-display text-lg">تحديث التطبيق</h3>
      <p className="text-xs leading-6 text-foreground/65">
        اكتب نفس الإصدار اللي حاطه في app.json بتاع النسخة الجديدة. أي جهاز إصداره أقدم هيظهرله تنبيه فيه رابط التحميل لحد ما يحدّث.
      </p>
      {!ready ? (
        <Loader2 className="h-4 w-4 animate-spin text-accent" />
      ) : cur ? (
        <div className="space-y-2 rounded-xl border border-border p-3">
          <p className="text-sm font-semibold text-accent">المنشور حاليًا: {cur.version}</p>
          <p className="text-[11px] text-foreground/60">من {new Date(cur.created_at).toLocaleDateString("ar-EG")}</p>
          <div className="flex gap-2">
            <a href={cur.download_url} target="_blank" rel="noreferrer" className="flex-1 rounded-full border border-border py-1.5 text-center text-xs hover:border-accent">فتح الرابط</a>
            <button onClick={stop} className="flex-1 rounded-full border border-destructive/50 py-1.5 text-xs text-destructive hover:bg-destructive/10">إيقاف التنبيه</button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-foreground/60">مفيش تحديث منشور دلوقتي.</p>
      )}
      <input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="رقم الإصدار الجديد (مثلًا 1.1.0)" dir="ltr" className={input} />
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="رابط التحميل https://..." dir="ltr" className={input} />
      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة للمستخدمين (اختياري): إيه الجديد؟" rows={3} maxLength={1000} className={input} />
      <button onClick={() => void publish()} disabled={busy} className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
        {busy ? "جاري النشر..." : "نشر التحديث"}
      </button>
    </section>
  );
}
