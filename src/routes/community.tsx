import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight, Bookmark, Heart, ImagePlus, MessageCircle, MoreHorizontal, Pin,
  Search, Sparkles, ThumbsDown, Trash2, X, FileText, Flag, Sun,
} from "lucide-react";
import { useAuth, isAdminRole } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { uploadToB2, mu, useB2Urls } from "@/lib/b2";
import { StarsBackground } from "@/components/IntroSequence";

export const Route = createFileRoute("/community")({
  head: () => ({ meta: [{ title: "المنشورات — Assuit SciDream" }] }),
  component: CommunityPage,
});

const DEPARTMENTS = ["الرياضيات", "الفيزياء", "الكيمياء", "الجيولوجيا", "النبات والميكروبيولوجي", "علم الحيوان", "الكيمياء الصناعية"];
const ROLE_LABEL: Record<string, string> = {
  super_admin: "سوبر أدمن", admin: "أدمن الموقع", department_advisor: "مشرف أكاديمي", instructor: "دكتور", assistant: "معيد", student: "طالب",
};
const KIND_LABEL: Record<string, string> = { general: "عام", study: "دراسي" };

type Media = { ref: string; mime: string; name: string };
type Author = {
  id: string; name: string; avatar_url: string | null; role: string | null; whatsapp?: string | null;
  subject_role_label?: string | null; rank_label?: string | null; followed: boolean;
};
type Post = {
  id: string; kind: "general" | "study"; body: string | null; department: string | null; year: number | null;
  subject_id: string | null; subject_name: string | null; media: Media[]; is_official: boolean; pinned: boolean;
  created_at: string; edited_at: string | null; mine: boolean; author: Author;
  love_count: number; dislike_count: number; my_reaction: "love" | "dislike" | null;
  comment_count: number; saved: boolean;
};
type Subj = { id: string; name_ar: string };

