import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Loader2,
  Search,
  Ban,
  Trash2,
  RotateCcw,
  Send,
  Download,
  CreditCard,
  ShieldAlert,
  UploadCloud,
  Radar,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// New tables/RPCs are not in the generated types yet.
const db = supabase as any;

const PAGE = 30;

type Restriction = { user_id: string; status: "banned" | "deleted"; reason: string | null; created_at: string } | null;
type Dossier = {
  profile: Record<string, any> & { id: string; full_name: string | null; avatar_url: string | null; id_card_url: string | null };
  roles: string[];
  restriction: Restriction;
  groups_count: number;
};

const FIELD_LABELS: Record<string, string> = {
  id: "المعرّف",
  email: "الإيميل",
  full_name: "الاسم",
  academic_id: "الرقم الأكاديمي",
  phone: "التليفون",
  is_verified: "موثّق",
  verification_status: "حالة التوثيق",
  rejection_reason: "سبب الرفض",
  batch_year: "الدفعة",
  created_at: "تاريخ التسجيل",
  updated_at: "آخر تعديل",
  display_title: "اللقب",
  bio: "النبذة",
  dm_privacy: "خصوصية الخاص",
  last_seen_at: "آخر ظهور",
};

function fmt(k: string, v: any) {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "نعم" : "لا";
  if (k.endsWith("_at") && typeof v === "string") return new Date(v).toLocaleString("ar-EG");
  return String(v);
}

export function BigBossPanel() {
  return (
    <div className="space-y-8">
      <UploadSwitches />
      <IntelAgent />
    </div>
  );
}

/* ---------------- Global upload switches ---------------- */

function UploadSwitches() {
  const [groups, setGroups] = useState<boolean | null>(null);
  const [dm, setDm] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await db.from("app_settings").select("*").eq("id", 1).maybeSingle();
    if (error) return toast.error(error.message);
    setGroups(data?.allow_group_uploads ?? true);
    setDm(data?.allow_dm_uploads ?? true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(g: boolean, d: boolean) {
    setSaving(true);
    const { error } = await db.rpc("admin_set_upload_settings", { p_groups: g, p_dm: d });
    setSaving(false);
    if (error) return toast.error(error.message);
    setGroups(g);
    setDm(d);
    toast.success("اتحفظت إعدادات رفع الملفات");
  }

  const loading = groups === null || dm === null;

  return (
    <section className="cosmic-card rounded-2xl p-5">
      <div className="mb-4 flex items-center gap-2 font-semibold">
        <UploadCloud className="h-5 w-5 text-accent" /> رفع الملفات (الموقع والتطبيق)
      </div>
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle label="رفع الملفات في الجروبات" on={groups!} disabled={saving} onChange={(v) => save(v, dm!)} />
          <Toggle label="رفع الملفات في الخاص" on={dm!} disabled={saving} onChange={(v) => save(groups!, v)} />
        </div>
      )}
      <p className="mt-3 text-xs text-foreground/70">
        لو قفلتها، محدش غيرك يقدر يرفع. ولو فتحتها، كل جروب له إعداداته ورتبه الخاصة.
      </p>
    </section>
  );
}

function Toggle({
  label,
  on,
  onChange,
  disabled,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={() => onChange(!on)}
      className="flex items-center justify-between rounded-xl border border-border bg-background/40 px-4 py-3 text-sm disabled:opacity-60"
    >
      <span>{label}</span>
      <span
        className={`rounded-full px-3 py-0.5 text-xs font-semibold ${
          on ? "bg-emerald-500/20 text-emerald-300" : "bg-destructive/20 text-destructive"
        }`}
      >
        {on ? "شغّال" : "مقفول"}
      </span>
    </button>
  );
}

/* ---------------- Intelligence agent ---------------- */

