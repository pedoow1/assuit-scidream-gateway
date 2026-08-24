import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, FlaskConical, Loader2, Send } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { StarsBackground } from "@/components/IntroSequence";
import { DEPARTMENT_NAME } from "@/lib/department";

export const Route = createFileRoute("/department/apply")({
  head: () => ({ meta: [{ title: `التقديم لقسم ${DEPARTMENT_NAME} — Assuit SciDream` }] }),
  component: ApplyPage,
});

const YEARS = ["الفرقة الأولى", "الفرقة الثانية", "الفرقة الثالثة", "الفرقة الرابعة"];

function ApplyPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    academic_id: "",
    academic_year: YEARS[0],
    notes: "",
  });

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);
  useEffect(() => {
    if (!profile || !user) return;
    setForm((f) => ({
      ...f,
      full_name: profile.full_name ?? "",
      email: profile.email ?? user.email ?? "",
      phone: profile.phone ?? "",
      academic_id: profile.academic_id ?? "",
    }));
  }, [profile, user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!form.full_name.trim() || !form.email.trim() || !form.phone.trim()) {
      toast.error("من فضلك اكمل البيانات الأساسية");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("department_applications").insert({
      user_id: user.id,
      department: DEPARTMENT_NAME,
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      academic_id: form.academic_id.trim() || null,
      academic_year: form.academic_year,
      notes: form.notes.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("تم إرسال طلبك، هيتراجع من المشرف الأكاديمي");
    navigate({ to: "/department" });
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen" dir="rtl">
      <StarsBackground />
      <header className="relative z-10 border-b border-border/60 bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
          <Link
            to="/department"
            className="flex items-center gap-2 text-sm text-foreground/75 hover:text-foreground"
          >
            <ArrowRight className="h-4 w-4" /> قسم {DEPARTMENT_NAME}
          </Link>
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-accent" />
            <h1 className="font-display text-lg font-semibold">طلب الانضمام</h1>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-2xl px-6 py-8">
        <p className="mb-6 text-sm text-foreground/75">
          البيانات هنا بتتبعت بشكل منفصل تمامًا عن باقي بياناتك في الموقع، وهيراجعها المشرف
          الأكاديمي للقسم قبل ما يوافق عليها.
        </p>
        <form onSubmit={submit} className="cosmic-card space-y-4 rounded-3xl p-6">
          <Field label="الاسم بالكامل">
            <input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm focus:border-accent focus:outline-none"
              required
            />
          </Field>
          <Field label="البريد الإلكتروني">
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm focus:border-accent focus:outline-none"
              required
            />
          </Field>
          <Field label="رقم الموبايل">
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm focus:border-accent focus:outline-none"
              required
            />
          </Field>
          <Field label="الرقم الأكاديمي (اختياري)">
            <input
              value={form.academic_id}
              onChange={(e) => setForm({ ...form, academic_id: e.target.value })}
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
          </Field>
          <Field label="الفرقة الدراسية">
            <select
              value={form.academic_year}
              onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm focus:border-accent focus:outline-none"
            >
              {YEARS.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </Field>
          <Field label="ملاحظات (اختياري)">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
          </Field>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-cosmic px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-rose disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            إرسال الطلب
          </button>
        </form>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-foreground/75">{label}</span>
      {children}
    </label>
  );
}
