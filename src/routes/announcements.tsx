import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Bell, Loader2, Pin, Plus, Trash2 } from "lucide-react";
import { useAuth, isAdminRole } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { CosmicBackground } from "@/components/CosmicBackground";

export const Route = createFileRoute("/announcements")({
  head: () => ({ meta: [{ title: "الإعلانات — Assuit SciDream" }] }),
  component: AnnouncementsPage,
});

interface Announcement {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
  author_id: string | null;
}

function AnnouncementsPage() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const isOwner = user?.email?.trim().toLowerCase() === "abdalahkotp31@gmail.com";
  const isAdmin = isOwner || isAdminRole(roles);
  const [items, setItems] = useState<Announcement[]>([]);
  const [busy, setBusy] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", pinned: false });

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  async function load() {
    setBusy(true);
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    setItems((data as Announcement[]) ?? []);
    setBusy(false);
  }
  useEffect(() => { void load(); }, []);

  async function submit() {
    if (!form.title.trim() || !form.body.trim() || !user) return;
    const { error } = await supabase.from("announcements").insert({
      title: form.title, body: form.body, pinned: form.pinned, author_id: user.id,
    });
    if (!error) {
      setForm({ title: "", body: "", pinned: false });
      setCreating(false);
      await load();
    } else alert(error.message);
  }

  async function togglePin(a: Announcement) {
    await supabase.from("announcements").update({ pinned: !a.pinned }).eq("id", a.id);
    await load();
  }
  async function del(id: string) {
    if (!confirm("حذف هذا الإعلان؟")) return;
    await supabase.from("announcements").delete().eq("id", id);
    await load();
  }

  return (
    <div className="relative min-h-screen" dir="rtl">
      <CosmicBackground density={18} />
      <header className="relative z-10 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm hover:text-accent">
            <ArrowRight className="h-4 w-4" /> الرئيسية
          </Link>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-accent" />
            <h1 className="font-display text-xl font-semibold">الإعلانات</h1>
          </div>
          {isAdmin ? (
            <button onClick={() => setCreating((v) => !v)} className="inline-flex items-center gap-1 rounded-full bg-gradient-cosmic px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-rose">
              <Plus className="h-3.5 w-3.5" /> إضافة
            </button>
          ) : <span />}
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-3xl px-6 py-8">

        {isAdmin && creating && (
          <div className="cosmic-card mb-6 rounded-3xl p-5 space-y-3">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="العنوان"
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm focus:border-accent focus:outline-none" />
            <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="نص الإعلان..." rows={4}
              className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm focus:border-accent focus:outline-none" />
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} />
              تثبيت في الأعلى
            </label>
            <button onClick={submit} className="rounded-full bg-gradient-cosmic px-5 py-1.5 text-xs font-semibold text-primary-foreground shadow-rose">نشر</button>
          </div>
        )}

        {busy ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
        ) : items.length === 0 ? (
          <p className="text-center text-sm text-foreground/75 py-20">لا توجد إعلانات حالياً.</p>
        ) : (
          <div className="space-y-3">
            {items.map((a) => (
              <article key={a.id} className={`cosmic-card rounded-2xl p-5 ${a.pinned ? "ring-1 ring-accent/50" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {a.pinned && <Pin className="h-3.5 w-3.5 text-accent" />}
                      <h3 className="font-display text-lg">{a.title}</h3>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/75">{a.body}</p>
                    <div className="mt-2 text-[11px] text-foreground/75">{new Date(a.created_at).toLocaleDateString("ar-EG")}</div>
                  </div>
                  {isAdmin && (
                    <div className="flex flex-col gap-2">
                      <button onClick={() => togglePin(a)} className="rounded-full border border-border p-1.5 hover:border-accent" title="تثبيت">
                        <Pin className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => del(a.id)} className="rounded-full border border-destructive/50 p-1.5 text-destructive hover:bg-destructive/10" title="حذف">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
