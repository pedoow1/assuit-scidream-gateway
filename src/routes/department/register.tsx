import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Loader2,
  Upload,
  FlaskConical,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { StarsBackground } from "@/components/IntroSequence";
import {
  DEPARTMENT_NAME,
  REGISTRATION_STATUS_LABEL,
  MAX_PRIORITY_EDITS,
  receiptDueDate,
  isReceiptOverdue,
  type DepartmentApplication,
  type DepartmentRegistration,
} from "@/lib/department";

export const Route = createFileRoute("/department/register")({
  head: () => ({ meta: [{ title: `تسجيل المواد — قسم ${DEPARTMENT_NAME}` }] }),
  component: RegisterPage,
});

interface Subject {
  id: string;
  code: string;
  name_ar: string;
  credit_hours: number | null;
  instructor_name: string | null;
  prerequisite_codes: string[];
}

function RegisterPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [app, setApp] = useState<DepartmentApplication | null | undefined>(undefined);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [regs, setRegs] = useState<DepartmentRegistration[]>([]);
  const [busy, setBusy] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const load = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    const [{ data: appData }, { data: subjData }, { data: regData }] = await Promise.all([
      supabase
        .from("department_applications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("subjects")
        .select("id, code, name_ar, credit_hours, instructor_name, prerequisite_codes")
        .eq("department", DEPARTMENT_NAME)
        .order("year")
        .order("name_ar"),
      supabase
        .from("department_registrations")
        .select("*")
        .eq("student_id", user.id)
        .order("priority"),
    ]);
    setApp((appData as DepartmentApplication) ?? null);
    setSubjects((subjData as Subject[]) ?? []);
    setRegs((regData as DepartmentRegistration[]) ?? []);
    setBusy(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const registeredSubjectIds = useMemo(() => new Set(regs.map((r) => r.subject_id)), [regs]);
  const available = subjects.filter((s) => !registeredSubjectIds.has(s.id));

  async function registerSubject(subjectId: string) {
    if (!user) return;
    const nextPriority = (regs.length ? Math.max(...regs.map((r) => r.priority)) : 0) + 1;
    const { error } = await supabase.from("department_registrations").insert({
      student_id: user.id,
      subject_id: subjectId,
      priority: nextPriority,
    });
    if (error) {
      toast.error(
        error.message.includes("row-level security")
          ? "لازم يكون طلب الانضمام للقسم متأكد الأول"
          : error.message,
      );
      return;
    }
    toast.success("اتسجلت، مستنية موافقة المشرف");
    void load();
  }

  async function move(reg: DepartmentRegistration, dir: -1 | 1) {
    const sorted = [...regs].sort((a, b) => a.priority - b.priority);
    const idx = sorted.findIndex((r) => r.id === reg.id);
    const swapWith = sorted[idx + dir];
    if (!swapWith) return;
    if (reg.priority_edit_count >= MAX_PRIORITY_EDITS) {
      toast.error("وصلت للحد الأقصى لعدد مرات تعديل الترتيب");
      return;
    }
    const { error: e1 } = await supabase
      .from("department_registrations")
      .update({ priority: swapWith.priority })
      .eq("id", reg.id);
    const { error: e2 } = !e1
      ? await supabase
          .from("department_registrations")
          .update({ priority: reg.priority })
          .eq("id", swapWith.id)
      : { error: null };
    if (e1 || e2) toast.error((e1 || e2)?.message ?? "حصل خطأ");
    void load();
  }

  async function uploadReceipt(reg: DepartmentRegistration, file: File) {
    if (!user) return;
    setUploading(reg.id);
    const path = `${user.id}/${reg.id}-${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("department-receipts").upload(path, file);
    if (upErr) {
      toast.error(upErr.message);
      setUploading(null);
      return;
    }
    const { error: insErr } = await supabase.from("department_payment_receipts").insert({
      registration_id: reg.id,
      student_id: user.id,
      file_url: path,
    });
    if (insErr) {
      toast.error(insErr.message);
      setUploading(null);
      return;
    }
    await supabase
      .from("department_registrations")
      .update({ status: "needs_receipt" })
      .eq("id", reg.id);
    toast.success("تم رفع الإيصال، في انتظار تأكيد المشرف");
    setUploading(null);
    void load();
  }

  if (loading || !user || app === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (app?.status !== "approved") {
    return (
      <div className="relative min-h-screen" dir="rtl">
        <StarsBackground />
        <main className="relative z-10 mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
          <FlaskConical className="h-10 w-10 text-accent" />
          <h1 className="mt-4 font-display text-xl">لازم تكون طالب مؤكد في القسم الأول</h1>
          <p className="mt-2 text-sm text-foreground/75">
            {app?.status === "pending"
              ? "طلب انضمامك لسه قيد المراجعة."
              : "قدّم طلب الانضمام للقسم الأول."}
          </p>
          <Link
            to="/department"
            className="mt-6 rounded-full bg-gradient-cosmic px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-rose"
          >
            الرجوع لصفحة القسم
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen" dir="rtl">
      <StarsBackground />
      <header className="relative z-10 border-b border-border/60 bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link
            to="/department"
            className="flex items-center gap-2 text-sm text-foreground/75 hover:text-foreground"
          >
            <ArrowRight className="h-4 w-4" /> قسم {DEPARTMENT_NAME}
          </Link>
          <h1 className="font-display text-lg font-semibold">تسجيل المواد</h1>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-6 py-8 space-y-8">
        {busy ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : (
          <>
            <section>
              <h2 className="mb-3 font-display text-lg">موادي المسجلة ({regs.length})</h2>
              {regs.length === 0 ? (
                <p className="text-sm text-foreground/75">لسه معندكش مواد مسجلة.</p>
              ) : (
                <div className="space-y-2">
                  {[...regs]
                    .sort((a, b) => a.priority - b.priority)
                    .map((r) => {
                      const subj = subjects.find((s) => s.id === r.subject_id);
                      const due = receiptDueDate(r.created_at);
                      const overdue =
                        (r.status === "approved" || r.status === "needs_receipt") &&
                        isReceiptOverdue(r.created_at);
                      return (
                        <div
                          key={r.id}
                          className="cosmic-card flex flex-col gap-2 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <div className="font-medium">
                              {subj?.name_ar ?? "—"}{" "}
                              <span className="text-xs text-foreground/75">({subj?.code})</span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-foreground/75">
                              <StatusBadge status={r.status} />
                              {(r.status === "approved" || r.status === "needs_receipt") && (
                                <span
                                  className={`inline-flex items-center gap-1 ${overdue ? "text-destructive" : ""}`}
                                >
                                  <Clock className="h-3 w-3" /> آخر ميعاد للإيصال:{" "}
                                  {due.toLocaleDateString("ar-EG")}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {r.status === "approved" && (
                              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-gradient-cosmic px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-rose">
                                {uploading === r.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Upload className="h-3.5 w-3.5" />
                                )}
                                رفع الإيصال
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  className="hidden"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) void uploadReceipt(r, f);
                                  }}
                                />
                              </label>
                            )}
                            <button
                              onClick={() => move(r, -1)}
                              disabled={r.priority_edit_count >= MAX_PRIORITY_EDITS}
                              className="rounded-lg border border-border p-1.5 hover:border-accent disabled:opacity-40"
                              title="لأعلى"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => move(r, 1)}
                              disabled={r.priority_edit_count >= MAX_PRIORITY_EDITS}
                              className="rounded-lg border border-border p-1.5 hover:border-accent disabled:opacity-40"
                              title="لأسفل"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  <p className="text-[11px] text-foreground/75">
                    تقدر تعدل ترتيب أولوياتك حتى {MAX_PRIORITY_EDITS} مرات بس.
                  </p>
                </div>
              )}
            </section>

            <section>
              <h2 className="mb-3 font-display text-lg">المواد المتاحة</h2>
              {available.length === 0 ? (
                <p className="text-sm text-foreground/75">مفيش مواد متاحة تانية دلوقتي.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {available.map((s) => (
                    <div key={s.id} className="cosmic-card rounded-2xl p-4">
                      <div className="font-medium">
                        {s.name_ar} <span className="text-xs text-foreground/75">({s.code})</span>
                      </div>
                      <div className="mt-1 space-y-0.5 text-xs text-foreground/75">
                        {s.instructor_name && <div>الدكتور: {s.instructor_name}</div>}
                        {s.credit_hours != null && <div>عدد الساعات: {s.credit_hours}</div>}
                        {s.prerequisite_codes?.length > 0 && (
                          <div>متطلب سابق: {s.prerequisite_codes.join("، ")}</div>
                        )}
                      </div>
                      <button
                        onClick={() => registerSubject(s.id)}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> تسجيل
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: DepartmentRegistration["status"] }) {
  const color =
    status === "paid"
      ? "bg-green-600/15 text-green-700"
      : status === "rejected" || status === "expired"
        ? "bg-destructive/15 text-destructive"
        : "bg-secondary text-foreground/75";
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] ${color}`}>
      {REGISTRATION_STATUS_LABEL[status]}
    </span>
  );
}
