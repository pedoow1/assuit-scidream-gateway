import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, ShieldCheck, Eye, ArrowLeft, UserPlus, Trash2, ClipboardList } from "lucide-react";
import { useAuth, isAdminRole, type ProfileRow, type AppRole } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { StarsBackground } from "@/components/IntroSequence";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "لوحة الأدمن — Dream Team" }] }),
  component: AdminPage,
});

type Tab = "verification" | "admins" | "applications";

const OWNER_EMAIL = "abdalahkotp31@gmail.com";

function AdminPage() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("verification");

  const isOwnerAdmin = user?.email?.trim().toLowerCase() === OWNER_EMAIL;

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth" });
    else if (!isOwnerAdmin && !isAdminRole(roles)) navigate({ to: "/dashboard" });
  }, [user, roles, loading, navigate, isOwnerAdmin]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!isOwnerAdmin && !isAdminRole(roles)) return null;

  const isSuper = isOwnerAdmin || roles.includes("super_admin");

  return (
    <div className="relative min-h-screen">
      <StarsBackground />

      <header className="relative z-10 border-b border-border/60 bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="flex items-center gap-2 text-sm text-foreground/75 hover:text-foreground">
            <ArrowLeft className="h-4 w-4 rotate-180" /> الرجوع
          </Link>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-accent" />
            <div>
              <div className="font-display text-base font-semibold leading-tight">لوحة الأدمن</div>
              <div className="text-[10px] text-foreground/75">
                {isSuper ? "Super Admin · أنت الـ Big Boss" : "Admin"}
              </div>
            </div>
            <Logo size={36} />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 py-8">
        <div className="flex gap-2 border-b border-border">
          <TabBtn active={tab === "verification"} onClick={() => setTab("verification")}>
            مراجعة الطلاب
          </TabBtn>
          <TabBtn active={tab === "applications"} onClick={() => setTab("applications")}>
            طلبات اللجان
          </TabBtn>
          {isSuper && (
            <TabBtn active={tab === "admins"} onClick={() => setTab("admins")}>
              إدارة الأدمن
            </TabBtn>
          )}
        </div>

        <div className="mt-6">
          {tab === "verification" && <VerificationTab />}
          {tab === "applications" && <ApplicationsTab />}
          {tab === "admins" && isSuper && <AdminsTab />}
        </div>
      </main>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`relative -mb-px px-4 py-2.5 text-sm font-medium transition ${
        active ? "text-foreground" : "text-foreground/75 hover:text-foreground"
      }`}
    >
      {children}
      {active && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-gradient-cosmic" />}
    </button>
  );
}

/* ---------------- Verification tab ---------------- */

