import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2, ArrowLeft, FolderPlus, Folder, FileText, Youtube, Link as LinkIcon,
  Plus, ChevronLeft, X, Trash2, Upload, Download, HardDriveDownload,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, isAdminRole } from "@/lib/auth";
import { CosmicBackground } from "@/components/CosmicBackground";
import { Logo } from "@/components/Logo";
import { extractYouTubeId } from "@/lib/youtube";

export const Route = createFileRoute("/subjects/$subjectId")({
  head: () => ({ meta: [{ title: "المادة — Assuit SciDream" }] }),
  component: SubjectDetailPage,
});

interface Subject {
  id: string; code: string; name_ar: string; name_en: string | null;
  department: string; year: number; semester: number; credit_hours: number | null; description: string | null;
}
interface Folder {
  id: string; subject_id: string; parent_id: string | null; name: string; sort_order: number;
}
interface ContentItem {
  id: string; folder_id: string; type: "pdf" | "youtube" | "link";
  title: string; description: string | null; file_url: string | null; youtube_id: string | null; external_url: string | null;
}

function SubjectDetailPage() {
  const { subjectId } = Route.useParams();
  const { user, profile, roles, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isAdmin = isAdminRole(roles);

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [showAddContent, setShowAddContent] = useState(false);
  const [showImportDrive, setShowImportDrive] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    if (!profile) return;
    if (profile.verification_status !== "verified" && !isAdmin) navigate({ to: "/pending" });
  }, [user, profile, loading, isAdmin, navigate]);

  const { data: subject } = useQuery({
    queryKey: ["subject", subjectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("subjects").select("*").eq("id", subjectId).maybeSingle();
      if (error) throw error;
      return data as Subject | null;
    },
    enabled: !!user,
  });

  const { data: folders = [] } = useQuery({
    queryKey: ["folders", subjectId],
    queryFn: async () => {
      const { data, error } = await supabase.from("folders").select("*").eq("subject_id", subjectId).order("sort_order").order("name");
      if (error) throw error;
      return data as Folder[];
    },
    enabled: !!user,
  });

  const { data: items = [] } = useQuery({
    queryKey: ["content", subjectId, currentFolderId],
    queryFn: async () => {
      if (!currentFolderId) return [];
      const { data, error } = await supabase.from("content_items").select("*").eq("folder_id", currentFolderId).order("sort_order").order("created_at");
      if (error) throw error;
      return data as ContentItem[];
    },
    enabled: !!user && !!currentFolderId,
  });

  const childFolders = useMemo(
    () => folders.filter((f) => f.parent_id === currentFolderId),
    [folders, currentFolderId]
  );

  const breadcrumb = useMemo(() => {
    const trail: Folder[] = [];
    let cur = folders.find((f) => f.id === currentFolderId);
    while (cur) {
      trail.unshift(cur);
      cur = cur.parent_id ? folders.find((f) => f.id === cur!.parent_id) : undefined;
    }
    return trail;
  }, [folders, currentFolderId]);

  async function deleteFolder(id: string) {
    if (!confirm("متأكد؟ هتمسح الفولدر وكل اللي جواه.")) return;
    const { error } = await supabase.from("folders").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("اتمسح");
    qc.invalidateQueries({ queryKey: ["folders", subjectId] });
  }

  async function deleteItem(item: ContentItem) {
    if (!confirm("متأكد؟")) return;
    if (item.type === "pdf" && item.file_url) {
      await supabase.storage.from("subject-files").remove([item.file_url]);
    }
    const { error } = await supabase.from("content_items").delete().eq("id", item.id);
    if (error) return toast.error(error.message);
    toast.success("اتمسح");
    qc.invalidateQueries({ queryKey: ["content", subjectId, currentFolderId] });
  }

  async function openPdf(path: string) {
    const { data, error } = await supabase.storage.from("subject-files").createSignedUrl(path, 3600);
    if (error || !data) return toast.error("مش قادر يفتح الملف");
    window.open(data.signedUrl, "_blank");
  }

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;
  }

  return (
    <div className="relative min-h-screen">
      <CosmicBackground density={22} />

      <header className="relative z-10 border-b border-border/60 bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/subjects" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 rotate-180" /> كل المواد
          </Link>
          <Logo size={36} />
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 py-8">
        {!subject ? (
          <div className="cosmic-card rounded-2xl p-8 text-center text-muted-foreground">المادة مش موجودة.</div>
        ) : (
          <>
            <div className="cosmic-card rounded-3xl p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="inline-block rounded-lg bg-gradient-cosmic px-2.5 py-1 text-[10px] font-semibold text-primary-foreground">{subject.code}</div>
                  <h1 className="mt-3 font-display text-3xl">{subject.name_ar}</h1>
                  {subject.name_en && <div className="mt-1 text-sm text-muted-foreground">{subject.name_en}</div>}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-secondary px-3 py-1">{subject.department}</span>
                    <span className="rounded-full bg-secondary px-3 py-1">السنة {subject.year}</span>
                    <span className="rounded-full bg-secondary px-3 py-1">الفصل {subject.semester}</span>
                    <span className="rounded-full bg-secondary px-3 py-1">{subject.credit_hours ?? 3} ساعة</span>
                  </div>
                  {subject.description && <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{subject.description}</p>}
                </div>
                <Link
                  to="/subjects/$subjectId/quizzes"
                  params={{ subjectId: subject.id }}
                  className="inline-flex items-center gap-2 self-start rounded-full bg-gradient-cosmic px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-rose transition hover:shadow-glow"
                >
                  اختبارات المادة ✨
                </Link>
              </div>
            </div>

            {/* Breadcrumb */}
            <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
              <button onClick={() => setCurrentFolderId(null)} className={`rounded-full px-3 py-1 ${currentFolderId === null ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>
                الجذر
              </button>
              {breadcrumb.map((f) => (
                <div key={f.id} className="flex items-center gap-2">
                  <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
                  <button onClick={() => setCurrentFolderId(f.id)} className={`rounded-full px-3 py-1 ${currentFolderId === f.id ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>
                    {f.name}
                  </button>
                </div>
              ))}
            </div>

            {isAdmin && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => setShowAddFolder(true)} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs hover:border-accent">
                  <FolderPlus className="h-3.5 w-3.5" /> فولدر جديد
                </button>
                {currentFolderId && (
                  <button onClick={() => setShowAddContent(true)} className="inline-flex items-center gap-1.5 rounded-full bg-gradient-cosmic px-4 py-1.5 text-xs font-semibold text-primary-foreground">
                    <Plus className="h-3.5 w-3.5" /> محتوى جديد
                  </button>
                )}
                {currentFolderId && (
                  <button onClick={() => setShowImportDrive(true)} className="inline-flex items-center gap-1.5 rounded-full border border-green-500/50 bg-green-500/10 px-4 py-1.5 text-xs font-semibold text-green-400 hover:bg-green-500/20">
                    <HardDriveDownload className="h-3.5 w-3.5" /> استيراد من Drive
                  </button>
                )}
              </div>
            )}

            {/* Folders grid */}
            {childFolders.length > 0 && (
              <div className="mt-6">
                <h2 className="text-sm font-semibold text-muted-foreground">الفولدرات</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {childFolders.map((f) => (
                    <div key={f.id} className="cosmic-card group flex items-center justify-between rounded-2xl p-4 transition hover:shadow-glow">
                      <button onClick={() => setCurrentFolderId(f.id)} className="flex flex-1 items-center gap-3 text-right">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gold/40 to-rose/30">
                          <Folder className="h-5 w-5" />
                        </div>
                        <div className="font-medium">{f.name}</div>
                      </button>
                      {isAdmin && (
                        <button onClick={() => deleteFolder(f.id)} className="rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Items */}
            {currentFolderId && (
              <div className="mt-6">
                <h2 className="text-sm font-semibold text-muted-foreground">المحتوى</h2>
                {items.length === 0 ? (
                  <div className="mt-3 cosmic-card rounded-2xl p-8 text-center text-sm text-muted-foreground">
                    مفيش محتوى لحد دلوقتي.
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    {items.map((it) => <ContentRow key={it.id} item={it} isAdmin={isAdmin} onDelete={() => deleteItem(it)} onOpenPdf={openPdf} />)}
                  </div>
                )}
              </div>
            )}

            {childFolders.length === 0 && !currentFolderId && (
              <div className="mt-6 cosmic-card rounded-2xl p-8 text-center text-sm text-muted-foreground">
                مفيش فولدرات بعد. {isAdmin && "ابدأ بإضافة فولدر."}
              </div>
            )}
          </>
        )}
      </main>

      {showAddFolder && (
        <AddFolderModal
          subjectId={subjectId}
          parentId={currentFolderId}
          onClose={() => setShowAddFolder(false)}
          onDone={() => { qc.invalidateQueries({ queryKey: ["folders", subjectId] }); setShowAddFolder(false); }}
        />
      )}
      {showAddContent && currentFolderId && (
        <AddContentModal
          folderId={currentFolderId}
          onClose={() => setShowAddContent(false)}
          onDone={() => { qc.invalidateQueries({ queryKey: ["content", subjectId, currentFolderId] }); setShowAddContent(false); }}
        />
      )}
      {showImportDrive && currentFolderId && (
        <ImportDriveModal
          folderId={currentFolderId}
          onClose={() => setShowImportDrive(false)}
          onDone={() => { qc.invalidateQueries({ queryKey: ["content", subjectId, currentFolderId] }); setShowImportDrive(false); }}
        />
      )}
    </div>
  );
}

function ContentRow({ item, isAdmin, onDelete, onOpenPdf }: {
  item: ContentItem; isAdmin: boolean; onDelete: () => void; onOpenPdf: (path: string) => void;
}) {
  if (item.type === "youtube" && item.youtube_id) {
    return (
      <div className="cosmic-card overflow-hidden rounded-2xl">
        <div className="flex items-start justify-between gap-3 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500"><Youtube className="h-5 w-5" /></div>
            <div>
              <div className="font-medium">{item.title}</div>
              {item.description && <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>}
            </div>
          </div>
          {isAdmin && <button onClick={onDelete} className="rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>}
        </div>
        <div className="aspect-video w-full bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${item.youtube_id}`}
            title={item.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      </div>
    );
  }
  if (item.type === "pdf" && item.file_url) {
    return (
      <div className="cosmic-card flex items-center justify-between gap-3 rounded-2xl p-4">
        <button onClick={() => onOpenPdf(item.file_url!)} className="flex flex-1 items-start gap-3 text-right">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose/20 text-rose"><FileText className="h-5 w-5" /></div>
          <div>
            <div className="font-medium">{item.title}</div>
            {item.description && <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>}
          </div>
        </button>
        <div className="flex items-center gap-1">
          <button onClick={() => onOpenPdf(item.file_url!)} className="rounded-full p-2 text-muted-foreground hover:bg-secondary"><Download className="h-4 w-4" /></button>
          {isAdmin && <button onClick={onDelete} className="rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>}
        </div>
      </div>
    );
  }
  return (
    <div className="cosmic-card flex items-center justify-between gap-3 rounded-2xl p-4">
      <a href={item.external_url ?? "#"} target="_blank" rel="noreferrer" className="flex flex-1 items-start gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          item.external_url?.includes("drive.google.com")
            ? "bg-rose/20 text-rose"
            : "bg-gold/20 text-gold"
        }`}>
          {item.external_url?.includes("drive.google.com")
            ? <FileText className="h-5 w-5" />
            : <LinkIcon className="h-5 w-5" />
          }
        </div>
        <div>
          <div className="font-medium">{item.title}</div>
          {item.description && <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>}
          {item.external_url?.includes("drive.google.com") && (
            <span className="mt-1 inline-block rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] text-green-400">Google Drive PDF</span>
          )}
        </div>
      </a>
      <div className="flex items-center gap-1">
        <a href={item.external_url ?? "#"} target="_blank" rel="noreferrer" className="rounded-full p-2 text-muted-foreground hover:bg-secondary">
          <Download className="h-4 w-4" />
        </a>
        {isAdmin && <button onClick={onDelete} className="rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>}
      </div>
    </div>
  );
}

function AddFolderModal({ subjectId, parentId, onClose, onDone }: {
  subjectId: string; parentId: string | null; onClose: () => void; onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("folders").insert({ subject_id: subjectId, parent_id: parentId, name: name.trim() });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("اتضاف الفولدر");
    onDone();
  }
  return (
    <ModalShell title="فولدر جديد" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <input autoFocus className="modal-input" placeholder="اسم الفولدر (مثل: المحاضرة الأولى)" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" disabled={saving} className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {saving ? "جاري..." : "إضافة"}
        </button>
      </form>
    </ModalShell>
  );
}

function AddContentModal({ folderId, onClose, onDone }: { folderId: string; onClose: () => void; onDone: () => void }) {
  const [type, setType] = useState<"pdf" | "youtube" | "link">("pdf");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [youtubeInput, setYoutubeInput] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return toast.error("اكتب عنوان");
    setSaving(true);
    try {
      let payload: Record<string, unknown> = { folder_id: folderId, type, title: title.trim(), description: description.trim() || null };
      if (type === "pdf") {
        if (!file) throw new Error("اختر ملف PDF");
        const path = `${folderId}/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("subject-files").upload(path, file);
        if (upErr) throw upErr;
        payload.file_url = path;
      } else if (type === "youtube") {
        const id = extractYouTubeId(youtubeInput);
        if (!id) throw new Error("رابط يوتيوب غير صحيح");
        payload.youtube_id = id;
      } else {
        if (!externalUrl.trim()) throw new Error("اكتب الرابط");
        payload.external_url = externalUrl.trim();
      }
      const { error } = await supabase.from("content_items").insert(payload as never);
      if (error) throw error;
      toast.success("اتضاف المحتوى ✨");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "حصلت مشكلة");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title="محتوى جديد" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {(["pdf", "youtube", "link"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-xl border px-3 py-2 text-xs font-semibold ${type === t ? "border-accent bg-accent/10" : "border-border"}`}
            >
              {t === "pdf" ? "PDF" : t === "youtube" ? "YouTube" : "رابط"}
            </button>
          ))}
        </div>
        <input className="modal-input" placeholder="العنوان" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <textarea className="modal-input" placeholder="وصف (اختياري)" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        {type === "pdf" && (
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-border bg-background/40 px-4 py-3 text-sm hover:border-accent">
            <span className="flex items-center gap-2"><Upload className="h-4 w-4 text-accent" />{file ? file.name : "اختر ملف PDF"}</span>
            <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        )}
        {type === "youtube" && (
          <input className="modal-input" placeholder="رابط YouTube أو ID الفيديو" value={youtubeInput} onChange={(e) => setYoutubeInput(e.target.value)} />
        )}
        {type === "link" && (
          <input className="modal-input" placeholder="https://..." value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} />
        )}
        <button type="submit" disabled={saving} className="w-full rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {saving ? "جاري الرفع..." : "إضافة"}
        </button>
      </form>
    </ModalShell>
  );
}

function ModalShell({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="cosmic-card w-full max-w-md rounded-2xl bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        {children}
        <style>{`.modal-input { width: 100%; background: color-mix(in oklch, var(--background) 60%, transparent); border: 1px solid var(--border); border-radius: 0.6rem; padding: 0.55rem 0.75rem; font-size: 0.9rem; outline: none; font-family: inherit; }
        .modal-input:focus { border-color: var(--accent); }`}</style>
      </div>
    </div>
  );
}

/* ---- Google Drive import helpers ---- */

function extractDriveFolderId(input: string): string | null {
  // Full URL: https://drive.google.com/drive/folders/FOLDER_ID
  const urlMatch = input.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (urlMatch) return urlMatch[1];
  // Raw ID (no slashes)
  if (/^[a-zA-Z0-9_-]{10,}$/.test(input.trim())) return input.trim();
  return null;
}

function driveFileViewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

async function listDriveFiles(folderId: string): Promise<DriveFile[]> {
  // Using Google Drive public JSON feed (works for publicly shared folders)
  const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType)&key=AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("تأكد إن الفولدر مشارك بشكل عام (Anyone with the link)");
  const data = await res.json();
  if (data.error) throw new Error(data.error.message ?? "خطأ في Google Drive API");
  return (data.files ?? []) as DriveFile[];
}

function ImportDriveModal({ folderId, onClose, onDone }: { folderId: string; onClose: () => void; onDone: () => void }) {
  const [driveInput, setDriveInput] = useState("");
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fetched, setFetched] = useState(false);

  async function fetchFiles() {
    const id = extractDriveFolderId(driveInput);
    if (!id) return toast.error("رابط أو ID الفولدر غلط");
    setLoading(true);
    setFetched(false);
    setFiles([]);
    setSelected(new Set());
    try {
      const result = await listDriveFiles(id);
      if (result.length === 0) {
        toast.info("الفولدر فاضي أو مش مشارك");
      } else {
        setFiles(result);
        // pre-select PDFs by default
        setSelected(new Set(result.filter(f => f.mimeType === "application/pdf").map(f => f.id)));
      }
      setFetched(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل تحميل الملفات");
    } finally {
      setLoading(false);
    }
  }

  function toggleFile(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === files.length) setSelected(new Set());
    else setSelected(new Set(files.map(f => f.id)));
  }

  async function doImport() {
    const toImport = files.filter(f => selected.has(f.id));
    if (toImport.length === 0) return toast.error("اختر ملف واحد على الأقل");
    setImporting(true);
    let ok = 0;
    for (const f of toImport) {
      const isPdf = f.mimeType === "application/pdf";
      const payload = {
        folder_id: folderId,
        type: isPdf ? "link" : "link",
        title: f.name.replace(/\.[^.]+$/, ""), // remove extension
        description: null,
        external_url: driveFileViewUrl(f.id),
        file_url: null,
        youtube_id: null,
      };
      const { error } = await supabase.from("content_items").insert(payload as never);
      if (!error) ok++;
      else toast.error(`فشل: ${f.name}`);
    }
    setImporting(false);
    if (ok > 0) {
      toast.success(`تم استيراد ${ok} ملف ✨`);
      onDone();
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="cosmic-card w-full max-w-lg rounded-2xl bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl flex items-center gap-2">
            <HardDriveDownload className="h-5 w-5 text-green-400" /> استيراد من Google Drive
          </h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>

        <p className="mb-3 text-xs text-muted-foreground leading-relaxed">
          حط رابط فولدر Google Drive أو الـ ID بتاعه. لازم الفولدر يكون مشارك على "Anyone with the link can view".
        </p>

        <div className="flex gap-2">
          <input
            className="flex-1 rounded-xl border border-border bg-background/50 px-4 py-2.5 text-sm"
            placeholder="https://drive.google.com/drive/folders/..."
            value={driveInput}
            onChange={e => setDriveInput(e.target.value)}
          />
          <button
            onClick={fetchFiles}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "جلب"}
          </button>
        </div>

        {fetched && files.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{files.length} ملف — اختار اللي تحبه</span>
              <button onClick={toggleAll} className="hover:text-foreground underline">
                {selected.size === files.length ? "إلغاء الكل" : "تحديد الكل"}
              </button>
            </div>
            <ul className="max-h-56 overflow-y-auto space-y-1.5 rounded-xl border border-border p-2">
              {files.map(f => {
                const isPdf = f.mimeType === "application/pdf";
                return (
                  <li
                    key={f.id}
                    onClick={() => toggleFile(f.id)}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                      selected.has(f.id) ? "bg-green-500/15 text-green-300" : "hover:bg-secondary/50"
                    }`}
                  >
                    <span className="text-base">{isPdf ? "📄" : "📁"}</span>
                    <span className="flex-1 truncate">{f.name}</span>
                    {selected.has(f.id) && <span className="text-green-400 text-xs">✓</span>}
                  </li>
                );
              })}
            </ul>
            <button
              onClick={doImport}
              disabled={importing || selected.size === 0}
              className="mt-3 w-full rounded-full bg-green-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {importing ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> جاري الاستيراد...</span> : `استيراد ${selected.size} ملف`}
            </button>
          </div>
        )}

        {fetched && files.length === 0 && (
          <p className="mt-4 text-center text-sm text-muted-foreground">مفيش ملفات في الفولدر ده.</p>
        )}
      </div>
    </div>
  );
}
