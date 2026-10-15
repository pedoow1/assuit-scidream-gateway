import { useCallback, useEffect, useState } from "react";
import { Star, Sun } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
const RATING_EVENT = "sd:rating-changed";

/** بعد أي تقييم/حذف تلخيص نادي ده عشان كل الشارات تتحدّث */
export function notifyRatingChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(RATING_EVENT));
}

export type UserRating = { loaded: boolean; isSuper: boolean; avg: number | null; votes: number };

/** تقييم الشخص = متوسط تقييمات تلخيصاته العامة. السوبر أدمن: isSuper = true (شمس، من غير تقييم). */
export function useUserRating(userId: string | null | undefined): UserRating {
  const [r, setR] = useState<UserRating>({ loaded: false, isSuper: false, avg: null, votes: 0 });
  const load = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await db.rpc("user_rating", { p_user: userId });
    if (error) return; // لسه ما شغّلتش ملف الـ SQL: نخبّي الشارة
    const row = Array.isArray(data) ? data[0] : data;
    setR({
      loaded: true,
      isSuper: !!row?.is_super,
      avg: row?.avg_stars != null ? Number(row.avg_stars) : null,
      votes: Number(row?.votes ?? 0),
    });
  }, [userId]);
  useEffect(() => {
    setR({ loaded: false, isSuper: false, avg: null, votes: 0 });
    void load();
    const h = () => void load();
    window.addEventListener(RATING_EVENT, h);
    return () => window.removeEventListener(RATING_EVENT, h);
  }, [load]);
  return r;
}

/** بيظهر جنب اسم الشخص: ★ والمتوسط، أو ☀️ للسوبر أدمن (من غير أي تقييم). */
export function RatingBadge({ userId, className = "" }: { userId: string; className?: string }) {
  const r = useUserRating(userId);
  if (!r.loaded) return null;
  if (r.isSuper) {
    return (
      <span title="Big Boss" className={`inline-flex items-center rounded-full bg-accent/15 p-1.5 text-accent ${className}`}>
        <Sun className="h-5 w-5" />
      </span>
    );
  }
  if (!r.votes || r.avg == null) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs text-foreground/50 ${className}`}>
        <Star className="h-3.5 w-3.5" /> جديد
      </span>
    );
  }
  return (
    <span
      title={`${r.votes} تقييم`}
      className={`inline-flex items-center gap-1 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      <Star className="h-3.5 w-3.5 fill-accent text-accent" />
      {r.avg.toFixed(1)}
      <span className="font-normal text-foreground/50">({r.votes})</span>
    </span>
  );
}

/** صف ٥ نجوم: لو onChange موجودة بيبقى قابل للضغط */
export function Stars({ value, onChange, size = 22 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  return (
    <div className="inline-flex items-center gap-1" dir="ltr">
      {[1, 2, 3, 4, 5].map((i) => {
        const on = i <= Math.round(value);
        const icon = (
          <Star
            style={{ width: size, height: size }}
            className={on ? "fill-accent text-accent" : "text-foreground/30"}
          />
        );
        return onChange ? (
          <button key={i} type="button" onClick={() => onChange(i)} className="transition hover:scale-110" aria-label={`${i} نجوم`}>
            {icon}
          </button>
        ) : (
          <span key={i}>{icon}</span>
        );
      })}
    </div>
  );
}
