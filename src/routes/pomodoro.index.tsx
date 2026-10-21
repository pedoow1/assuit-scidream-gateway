import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, KeyRound, Loader2, Lock, Plus, Timer, Users, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { StarsBackground } from "@/components/IntroSequence";
import { cfgText } from "@/lib/pomodoro";

export const Route = createFileRoute("/pomodoro/")({
  head: () => ({ meta: [{ title: "غرف المذاكرة — Assuit SciDream" }] }),
  component: PomodoroRooms,
});

const db = supabase as any;
type Room = {
  id: string; name: string; subject: string | null; host_name: string; study_min: number; break_min: number;
  long_break_min: number; rounds_before_long: number; running: boolean; active_count: number; is_public: boolean;
};
const PRESETS = [
  { k: "classic", label: "كلاسيك 25/5", s: "25", b: "5", l: "15", r: "4" },
  { k: "mid", label: "45 / 10", s: "45", b: "10", l: "20", r: "3" },
  { k: "long", label: "50 / 10", s: "50", b: "10", l: "20", r: "3" },
  { k: "none", label: "من غير راحة", s: "25", b: "0", l: "0", r: "4" },
];
const EMPTY = { name: "", subject: "", s: "25", b: "5", l: "15", r: "4", anyone: false, isPublic: true };
const digits = (v: string) => v.replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 1632)).replace(/[^0-9]/g, "");
const input = "w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm focus:border-accent focus:outline-none";
const chip = (on: boolean) => `rounded-full border px-3 py-1 text-xs ${on ? "border-accent bg-accent/20 text-accent" : "border-border"}`;

