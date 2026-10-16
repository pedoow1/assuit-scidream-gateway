import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";

type Props<T> = {
  items: T[];
  renderRow: (item: T) => ReactNode;
  onReorder: (next: T[]) => void;
};

/** قايمة بتتسحب عشان تترتّب (بتشتغل بالماوس وباللمس): امسك أيقونة ⋮⋮ واسحب لفوق أو لتحت. فيه كمان أسهم ▲▼. */
export function SortableList<T extends { id: string }>({ items, renderRow, onReorder }: Props<T>) {
  const [order, setOrder] = useState<T[]>(items);
  const [dragId, setDragId] = useState<string | null>(null);
  const orderRef = useRef(order);
  orderRef.current = order;
  const rows = useRef(new Map<string, HTMLDivElement>());
  const lastY = useRef(0);

  // لما الداتا تتحدّث من السيرفر ومفيش سحب شغّال
  useEffect(() => { if (!dragId) setOrder(items); }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  // سكرول تلقائي لما تسحب قرب حافة الشاشة
  useEffect(() => {
    if (!dragId) return;
    const t = setInterval(() => {
      const y = lastY.current;
      if (y < 90) window.scrollBy(0, -12);
      else if (y > window.innerHeight - 90) window.scrollBy(0, 12);
    }, 16);
    return () => clearInterval(t);
  }, [dragId]);

  function down(e: React.PointerEvent, id: string) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    lastY.current = e.clientY;
    setDragId(id);
  }

  function move(e: React.PointerEvent, id: string) {
    if (dragId !== id) return;
    const y = e.clientY;
    lastY.current = y;
    const cur = orderRef.current;
    const others = cur.filter((x) => x.id !== id);
    // مكانه الجديد = عدد الصفوف التانية اللي نصّها فوق إصبعك/الماوس
    let to = 0;
    for (const o of others) {
      const el = rows.current.get(o.id);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (r.top + r.height / 2 < y) to++;
    }
    const from = cur.findIndex((x) => x.id === id);
    if (to === from) return;
    const dragged = cur[from];
    const next = [...others];
    next.splice(to, 0, dragged);
    setOrder(next);
  }

  function up(e: React.PointerEvent) {
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* مش مشكلة */ }
    if (!dragId) return;
    setDragId(null);
    const cur = orderRef.current;
    if (cur.some((x, i) => x.id !== items[i]?.id)) onReorder(cur);
  }

  function nudge(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setOrder(next);
    onReorder(next);
  }

  return (
    <div className="space-y-2">
      {order.map((item, i) => {
        const dragging = dragId === item.id;
        return (
          <div
            key={item.id}
            ref={(el) => { if (el) rows.current.set(item.id, el); else rows.current.delete(item.id); }}
            className={`cosmic-card flex select-none items-center gap-2 rounded-2xl p-2.5 transition-shadow ${
              dragging ? "scale-[1.02] border-accent shadow-glow ring-1 ring-accent" : ""
            }`}
          >
            <div
              className="flex h-10 w-10 shrink-0 cursor-grab touch-none items-center justify-center rounded-xl text-foreground/60 hover:bg-secondary active:cursor-grabbing"
              onPointerDown={(e) => down(e, item.id)}
              onPointerMove={(e) => move(e, item.id)}
              onPointerUp={up}
              onPointerCancel={up}
              title="اسحب للترتيب"
            >
              <GripVertical className={`h-5 w-5 ${dragging ? "text-accent" : ""}`} />
            </div>
            <div className="min-w-0 flex-1">{renderRow(item)}</div>
            <div className="flex shrink-0">
              <button type="button" disabled={i === 0} onClick={() => nudge(i, -1)} className="rounded-full p-1.5 hover:bg-secondary disabled:opacity-25" aria-label="فوق">
                <ChevronUp className="h-4 w-4" />
              </button>
              <button type="button" disabled={i === order.length - 1} onClick={() => nudge(i, 1)} className="rounded-full p-1.5 hover:bg-secondary disabled:opacity-25" aria-label="تحت">
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
