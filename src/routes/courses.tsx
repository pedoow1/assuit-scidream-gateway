import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Loader2, ArrowLeft, GraduationCap, Download, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useAuth, isAdminRole } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { CosmicBackground } from "@/components/CosmicBackground";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/courses")({
  head: () => ({ meta: [{ title: "دورات تدريبية — Dream Team" }] }),
  component: CoursesPage,
});

type CourseFile = {
  name: string;
  id: string;
  updated_at: string;
  metadata: { size: number };
};

const BUCKET = "courses";

function CoursesPage() {
  const { user, profile, roles, loading } = useAuth();
  const navigate = useNavigate();
  const [files, setFiles] = useState<CourseFile[]>([]);
  const [fetching, setFetching] = useState(true);
  const [uploading, setUploading] = useState(false);

  const isOwnerAdmin = user?.email?.trim().toLowerCase() === "abdalahkotp31@gmail.com";
  const isAdmin = isOwnerAdmin || isAdminRole(roles);

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  const loadFiles = useCallback(async () => {
    setFetching(true);
    const { data, error } = await supabase.storage.from(BUCKET).list("", {
      sortBy: { column: "updated_at", order: "desc" },
    });
    if (error) toast.error("تعذر تحميل الملفات");
    setFiles((data ?? []) as CourseFile[]);
    setFetching(false);
  }, []);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    for (const file of Array.from(fileList)) {
      const path = `${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, file);
      if (error) toast.error(`فشل رفع ${file.name}`);
      else toast.success(`تم رفع ${file.name} ✨`);
    }
    setUploading(false);
    e.target.value = "";
    loadFiles();
  }

  async function handleDownload(fileName: string) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(fileName, 60);
    if (error || !data) { toast.error("تعذر تحميل الملف"); return; }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = fileName;
    a.click();
  }

  async function handleDelete(fileName: string) {
    if (!confirm(`هتحذف "${fileName}"؟`)) return;
    const { error } = await supabase.storage.from(BUCKET).remove([fileName]);
    if (error) { toast.error("فشل الحذف"); return; }
    toast.success("تم الحذف");
    loadFiles();
  }

  function formatSize(bytes: number) {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen" dir="rtl">
      <CosmicBackground density={22} />

      <header className="relative z-10 border-b border-border/60 bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 rotate-180" /> الرجوع
          </Link>
          <div className="flex items-center gap-3">
            <GraduationCap className="h-5 w-5 text-accent" />
            <div className="font-display text-base font-semibold">دورات تدريبية</div>
            <Logo size={36} />
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-6 py-10 space-y-6">

        {/* Upload — Admins only */}
        {isAdmin && (
          <div className="cosmic-card rounded-2xl p-6">
            <h2 className="font-display text-lg mb-3">رفع ملفات</h2>
            <label className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border/60 p-8 transition hover:border-accent ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground">
                {uploading ? "جاري الرفع..." : "اضغط هنا لرفع ملف أو أكتر"}
              </span>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={handleUpload}
                accept=".pdf,.xlsx,.xls,.doc,.docx,.pptx,.ppt,.zip"
              />
            </label>
          </div>
        )}

        {/* Files list */}
        <div className="cosmic-card rounded-2xl overflow-hidden">
          <div className="border-b border-border/60 px-6 py-4">
            <h2 className="font-display text-lg">الملفات المتاحة</h2>
          </div>

          {fetching ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : files.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-4xl">📂</div>
              <p className="mt-3 text-sm text-muted-foreground">لا توجد ملفات بعد</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {files.map((f) => (
                <li key={f.id ?? f.name} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-card/40 transition">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-sm">{f.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {formatSize(f.metadata?.size)} · {new Date(f.updated_at).toLocaleDateString("ar-EG")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleDownload(f.name)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition"
                    >
                      <Download className="h-3.5 w-3.5" /> تحميل
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(f.name)}
                        className="rounded-lg bg-destructive/10 p-1.5 text-destructive hover:bg-destructive/20 transition"
                        title="حذف"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