function PomodoroRooms() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [busyList, setBusyList] = useState(true);
  const [q, setQ] = useState("");
  const qRef = useRef("");
  const [open, setOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState(EMPTY);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  const load = useCallback(async () => {
    const { data } = await db.rpc("pomo_rooms_list", { p_q: qRef.current.trim() || null });
    setRooms((data as Room[]) ?? []);
    setBusyList(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    qRef.current = q;
    const t = setTimeout(() => { void load(); }, 350);
    return () => clearTimeout(t);
  }, [q, user, load]);
  useEffect(() => {
    if (!user) return;
    const t = setInterval(() => { void load(); }, 10000);
    return () => clearInterval(t);
  }, [user, load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const s = Number(f.s), b = Number(f.b || 0), l = Number(f.l || 0), r = Number(f.r || 4);
    if (!f.name.trim()) return toast.error("اكتب اسم الغرفة");
    if (!(s >= 1 && s <= 180)) return toast.error("مدة المذاكرة من 1 لـ 180 دقيقة");
    if (b > 60 || l > 120) return toast.error("الراحة القصيرة لحد 60 دقيقة والطويلة لحد 120");
    if (!(r >= 1 && r <= 12)) return toast.error("عدد الجولات قبل الراحة الطويلة من 1 لـ 12");
    setBusy(true);
    const { data, error } = await db.rpc("pomo_create", {
      p_name: f.name.trim(), p_subject: f.subject.trim() || null, p_study: s, p_break: b, p_long: l, p_rounds: r,
      p_anyone: f.anyone, p_public: f.isPublic,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setOpen(false);
    setF(EMPTY);
    navigate({ to: "/pomodoro/$roomId", params: { roomId: data as string } });
  }

  async function joinByCode(e: React.FormEvent) {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (c.length < 4) return toast.error("اكتب كود الغرفة");
    setBusy(true);
    const { data, error } = await db.rpc("pomo_join_by_code", { p_code: c });
    setBusy(false);
    if (error) return toast.error(error.message);
    setCodeOpen(false);
    setCode("");
    navigate({ to: "/pomodoro/$roomId", params: { roomId: data as string } });
  }

  return (
    <div className="relative min-h-screen" dir="rtl">
      <StarsBackground />
      <header className="relative z-10 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm hover:text-accent">
            <ArrowRight className="h-4 w-4" /> الرئيسية
          </Link>
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-accent" />
            <h1 className="font-display text-xl font-semibold">غرف المذاكرة</h1>
          </div>
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 rounded-full bg-gradient-cosmic px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-rose">
            <Plus className="h-3.5 w-3.5" /> غرفة جديدة
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl space-y-3 px-6 py-8">
        <p className="text-xs text-foreground/65">ادخل أي غرفة وذاكر مع زمايلك بنفس التايمر، أو اعمل غرفتك بالأوقات اللي تناسبك.</p>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث باسم الغرفة أو المادة أو المضيف..." className={input} />
        <button onClick={() => setCodeOpen(true)} className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-xs hover:border-accent">
          <KeyRound className="h-3.5 w-3.5" /> عندي كود غرفة
        </button>

        {busyList ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
        ) : rooms.length === 0 ? (
          <p className="py-16 text-center text-sm text-foreground/75">{q.trim() ? "مفيش غرف بالاسم ده." : "مفيش غرف شغالة دلوقتي. اعمل أول غرفة!"}</p>
        ) : (
          <div className="grid gap-3 pt-2 sm:grid-cols-2">
            {rooms.map((r) => (
              <Link key={r.id} to="/pomodoro/$roomId" params={{ roomId: r.id }} className="cosmic-card block rounded-2xl p-5 transition hover:-translate-y-0.5 hover:shadow-glow">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs"><Users className="h-3.5 w-3.5 text-accent" /> {r.active_count}</span>
                  <div className="flex gap-1.5">
                    {!r.is_public && <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px]">خاصة</span>}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${r.running ? "bg-accent/20 text-accent" : "bg-secondary"}`}>{r.running ? "شغّالة" : "موقوفة"}</span>
                  </div>
                </div>
                <h3 className="mt-2 flex items-center gap-1.5 font-display text-lg">{!r.is_public && <Lock className="h-3.5 w-3.5 text-accent" />}{r.name}</h3>
                {r.subject && <p className="text-xs text-accent">{r.subject}</p>}
                <p className="mt-1 text-[11px] leading-5 text-foreground/65">{cfgText(r)}</p>
                <p className="text-[11px] text-foreground/65">المضيف: {r.host_name}</p>
              </Link>
            ))}
          </div>
        )}
      </main>

      {codeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur">
          <div className="cosmic-card w-full max-w-sm rounded-2xl bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl">دخول غرفة بكود</h2>
              <button onClick={() => !busy && setCodeOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={joinByCode} className="space-y-3">
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} placeholder="مثلًا K7M2QX" dir="ltr"
                className={`${input} text-center text-xl tracking-[0.4em]`} />
              <button disabled={busy} className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">دخول</button>
            </form>
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur">
          <div className="cosmic-card max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl">غرفة مذاكرة جديدة</h2>
              <button onClick={() => !busy && setOpen(false)}><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={create} className="space-y-3">
              <input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="اسم الغرفة (مثلًا: مذاكرة جيولوجيا)" maxLength={60} className={input} />
              <input value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} placeholder="المادة (اختياري)" maxLength={60} className={input} />

              <p className="text-xs font-semibold">مين يقدر يدخل؟</p>
              <div className="flex gap-2">
                <button type="button" className={chip(f.isPublic)} onClick={() => setF({ ...f, isPublic: true })}>عامة: أي حد يدخل</button>
                <button type="button" className={chip(!f.isPublic)} onClick={() => setF({ ...f, isPublic: false })}>خاصة بكود</button>
              </div>
              {!f.isPublic && <p className="text-[11px] leading-5 text-foreground/65">هتاخد كود من 6 حروف بعد الإنشاء، وشاركه مع اللي عايزهم يدخلوا. الغرفة مش هتظهر في القايمة لغيرهم.</p>}

              <p className="text-xs font-semibold">نظام الوقت</p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button key={p.k} type="button" className={chip(f.s === p.s && f.b === p.b && f.l === p.l && f.r === p.r)}
                    onClick={() => setF({ ...f, s: p.s, b: p.b, l: p.l, r: p.r })}>{p.label}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {([["s", "مذاكرة (دقيقة)"], ["b", "راحة قصيرة"], ["l", "راحة طويلة"], ["r", "جولات قبل الطويلة"]] as const).map(([k, label]) => (
                  <label key={k} className="block text-xs text-foreground/70">{label}
                    <input inputMode="numeric" value={f[k]} onChange={(e) => setF({ ...f, [k]: digits(e.target.value) })} className={`${input} mt-1 text-center`} />
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-foreground/60">اكتب 0 في الراحة لو مش عايز راحة.</p>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={f.anyone} onChange={(e) => setF({ ...f, anyone: e.target.checked })} />
                أي حد في الغرفة يقدر يشغّل ويوقف التايمر
              </label>
              <button disabled={busy} className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "إنشاء الغرفة"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
