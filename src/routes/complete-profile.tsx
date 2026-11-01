import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { StarsBackground } from "@/components/IntroSequence";
import { Logo } from "@/components/Logo";
import { Upload, Loader2, ArrowLeft } from "lucide-react";
import { uploadToB2 } from "@/lib/b2";

export const Route = createFileRoute("/complete-profile")({
  head: () => ({ meta: [{ title: "استكمال البيانات — Assuit SciDream" }] }),
  component: CompleteProfilePage,
});

type PersonRole = "student" | "instructor" | "assistant";
type Subj = { id: string; code: string; name_ar: string; department: string; year: number };

function CompleteProfilePage() {
  const { user, profile, roles, loading, refresh } = useAuth();
  const isOwnerAdmin = user?.email?.trim().toLowerCase() === "abdalahkotp31@gmail.com";
  const isAdmin = isOwnerAdmin || roles.includes("admin") || roles.includes("super_admin");
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [personRole, setPersonRole] = useState<PersonRole>("student");
  const [fullName, setFullName] = useState("");
  const [academicId, setAcademicId] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [batchYear, setBatchYear] = useState<string>(String(new Date().getFullYear()));
  const [idFile, setIdFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // مواد الكلية — بيتحمّلوا بس لما الشخص يختار دكتور/معيد
  const [subjects, setSubjects] = useState<Subj[]>([]);
  const [subjQuery, setSubjQuery] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  useEffect(() => {
    if (personRole === "student" || isAdmin) return;
    let live = true;
    void supabase.from("subjects").select("id,code,name_ar,department,year").order("department").order("year").order("name_ar")
      .then(({ data }) => { if (live) setSubjects((data as Subj[]) ?? []); });
    return () => { live = false; };
  }, [personRole, isAdmin]);

  const filteredSubjects = useMemo(() => {
    const q = subjQuery.trim();
    if (!q) return subjects;
    return subjects.filter((s) => s.name_ar.includes(q) || s.code.toLowerCase().includes(q.toLowerCase()));
  }, [subjects, subjQuery]);

  function toggleSubject(id: string) {
    setSelectedSubjects((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  }

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
      setWhatsapp(profile.whatsapp ?? "");
      if (profile.batch_year) setBatchYear(String(profile.batch_year));
    }
  }, [user, profile, loading, navigate, isOwnerAdmin]);

  async function handleSubmitStudent(e: React.FormEvent) {
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
        idCardUrl = (await uploadToB2("id-card", user.id, idFile)).ref;
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
        } as never)
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

  // دكتور أو معيد: من غير بطاقة جامعية، بس موبايل وواتساب واختيار المواد؛
  // بتتبعت طلب (staff_applications) للمراجعة بدل ما تتفعّل على طول.
  async function handleSubmitStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!fullName.trim() || !phone.trim() || !whatsapp.trim()) {
      toast.error("املأ الاسم ورقم الموبايل والواتساب");
      return;
    }
    if (selectedSubjects.length === 0) {
      toast.error("اختار مادة واحدة على الأقل");
      return;
    }
    setSubmitting(true);
    try {
      const { error: e1 } = await supabase.from("staff_applications").insert({
        user_id: user.id, requested_role: personRole, subject_ids: selectedSubjects,
        phone: phone.trim(), whatsapp: whatsapp.trim(),
      } as never);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("profiles").update({
        full_name: fullName.trim(), phone: phone.trim(), whatsapp: whatsapp.trim(),
        verification_status: "pending",
      } as never).eq("id", user.id);
      if (e2) throw e2;
      await refresh();
      toast.success("تم إرسال طلبك للمراجعة ✨");
      navigate({ to: "/pending" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(`حصلت مشكلة في الحفظ: ${message}`);
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
      <StarsBackground />
      <div className="relative z-10 mx-auto max-w-xl">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-foreground/75 hover:text-foreground">
          <ArrowLeft className="h-4 w-4 rotate-180" /> الرئيسية
        </Link>

        <div className="cosmic-card rounded-3xl p-8">
          <div className="text-center">
            <Logo size={64} className="mx-auto" />
            <h1 className="mt-3 font-display text-3xl">استكمال بياناتك</h1>
            <p className="mt-2 text-sm text-foreground/75">
              {personRole === "student" ? "عشان نأكد إنك طالب في كلية العلوم، محتاجين منك البيانات دي." : "عشان نأكد هويتك، محتاجين منك البيانات دي."}
            </p>
          </div>

          {!isAdmin && (
            <div className="mt-6 flex gap-2">
              {([["student", "طالب"], ["instructor", "دكتور"], ["assistant", "معيد"]] as [PersonRole, string][]).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setPersonRole(v)}
                  className={`flex-1 rounded-full border px-3 py-2 text-sm font-semibold transition ${personRole === v ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-accent"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {personRole === "student" ? (
            <form onSubmit={handleSubmitStudent} className="mt-8 space-y-5">
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
                  <span className="text-xs text-foreground/75">JPG / PNG</span>
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
          ) : (
            <form onSubmit={handleSubmitStaff} className="mt-8 space-y-5">
              <Field label="الاسم الكامل">
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="د. عبدالله محمد"
                  className="input"
                  required
                />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="رقم الموبايل">
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01xxxxxxxxx"
                    inputMode="tel"
                    className="input"
                    required
                  />
                </Field>
                <Field label="رقم الواتساب">
                  <input
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="01xxxxxxxxx"
                    inputMode="tel"
                    className="input"
                    required
                  />
                </Field>
              </div>

              <Field label={`المواد (${selectedSubjects.length} مختارة)`}>
                <input
                  value={subjQuery}
                  onChange={(e) => setSubjQuery(e.target.value)}
                  placeholder="دور على اسم أو كود المادة..."
                  className="input"
                />
                <div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto rounded-xl border border-border/60 p-2">
                  {filteredSubjects.length === 0 ? (
                    <p className="p-3 text-center text-xs text-foreground/60">مفيش مواد متاحة</p>
                  ) : filteredSubjects.map((sj) => {
                    const on = selectedSubjects.includes(sj.id);
                    return (
                      <button
                        key={sj.id}
                        type="button"
                        onClick={() => toggleSubject(sj.id)}
                        className={`block w-full truncate rounded-lg px-3 py-2 text-right text-sm ${on ? "bg-primary font-semibold text-primary-foreground" : "bg-background/40 hover:bg-background/70"}`}
                      >
                        {sj.name_ar} ({sj.code}) — سنة {sj.year}
                      </button>
                    );
                  })}
                </div>
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
          )}
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
