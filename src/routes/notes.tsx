import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, FileText, Loader2, Plus, Trash2, Save } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { CosmicBackground } from "@/components/CosmicBackground";

export const Route = createFileRoute("/notes")({
  head: () => ({ meta: [{ title: "ملاحظاتي — Assuit SciDream" }] }),
  component: NotesPage,
});

interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  updated_at: string;
}

const COLORS = ["rose", "gold", "cosmic"] as const;
const colorCls: Record<string, string> = {
  rose: "from-rose/40 to-rose/10",
  gold: "from-gold/40 to-gold/10",
  cosmic: "from-cosmic/40 to-cosmic/10",
};

function NotesPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [busy, setBusy] = useState(true);
  const [active, setActive] = useState<Note | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  async function load() {
    if (!user) return;
    setBusy(true);
    const { data } = await supabase
      .from("notes")
      .select("id,title,content,color,updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    setNotes((data as Note[]) ?? []);
    setBusy(false);
  }
  useEffect(() => { void load(); }, [user]);

  async function createNote() {
    if (!user) return;
    const { data, error } = await supabase
      .from("notes")
      .insert({ user_id: user.id, title: "ملاحظة جديدة", content: "", color: "rose" })
      .select("*")
      .single();
    if (!error && data) { await load(); setActive(data as Note); }
  }

  async function save() {
    if (!active) return;
    await supabase.from("notes").update({
      title: active.title, content: active.content, color: active.color,
    }).eq("id", active.id);
    await load();
  }

  async function del(id: string) {
    if (!confirm("هل تريد حذف هذه الملاحظة؟")) return;
    await supabase.from("notes").delete().eq("id", id);
    if (active?.id === id) setActive(null);
    await load();
  }

  return (
    <div className="relative min-h-screen" dir="rtl">
      <CosmicBackground density={18} />
      <main className="relative z-10 mx-auto max-w-6xl px-6 py-8">
        <header className="mb-6 flex items-center justify-between">
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-accent">
            <ArrowRight className="h-4 w-4" /> الرئيسية
          </Link>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent" />
            <h1 className="font-display text-xl">ملاحظاتي</h1>
          </div>
          <button onClick={createNote} className="inline-flex items-center gap-1 rounded-full bg-gradient-cosmic px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-rose">
            <Plus className="h-3.5 w-3.5" /> ملاحظة
          </button>
        </header>

        {busy ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-accent" /></div>
        ) : (
          <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
            <div className="space-y-2">
              {notes.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">لا توجد ملاحظات. ابدأ بإضافة واحدة ✨</p>}
              {notes.map((n) => (
                <button key={n.id} onClick={() => setActive(n)}
                  className={`block w-full rounded-2xl bg-gradient-to-br ${colorCls[n.color] ?? colorCls.rose} p-4 text-right transition hover:-translate-y-0.5 ${active?.id === n.id ? "ring-2 ring-accent" : ""}`}>
                  <div className="font-semibold truncate">{n.title || "بدون عنوان"}</div>
                  <div className="text-xs text-muted-foreground truncate mt-1">{n.content || "..."}</div>
                </button>
              ))}
            </div>

            <div className="cosmic-card rounded-3xl p-5">
              {!active ? (
                <p className="text-center text-sm text-muted-foreground py-20">اختر ملاحظة من القائمة أو أنشئ واحدة.</p>
              ) : (
                <div className="space-y-3">
                  <input value={active.title} onChange={(e) => setActive({ ...active, title: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 font-display text-lg focus:border-accent focus:outline-none" />
                  <textarea value={active.content} onChange={(e) => setActive({ ...active, content: e.target.value })}
                    rows={12}
                    className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm focus:border-accent focus:outline-none" />
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      {COLORS.map((c) => (
                        <button key={c} onClick={() => setActive({ ...active, color: c })}
                          className={`h-7 w-7 rounded-full bg-gradient-to-br ${colorCls[c]} ${active.color === c ? "ring-2 ring-accent" : ""}`} />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => del(active.id)} className="inline-flex items-center gap-1 rounded-full border border-destructive/50 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3 w-3" /> حذف
                      </button>
                      <button onClick={save} className="inline-flex items-center gap-1 rounded-full bg-gradient-cosmic px-4 py-1.5 text-xs font-semibold text-primary-foreground shadow-rose">
                        <Save className="h-3 w-3" /> حفظ
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