function ago(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `من ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `من ${h} ساعة`;
  const d = Math.floor(h / 24);
  if (d < 30) return `من ${d} يوم`;
  return new Date(iso).toLocaleDateString("ar-EG");
}
const isImg = (m: Media) => m.mime?.startsWith("image/");
const isVideo = (m: Media) => m.mime?.startsWith("video/");

function CommunityPage() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const isAdmin = isAdminRole(roles);
  useB2Urls();

  useEffect(() => { if (!loading && !user) navigate({ to: "/auth" }); }, [loading, user, navigate]);

  const [tab, setTab] = useState<"all" | "study" | "following" | "saved">("all");
  const [department, setDepartment] = useState<string | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const [commentsFor, setCommentsFor] = useState<Post | null>(null);
  const [peopleModal, setPeopleModal] = useState<{ title: string; load: () => Promise<{ id: string; name: string; avatar_url: string | null; role: string | null; followed: boolean }[]> } | null>(null);
  const [reports, setReports] = useState<ReportGroup[] | null>(null);

  async function load(before?: string) {
    setPostsLoading(!before);
    const { data, error } = await supabase.rpc("community_feed", {
      p_kind: tab === "study" ? "study" : null,
      p_department: department, p_year: year,
      p_mine: false, p_saved: tab === "saved", p_following: tab === "following",
      p_before: before ?? null, p_limit: 15, p_q: q.trim() || null,
    } as never);
    if (error) { toast.error(error.message); setPostsLoading(false); return; }
    const list = (data as Post[]) ?? [];
    setPosts((cur) => (before ? [...cur, ...list] : list));
    setPostsLoading(false);
  }
  useEffect(() => { if (user) void load(); }, [user?.id, tab, department, year]);

  function patchPost(id: string, patch: Partial<Post>) {
    setPosts((cur) => cur.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  async function react(p: Post, kind: "love" | "dislike") {
    const prev = { my_reaction: p.my_reaction, love_count: p.love_count, dislike_count: p.dislike_count };
    patchPost(p.id, { my_reaction: p.my_reaction === kind ? null : kind }); // لمسة سريعة بصريًا لحد ما يرجع الرد الحقيقي
    const { data, error } = await supabase.rpc("post_react", { p_post: p.id, p_kind: kind } as never);
    if (error) { toast.error(error.message); patchPost(p.id, prev); return; }
    const r = data as { love: number; dislike: number; mine: "love" | "dislike" | null };
    patchPost(p.id, { love_count: r.love, dislike_count: r.dislike, my_reaction: r.mine });
  }
  async function toggleSave(p: Post) {
    patchPost(p.id, { saved: !p.saved });
    const { error } = await supabase.rpc("post_save_toggle", { p_post: p.id } as never);
    if (error) { toast.error(error.message); patchPost(p.id, { saved: p.saved }); }
  }
  async function toggleFollow(p: Post) {
    patchPost(p.id, { author: { ...p.author, followed: !p.author.followed } });
    const { error } = await supabase.rpc("follow_toggle", { p_user: p.author.id } as never);
    if (error) toast.error(error.message);
  }
  async function togglePin(p: Post) {
    const { error } = await supabase.rpc("post_admin_set", { p_post: p.id, p_pinned: !p.pinned, p_official: p.is_official } as never);
    if (error) return toast.error(error.message);
    await load();
  }
  async function del(p: Post) {
    if (!confirm("حذف المنشور؟")) return;
    const { error } = await supabase.rpc("post_delete", { p_post: p.id } as never);
    if (error) return toast.error(error.message);
    setPosts((cur) => cur.filter((x) => x.id !== p.id));
  }
  async function report(p: Post) {
    const reason = window.prompt("سبب الإبلاغ (اختياري):") ?? "";
    const { error } = await supabase.rpc("post_report", { p_post: p.id, p_reason: reason || null } as never);
    if (error) return toast.error(error.message);
    toast.success("اتبعت البلاغ، شكراً");
  }

  async function loadReports() {
    const { data, error } = await supabase.rpc("post_reports_list" as never);
    if (error) return toast.error(error.message);
    setReports((data as ReportGroup[]) ?? []);
  }
  async function dismissReport(postId: string) {
    await supabase.rpc("post_reports_dismiss", { p_post: postId } as never);
    await loadReports();
  }

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center" dir="rtl"><div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>;
  }

  return (
    <div className="relative min-h-screen" dir="rtl">
      <StarsBackground />
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm hover:text-accent">
            <ArrowRight className="h-4 w-4" /> الرئيسية
          </Link>
          <h1 className="font-display text-lg font-semibold">المنشورات</h1>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button onClick={() => void loadReports()} className="rounded-full border border-border p-2 hover:border-accent" title="بلاغات المنشورات">
                <Flag className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className="mx-auto max-w-2xl px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto">
            {([["all", "الكل"], ["study", "دراسي"], ["following", "متابَعين"], ["saved", "محفوظاتي"]] as const).map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${tab === k ? "border-accent bg-accent/15 text-accent" : "border-border"}`}>{label}</button>
            ))}
          </div>
          <div className="mt-2 flex gap-2 overflow-x-auto">
            <button onClick={() => setDepartment(null)} className={`shrink-0 rounded-full border px-3 py-1 text-[11px] ${!department ? "border-accent bg-accent/15 text-accent" : "border-border"}`}>كل الأقسام</button>
            {DEPARTMENTS.map((d) => (
              <button key={d} onClick={() => setDepartment(d === department ? null : d)} className={`shrink-0 rounded-full border px-3 py-1 text-[11px] ${department === d ? "border-accent bg-accent/15 text-accent" : "border-border"}`}>{d}</button>
            ))}
          </div>
          <div className="relative mt-2">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40" />
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void load(); }}
              placeholder="دوّر في المنشورات..."
              className="w-full rounded-full border border-border bg-background/60 py-2 pe-9 ps-4 text-sm focus:border-accent focus:outline-none"
            />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-2xl px-4 py-5 space-y-4">
        <button onClick={() => setShowComposer(true)} className="cosmic-card flex w-full items-center gap-3 rounded-2xl p-4 text-right text-sm text-foreground/60 hover:border-accent">
          <Sparkles className="h-4 w-4 text-accent" /> اكتب منشور جديد...
        </button>

        {postsLoading ? (
          <div className="flex justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>
        ) : posts.length === 0 ? (
          <p className="py-16 text-center text-sm text-foreground/75">مفيش منشورات هنا لسه.</p>
        ) : (
          <>
            {posts.map((p) => (
              <PostCard
                key={p.id} post={p} isAdmin={isAdmin}
                onReact={react} onSave={toggleSave} onFollow={toggleFollow} onPin={togglePin} onDelete={del} onReport={report}
                onComments={() => setCommentsFor(p)}
                onReactors={() => setPeopleModal({
                  title: "عملوا إعجاب",
                  load: async () => {
                    const { data } = await supabase.rpc("post_reactors", { p_post: p.id } as never);
                    return (data as any[]) ?? [];
                  },
                })}
              />
            ))}
            {posts.length >= 15 && (
              <button onClick={() => load(posts[posts.length - 1]?.created_at)} className="w-full rounded-full border border-border py-2 text-xs hover:border-accent">
                تحميل المزيد
              </button>
            )}
          </>
        )}
      </main>

      {showComposer && (
        <ComposerModal
          onClose={() => setShowComposer(false)}
          onPosted={async () => { setShowComposer(false); await load(); }}
        />
      )}
      {commentsFor && <CommentsModal post={commentsFor} onClose={() => setCommentsFor(null)} onCountChange={(n) => patchPost(commentsFor.id, { comment_count: n })} />}
      {peopleModal && <PeopleModal title={peopleModal.title} load={peopleModal.load} onClose={() => setPeopleModal(null)} />}
      {reports && <ReportsModal reports={reports} onClose={() => setReports(null)} onDismiss={dismissReport} onDelete={async (id) => { await supabase.rpc("post_delete", { p_post: id } as never); await loadReports(); }} />}
    </div>
  );
}