function IntelAgent() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Dossier[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [whisperTo, setWhisperTo] = useState<Dossier | null>(null);
  const offsetRef = useRef(0);
  const queryRef = useRef("");
  const sentinel = useRef<HTMLDivElement | null>(null);
  const busy = useRef(false);

  const fetchPage = useCallback(async (reset: boolean) => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    if (reset) {
      offsetRef.current = 0;
      setDone(false);
    }
    const { data, error } = await db.rpc("admin_list_users", {
      p_search: queryRef.current || null,
      p_limit: PAGE,
      p_offset: offsetRef.current,
    });
    busy.current = false;
    setLoading(false);
    if (error) return toast.error(error.message);
    const list = (data ?? []) as Dossier[];
    offsetRef.current += list.length;
    if (list.length < PAGE) setDone(true);
    setRows((prev) => (reset ? list : [...prev, ...list]));
  }, []);

  // debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      queryRef.current = q.trim();
      fetchPage(true);
    }, 350);
    return () => clearTimeout(t);
  }, [q, fetchPage]);

  // infinite scroll
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !done && !busy.current && rows.length > 0) fetchPage(false);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [done, rows.length, fetchPage]);

  function patchRestriction(id: string, restriction: Restriction) {
    setRows((prev) => prev.map((r) => (r.profile.id === id ? { ...r, restriction } : r)));
  }

  async function setStatus(r: Dossier, status: "banned" | "deleted") {
    const name = r.profile.full_name ?? "المستخدم";
    const reason =
      status === "banned"
        ? prompt(`سبب حظر ${name} (اختياري):`, "")
        : confirm(`حذف حساب ${name} من الموقع؟ تقدر ترجّعه بعدين.`)
          ? ""
          : null;
    if (reason === null) return;
    const { error } = await db.rpc("admin_set_account_status", {
      p_user: r.profile.id,
      p_status: status,
      p_reason: reason || null,
    });
    if (error) return toast.error(error.message);
    patchRestriction(r.profile.id, {
      user_id: r.profile.id,
      status,
      reason: reason || null,
      created_at: new Date().toISOString(),
    });
    toast.success(status === "banned" ? "اتحظر" : "اتحذف");
  }

  async function restore(r: Dossier) {
    const { error } = await db.rpc("admin_restore_account", { p_user: r.profile.id });
    if (error) return toast.error(error.message);
    patchRestriction(r.profile.id, null);
    toast.success("اتسترجع الحساب");
  }

  async function downloadUrl(url: string, filename: string) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, "_blank");
    }
  }

  async function openIdCard(r: Dossier) {
    const path = r.profile.id_card_url;
    if (!path) return toast.error("مفيش بطاقة مرفوعة");
    const { data, error } = await supabase.storage.from("id-cards").createSignedUrl(path, 600);
    if (error || !data) return toast.error(error?.message ?? "تعذّر فتح البطاقة");
    window.open(data.signedUrl, "_blank");
  }

  return (
    <section className="cosmic-card overflow-hidden rounded-2xl">
      <div className="flex flex-col gap-3 border-b border-border bg-secondary/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 font-semibold">
          <Radar className="h-5 w-5 text-accent" /> عميل المخابرات
        </div>
        <div className="relative">
          <Search className="absolute right-2.5 top-2 h-4 w-4 text-foreground/60" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="اسم / رقم أكاديمي / إيميل / تليفون"
            className="w-full rounded-lg border border-border bg-background/50 py-1.5 pr-8 pl-3 text-xs sm:w-72"
          />
        </div>
      </div>

      <ul className="divide-y divide-border/60">
        {rows.map((r) => {
          const p = r.profile;
          const isOwner = r.roles.includes("super_admin");
          return (
            <li key={p.id} className="space-y-3 px-4 py-4 text-sm">
              <div className="flex items-start gap-3">
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-lg">
                    {(p.full_name ?? "?").slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">
                    {p.display_title ? `${p.display_title} ` : ""}
                    {p.full_name ?? "—"}
                  </div>
                  <div className="truncate text-xs text-foreground/70">{p.email}</div>
                  <div className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
                    {r.roles.map((role) => (
                      <span key={role} className="rounded-full bg-secondary px-2 py-0.5">
                        {role}
                      </span>
                    ))}
                    <span className="rounded-full bg-secondary px-2 py-0.5">{r.groups_count} جروب</span>
                    {r.restriction && (
                      <span className="rounded-full bg-destructive/20 px-2 py-0.5 text-destructive">
                        {r.restriction.status === "banned" ? "محظور" : "محذوف"}
                        {r.restriction.reason ? ` — ${r.restriction.reason}` : ""}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                {Object.entries(p)
                  .filter(([k]) => k !== "avatar_url" && k !== "id_card_url")
                  .map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2 border-b border-border/30 py-0.5">
                      <dt className="text-foreground/60">{FIELD_LABELS[k] ?? k}</dt>
                      <dd className="break-all text-left">{fmt(k, v)}</dd>
                    </div>
                  ))}
              </dl>

              <div className="flex flex-wrap gap-2">
                {p.avatar_url && (
                  <Btn onClick={() => downloadUrl(p.avatar_url!, `${p.full_name ?? p.id}.jpg`)}>
                    <Download className="h-3.5 w-3.5" /> تنزيل الصورة
                  </Btn>
                )}
                {p.id_card_url && (
                  <Btn onClick={() => openIdCard(r)}>
                    <CreditCard className="h-3.5 w-3.5" /> البطاقة
                  </Btn>
                )}
                <Btn onClick={() => setWhisperTo(r)}>
                  <Send className="h-3.5 w-3.5" /> همس
                </Btn>
                {!isOwner && (
                  <>
                    {r.restriction ? (
                      <Btn onClick={() => restore(r)}>
                        <RotateCcw className="h-3.5 w-3.5" /> استرجاع
                      </Btn>
                    ) : (
                      <>
                        <Btn onClick={() => setStatus(r, "banned")} danger>
                          <Ban className="h-3.5 w-3.5" /> حظر
                        </Btn>
                        <Btn onClick={() => setStatus(r, "deleted")} danger>
                          <Trash2 className="h-3.5 w-3.5" /> طرد وحذف
                        </Btn>
                      </>
                    )}
                  </>
                )}
              </div>
            </li>
          );
        })}
        {!loading && rows.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-foreground/70">مفيش نتائج</li>
        )}
      </ul>

      <div ref={sentinel} className="flex h-12 items-center justify-center">
        {loading && <Loader2 className="h-5 w-5 animate-spin text-accent" />}
        {done && rows.length > 0 && <span className="text-xs text-foreground/50">خلص</span>}
      </div>

      {whisperTo && <WhisperDialog target={whisperTo} onClose={() => setWhisperTo(null)} />}
    </section>
  );
}

function Btn({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-semibold ${
        danger
          ? "bg-destructive/15 text-destructive hover:bg-destructive/25"
          : "border border-border hover:border-accent"
      }`}
    >
      {children}
    </button>
  );
}

/* ---------------- Whisper ---------------- */

function WhisperDialog({ target, onClose }: { target: Dossier; onClose: () => void }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    const { error } = await db.rpc("send_whisper", { p_to: target.profile.id, p_body: body });
    setSending(false);
    if (error) return toast.error(error.message);
    toast.success("اتبعت الهمس");
    setText("");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="cosmic-card w-full max-w-md space-y-3 rounded-2xl bg-background p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldAlert className="h-4 w-4 text-accent" /> همس إلى {target.profile.full_name ?? "المستخدم"}
          </div>
          <button onClick={onClose}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          autoFocus
          placeholder="اكتب الهمس… هيظهر عنده فورًا وعنده بس"
          className="w-full rounded-xl border border-border bg-background/50 p-3 text-sm"
        />
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} إرسال
        </button>
      </div>
    </div>
  );
}
