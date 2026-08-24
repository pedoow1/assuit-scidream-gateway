import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  XCircle,
  Users,
  Clock,
  FileText,
  Eye,
  RefreshCcw,
} from "lucide-react";
import { useAuth, isDepartmentStaffRole } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { StarsBackground } from "@/components/IntroSequence";
import {
  DEPARTMENT_NAME,
  type DepartmentApplication,
  type DepartmentRegistration,
  type DepartmentReceipt,
} from "@/lib/department";

export const Route = createFileRoute("/department/advisor")({
  head: () => ({ meta: [{ title: `لوحة المشرف — قسم ${DEPARTMENT_NAME}` }] }),
  component: AdvisorPage,
});

type Tab = "stats" | "applications" | "registrations" | "receipts";

function AdvisorPage() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("stats");
  const isStaff = isDepartmentStaffRole(roles);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth" });
    else if (!isStaff) navigate({ to: "/department" });
  }, [loading, user, isStaff, navigate]);

  if (loading || !user || !isStaff) {
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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            to="/department"
            className="flex items-center gap-2 text-sm text-foreground/75 hover:text-foreground"
          >
            <ArrowRight className="h-4 w-4" /> قسم {DEPARTMENT_NAME}
          </Link>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-accent" />
            <h1 className="font-display text-lg font-semibold">لوحة المشرف الأكاديمي</h1>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 py-8">
        <div className="flex flex-wrap gap-2 border-b border-border">
          <TabBtn active={tab === "stats"} onClick={() => setTab("stats")}>
            إحصائيات
          </TabBtn>
          <TabBtn active={tab === "applications"} onClick={() => setTab("applications")}>
            طلبات الانضمام
          </TabBtn>
          <TabBtn active={tab === "registrations"} onClick={() => setTab("registrations")}>
            تسجيل المواد
          </TabBtn>
          <TabBtn active={tab === "receipts"} onClick={() => setTab("receipts")}>
            إيصالات الدفع
          </TabBtn>
        </div>
        <div className="mt-6">
          {tab === "stats" && <StatsTab />}
          {tab === "applications" && <ApplicationsTab />}
          {tab === "registrations" && <RegistrationsTab />}
          {tab === "receipts" && <ReceiptsTab />}
        </div>
      </main>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative -mb-px px-4 py-2.5 text-sm font-medium transition ${active ? "text-foreground" : "text-foreground/75 hover:text-foreground"}`}
    >
      {children}
      {active && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-gradient-cosmic" />}
    </button>
  );
}

/* ---------------- Stats ---------------- */

function StatsTab() {
  const [stats, setStats] = useState<{
    pendingApps: number;
    approvedMembers: number;
    pendingRegs: number;
    unconfirmedReceipts: number;
  } | null>(null);
  const [expiring, setExpiring] = useState(false);

  const load = useCallback(async () => {
    const [
      { count: pendingApps },
      { count: approvedMembers },
      { count: pendingRegs },
      { count: unconfirmedReceipts },
    ] = await Promise.all([
      supabase
        .from("department_applications")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("department_applications")
        .select("*", { count: "exact", head: true })
        .eq("status", "approved"),
      supabase
        .from("department_registrations")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending_advisor"),
      supabase
        .from("department_payment_receipts")
        .select("*", { count: "exact", head: true })
        .eq("status", "submitted"),
    ]);
    setStats({
      pendingApps: pendingApps ?? 0,
      approvedMembers: approvedMembers ?? 0,
      pendingRegs: pendingRegs ?? 0,
      unconfirmedReceipts: unconfirmedReceipts ?? 0,
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runExpiry() {
    setExpiring(true);
    const { data, error } = await supabase.rpc("expire_overdue_department_receipts");
    setExpiring(false);
    if (error) toast.error(error.message);
    else {
      toast.success(`اتشال ${data ?? 0} تسجيل متأخر`);
      void load();
    }
  }

  if (!stats)
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );

  const cards = [
    { label: "طلبات انضمام مستنية", value: stats.pendingApps, icon: Clock },
    { label: "طلاب مؤكدين في القسم", value: stats.approvedMembers, icon: Users },
    { label: "تسجيلات مواد مستنية", value: stats.pendingRegs, icon: FileText },
    { label: "إيصالات محتاجة مراجعة", value: stats.unconfirmedReceipts, icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="cosmic-card rounded-2xl p-5">
            <c.icon className="h-5 w-5 text-accent" />
            <div className="mt-2 font-display text-2xl">{c.value}</div>
            <div className="mt-1 text-xs text-foreground/75">{c.label}</div>
          </div>
        ))}
      </div>
      <div className="cosmic-card rounded-2xl p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-medium">تشييل المتأخرين في الإيصال</div>
            <div className="mt-1 text-xs text-foreground/75">
              بيشيل أي تسجيل عدّى عليه أسبوع من غير ما يتبعت إيصال، ويرجّع الطالب لطالب عادي.
            </div>
          </div>
          <button
            onClick={runExpiry}
            disabled={expiring}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground disabled:opacity-60"
          >
            {expiring ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCcw className="h-3.5 w-3.5" />
            )}
            تشغيل الفحص الآن
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Applications ---------------- */

function ApplicationsTab() {
  const [apps, setApps] = useState<DepartmentApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("department_applications")
      .select("*")
      .order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) toast.error("ما قدرناش نحمل الطلبات");
    setApps((data as DepartmentApplication[]) ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(id: string, status: "approved" | "rejected") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("department_applications")
      .update({ status, reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error("حصل خطأ");
    toast.success(status === "approved" ? "تم القبول ✅" : "تم الرفض");
    void load();
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${filter === f ? "border-accent bg-accent text-background" : "border-border text-foreground/70 hover:text-foreground"}`}
          >
            {{ pending: "مستنية", approved: "مقبولة", rejected: "مرفوضة", all: "الكل" }[f]}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-accent" />
        </div>
      ) : apps.length === 0 ? (
        <p className="py-12 text-center text-sm text-foreground/75">لا توجد طلبات.</p>
      ) : (
        <div className="cosmic-card overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="border-b border-border bg-secondary/30 text-xs uppercase tracking-wider text-foreground/75">
                <tr>
                  <th className="px-4 py-3">الاسم</th>
                  <th className="px-4 py-3">الفرقة</th>
                  <th className="px-4 py-3">التليفون</th>
                  <th className="px-4 py-3">الإيميل</th>
                  <th className="px-4 py-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {apps.map((a) => (
                  <tr key={a.id} className="hover:bg-secondary/20">
                    <td className="px-4 py-3 font-medium">{a.full_name}</td>
                    <td className="px-4 py-3 text-xs">{a.academic_year}</td>
                    <td className="px-4 py-3 font-mono text-xs">{a.phone}</td>
                    <td className="px-4 py-3 text-xs text-foreground/75">{a.email}</td>
                    <td className="px-4 py-3">
                      {a.status === "pending" ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setStatus(a.id, "approved")}
                            className="rounded-lg bg-green-600/15 p-1.5 text-green-700 hover:bg-green-600/25"
                            title="قبول"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setStatus(a.id, "rejected")}
                            className="rounded-lg bg-destructive/15 p-1.5 text-destructive hover:bg-destructive/25"
                            title="رفض"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="block text-center text-xs text-foreground/75">
                          {a.status === "approved" ? "مقبول" : "مرفوض"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Registrations ---------------- */

interface RegRow extends DepartmentRegistration {
  subjects: { name_ar: string; code: string } | null;
  profiles: { full_name: string | null; academic_id: string | null } | null;
}

function RegistrationsTab() {
  const [rows, setRows] = useState<RegRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("department_registrations")
      .select("*, subjects(name_ar, code), profiles(full_name, academic_id)")
      .eq("status", "pending_advisor")
      .order("created_at", { ascending: true });
    if (error) toast.error("ما قدرناش نحمل التسجيلات");
    setRows((data as unknown as RegRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, status: "approved" | "rejected") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("department_registrations")
      .update({ status, reviewed_by: user?.id ?? null, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error("حصل خطأ");
    toast.success(
      status === "approved" ? "اتوافق عليه — الطالب لازم يبعت الإيصال دلوقتي" : "اترفض",
    );
    void load();
  }

  if (loading)
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  if (rows.length === 0)
    return <p className="py-12 text-center text-sm text-foreground/75">مفيش تسجيلات مستنية.</p>;

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div
          key={r.id}
          className="cosmic-card flex flex-col gap-2 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div className="font-medium">
              {r.subjects?.name_ar}{" "}
              <span className="text-xs text-foreground/75">({r.subjects?.code})</span>
            </div>
            <div className="mt-1 text-xs text-foreground/75">
              {r.profiles?.full_name} · {r.profiles?.academic_id}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => decide(r.id, "approved")}
              className="rounded-lg bg-green-600/15 p-1.5 text-green-700 hover:bg-green-600/25"
              title="موافقة"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => decide(r.id, "rejected")}
              className="rounded-lg bg-destructive/15 p-1.5 text-destructive hover:bg-destructive/25"
              title="رفض"
            >
              <XCircle className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Receipts ---------------- */

interface ReceiptRow extends DepartmentReceipt {
  department_registrations: {
    subject_id: string;
    subjects: { name_ar: string; code: string } | null;
  } | null;
  profiles: { full_name: string | null } | null;
}

function ReceiptsTab() {
  const [rows, setRows] = useState<ReceiptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<{ url: string; row: ReceiptRow } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("department_payment_receipts")
      .select(
        "*, department_registrations(subject_id, subjects(name_ar, code)), profiles(full_name)",
      )
      .eq("status", "submitted")
      .order("uploaded_at", { ascending: true });
    if (error) toast.error("ما قدرناش نحمل الإيصالات");
    setRows((data as unknown as ReceiptRow[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function view(row: ReceiptRow) {
    const { data, error } = await supabase.storage
      .from("department-receipts")
      .createSignedUrl(row.file_url, 600);
    if (error || !data) return toast.error("تعذر فتح الإيصال");
    setPreview({ url: data.signedUrl, row });
  }

  async function decide(row: ReceiptRow, status: "confirmed" | "rejected") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error: e1 } = await supabase
      .from("department_payment_receipts")
      .update({ status, confirmed_by: user?.id ?? null, confirmed_at: new Date().toISOString() })
      .eq("id", row.id);
    const { error: e2 } = await supabase
      .from("department_registrations")
      .update({ status: status === "confirmed" ? "paid" : "rejected" })
      .eq("id", row.registration_id);
    if (e1 || e2) toast.error("حصل خطأ");
    else toast.success(status === "confirmed" ? "اتأكد الدفع ✅" : "اترفض الإيصال");
    setPreview(null);
    void load();
  }

  if (loading)
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  if (rows.length === 0)
    return (
      <p className="py-12 text-center text-sm text-foreground/75">مفيش إيصالات محتاجة مراجعة.</p>
    );

  return (
    <>
      <div className="space-y-2">
        {rows.map((r) => (
          <div
            key={r.id}
            className="cosmic-card flex flex-col gap-2 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="font-medium">
                {r.department_registrations?.subjects?.name_ar}{" "}
                <span className="text-xs text-foreground/75">
                  ({r.department_registrations?.subjects?.code})
                </span>
              </div>
              <div className="mt-1 text-xs text-foreground/75">
                {r.profiles?.full_name} · {new Date(r.uploaded_at).toLocaleDateString("ar-EG")}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => view(r)}
                className="rounded-lg border border-border p-1.5 hover:border-accent"
                title="عرض"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => decide(r, "confirmed")}
                className="rounded-lg bg-green-600/15 p-1.5 text-green-700 hover:bg-green-600/25"
                title="تأكيد"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => decide(r, "rejected")}
                className="rounded-lg bg-destructive/15 p-1.5 text-destructive hover:bg-destructive/25"
                title="رفض"
              >
                <XCircle className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="cosmic-card max-w-2xl rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="font-display text-lg">{preview.row.profiles?.full_name}</div>
              <button
                onClick={() => setPreview(null)}
                className="text-foreground/75 hover:text-foreground"
              >
                ✕
              </button>
            </div>
            {preview.url.match(/\.pdf($|\?)/i) ? (
              <a
                href={preview.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-accent underline"
              >
                فتح ملف PDF
              </a>
            ) : (
              <img
                src={preview.url}
                alt="إيصال"
                className="max-h-[60vh] w-full rounded-lg object-contain"
              />
            )}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => decide(preview.row, "confirmed")}
                className="flex-1 rounded-full bg-green-600 py-2.5 text-sm font-semibold text-white"
              >
                تأكيد ✓
              </button>
              <button
                onClick={() => decide(preview.row, "rejected")}
                className="flex-1 rounded-full bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground"
              >
                رفض ✗
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
