import { useCallback, useEffect, useState } from "react";
import { Ban, EyeOff, MessageSquare, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// New tables/RPCs are not in the generated types yet.
const db = supabase as any;

type Restriction = { status: "banned" | "deleted"; reason: string | null } | null;
type Whisper = { id: string; body: string; created_at: string };

/**
 * Mounted once in the root route. Handles:
 *  - ban screen ("تم حظرك") and deleted-account screen (signs the user out)
 *  - realtime whispers sent by the super admin, shown only to the target
 */
export function AccountGuard() {
  const [userId, setUserId] = useState<string | null>(null);
  const [restriction, setRestriction] = useState<Restriction>(null);
  const [whispers, setWhispers] = useState<Whisper[]>([]);

  // current user id
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setUserId(data.session?.user.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const checkRestriction = useCallback(async (uid: string) => {
    const { data } = await db
      .from("account_restrictions")
      .select("status, reason")
      .eq("user_id", uid)
      .maybeSingle();
    setRestriction(data ?? null);
  }, []);

  // restriction: initial + realtime + slow poll fallback
  useEffect(() => {
    if (!userId) {
      setRestriction(null);
      setWhispers([]);
      return;
    }
    void checkRestriction(userId);
    const poll = setInterval(() => void checkRestriction(userId), 30_000);
    const ch = supabase
      .channel(`restriction-${userId}`)
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "account_restrictions", filter: `user_id=eq.${userId}` },
        () => void checkRestriction(userId),
      )
      .subscribe();
    return () => {
      clearInterval(poll);
      void supabase.removeChannel(ch);
    };
  }, [userId, checkRestriction]);

  // whispers: unseen ones on load + realtime inserts
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    db.from("whispers")
      .select("id, body, created_at")
      .eq("to_user", userId)
      .is("seen_at", null)
      .order("created_at", { ascending: true })
      .then(({ data }: any) => {
        if (!cancelled && data?.length) setWhispers(data as Whisper[]);
      });
    const ch = supabase
      .channel(`whispers-${userId}`)
      .on(
        "postgres_changes" as any,
        { event: "INSERT", schema: "public", table: "whispers", filter: `to_user=eq.${userId}` },
        (payload: any) => {
          const w = payload.new as Whisper;
          setWhispers((prev) => (prev.some((x) => x.id === w.id) ? prev : [...prev, w]));
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(ch);
    };
  }, [userId]);

  async function dismiss(id: string) {
    setWhispers((prev) => prev.filter((w) => w.id !== id));
    await db.rpc("whisper_mark_seen", { p_id: id });
  }

  async function leave() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  // a deleted account is signed out right away
  useEffect(() => {
    if (restriction?.status === "deleted") {
      const t = setTimeout(() => void leave(), 6000);
      return () => clearTimeout(t);
    }
  }, [restriction?.status]);

  if (restriction) {
    const banned = restriction.status === "banned";
    return (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-background px-4" dir="rtl">
        <div className="cosmic-card max-w-md rounded-2xl p-8 text-center">
          {banned ? (
            <Ban className="mx-auto h-12 w-12 text-destructive" />
          ) : (
            <EyeOff className="mx-auto h-12 w-12 text-destructive" />
          )}
          <h1 className="mt-4 font-display text-2xl">
            {banned ? "تم حظرك من الموقع" : "الحساب غير موجود"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {banned
              ? restriction.reason
                ? `السبب: ${restriction.reason}`
                : "تم حظر حسابك من قِبل الإدارة."
              : "تم حذف هذا الحساب من الموقع."}
          </p>
          <button
            onClick={leave}
            className="mt-6 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    );
  }

  if (whispers.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[900] flex flex-col items-center gap-2 px-3" dir="rtl">
      {whispers.map((w) => (
        <div
          key={w.id}
          className="cosmic-card pointer-events-auto w-full max-w-md rounded-2xl border border-accent/60 bg-background/95 p-4 shadow-glow backdrop-blur"
        >
          <div className="flex items-start gap-3">
            <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] text-foreground/60">همسة</div>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm">{w.body}</p>
            </div>
            <button onClick={() => dismiss(w.id)} className="text-foreground/60 hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
