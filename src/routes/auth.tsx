import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { CosmicBackground } from "@/components/CosmicBackground";
import { Logo } from "@/components/Logo";
import { ArrowLeft, LogIn } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — Assuit SciDream" },
      { name: "description", content: "سجّل دخولك بحساب Google لمنصة Dream Team — كلية العلوم جامعة أسيوط." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
      else setChecking(false);
    });
  }, [navigate]);

  async function handleGoogle() {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("حصلت مشكلة في تسجيل الدخول، حاول مرة تانية");
        setLoading(false);
        return;
      }
      if (result.redirected) return;
      toast.success("تم تسجيل الدخول ✨");
      navigate({ to: "/dashboard" });
    } catch (e) {
      console.error(e);
      toast.error("حصلت مشكلة، حاول مرة تانية");
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <CosmicBackground density={35} />
      <div className="relative z-10 w-full max-w-md">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 rotate-180" /> العودة للرئيسية
        </Link>
        <div className="cosmic-card rounded-3xl p-8 text-center">
          <Logo size={84} className="mx-auto" />
          <h1 className="mt-4 font-display text-3xl">أهلاً بيك في Dream Team</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            سجل بحساب جوجل علشان تدخل لبوابة عباقرة كلية العلوم.
          </p>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="mt-7 inline-flex w-full items-center justify-center gap-3 rounded-full bg-primary px-6 py-3.5 text-base font-semibold text-primary-foreground shadow-soft transition hover:shadow-glow disabled:opacity-60"
          >
            {loading ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : (
              <>
                <GoogleIcon />
                سجّل بحساب Google
              </>
            )}
          </button>

          <p className="mt-6 text-xs text-muted-foreground">
            بتسجيلك، أنت موافق على أن فريق Dream Team هيراجع بياناتك للتأكد إنك طالب في الكلية.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <LogIn className="h-3.5 w-3.5" />
          محتاج مساعدة؟ راسلنا على{" "}
          <a className="text-foreground hover:text-accent" href="mailto:abdalahkotp31@gmail.com">abdalahkotp31@gmail.com</a>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.2c-2 1.4-4.5 2.3-7.3 2.3-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.2C41 35.6 44 30.3 44 24c0-1.3-.1-2.4-.4-3.5z"/>
    </svg>
  );
}
