import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { Loader2, Clock, XCircle, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { StarsBackground } from "@/components/IntroSequence";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/pending")({
  head: () => ({ meta: [{ title: "جاري المراجعة — Assuit SciDream" }] }),
  component: PendingPage,
});

function PendingPage() {
  const { user, profile, loading, refresh } = useAuth();
  const navigate = useNavigate();
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // التوجيه الأساسي
  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    if (profile?.verification_status === "verified") { navigate({ to: "/dashboard" }); return; }
    if (profile?.verification_status === "incomplete") { navigate({ to: "/complete-profile" }); return; }
  }, [user, profile, loading, navigate]);

  // Polling كل 10 ثواني عشان نعرف لو الأدمن فعّل الحساب
  useEffect(() => {
    if (loading || !user) return;
    if (profile?.verification_status !== "pending") return;

    pollingRef.current = setInterval(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("verification_status")
        .eq("id", user.id)
        .single();

      if (data?.verification_status === "verified") {
        // حدّث الـ auth state وروّح للداشبورد
        await refresh();
        navigate({ to: "/dashboard" });
      } else if (data?.verification_status === "rejected") {
        // حدّث عشان يظهر سبب الرفض
        await refresh();
      }
    }, 10000); // كل 10 ثواني

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [loading, user, profile?.verification_status, refresh, navigate]);

  if (loading || !user || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const rejected = profile.verification_status === "rejected";

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <StarsBackground />
      <div className="relative z-10 w-full max-w-md">
        <div className="cosmic-card rounded-3xl p-8 text-center">
          <Logo size={72} className="mx-auto" />

          {rejected ? (
            <>
              <div className="mx-auto mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                <XCircle className="h-7 w-7" />
              </div>
              <h1 className="mt-4 font-display text-2xl">تم رفض بياناتك</h1>
              {profile.rejection_reason && (
                <div className="mt-3 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  السبب: {profile.rejection_reason}
                </div>
              )}
              <p className="mt-3 text-sm text-foreground/75">
                صحّح بياناتك وحاول تاني.
              </p>
              <Link
                to="/complete-profile"
                className="mt-5 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                تعديل البيانات
              </Link>
            </>
          ) : (
            <>
              <div className="mx-auto mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-aurora">
                <Clock className="h-7 w-7 text-foreground animate-pulse" />
              </div>
              <h1 className="mt-4 font-display text-2xl">تلقينا طلبك ✨</h1>
              <p className="mt-3 text-sm leading-relaxed text-foreground/75">
                فريق Dream Team بيراجع بياناتك دلوقتي — هتقدر تدخل المنصة بمجرد ما يتأكدوا إنك من طلاب الكلية.
              </p>
              <div className="mt-5 rounded-xl bg-secondary/40 p-4 text-right text-xs text-foreground/75">
                <div><span className="font-semibold text-foreground">الاسم:</span> {profile.full_name}</div>
                <div className="mt-1"><span className="font-semibold text-foreground">الرقم الأكاديمي:</span> {profile.academic_id}</div>
              </div>
              <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-foreground/75">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>بنتحقق من حالة طلبك تلقائياً…</span>
              </div>
            </>
          )}

          <button
            onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}
            className="mt-6 inline-flex items-center gap-1.5 text-xs text-foreground/75 hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" /> تسجيل خروج
          </button>
        </div>
      </div>
    </div>
  );
}