/* ================= Post Card ================= */

function PostCard({ post, isAdmin, onReact, onSave, onFollow, onPin, onDelete, onReport, onComments, onReactors }: {
  post: Post; isAdmin: boolean;
  onReact: (p: Post, k: "love" | "dislike") => void; onSave: (p: Post) => void; onFollow: (p: Post) => void;
  onPin: (p: Post) => void; onDelete: (p: Post) => void; onReport: (p: Post) => void;
  onComments: () => void; onReactors: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const images = post.media.filter(isImg);
  const videos = post.media.filter(isVideo);
  const files = post.media.filter((m) => !isImg(m) && !isVideo(m));
  const long = (post.body?.length ?? 0) > 280;
  const a = post.author;

  return (
    <div className={`cosmic-card rounded-2xl p-4 ${post.is_official ? "border-accent/50" : ""}`}>
      <div className="flex items-start gap-3">
        {a.avatar_url ? <img src={mu(a.avatar_url)} className="h-10 w-10 rounded-full object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose/30 text-sm font-semibold">{a.name?.[0] ?? "؟"}</div>}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {post.pinned && <Pin className="h-3.5 w-3.5 text-accent" />}
            {post.is_official && <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] text-accent">رسمي</span>}
            <span className="font-semibold">{a.name}</span>
            {a.role === "super_admin" ? <Sun className="h-3.5 w-3.5 text-accent" /> : (a.rank_label || a.subject_role_label) ? (
              <span className="text-[11px] text-foreground/55">({a.rank_label ?? a.subject_role_label})</span>
            ) : a.role ? <span className="text-[11px] text-foreground/55">({ROLE_LABEL[a.role] ?? a.role})</span> : null}
          </div>
          <p className="text-[11px] text-foreground/50">{ago(post.created_at)}{post.edited_at ? " · معدّل" : ""}</p>
        </div>
        {!post.mine && !a.followed && (
          <button onClick={() => onFollow(post)} className="shrink-0 rounded-full border border-accent px-2.5 py-1 text-[11px] font-semibold text-accent">متابعة</button>
        )}
        <div className="relative">
          <button onClick={() => setMenuOpen((v) => !v)} className="rounded-full p-1.5 text-foreground/60 hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></button>
          {menuOpen && (
            <div className="absolute left-0 top-8 z-10 w-44 overflow-hidden rounded-xl border border-border bg-background shadow-lg" onMouseLeave={() => setMenuOpen(false)}>
              {isAdmin && (
                <button onClick={() => { setMenuOpen(false); onPin(post); }} className="block w-full px-4 py-2.5 text-right text-xs hover:bg-secondary">{post.pinned ? "إلغاء التثبيت" : "تثبيت المنشور"}</button>
              )}
              {(post.mine || isAdmin) && (
                <button onClick={() => { setMenuOpen(false); onDelete(post); }} className="block w-full px-4 py-2.5 text-right text-xs text-destructive hover:bg-destructive/10">حذف المنشور</button>
              )}
              {!post.mine && (
                <button onClick={() => { setMenuOpen(false); onReport(post); }} className="block w-full px-4 py-2.5 text-right text-xs hover:bg-secondary">إبلاغ عن المنشور</button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] ${post.kind === "study" ? "bg-accent/15 text-accent" : "bg-secondary"}`}>{KIND_LABEL[post.kind]}</span>
        {post.department && <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px]">{post.department}</span>}
        {post.year && <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px]">السنة {post.year}</span>}
        {post.subject_name && <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px]">{post.subject_name}</span>}
      </div>

      {post.body && (
        <div className="mt-2.5">
          <p className={`whitespace-pre-wrap text-sm leading-7 ${!expanded && long ? "line-clamp-6" : ""}`}>{post.body}</p>
          {long && !expanded && <button onClick={() => setExpanded(true)} className="mt-1 text-xs font-semibold text-accent">عرض المزيد</button>}
        </div>
      )}

      {images.length > 0 && (
        <div className={`mt-3 grid gap-1 overflow-hidden rounded-xl ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {images.slice(0, 4).map((m, i) => (
            <a key={m.ref} href={mu(m.ref)} target="_blank" rel="noreferrer" className="relative block">
              <img src={mu(m.ref)} className={`w-full object-cover ${images.length === 1 ? "max-h-96" : "aspect-square"}`} />
              {i === 3 && images.length > 4 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-xl font-bold text-white">+{images.length - 4}</div>
              )}
            </a>
          ))}
        </div>
      )}
      {videos.map((m) => (
        <video key={m.ref} src={mu(m.ref)} controls className="mt-3 max-h-96 w-full rounded-xl bg-black" />
      ))}
      {files.map((m) => (
        <a key={m.ref} href={mu(m.ref)} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm hover:border-accent">
          <FileText className="h-4 w-4 text-accent" /> <span className="flex-1 truncate">{m.name}</span>
        </a>
      ))}

      {(post.love_count > 0 || post.dislike_count > 0 || post.comment_count > 0) && (
        <div className="mt-3 flex items-center justify-between text-xs text-foreground/60">
          <button onClick={onComments}>{post.comment_count > 0 ? `${post.comment_count} تعليق` : ""}</button>
          <div className="flex items-center gap-3">
            {post.love_count > 0 && (
              <button onClick={onReactors} className="flex items-center gap-1"><span>{post.love_count}</span><Heart className="h-3.5 w-3.5 fill-rose text-rose" /></button>
            )}
            {post.dislike_count > 0 && <span className="flex items-center gap-1">{post.dislike_count}<ThumbsDown className="h-3.5 w-3.5 fill-destructive text-destructive" /></span>}
          </div>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between border-t border-border pt-2.5">
        <button onClick={() => onSave(post)} className="rounded-full p-1.5"><Bookmark className={`h-[18px] w-[18px] ${post.saved ? "fill-accent text-accent" : "text-foreground/70"}`} /></button>
        <button onClick={onComments} className="flex items-center gap-1.5 text-xs text-foreground/70"><MessageCircle className="h-[18px] w-[18px]" /> تعليق</button>
        <button onClick={() => onReact(post, "love")} className={`flex items-center gap-1.5 text-xs ${post.my_reaction === "love" ? "text-rose" : "text-foreground/70"}`}>
          <Heart className="h-[18px] w-[18px]" fill={post.my_reaction === "love" ? "currentColor" : "none"} /> إعجاب
        </button>
        <button onClick={() => onReact(post, "dislike")} className={`flex items-center gap-1.5 text-xs ${post.my_reaction === "dislike" ? "text-destructive" : "text-foreground/70"}`}>
          <ThumbsDown className="h-[18px] w-[18px]" fill={post.my_reaction === "dislike" ? "currentColor" : "none"} /> عدم إعجاب
        </button>
      </div>
    </div>
  );
}

/* ================= Composer ================= */

function ComposerModal({ onClose, onPosted }: { onClose: () => void; onPosted: () => void }) {
  const [kind, setKind] = useState<"general" | "study">("general");
  const [body, setBody] = useState("");
  const [department, setDepartment] = useState<string | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subj[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (kind !== "study") return;
    void supabase.from("subjects").select("id,name_ar").order("name_ar").then(({ data }) => setSubjects((data as Subj[]) ?? []));
  }, [kind]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((cur) => [...cur, ...Array.from(list)].slice(0, 10));
  }

  async function submit() {
    if (!body.trim() && files.length === 0) { toast.error("اكتب نص أو ضيف صور/ملفات"); return; }
    setBusy(true);
    try {
      const scope = `post-${crypto.randomUUID()}`;
      const media: Media[] = [];
      for (const f of files) {
        const { ref } = await uploadToB2("group-media", scope, f);
        media.push({ ref, mime: f.type, name: f.name });
      }
      const { error } = await supabase.rpc("post_create", {
        p_kind: kind, p_body: body.trim() || null,
        p_department: kind === "study" ? department : null,
        p_year: kind === "study" ? year : null,
        p_subject: kind === "study" ? subjectId : null,
        p_media: media,
      } as never);
      if (error) throw error;
      toast.success("اتنشر المنشور ✨");
      onPosted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل النشر");
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => !busy && onClose()}>
      <div className="cosmic-card max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg">منشور جديد</h3>
          <button onClick={() => !busy && onClose()}><X className="h-4 w-4" /></button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setKind("general")} className={`rounded-full border px-3 py-1.5 text-xs ${kind === "general" ? "border-accent bg-accent/15 text-accent" : "border-border"}`}>عام</button>
          <button onClick={() => setKind("study")} className={`rounded-full border px-3 py-1.5 text-xs ${kind === "study" ? "border-accent bg-accent/15 text-accent" : "border-border"}`}>دراسي</button>
        </div>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="اكتب اللي في بالك..." className="mt-3 w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm focus:border-accent focus:outline-none" />

        {kind === "study" && (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {DEPARTMENTS.map((d) => <button key={d} onClick={() => setDepartment(d === department ? null : d)} className={`rounded-full border px-2.5 py-1 text-[11px] ${department === d ? "border-accent bg-accent/15 text-accent" : "border-border"}`}>{d}</button>)}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 4].map((y) => <button key={y} onClick={() => setYear(y === year ? null : y)} className={`rounded-full border px-2.5 py-1 text-[11px] ${year === y ? "border-accent bg-accent/15 text-accent" : "border-border"}`}>السنة {y}</button>)}
            </div>
            <select value={subjectId ?? ""} onChange={(e) => setSubjectId(e.target.value || null)} className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm focus:border-accent focus:outline-none">
              <option value="">بدون مادة محددة</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name_ar}</option>)}
            </select>
          </div>
        )}

        {files.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {files.map((f, i) => (
              <div key={i} className="relative">
                {f.type.startsWith("image/") ? <img src={URL.createObjectURL(f)} className="h-16 w-16 rounded-lg object-cover" /> : <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-secondary text-[10px]">{f.name.slice(0, 10)}</div>}
                <button onClick={() => setFiles((cur) => cur.filter((_, j) => j !== i))} className="absolute -top-1.5 -left-1.5 rounded-full bg-black/70 p-0.5"><X className="h-3 w-3 text-white" /></button>
              </div>
            ))}
          </div>
        )}
        {files.length < 10 && (
          <button onClick={() => fileRef.current?.click()} className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3.5 py-1.5 text-xs hover:border-accent">
            <ImagePlus className="h-3.5 w-3.5" /> صور / فيديو / ملفات
          </button>
        )}
        <input ref={fileRef} type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx" className="hidden" onChange={(e) => addFiles(e.target.files)} />

        <button onClick={submit} disabled={busy} className="mt-5 w-full rounded-full bg-gradient-cosmic py-2.5 text-sm font-semibold text-primary-foreground shadow-rose disabled:opacity-60">
          {busy ? "جاري النشر..." : "نشر"}
        </button>
      </div>
    </div>
  );
}

