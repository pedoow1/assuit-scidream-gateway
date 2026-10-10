import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Plus, SmilePlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const db = supabase as any;

export type ReactionKind = "group" | "dm";
export type ReactionGroup = { emoji: string; count: number; mine: boolean };

const TABLE: Record<ReactionKind, string> = {
  group: "group_message_reactions",
  dm: "direct_message_reactions",
};

const QUICK = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
const MORE = (
  "😀 😃 😄 😁 😆 😅 🤣 😊 🙂 😉 😍 🥰 😘 😎 🤩 🥳 🤔 🤨 😐 😴 😪 😭 😡 🤯 😱 🥺 😇 🤗 🙄 😬 " +
  "👏 🙌 💪 🤝 👌 ✌️ 🤞 👀 🔥 💯 ✨ 🎉 ❤️‍🔥 💔 💙 💚 💛 🧡 💜 🖤 ✅ ❌ ⭐ 🌹 ☕ 📚 ✏️ 🎓 🏆 💡 ⏰ 🕌"
).split(" ");

/** تفاعلات الرسايل: تحميل + realtime + تبديل (تفاعل واحد لكل شخص زي واتساب). */
export function useReactions(kind: ReactionKind, ids: string[], userId: string) {
  const table = TABLE[kind];
  // message_id -> (user_id -> emoji)
  const [rows, setRows] = useState<Map<string, Map<string, string>>>(new Map());
  const fetched = useRef<Set<string>>(new Set());
  const key = ids.join(",");

  const put = useCallback((mid: string, uid: string, emoji: string | null) => {
    setRows((prev) => {
      const next = new Map(prev);
      const inner = new Map(next.get(mid) ?? []);
      if (emoji) inner.set(uid, emoji);
      else inner.delete(uid);
      if (inner.size) next.set(mid, inner);
      else next.delete(mid);
      return next;
    });
  }, []);

  useEffect(() => {
    const fresh = ids.filter((id) => id && !id.startsWith("temp-") && !fetched.current.has(id));
    if (!fresh.length) return;
    fresh.forEach((id) => fetched.current.add(id));
    (async () => {
      for (let i = 0; i < fresh.length; i += 150) {
        const chunk = fresh.slice(i, i + 150);
        const { data } = await db.from(table).select("message_id, user_id, emoji").in("message_id", chunk);
        if (!data?.length) continue;
        setRows((prev) => {
          const next = new Map(prev);
          for (const r of data as { message_id: string; user_id: string; emoji: string }[]) {
            const inner = new Map(next.get(r.message_id) ?? []);
            inner.set(r.user_id, r.emoji);
            next.set(r.message_id, inner);
          }
          return next;
        });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, table]);

  useEffect(() => {
    const ch = db
      .channel(`rx-${kind}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, (pl: any) => {
        const n = pl.new, o = pl.old;
        if (pl.eventType === "DELETE") {
          if (o?.message_id && o?.user_id && fetched.current.has(String(o.message_id))) put(String(o.message_id), o.user_id, null);
        } else if (n?.message_id && fetched.current.has(String(n.message_id))) {
          put(String(n.message_id), n.user_id, n.emoji);
        }
      })
      .subscribe();
    return () => { db.removeChannel(ch); };
  }, [kind, table, put]);

  const groups = useCallback(
    (mid: string): ReactionGroup[] => {
      const inner = rows.get(mid);
      if (!inner) return [];
      const m = new Map<string, ReactionGroup>();
      inner.forEach((emoji, uid) => {
        const g = m.get(emoji) ?? { emoji, count: 0, mine: false };
        g.count++;
        if (uid === userId) g.mine = true;
        m.set(emoji, g);
      });
      return [...m.values()].sort((a, b) => b.count - a.count);
    },
    [rows, userId],
  );

  const mineOf = useCallback((mid: string) => rows.get(mid)?.get(userId) ?? null, [rows, userId]);

  const toggle = useCallback(
    async (mid: string, emoji: string) => {
      if (!mid || mid.startsWith("temp-")) return;
      const cur = rows.get(mid)?.get(userId) ?? null;
      if (cur === emoji) {
        put(mid, userId, null);
        const { error } = await db.from(table).delete().eq("message_id", mid).eq("user_id", userId);
        if (error) { put(mid, userId, cur); toast.error(error.message); }
      } else {
        put(mid, userId, emoji);
        const { error } = await db.from(table).upsert({ message_id: mid, user_id: userId, emoji }, { onConflict: "message_id,user_id" });
        if (error) { put(mid, userId, cur); toast.error(error.message); }
      }
    },
    [rows, userId, table, put],
  );

  return { groups, mineOf, toggle };
}

/** شرايح التفاعلات تحت الرسالة */
export function ReactionChips({
  groups,
  onToggle,
  self,
  className = "",
}: {
  groups: ReactionGroup[];
  onToggle: (emoji: string) => void;
  self?: boolean;
  className?: string;
}) {
  if (!groups.length) return null;
  return (
    <div className={`mt-1 flex flex-wrap gap-1 ${className}`}>
      {groups.map((g) => (
        <button
          key={g.emoji}
          onClick={(e) => { e.stopPropagation(); onToggle(g.emoji); }}
          className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] leading-none transition hover:brightness-110 ${
            g.mine
              ? "border-accent bg-accent/25"
              : self
                ? "border-primary-foreground/30 bg-black/10"
                : "border-border/60 bg-background/60"
          }`}
        >
          <span className="text-sm leading-none">{g.emoji}</span>
          {g.count > 1 && <span className="font-semibold">{g.count}</span>}
        </button>
      ))}
    </div>
  );
}

function firstEmoji(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  const Seg = (Intl as any).Segmenter;
  const parts: string[] = Seg ? [...new Seg(undefined, { granularity: "grapheme" }).segment(t)].map((s: any) => s.segment) : Array.from(t);
  return parts.find((p) => /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(p)) ?? null;
}

/** زرار التفاعل: 6 إيموجيز سريعة + "+" لباقي الإيموجيز + خانة تكتب فيها أي إيموجي من كيبورد الموبايل */
export function ReactionButton({ current, onPick }: { current?: string | null; onPick: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);
  const pick = (e: string) => { onPick(e); setOpen(false); setMore(false); };
  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setMore(false); }}>
      <PopoverTrigger asChild>
        <button
          title="تفاعل"
          className="shrink-0 self-center rounded-full p-1 text-foreground/35 transition hover:bg-card/60 hover:text-foreground"
        >
          {current ? <span className="text-sm leading-none">{current}</span> : <SmilePlus className="h-3.5 w-3.5" />}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-[19rem] p-2" dir="rtl" align="center">
        <div className="flex items-center gap-1">
          {QUICK.map((e) => (
            <button
              key={e}
              onClick={() => pick(e)}
              className={`rounded-full p-1.5 text-xl leading-none transition hover:scale-125 hover:bg-card ${current === e ? "bg-accent/25" : ""}`}
            >
              {e}
            </button>
          ))}
          <button onClick={() => setMore((v) => !v)} title="المزيد" className="rounded-full p-1.5 text-foreground/60 hover:bg-card">
            <Plus className="h-5 w-5" />
          </button>
        </div>
        {more && (
          <div className="mt-2 space-y-2">
            <input
              dir="auto"
              placeholder="اكتب أي إيموجي من كيبورد موبايلك"
              onChange={(ev) => {
                const e = firstEmoji(ev.target.value);
                if (e) pick(e);
              }}
              className="w-full rounded-md border border-border bg-background/60 px-2 py-1.5 text-sm outline-none focus:border-accent"
            />
            <div className="grid max-h-44 grid-cols-8 gap-0.5 overflow-y-auto">
              {MORE.map((e) => (
                <button key={e} onClick={() => pick(e)} className="rounded p-1 text-xl leading-none hover:bg-card">
                  {e}
                </button>
              ))}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** اسم مفهوم للملف عند التحميل */
export function suggestFileName(m: { type?: string | null; content?: string | null; media_url?: string | null }): string {
  if (m.type === "file" && m.content) return m.content;
  let name = "";
  try {
    const clean = String(m.media_url ?? "").split("?")[0];
    name = decodeURIComponent((clean.split("/").pop() ?? "").replace(/^\d+-([a-z0-9]{6}-)?/i, ""));
  } catch { /* ignore */ }
  const ext = m.type === "image" ? "jpg" : m.type === "video" ? "mp4" : m.type === "audio" ? "m4a" : "";
  if (!name) name = `${m.type ?? "file"}-${Date.now()}`;
  if (ext && !/\.[a-z0-9]{2,5}$/i.test(name)) name += `.${ext}`;
  return name;
}

/** تحميل فعلي للملف (مش فتح في تاب) — لو المتصفح منع، بيفتحه في تاب جديد */
export async function downloadFile(url: string, name: string) {
  if (!url) { toast.error("الملف لسه بيتجهّز، جرّب كمان ثانية"); return; }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const obj = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = obj;
    a.download = name || "file";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(obj), 30_000);
  } catch {
    window.open(url, "_blank", "noopener");
    toast("اتفتح الملف في تاب جديد — احفظه من هناك");
  }
}

export { Download as DownloadIcon };