function VerificationTab() {
  const [pending, setPending] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<{ row: ProfileRow; url: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("verification_status", "pending")
      .order("updated_at", { ascending: false });
    if (error) toast.error("ما قدرناش نحمل القائمة");
    setPending((data ?? []) as ProfileRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function showCard(row: ProfileRow) {
    if (!row.id_card_url) { toast.error("لا توجد صورة"); return; }
    const { data, error } = await supabase.storage.from("id-cards").createSignedUrl(row.id_card_url, 600);
    if (error || !data) { toast.error("تعذر فتح الصورة"); return; }
    setPreview({ row, url: data.signedUrl });
  }

  async function approve(row: ProfileRow) {
    const { error } = await supabase
      .from("profiles")
      .update({ verification_status: "verified", is_verified: true, rejection_reason: null })
      .eq("id", row.id);
    if (error) return toast.error("فشل التأكيد");
    toast.success(`تم تأكيد ${row.full_name} ✨`);
    // optimistic remove أولاً عشان UI يتحدث فوراً
    setPending((p) => p.filter((r) => r.id !== row.id));
    setPreview(null);
    // بعدين load من DB عشان نتأكد
    await load();
  }

  async function reject(row: ProfileRow) {
    const reason = prompt("سبب الرفض (اختياري):") ?? "";
    const { error } = await supabase
      .from("profiles")
      .update({ verification_status: "rejected", is_verified: false, rejection_reason: reason || "بيانات غير صحيحة" })
      .eq("id", row.id);
    if (error) return toast.error("فشل الرفض");
    toast.success("تم رفض الطلب");
    setPending((p) => p.filter((r) => r.id !== row.id));
    setPreview(null);
    await load();
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>;
  }

  if (pending.length === 0) {
    return (
      <div className="cosmic-card rounded-2xl p-12 text-center">
        <div className="text-5xl">✨</div>
        <h3 className="mt-3 font-display text-xl">مفيش طلبات تستنى</h3>
        <p className="mt-1 text-sm text-foreground/75">كل الطلاب اتأكدوا — رايق</p>
      </div>
    );
  }

  return (
    <>
      <div className="cosmic-card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="border-b border-border bg-secondary/30 text-xs uppercase tracking-wider text-foreground/75">
              <tr>
                <th className="px-4 py-3">الاسم</th>
                <th className="px-4 py-3">الرقم الأكاديمي</th>
                <th className="px-4 py-3">التليفون</th>
                <th className="px-4 py-3">الإيميل</th>
                <th className="px-4 py-3">دفعة</th>
                <th className="px-4 py-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {pending.map((row) => (
                <tr key={row.id} className="hover:bg-secondary/20">
                  <td className="px-4 py-3 font-medium">{row.full_name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.academic_id}</td>
                  <td className="px-4 py-3 font-mono text-xs">{row.phone}</td>
                  <td className="px-4 py-3 text-xs text-foreground/75">{row.email}</td>
                  <td className="px-4 py-3 text-xs">{row.batch_year}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={() => showCard(row)} className="rounded-lg border border-border p-1.5 hover:border-accent" title="عرض البطاقة">
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => approve(row)} className="rounded-lg bg-green-600/15 p-1.5 text-green-700 hover:bg-green-600/25" title="تأكيد">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => reject(row)} className="rounded-lg bg-destructive/15 p-1.5 text-destructive hover:bg-destructive/25" title="رفض">
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setPreview(null)}>
          <div className="cosmic-card max-w-2xl rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="font-display text-lg">{preview.row.full_name}</div>
                <div className="text-xs text-foreground/75">{preview.row.academic_id}</div>
              </div>
              <button onClick={() => setPreview(null)} className="text-foreground/75 hover:text-foreground">✕</button>
            </div>
            <img src={preview.url} alt="بطاقة جامعية" className="max-h-[60vh] w-full rounded-lg object-contain" />
            <div className="mt-4 flex gap-2">
              <button onClick={() => approve(preview.row)} className="flex-1 rounded-full bg-green-600 py-2.5 text-sm font-semibold text-white">
                تأكيد ✓
              </button>
              <button onClick={() => reject(preview.row)} className="flex-1 rounded-full bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground">
                رفض ✗
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------------- Admins tab (super admin only) ---------------- */

type AdminRow = { user_id: string; role: "admin" | "super_admin"; profile: ProfileRow | null };
type UserRow = ProfileRow & { roles: AppRole[] };

function AdminsTab() {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [allUsers, setAllUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailInput, setEmailInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: roleRows }, { data: profs }] = await Promise.all([
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("profiles").select("*").order("updated_at", { ascending: false }),
    ]);
    const rolesByUser = new Map<string, AppRole[]>();
    (roleRows ?? []).forEach((r) => {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role as AppRole);
      rolesByUser.set(r.user_id, arr);
    });
    const profMap = new Map((profs ?? []).map((p) => [p.id, p as ProfileRow]));
    const admins: AdminRow[] = [];
    (roleRows ?? []).forEach((r) => {
      if (r.role === "admin" || r.role === "super_admin") {
        admins.push({ user_id: r.user_id, role: r.role as "admin" | "super_admin", profile: profMap.get(r.user_id) ?? null });
      }
    });
    const users: UserRow[] = (profs ?? []).map((p) => ({ ...(p as ProfileRow), roles: rolesByUser.get(p.id) ?? [] }));
    setRows(admins);
    setAllUsers(users);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function promoteById(userId: string) {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
    if (error) {
      if (error.code === "23505") toast.info("ده أدمن أصلاً");
      else toast.error("فشل التعيين");
    } else {
      toast.success("تم التعيين كأدمن ✨");
      load();
    }
  }

  async function grantAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setSubmitting(true);
    const email = emailInput.trim().toLowerCase();
    const { data: prof } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
    if (!prof) {
      toast.error("لا يوجد مستخدم بهذا الإيميل — لازم يسجل دخول الأول");
      setSubmitting(false);
      return;
    }
    await promoteById(prof.id);
    setEmailInput("");
    setSubmitting(false);
  }

  async function revoke(row: AdminRow) {
    if (row.role === "super_admin") { toast.error("لا يمكن إزالة الـ Super Admin"); return; }
    if (!confirm(`إزالة صلاحية الأدمن من ${row.profile?.full_name || row.profile?.email}؟`)) return;
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", row.user_id)
      .eq("role", "admin");
    if (error) toast.error("فشل الإزالة");
    else { toast.success("تمت الإزالة"); load(); }
  }

  const filtered = allUsers.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (u.email ?? "").toLowerCase().includes(q) ||
      (u.full_name ?? "").toLowerCase().includes(q) ||
      (u.academic_id ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="cosmic-card rounded-2xl p-6">
        <h3 className="font-display text-lg">تعيين أدمن بالإيميل</h3>
        <p className="mt-1 text-sm text-foreground/75">المستخدم لازم يسجل دخول بحساب جوجل أولاً.</p>
        <form onSubmit={grantAdmin} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="email@example.com"
            className="flex-1 rounded-xl border border-border bg-background/50 px-4 py-2.5 text-sm"
            required
          />
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            <UserPlus className="h-4 w-4" /> تعيين
          </button>
        </form>
      </div>

      <div className="cosmic-card overflow-hidden rounded-2xl">
        <div className="flex flex-col gap-2 border-b border-border bg-secondary/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs uppercase tracking-wider text-foreground/75">كل المستخدمين ({allUsers.length})</div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو الإيميل…"
            className="rounded-lg border border-border bg-background/50 px-3 py-1.5 text-xs"
          />
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>
        ) : (
          <ul className="divide-y divide-border/60">
            {filtered.map((u) => {
              const isSuper = u.roles.includes("super_admin") || u.email?.trim().toLowerCase() === OWNER_EMAIL;
              const isAdm = u.roles.includes("admin");
              return (
                <li key={u.id} className="flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{u.full_name ?? "—"}</div>
                    <div className="truncate text-xs text-foreground/75">{u.email}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] text-foreground/75">
                      {u.verification_status}
                    </span>
                    {isSuper && (
                      <span className="rounded-full bg-gradient-cosmic px-3 py-0.5 text-xs text-primary-foreground">Super Admin</span>
                    )}
                    {isAdm && !isSuper && (
                      <>
                        <span className="rounded-full bg-secondary px-3 py-0.5 text-xs">Admin</span>
                        <button
                          onClick={() => revoke({ user_id: u.id, role: "admin", profile: u })}
                          className="rounded-lg bg-destructive/15 p-1.5 text-destructive hover:bg-destructive/25"
                          title="إزالة"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                    {!isSuper && !isAdm && (
                      <button
                        onClick={() => promoteById(u.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90"
                      >
                        <UserPlus className="h-3.5 w-3.5" /> تعيين أدمن
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-foreground/75">لا يوجد مستخدمين مطابقين</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ---------------- Applications tab ---------------- */

type ApplicationRow = {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone: string;
  academic_year: string;
  committee: string;
  why_join: string;
  skills: string | null;
  status: string;
};

function ApplicationsTab() {
  const [apps, setApps] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("الكل");

  const committees = ["الكل", "PR Committee", "Media Committee", "HR Committee", "OC Committee", "AC Committee"];

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("committee_applications")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("ما قدرناش نحمل الطلبات");
    setApps((data ?? []) as ApplicationRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === "الكل" ? apps : apps.filter((a) => a.committee === filter);

  const handleStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("committee_applications")
      .update({ status })
      .eq("id", id);
    if (error) toast.error("حصل خطأ");
    else {
      toast.success(status === "accepted" ? "تم القبول ✅" : "تم الرفض");
      load();
    }
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <ClipboardList className="h-5 w-5 text-accent" />
        <h2 className="font-display text-lg">طلبات الانضمام للجان ({apps.length})</h2>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        {committees.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
              filter === c
                ? "bg-accent text-background border-accent"
                : "border-border text-foreground/70 hover:text-foreground"
            }`}
          >
            {c}
            {c !== "الكل" && (
              <span className="ml-1 opacity-60">
                ({apps.filter((a) => a.committee === c).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-foreground/50">لا توجد طلبات بعد</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((app) => (
            <div key={app.id} className="cosmic-card rounded-2xl p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-base">{app.full_name}</div>
                  <div className="text-xs text-accent font-medium mt-0.5">{app.committee}</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${
                  app.status === "accepted" ? "bg-green-500/20 text-green-400" :
                  app.status === "rejected" ? "bg-red-500/20 text-red-400" :
                  "bg-foreground/10 text-foreground/60"
                }`}>
                  {app.status === "accepted" ? "مقبول ✅" : app.status === "rejected" ? "مرفوض ❌" : "قيد المراجعة"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-foreground/70">
                <div><span className="text-foreground/40">الرقم الأكاديمي: </span>{app.email}</div>
                <div><span className="text-foreground/40">الواتساب: </span>{app.phone}</div>
                <div><span className="text-foreground/40">السنة: </span>{app.academic_year}</div>
                <div><span className="text-foreground/40">التاريخ: </span>{new Date(app.created_at).toLocaleDateString("ar-EG")}</div>
              </div>

              <div className="text-xs bg-background/40 rounded-xl p-3">
                <div className="text-foreground/50 mb-1 font-medium">سبب الانضمام:</div>
                <p className="text-foreground/80 leading-relaxed">{app.why_join}</p>
              </div>

              {app.skills && (
                <div className="text-xs bg-background/40 rounded-xl p-3">
                  <div className="text-foreground/50 mb-1 font-medium">المهارات:</div>
                  <p className="text-foreground/80">{app.skills}</p>
                </div>
              )}

              {app.status === "pending" && (
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => handleStatus(app.id, "accepted")}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-green-500/20 text-green-400 hover:bg-green-500/30 py-2 text-xs font-semibold transition"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> قبول
                  </button>
                  <button
                    onClick={() => handleStatus(app.id, "rejected")}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 py-2 text-xs font-semibold transition"
                  >
                    <XCircle className="h-3.5 w-3.5" /> رفض
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