/* ================= Comments ================= */

type Comment = { id: string; parent_id: string | null; body: string; created_at: string; edited_at: string | null; mine: boolean; author: { id: string; name: string; avatar_url: string | null; role: string | null; subject_role_label?: string | null } };

function CommentsModal({ post, onClose, onCountChange }: { post: Post; onClose: () => void; onCountChange: (n: number) => void }) {
  useB2Urls();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.rpc("post_comments_list", { p_post: post.id } as never);
    if (error) toast.error(error.message);
    const list = (data as Comment[]) ?? [];
    setComments(list);
    onCountChange(list.length);
    setLoading(false);
  }
  useEffect(() => { void load(); }, [post.id]);

  async function send() {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    const { error } = await supabase.rpc("post_comment_add", { p_post: post.id, p_body: body } as never);
    setSending(false);
    if (error) return toast.error(error.message);
    setText("");
    await load();
  }
  async function del(id: string) {
    if (!confirm("حذف التعليق؟")) return;
    await supabase.rpc("post_comment_delete", { p_comment: id } as never);
    await load();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-background" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h3 className="font-display text-base">التعليقات</h3>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-10"><div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>
          ) : comments.length === 0 ? (
            <p className="py-10 text-center text-xs text-foreground/60">لسه مفيش تعليقات، كن أول واحد.</p>
          ) : comments.map((c) => (
            <div key={c.id} className={`flex items-start gap-2.5 ${c.parent_id ? "ms-8" : ""}`}>
              {c.author.avatar_url ? <img src={mu(c.author.avatar_url)} className="h-8 w-8 shrink-0 rounded-full object-cover" /> : <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose/30 text-xs">{c.author.name?.[0] ?? "؟"}</div>}
              <div className="min-w-0 flex-1 rounded-xl bg-secondary/50 px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold">{c.author.name}</span>
                  {c.author.subject_role_label && <span className="text-[10px] text-foreground/50">({c.author.subject_role_label})</span>}
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-sm">{c.body}</p>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-foreground/45">
                  <span>{ago(c.created_at)}</span>
                  {c.mine && <button onClick={() => del(c.id)} className="text-destructive">حذف</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t border-border p-3">
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="اكتب تعليق..." className="flex-1 rounded-full border border-border bg-background/60 px-4 py-2 text-sm focus:border-accent focus:outline-none" />
          <button onClick={send} disabled={sending || !text.trim()} className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60">إرسال</button>
        </div>
      </div>
    </div>
  );
}

/* ================= People (reactors / followers) ================= */

function PeopleModal({ title, load, onClose }: { title: string; load: () => Promise<{ id: string; name: string; avatar_url: string | null; role: string | null; followed: boolean }[]>; onClose: () => void }) {
  useB2Urls();
  const [rows, setRows] = useState<{ id: string; name: string; avatar_url: string | null; role: string | null; followed: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { void load().then(setRows).finally(() => setLoading(false)); }, []);

  async function follow(p: typeof rows[number]) {
    setRows((cur) => cur.map((x) => (x.id === p.id ? { ...x, followed: !x.followed } : x)));
    const { error } = await supabase.rpc("follow_toggle", { p_user: p.id } as never);
    if (error) { toast.error(error.message); setRows((cur) => cur.map((x) => (x.id === p.id ? p : x))); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="max-h-[75vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-border bg-background p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-base">{title}</h3>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" /></div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-xs text-foreground/60">مفيش حد هنا لسه.</p>
        ) : rows.map((p) => (
          <div key={p.id} className="flex items-center gap-2.5 py-2">
            <button onClick={() => follow(p)} className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${p.followed ? "border-accent bg-accent text-primary-foreground" : "border-accent text-accent"}`}>{p.followed ? "متابَع ✓" : "متابعة"}</button>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {p.avatar_url ? <img src={mu(p.avatar_url)} className="h-9 w-9 rounded-full object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose/30 text-xs">{p.name?.[0] ?? "؟"}</div>}
              <span className="truncate text-sm font-semibold">{p.name} {p.role && <span className="text-[11px] font-normal text-foreground/50">({ROLE_LABEL[p.role] ?? p.role})</span>}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= Admin: reports ================= */

type ReportGroup = { post: Post; count: number; reports: { id: string; reason: string | null; created_at: string; reporter: string }[] };

function ReportsModal({ reports, onClose, onDismiss, onDelete }: { reports: ReportGroup[]; onClose: () => void; onDismiss: (id: string) => void; onDelete: (id: string) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-background p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-base">بلاغات المنشورات ({reports.length})</h3>
          <button onClick={onClose}><X className="h-4 w-4" /></button>
        </div>
        {reports.length === 0 ? (
          <p className="py-8 text-center text-xs text-foreground/60">مفيش بلاغات حالياً.</p>
        ) : reports.map((r) => (
          <div key={r.post.id} className="mb-3 rounded-xl border border-border/60 p-3">
            <p className="text-xs text-foreground/60">{r.count} بلاغ · {r.post.author.name}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{r.post.body}</p>
            <div className="mt-1.5 space-y-0.5">
              {r.reports.slice(0, 4).map((rep) => (
                <p key={rep.id} className="text-[11px] text-foreground/50">— {rep.reporter}{rep.reason ? `: ${rep.reason}` : ""}</p>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <button onClick={() => onDismiss(r.post.id)} className="rounded-full border border-border px-3 py-1 text-[11px]">تجاهل البلاغات</button>
              <button onClick={() => onDelete(r.post.id)} className="rounded-full border border-destructive/50 px-3 py-1 text-[11px] text-destructive">حذف المنشور</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
