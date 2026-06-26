import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CosmicBackground } from "@/components/CosmicBackground";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase بيقرأ الـ hash تلقائياً لو استدعيت getSession
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate({ to: "/dashboard" });
      } else {
        // لو مش لاقي session، استنى الـ onAuthStateChange
        const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "SIGNED_IN" && session) {
            sub.subscription.unsubscribe();
            navigate({ to: "/dashboard" });
          }
        });
      }
    });
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
