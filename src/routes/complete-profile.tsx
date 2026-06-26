import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CosmicBackground } from "@/components/CosmicBackground";
import { Logo } from "@/components/Logo";
import { Upload, Loader2, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/complete-profile")({
  head: () => ({ meta: [{ title: "استكمال البيانات — Assuit SciDream" }] }),
  component: CompleteProfilePage,
});

function CompleteProfilePage() {
  const { user, profile, roles, loading, refresh } = useAuth();
  const isOwnerAdmin = user?.email?.trim().toLowerCase() === "abdalahkotp31@gmail.com";
  const isAdmin = isOwnerAdmin || roles.includes("admin") || roles.includes("super_admin");
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [academicId, setAcademicId] = useState("");
  const [phone, setPhone] = useState("");
  const [batchYear, setBatchYear] = useState<string>(String(new Date().getFullYear()));
  const [idFile, setIdFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    if (isOwnerAdmin) {
      navigate({ to: "/dashboard" });
      return;
    }
    if (!profile) return;
    if (profile.verification_status === "pending") navigate({ to: "/pending" });
    if (profile?.verification_status === "verified") navigate({ to: "/dashboard" });
    if (profile) {
      setFullName(profile.full_name ?? "");
      setAcademicId(profile.academic_id ?? "");
      setPhone(profile.phone ?? "");
      if (profile.batch_year) setBatchYear(String(profile.batch_year));
    }
  }, [user, profile, loading, navigate, isOwnerAdmin]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!fullName.trim() || !academicId.trim() || !phone.trim()) {
      toast.error("املأ كل البيانات الأول");
      return;
    }
    if (!isAdmin && !idFile && !profile?.id_card_url) {
      toast.error("لازم ترفع صورة بطاقتك الجامعية");
      return;
    }

    setSubmitting(true);
    try {
      let idCardUrl = profile?.id_card_url ?? null;

      if (idFile) {
        const ext = idFile.name.split(".").pop() ?? "jpg";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("id-cards").upload(path, idFile, { upsert: true, contentType: idFile.type });
        if (upErr) throw upErr;
        idCardUrl = path;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          academic_id: academicId.trim(),
          phone: phone.trim(),
          batch_year: Number(batchYear),
          id_card_url: idCardUrl,
          // Admins auto-verify themselves; students go to pending review
          verification_status: isAdmin ? "verified" : "pending",
          is_verified: isAdmin ? true : undefined,
        })
        .eq("id", user.id);

      if (error) throw error;
      await refresh();
      toast.success(isAdmin ? "تم حفظ بياناتك ✨" : "تم إرسال بياناتك للمراجعة ✨");
      navigate({ to: isAdmin ? "/dashboard" : "/pending" });
    } catch (err) {
      console.error("[complete-profile] save failed", err);
      const message = err instanceof Error ? err.message : (typeof err === "object" && err && "message" in err ? String((err as { message: unknown }).message) : String(err));
      if (message.toLowerCase().includes("duplicate")) {
        toast.error("الرقم الأكاديمي ده مستخدم قبل كده");
      } else {
        toast.error(`حصلت مشكلة في الحفظ: ${message}`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user || isOwnerAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen px-4 py-10">
      <CosmicBackground density={28} />
      <div className="relative z-10 mx-auto max-w-xl">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 rotate-180" /> الرئيسية
        </Link>

        <div className="cosmic-card rounded-3xl p-8">
          <div className="text-center">
            <Logo size={64} className="mx-auto" />
            <h1 className="mt-3 font-display text-3xl">استكمال بياناتك</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              عشان نأكد إنك طالب في كلية العلوم، محتاجين منك البيانات دي.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <Field label="الاسم الكامل (زي ما في البطاقة)">
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="عبدالله محمد كوتب"
                className="input"
                required
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="الرقم الأكاديمي">
                <input
                  value={academicId}
                  onChange={(e) => setAcademicId(e.target.value)}
                  placeholder="مثال: 2023123456"
                  className="input"
                  required
                />
              </Field>
              <Field label="سنة الالتحاق بالكلية">
                <select value={batchYear} onChange={(e) => setBatchYear(e.target.value)} className="input">
                  {Array.from({ length: 8 }).map((_, i) => {
                    const y = new Date().getFullYear() - i;
                    return <option key={y} value={y}>{y}</option>;
                  })}
                </select>
              </Field>
            </div>

            <Field label="رقم التليفون">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01xxxxxxxxx"
                inputMode="tel"
                className="input"
                required
              />
            </Field>

            <Field label="صورة البطاقة الجامعية">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center justify-between rounded-xl border border-dashed border-border bg-background/40 px-4 py-4 text-sm transition hover:border-accent"
              >
                <span className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-accent" />
                  {idFile ? idFile.name : profile?.id_card_url ? "البطاقة مرفوعة — اختر صورة جديدة" : "اضغط لاختيار صورة"}
                </span>
                <span className="text-xs text-muted-foreground">JPG / PNG</span>
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setIdFile(e.target.files?.[0] ?? null)}
              />
            </Field>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-primary py-3.5 text-base font-semibold text-primary-foreground shadow-soft transition hover:shadow-glow disabled:opacity-60"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> جاري الحفظ...
                </span>
              ) : (
                "إرسال للمراجعة"
              )}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        .input {
          width: 100%;
          background: color-mix(in oklch, var(--background) 60%, transparent);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 0.7rem 0.9rem;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.15s;
          font-family: inherit;
        }
        .input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in oklch, var(--accent) 25%, transparent); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
