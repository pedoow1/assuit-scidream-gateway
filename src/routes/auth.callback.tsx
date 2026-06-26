import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CosmicBackground } from "@/components/CosmicBackground";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({
    meta: [{ title: "جاري تسجيل الدخول — Assuit SciDream" }],
  }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    // انتظر الـ session تتحمل من Supabase بعد الـ OAuth redirect
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "SIGNED_IN" && session) {
        sub.subscription.unsubscribe();
        navigate({ to: "/dashboard" });
      }
    });

    // fallback: لو الـ session موجودة أصلاً
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) {
        sub.subscription.unsubscribe();
        navigate({ to: "/dashboard" });
      }
    });

    // timeout fallback بعد 10 ثواني
    const fallback = window.setTimeout(() => {
      if (!active) return;
      sub.subscription.unsubscribe();
      navigate({ to: "/auth" });
    }, 10000);

    return () => {
      active = false;
      window.clearTimeout(fallback);
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <CosmicBackground density={30} />
      <div className="relative z-10 flex flex-col items-center gap-6 text-center">
        <Logo size={72} className="animate-pulse" />
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <p className="text-sm text-muted-foreground">جاري تسجيل دخولك ✨</p>
      </div>
    </div>
  );
}
