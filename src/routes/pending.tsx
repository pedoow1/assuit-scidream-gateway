import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2, Clock, XCircle, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { CosmicBackground } from "@/components/CosmicBackground";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/pending")({
  head: () => ({ meta: [{ title: "جاري المراجعة — Assuit SciDream" }] }),
  component: PendingPage,
});

function PendingPage() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth" });
    else if (profile?.verification_status === "verified") navigate({ to: "/dashboard" });
    else if (profile?.verification_status === "incomplete") navigate({ to: "/complete-profile" });
  }, [user, profile, loading, navigate]);

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
      <CosmicBackground density={32} />
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
              <p className="mt-3 text-sm text-muted-foreground">
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
              <h1 className="mt-4 font-display text-2xl">جاري مراجعة بياناتك</h1>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                فريق Dream Team بيراجع بياناتك دلوقتي ✨ هتقدر تدخل المنصة بمجرد ما يتأكدوا إنك من طلاب الكلية.
              </p>
              <div className="mt-5 rounded-xl bg-secondary/40 p-4 text-right text-xs text-muted-foreground">
                <div><span className="font-semibold text-foreground">الاسم:</span> {profile.full_name}</div>
                <div className="mt-1"><span className="font-semibold text-foreground">الرقم الأكاديمي:</span> {profile.academic_id}</div>
              </div>
            </>
          )}

          <button
            onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/" }); }}
            className="mt-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" /> تسجيل خروج
          </button>
        </div>
      </div>
    </div>
  );
}
