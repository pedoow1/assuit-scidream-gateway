import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { StarsBackground } from "@/components/IntroSequence";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, UserPlus, UserCheck, UserX, Clock3 } from "lucide-react";

const db = supabase as any;

export const Route = createFileRoute("/profile/$userId")({
  head: () => ({ meta: [{ title: "بروفايل — Assuit SciDream" }] }),
  component: PublicProfilePage,
});

type PublicProfile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  display_title: string | null;
  batch_year: number | null;
  is_big_boss: boolean;
  is_site_admin: boolean;
  is_instructor: boolean;
  is_department_advisor: boolean;
};

function badgeFor(p: PublicProfile | null) {
  if (!p) return null;
  if (p.display_title?.trim()) return p.display_title.trim();
  if (p.is_big_boss) return "Big Boss";
  if (p.is_department_advisor) return "المشرف الأكاديمي";
  if (p.is_instructor) return "د.";
  if (p.is_site_admin) return "Admin";
  return null;
}

function PublicProfilePage() {
  const { userId } = Route.useParams();
  const { user, loading, refresh } = useAuth();
  const navigate = useNavigate();

  const [target, setTarget] = useState<PublicProfile | null>(null);
  const [friendStatus, setFriendStatus] = useState<"none" | "pending_sent" | "pending_received" | "friends" | null>(null);
  const [busy, setBusy] = useState(true);
  const [acting, setActing] = useState(false);

  // Tracks the most recently requested userId so an in-flight request for a
  // profile the person has since navigated away from can't land late and
  // overwrite the newer one — this is what caused "always shows my profile"
  // when tapping between profiles quickly.
  const latestUserIdRef = useRef(userId);
  useEffect(() => {
    latestUserIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  async function load() {
    setBusy(true);
    // Guard against out-of-order responses: if the user taps profile A then
    // quickly navigates to profile B before A's request finishes, A's slower
    // response must NOT be allowed to overwrite B's data once it lands.
    const requestedFor = userId;
    const [{ data: p }, { data: fs }] = await Promise.all([
      db.rpc("get_public_profile", { p_id: userId }).maybeSingle(),
      user && user.id !== userId ? db.rpc("friend_status_with", { p_other: userId }) : Promise.resolve({ data: null }),
    ]);
    if (requestedFor !== latestUserIdRef.current) return;
    setTarget((p as PublicProfile) ?? null);
    setFriendStatus((fs as any) ?? null);
    setBusy(false);
  }
  useEffect(() => {
    if (user) {
      // Reset immediately so the previous person's data can never flash (or
      // stick) while the new profile is loading.
      setTarget(null);
      void load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, userId]);

  const isOwnProfile = user?.id === userId;

  async function sendRequest() {
    setActing(true);
    const { error } = await db.rpc("send_friend_request", { p_receiver: userId });
    setActing(false);
    if (error) return toast.error(error.message);
    toast.success("اتبعت طلب الصداقة");
    await load();
  }

  async function removeFriend() {
    setActing(true);
    const { error } = await db.rpc("remove_friend", { p_other: userId });
    setActing(false);
    if (error) return toast.error(error.message);
    toast.success("اتشال من قايمة أصدقائك");
    await load();
  }

  async function respond(accept: boolean) {
    setActing(true);
    // We don't have the request_id here (we only know the status) — resolve
    // it through the incoming-requests list, since only the receiver side
    // needs this and that list is scoped to auth.uid() already.
    const { data: incoming } = await db.rpc("list_incoming_friend_requests");
    const match = (incoming ?? []).find((r: any) => r.sender_id === userId);
    if (match) {
      await db.rpc("respond_friend_request", { p_request_id: match.request_id, p_accept: accept });
    }
    setActing(false);
    await load();
  }

  if (loading || !user || busy) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!target) {
    return (
      <div className="relative min-h-screen px-4 py-10">
        <StarsBackground />
        <div className="relative z-10 mx-auto max-w-xl text-center">
          <p className="text-sm text-foreground/60">مش لاقيين اليوزر ده</p>
          <Link to="/dashboard" className="mt-4 inline-flex items-center gap-2 text-sm text-accent">
            <ArrowLeft className="h-4 w-4 rotate-180" /> الرئيسية
          </Link>
        </div>
      </div>
    );
  }

  const badge = badgeFor(target);

  return (
    <div className="relative min-h-screen px-4 py-10">
      <StarsBackground />
      <div className="relative z-10 mx-auto max-w-xl">
        <button
          onClick={() => {
            // Go back to wherever the user actually came from (a group chat,
            // the members list, dashboard, etc.) instead of always jumping
            // to the dashboard. Only fall back to dashboard if this profile
            // was opened directly with no in-app history to return to.
            if (window.history.length > 1) window.history.back();
            else navigate({ to: "/dashboard" });
          }}
          className="mb-6 inline-flex items-center gap-2 text-sm text-foreground/75 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 rotate-180" /> رجوع
        </button>

        <div className="cosmic-card rounded-3xl p-8 text-center">
          <Avatar className="mx-auto h-24 w-24 border-2 border-accent/40">
            <AvatarImage src={target.avatar_url ?? undefined} />
            <AvatarFallback className="font-display text-2xl">{target.full_name?.trim().charAt(0)}</AvatarFallback>
          </Avatar>

          <h1 className="mt-4 font-display text-2xl">{target.full_name}</h1>
          {badge && (
            <span className="mt-2 inline-block rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
              {badge}
            </span>
          )}

          {target.bio && <p className="mt-4 whitespace-pre-wrap text-sm text-foreground/75">{target.bio}</p>}
          {!target.bio && <p className="mt-4 text-sm text-foreground/40">من غير نبذة</p>}

          {!isOwnProfile && (
            <div className="mt-6">
              {friendStatus === "friends" && (
                <div className="flex items-center justify-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1.5 text-sm text-accent">
                    <UserCheck className="h-4 w-4" /> صديقك بالفعل
                  </span>
                  <Button size="sm" variant="outline" onClick={removeFriend} disabled={acting}>
                    إزالة
                  </Button>
                </div>
              )}
              {friendStatus === "pending_sent" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-card/60 px-3 py-1.5 text-sm text-foreground/60">
                  <Clock3 className="h-4 w-4" /> طلب الصداقة مبعوت
                </span>
              )}
              {friendStatus === "pending_received" && (
                <div className="flex items-center justify-center gap-2">
                  <Button size="sm" onClick={() => void respond(true)} disabled={acting}>
                    <UserCheck className="ml-1.5 h-4 w-4" /> قبول
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void respond(false)} disabled={acting}>
                    <UserX className="ml-1.5 h-4 w-4" /> رفض
                  </Button>
                </div>
              )}
              {friendStatus === "none" && (
                <Button size="sm" onClick={sendRequest} disabled={acting}>
                  <UserPlus className="ml-1.5 h-4 w-4" /> إضافة صديق
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
