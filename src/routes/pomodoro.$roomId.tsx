import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, KeyRound, Loader2, Lock, Pause, Play, RotateCcw, Send, SkipForward, Timer, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { mu, useB2Urls } from "@/lib/b2";
import { StarsBackground } from "@/components/IntroSequence";
import { cfgText, fmtClock, phaseAt, PHASE_LABEL, type PhaseKind } from "@/lib/pomodoro";

export const Route = createFileRoute("/pomodoro/$roomId")({
  head: () => ({ meta: [{ title: "غرفة مذاكرة — Assuit SciDream" }] }),
  component: PomodoroRoom,
});

const db = supabase as any;
const SIZE = 250;
const STROKE = 12;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;
const PHASE_COLOR: Record<PhaseKind, string> = { study: "#F9AD26", break: "#5DCAA5", long: "#AB79F5" };

type Member = { user_id: string; name: string; avatar_url: string | null; topic: string | null };
type Msg = { id: string; user_id: string; name: string; avatar_url: string | null; body: string; created_at: string };

function Avatar({ url, name, size = 32 }: { url: string | null; name: string; size?: number }) {
  const src = url ? mu(url) : "";
  return src ? (
    <img src={src} alt={name} style={{ width: size, height: size }} className="shrink-0 rounded-full border border-border object-cover" />
  ) : (
    <div style={{ width: size, height: size }} className="flex shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-xs font-bold">
      {(name || "?").trim().charAt(0)}
    </div>
  );
}

/** نغمة قصيرة لما المرحلة تتغيّر (بتشتغل بعد أول ضغطة على الصفحة) */
function beep() {
  try {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    const ctx = new AC();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    o.start(); o.stop(ctx.currentTime + 0.65);
  } catch { /* مش مشكلة */ }
}

