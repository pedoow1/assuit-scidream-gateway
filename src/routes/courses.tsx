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
  const { user, roles, loading } = useAuth();
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

  async function getSignedUrl(fileName: string) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(fileName, 3600);
    if (error || !data) { toast.error("تعذر فتح الملف"); return null; }
    return data.signedUrl;
  }

  async function handleOpen(fileName: string) {
    const url = await getSignedUrl(fileName);
    if (url) window.open(url, "_blank");
  }

  async function handleDownload(fileName: string) {
    const url = await getSignedUrl(fileName);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
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

  function cleanName(fileName: string) {
    // Remove timestamp prefix like "1782675097643_"
    return fileName.replace(/^\d+_/, "");
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

        {/* Description card */}
        <div className="cosmic-card rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-accent font-semibold text-sm">
            <span>📋</span>
            <span>دليل التدريب الميداني — Dream Team</span>
          </div>
          <p className="text-sm leading-relaxed">
            أعددنا لكم هذا الدليل الشامل بجهد أبناء أسرة <span className="font-bold">Dream Team</span> من مختلف أقسام كليات العلوم على مستوى الجمهورية.
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              "المراكز البحثية والجامعات الخاصة",
              "مراكز الحقن المجهري ومعامل التحاليل",
              "مراكز الأشعة وشركات الأدوية",
              "شركات الصناعات الغذائية",
              "معاهد ومراكز علاج الأورام",
              "شركات البترول",
            ].map((item) => (
              <div key={item} className="flex items-start gap-1.5 rounded-lg border border-border/50 bg-background/30 px-3 py-2">
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-foreground/75 border-t border-border/40 pt-3">
            الدليل في تحديث مستمر — كل جديد نضيفه فور توفره. نتمنى أن يكون عوناً حقيقياً في مسيرتكم العلمية 🌟
          </p>
        </div>

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
                  {/* اسم الملف قابل للضغط → يفتح */}
                  <button
                    onClick={() => handleOpen(f.name)}
                    className="flex flex-1 items-center gap-3 text-right min-w-0"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gold/40 to-rose/30 text-lg">
                      📄
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-sm">{cleanName(f.name)}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatSize(f.metadata?.size)} · {new Date(f.updated_at).toLocaleDateString("ar-EG")}
                      </div>
                    </div>
                  </button>

                  {/* أزرار التحميل والحذف */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleDownload(f.name)}
                      className="rounded-full p-2 text-muted-foreground hover:bg-secondary transition"
                      title="تحميل"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(f.name)}
                        className="rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                        title="حذف"
                      >
                        <Trash2 className="h-4 w-4" />
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
