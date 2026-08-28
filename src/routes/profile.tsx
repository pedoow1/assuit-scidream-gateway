import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, displayTitleFor } from "@/lib/auth";
import { StarsBackground } from "@/components/IntroSequence";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Camera, Check, X as XIcon } from "lucide-react";

const db = supabase as any;

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "بروفايلي — Assuit SciDream" }] }),
  component: MyProfilePage,
});

function MyProfilePage() {
  const { user, profile, roles, loading, refresh } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [requests, setRequests] = useState<
    { request_id: string; sender_id: string; full_name: string; avatar_url: string | null }[]
  >([]);
  const [friends, setFriends] = useState<{ user_id: string; full_name: string; avatar_url: string | null }[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (profile) setBio(profile.bio ?? "");
  }, [profile]);

  async function loadSocial() {
    const [{ data: r }, { data: f }] = await Promise.all([
      db.rpc("list_incoming_friend_requests"),
      db.rpc("list_friends"),
    ]);
    setRequests(r ?? []);
    setFriends(f ?? []);
  }
  useEffect(() => {
    if (user) void loadSocial();
  }, [user]);

  async function saveBio() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ bio: bio.trim() || null }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    await refresh();
    toast.success("اتحفظت النبذة");
  }

  async function uploadAvatar(file: File) {
    if (!user) return;
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setUploadingAvatar(false);
      return toast.error(upErr.message);
    }
    const publicUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    const { error } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
    setUploadingAvatar(false);
    if (error) return toast.error(error.message);
    await refresh();
    toast.success("اتغيرت الصورة");
  }

  async function respond(requestId: string, accept: boolean) {
    const { error } = await db.rpc("respond_friend_request", { p_request_id: requestId, p_accept: accept });
    if (error) return toast.error(error.message);
    await loadSocial();
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  const badge = displayTitleFor(profile, roles);

  return (
    <div className="relative min-h-screen px-4 py-10">
      <StarsBackground />
      <div className="relative z-10 mx-auto max-w-xl">
        <Link to="/dashboard" className="mb-6 inline-flex items-center gap-2 text-sm text-foreground/75 hover:text-foreground">
          <ArrowLeft className="h-4 w-4 rotate-180" /> الرئيسية
        </Link>

        <div className="cosmic-card rounded-3xl p-8">
          <div className="text-center">
            <div className="relative mx-auto w-fit">
              <Avatar className="h-24 w-24 border-2 border-accent/40">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="font-display text-2xl">
                  {(profile?.full_name || "?").trim().charAt(0)}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -left-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-cosmic text-primary-foreground shadow-soft"
                title="تغيير الصورة"
              >
                {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadAvatar(f);
                  e.target.value = "";
                }}
              />
            </div>

            <h1 className="mt-4 font-display text-2xl">{profile?.full_name}</h1>
            <p className="mt-0.5 text-xs text-foreground/50">
              الاسم زي ما هو في بطاقتك الجامعية — متقدرش تغيره من هنا
            </p>
            {badge && (
              <span className="mt-2 inline-block rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
                {badge}
              </span>
            )}
          </div>

          <div className="mt-8 space-y-2">
            <label className="text-sm font-medium">نبذة عني</label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="اكتب حاجة عن نفسك..."
              rows={4}
              maxLength={280}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-foreground/40">{bio.length}/280</span>
              <Button size="sm" onClick={saveBio} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ"}
              </Button>
            </div>
          </div>

          {requests.length > 0 && (
            <div className="mt-8 space-y-2">
              <h2 className="font-display text-base">طلبات صداقة جديدة</h2>
              {requests.map((r) => (
                <div key={r.request_id} className="flex items-center justify-between gap-2 rounded-xl bg-card/60 px-3 py-2">
                  <Link to="/profile/$userId" params={{ userId: r.sender_id }} className="flex min-w-0 items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={r.avatar_url ?? undefined} />
                      <AvatarFallback>{r.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm">{r.full_name}</span>
                  </Link>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      onClick={() => respond(r.request_id, true)}
                      className="rounded-full bg-accent/15 p-1.5 text-accent"
                      title="قبول"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => respond(r.request_id, false)}
                      className="rounded-full bg-destructive/15 p-1.5 text-destructive"
                      title="رفض"
                    >
                      <XIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 space-y-2">
            <h2 className="font-display text-base">الأصدقاء {friends.length > 0 && `(${friends.length})`}</h2>
            {friends.length === 0 ? (
              <p className="text-sm text-foreground/60">لسه معندكش أصدقاء</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {friends.map((f) => (
                  <Link
                    key={f.user_id}
                    to="/profile/$userId"
                    params={{ userId: f.user_id }}
                    className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card/50 px-2.5 py-1.5 text-xs hover:border-accent/50"
                  >
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={f.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[9px]">{f.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {f.full_name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