function PomodoroRoom() {
  useB2Urls();
  const { roomId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [st, setSt] = useState<any>(null);
  const [gone, setGone] = useState(false);
  const [goneMsg, setGoneMsg] = useState("");
  const [now, setNow] = useState(Date.now());
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"timer" | "chat">("timer");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const offset = useRef(0);
  const lastKey = useRef<string | null>(null);
  const seenAt = useRef("");
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  const load = useCallback(async () => {
    const { data, error } = await db.rpc("pomo_state", { p_room: roomId });
    if (error) return;
    if (!data) { setGone(true); return; }
    offset.current = new Date(data.server_now).getTime() - Date.now(); // فرق ساعة جهازك عن ساعة السيرفر
    setSt(data);
    if (data.room.ended_at) setGone(true);
  }, [roomId]);

  const loadMsgs = useCallback(async () => {
    const { data } = await db.rpc("pomo_messages_list", { p_room: roomId, p_limit: 80 });
    if (Array.isArray(data)) setMsgs(data as Msg[]);
  }, [roomId]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    void (async () => {
      const { error } = await db.rpc("pomo_join", { p_room: roomId, p_topic: null });
      if (error) { setGoneMsg(error.message); setGone(true); return; }
      if (alive) { await load(); await loadMsgs(); }
    })();
    const hb = setInterval(() => { void db.rpc("pomo_heartbeat", { p_room: roomId }); }, 25000);
    const poll = setInterval(() => { void load(); void loadMsgs(); }, 5000);
    const tick = setInterval(() => setNow(Date.now()), 500);
    const ch = supabase.channel(`pomo:${roomId}`)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "pomo_rooms", filter: `id=eq.${roomId}` }, () => { void load(); })
      .on("postgres_changes" as any, { event: "INSERT", schema: "public", table: "pomo_messages", filter: `room_id=eq.${roomId}` }, () => { void loadMsgs(); })
      .subscribe();
    const onVis = () => { if (!document.hidden) { void db.rpc("pomo_heartbeat", { p_room: roomId }); void load(); } };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      clearInterval(hb); clearInterval(poll); clearInterval(tick);
      void supabase.removeChannel(ch);
      document.removeEventListener("visibilitychange", onVis);
      void db.rpc("pomo_leave", { p_room: roomId });
      document.title = "Assuit SciDream";
    };
  }, [user, roomId, load, loadMsgs]);

  const room = st?.room;
  const cfg = room ? { study: room.study_min, brk: room.break_min, long: room.long_break_min, rounds: room.rounds_before_long } : null;
  const running = !!room?.running_since;
  const srvNow = now + offset.current;
  const elapsed = room ? Number(room.base_ms) + (running ? srvNow - new Date(room.running_since).getTime() : 0) : 0;
  const phase = cfg ? phaseAt(cfg, elapsed) : null;
  const key = phase && running ? `${phase.kind}-${phase.round}` : null;

  // تنبيه لما المرحلة تتغيّر: نغمة + اهتزاز + إشعار المتصفح لو التاب مش قدامك
  useEffect(() => {
    if (key && lastKey.current && lastKey.current !== key && phase) {
      beep();
      try { navigator.vibrate?.([300, 150, 300]); } catch { /* مش مشكلة */ }
      const msg = phase.kind === "study" ? "يلا نذاكر 📚" : "وقت الراحة ☕";
      toast(msg);
      if (document.hidden && typeof Notification !== "undefined" && Notification.permission === "granted") {
        try { new Notification(room?.name ?? "غرفة المذاكرة", { body: msg }); } catch { /* مش مشكلة */ }
      }
    }
    lastKey.current = key;
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  // الوقت المتبقي في عنوان التاب
  useEffect(() => {
    if (phase && running) document.title = `${fmtClock(phase.remainingMs)} · ${PHASE_LABEL[phase.kind]}`;
    else if (room) document.title = room.name;
  }, [phase?.remainingMs, running, room?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const newest = msgs.length ? msgs[msgs.length - 1].created_at : "";
  useEffect(() => { if (tab === "chat") { seenAt.current = newest; chatEnd.current?.scrollIntoView({ block: "end" }); } }, [tab, newest]);
  useEffect(() => { if (tab === "chat") chatEnd.current?.scrollIntoView({ block: "end" }); }, [msgs.length, tab]);
  const unread = useMemo(
    () => (tab === "chat" ? 0 : msgs.filter((m) => m.user_id !== user?.id && m.created_at > seenAt.current).length),
    [msgs, tab, user?.id],
  );

  async function control(action: string) {
    setBusy(true);
    const { error } = await db.rpc("pomo_control", { p_room: roomId, p_action: action });
    setBusy(false);
    if (error) return toast.error(error.message);
    await load();
  }
  async function endRoom() {
    if (!confirm("إنهاء الغرفة للكل؟")) return;
    await control("end");
    navigate({ to: "/pomodoro" });
  }
  async function saveTopic() {
    await db.rpc("pomo_heartbeat", { p_room: roomId, p_topic: topic.trim() });
    await load();
  }
  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    const { error } = await db.rpc("pomo_send", { p_room: roomId, p_body: body });
    if (error) { toast.error(error.message); setText(body); return; }
    await loadMsgs();
  }
  async function shareCode() {
    if (!room?.join_code) return;
    const message = `ادخل غرفة المذاكرة "${room.name}" في Assuit SciDream بالكود: ${room.join_code}`;
    try {
      if (navigator.share) await navigator.share({ text: message });
      else { await navigator.clipboard.writeText(message); toast.success("اتنسخ الكود والرسالة"); }
    } catch { /* المستخدم لغى */ }
  }
  async function askNotif() {
    if (typeof Notification === "undefined") return toast.error("المتصفح ده مش بيدعم الإشعارات");
    const p = await Notification.requestPermission();
    toast(p === "granted" ? "تم تفعيل الإشعارات" : "الإشعارات متقفلة من المتصفح");
  }

  const header = (
    <header className="relative z-10 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
        <Link to="/pomodoro" className="inline-flex items-center gap-1 text-sm hover:text-accent"><ArrowRight className="h-4 w-4" /> الغرف</Link>
        <div className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-accent" />
          <h1 className="max-w-[55vw] truncate font-display text-lg font-semibold">{room?.name ?? "غرفة المذاكرة"}</h1>
        </div>
        <span className="w-12" />
      </div>
    </header>
  );

  if (gone) {
    return (
      <div className="relative min-h-screen" dir="rtl">
        <StarsBackground />
        {header}
        <main className="relative z-10 mx-auto max-w-md px-6 py-16">
          <div className="cosmic-card rounded-2xl p-8 text-center">
            <p className="font-display text-lg">{goneMsg || "الغرفة دي اتقفلت أو مش موجودة"}</p>
            <Link to="/pomodoro" className="mt-4 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">رجوع للغرف</Link>
          </div>
        </main>
      </div>
    );
  }

  const members: Member[] = st?.members ?? [];
  const canControl = !!st?.can_control;
  const color = phase ? PHASE_COLOR[phase.kind] : "#F9AD26";
  const progress = phase && phase.totalMs > 0 ? Math.min(1, Math.max(0, phase.remainingMs / phase.totalMs)) : 1;
  const tabBtn = (on: boolean) => `rounded-full border px-4 py-1.5 text-xs ${on ? "border-accent bg-accent/20 text-accent" : "border-border"}`;

  return (
    <div className="relative min-h-screen" dir="rtl">
      <StarsBackground />
      {header}
      <main className="relative z-10 mx-auto max-w-3xl space-y-4 px-6 py-6">
        <div className="flex gap-2">
          <button className={tabBtn(tab === "timer")} onClick={() => setTab("timer")}>المؤقت</button>
          <button className={tabBtn(tab === "chat")} onClick={() => setTab("chat")}>{unread > 0 ? `الشات (${unread})` : "الشات"}</button>
        </div>

        {!room || !phase ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
        ) : tab === "timer" ? (
          <>
            <div className="cosmic-card flex flex-col items-center gap-3 rounded-3xl p-6">
              {room.subject && <p className="text-sm font-semibold text-accent">{room.subject}</p>}
              <div className="relative flex items-center justify-center" style={{ width: SIZE, height: SIZE }}>
                <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0">
                  <circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke="rgba(255,255,255,0.08)" strokeWidth={STROKE} fill="none" />
                  <circle
                    cx={SIZE / 2} cy={SIZE / 2} r={R} stroke={color} strokeWidth={STROKE} fill="none" strokeLinecap="round"
                    strokeDasharray={C} strokeDashoffset={C * (1 - progress)} transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                    style={{ transition: "stroke-dashoffset 0.5s linear" }}
                  />
                </svg>
                <div className="relative text-center">
                  <div className="font-display text-5xl font-bold tabular-nums" style={{ color }} dir="ltr">{fmtClock(phase.remainingMs)}</div>
                  <div className="mt-1 font-semibold">{PHASE_LABEL[phase.kind]}</div>
                  <div className="text-xs text-foreground/60">الجولة {phase.round}</div>
                </div>
              </div>
              <p className="text-xs text-foreground/65">{running ? "التايمر شغّال" : elapsed > 0 ? "التايمر موقوف" : "لسه ما بدأش"}</p>
              <p className="text-center text-[11px] leading-5 text-foreground/60">{cfgText(room)}</p>

              {canControl ? (
                <div className="flex w-full gap-2">
                  <button disabled={busy} onClick={() => control(running ? "pause" : "start")}
                    className="inline-flex flex-[2] items-center justify-center gap-1.5 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                    {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {running ? "إيقاف" : elapsed > 0 ? "استكمال" : "ابدأ"}
                  </button>
                  <button onClick={() => control("skip")} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border py-2.5 text-sm hover:border-accent"><SkipForward className="h-4 w-4" /> تخطي</button>
                  <button onClick={() => control("reset")} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border py-2.5 text-sm hover:border-accent"><RotateCcw className="h-4 w-4" /> إعادة</button>
                </div>
              ) : (
                <p className="text-xs text-foreground/60">التحكم في التايمر للمضيف {room.anyone_controls ? "" : "بس"}.</p>
              )}
              {typeof Notification !== "undefined" && Notification.permission === "default" && (
                <button onClick={askNotif} className="text-[11px] text-accent underline">فعّل إشعارات المتصفح عشان يوصلك التنبيه والتاب مقفول</button>
              )}
            </div>

            <div className="cosmic-card space-y-2 rounded-2xl p-5 text-center">
              <div className="flex items-center justify-between">
                <button onClick={shareCode} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs hover:border-accent"><KeyRound className="h-3.5 w-3.5" /> مشاركة الكود</button>
                <span className="inline-flex items-center gap-1.5 font-semibold">{!room.is_public && <Lock className="h-3.5 w-3.5 text-accent" />}{room.is_public ? "غرفة عامة" : "غرفة خاصة"}</span>
              </div>
              <div className="font-display text-3xl font-bold tracking-[0.35em] text-accent" dir="ltr">{room.join_code ?? ""}</div>
              <p className="text-[11px] text-foreground/60">{room.is_public ? "أي حد يقدر يدخل من قايمة الغرف، أو بالكود ده." : "مش بتظهر في القايمة. اللي معاه الكود بس يدخل."}</p>
            </div>

            <div className="cosmic-card space-y-3 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-sm"><Users className="h-4 w-4 text-accent" /> {members.length}</span>
                <h3 className="font-display">بيذاكروا دلوقتي</h3>
              </div>
              {members.map((m) => (
                <div key={m.user_id} className="flex items-center gap-3">
                  <Avatar url={m.avatar_url} name={m.name} size={36} />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{m.name}{m.user_id === room.host_id ? " · المضيف" : ""}</div>
                    {m.topic && <div className="text-[11px] text-foreground/60">بيذاكر: {m.topic}</div>}
                  </div>
                </div>
              ))}
              <input value={topic} onChange={(e) => setTopic(e.target.value)} onBlur={saveTopic} onKeyDown={(e) => { if (e.key === "Enter") void saveTopic(); }}
                placeholder="بتذاكر إيه دلوقتي؟ (اختياري)" maxLength={60}
                className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm focus:border-accent focus:outline-none" />
            </div>

            <div className="flex gap-2">
              <Link to="/pomodoro" className="flex-1 rounded-full border border-border py-2.5 text-center text-sm hover:border-accent">خروج من الغرفة</Link>
              {user?.id === room.host_id && (
                <button onClick={endRoom} className="flex-1 rounded-full border border-destructive/50 py-2.5 text-sm text-destructive hover:bg-destructive/10">إنهاء الغرفة</button>
              )}
            </div>
          </>
        ) : (
          <div className="cosmic-card flex h-[65vh] flex-col rounded-2xl p-3">
            <div className="flex-1 space-y-2 overflow-y-auto p-2">
              {msgs.length === 0 && <p className="py-10 text-center text-xs text-foreground/60">لسه مفيش رسايل. ابدأ الكلام!</p>}
              {msgs.map((m) => {
                const mine = m.user_id === user?.id;
                return (
                  <div key={m.id} className={`flex items-end gap-2 ${mine ? "justify-start" : "justify-end"}`}>
                    {!mine && <Avatar url={m.avatar_url} name={m.name} size={28} />}
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${mine ? "bg-accent/25" : "bg-secondary/70"}`}>
                      {!mine && <div className="text-[11px] font-semibold text-accent">{m.name}</div>}
                      <div className="whitespace-pre-wrap break-words text-sm leading-6">{m.body}</div>
                      <div className="text-[10px] text-foreground/45">{new Date(m.created_at).toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" })}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEnd} />
            </div>
            <form onSubmit={send} className="flex items-center gap-2 pt-2">
              <button type="submit" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><Send className="h-4 w-4" /></button>
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="اكتب رسالة للغرفة..." maxLength={1000}
                className="flex-1 rounded-full border border-border bg-background/60 px-4 py-2 text-sm focus:border-accent focus:outline-none" />
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
