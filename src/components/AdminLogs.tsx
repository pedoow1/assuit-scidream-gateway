import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, ScrollText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
const PAGE = 40;

type Log = {
  id: number; created_at: string; actor_id: string | null; actor_name: string | null; actor_role: string | null;
  action: "INSERT" | "UPDATE" | "DELETE"; table_name: string; summary: string | null; changes: Record<string, any> | null;
};
type Actor = { actor_id: string; actor_name: string; actor_role: string; n: number };

const TABLES: Record<string, string> = {
  subjects: "المواد", folders: "الفولدرات", content_items: "محتوى المواد", announcements: "الإعلانات", quizzes: "الاختبارات",
  quiz_questions: "أسئلة الاختبارات", quiz_audience: "جمهور الاختبارات", user_roles: "الأدوار", profiles: "توثيق الطلبة",
  account_restrictions: "حظر / حذف الحسابات", app_settings: "إعدادات التطبيق", app_releases: "تحديثات التطبيق", groups: "الجروبات",
  department_registrations: "تسجيل الأقسام", department_applications: "طلبات الأقسام", department_grades: "درجات الأقسام",
  department_payment_receipts: "إيصالات الأقسام", committee_applications: "طلبات اللجان", group_rank_perms: "صلاحيات رتب الجروب",
};
const ACTIONS: Record<string, string> = { INSERT: "أضاف", UPDATE: "عدّل", DELETE: "حذف" };
const ACTION_TAG: Record<string, string> = { INSERT: "إضافة", UPDATE: "تعديل", DELETE: "حذف" };
const ROLES: Record<string, string> = { super_admin: "المالك", admin: "أدمن", department_advisor: "مرشد قسم", instructor: "مدرّس" };

const when = (iso: string) => new Date(iso).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" });
const short = (v: any) => (v === null || v === undefined || v === "" ? "(فاضي)" : String(typeof v === "object" ? JSON.stringify(v) : v).slice(0, 120));
const select = "rounded-lg border border-border bg-background/60 px-3 py-2 text-sm focus:border-accent focus:outline-none";

/** سجل أفعال الأدمنز: مين أضاف أو عدّل أو حذف إيه ومتى. للمالك بس. */
export function AdminLogs() {
  const [rows, setRows] = useState<Log[]>([]);
  const [actors, setActors] = useState<Actor[]>([]);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [actor, setActor] = useState("");
  const [table, setTable] = useState("");
  const [action, setAction] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const filters = useRef({ q, actor, table, action });
  filters.current = { q, actor, table, action };

  const fetchPage = useCallback(async (before: number | null) => {
    const f = filters.current;
    const { data, error } = await db.rpc("admin_logs_list", {
      p_limit: PAGE, p_before: before, p_actor: f.actor || null, p_table: f.table || null, p_action: f.action || null, p_q: f.q.trim() || null,
    });
    if (error) { setErr(error.message); return [] as Log[]; }
    setErr("");
    return (data as Log[]) ?? [];
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    const list = await fetchPage(null);
    setRows(list);
    setDone(list.length < PAGE);
    setLoading(false);
  }, [fetchPage]);

  useEffect(() => {
    void db.rpc("admin_logs_actors").then(({ data }: any) => setActors((data as Actor[]) ?? []));
  }, []);
  useEffect(() => {
    const t = setTimeout(() => { void reload(); }, 300);
    return () => clearTimeout(t);
  }, [q, actor, table, action, reload]);

  async function loadMore() {
    if (more || done || !rows.length) return;
    setMore(true);
    const list = await fetchPage(rows[rows.length - 1].id);
    setRows((r) => [...r, ...list]);
    setDone(list.length < PAGE);
    setMore(false);
  }

  return (
    <section className="cosmic-card space-y-3 rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <button onClick={() => void reload()} className="text-xs text-accent hover:underline">تحديث</button>
        <h3 className="flex items-center gap-2 font-display text-lg"><ScrollText className="h-5 w-5 text-accent" /> Logs</h3>
      </div>
      <p className="text-xs leading-6 text-foreground/65">كل اللي الأدمنز عملوه: مين أضاف أو عدّل أو حذف إيه ومتى.</p>

      <div className="grid gap-2 sm:grid-cols-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث في السجل (اسم أو عنوان)..." className={`${select} sm:col-span-2`} />
        <select value={actor} onChange={(e) => setActor(e.target.value)} className={select}>
          <option value="">كل الأدمنز</option>
          {actors.map((a) => <option key={a.actor_id} value={a.actor_id}>{a.actor_name} ({a.n})</option>)}
        </select>
        <select value={table} onChange={(e) => setTable(e.target.value)} className={select}>
          <option value="">كل الأنواع</option>
          {Object.entries(TABLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={action} onChange={(e) => setAction(e.target.value)} className={select}>
          <option value="">كل الأفعال</option>
          {Object.entries(ACTION_TAG).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {err && <p className="text-xs text-destructive">{err}</p>}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-foreground/65">{err ? "مش قادر أحمّل السجل." : "مفيش سجلات بالفلتر ده لسه."}</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const isOpen = open === r.id;
            return (
              <button key={r.id} onClick={() => setOpen(isOpen ? null : r.id)} className="block w-full rounded-xl border border-border/60 bg-card/40 p-3 text-right hover:border-accent/50">
                <div className="flex items-center justify-between text-[11px] text-foreground/55">
                  <span>{when(r.created_at)}</span>
                  <span className={`rounded-full px-2 py-0.5 ${r.action === "DELETE" ? "bg-secondary" : "bg-accent/15 text-accent"}`}>{ACTION_TAG[r.action]}</span>
                </div>
                <p className="mt-1.5 text-sm leading-7">
                  <b className="text-accent">{r.actor_name ?? "غير معروف"}</b>
                  {r.actor_role && <span className="text-xs text-foreground/60"> ({ROLES[r.actor_role] ?? r.actor_role})</span>}
                  {` ${ACTIONS[r.action]} في `}
                  <b className="text-accent">{TABLES[r.table_name] ?? r.table_name}</b>
                </p>
                {r.summary && <p className="text-sm font-medium">{r.summary}</p>}
                {isOpen && r.changes && (
                  <div className="mt-2 space-y-1 border-t border-border/60 pt-2 text-xs text-foreground/65">
                    {Object.entries(r.changes).slice(0, 14).map(([k, v]) => (
                      <div key={k} className="break-words">
                        <span dir="ltr">{k}</span>:{" "}
                        {r.action === "UPDATE" && v && typeof v === "object" && "to" in v ? `${short(v.from)}  ←  ${short(v.to)}` : short(v)}
                      </div>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
          {!done && (
            <button onClick={() => void loadMore()} disabled={more} className="w-full rounded-full border border-border py-2 text-sm hover:border-accent disabled:opacity-60">
              {more ? "جاري التحميل..." : "عرض المزيد"}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
