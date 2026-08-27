import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Loader2,
  Send,
  Plus,
  Pin,
  Image as ImageIcon,
  Mic,
  Video,
  Trash2,
  ShieldOff,
  VolumeX,
  UserPlus,
  Users,
  CalendarClock,
  Megaphone,
  Link2,
  Images,
  MessageSquare,
  MessageCircle,
  Search,
  ChevronDown,
  MoreVertical,
  FolderTree,
  Hash,
  X,
  Trash,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { StarsBackground } from "@/components/IntroSequence";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

// NOTE: `groups`, `group_members`, `group_messages`, etc. were added in the
// 20260827092626_group_chat_system.sql migration. Until `types.ts` is
// regenerated against the live database (Lovable/Supabase CLI does this
// automatically after a migration is applied), we talk to these tables
// through a loosely-typed client to avoid false compile errors.
const db = supabase as any;

export const Route = createFileRoute("/communication")({
  head: () => ({ meta: [{ title: "التواصل — Assuit SciDream" }] }),
  component: CommunicationPage,
});

type GroupRow = {
  id: string;
  name: string;
  description: string | null;
  subject: string | null;
  created_by: string;
  // Sub-groups: a group with parent_group_id = null is a top-level
  // "community" that can contain child groups (WhatsApp-communities style).
  parent_group_id?: string | null;
};

// Small deterministic gradient avatar so groups don't need a real image.
const AVATAR_GRADIENTS = [
  "from-violet-500 to-fuchsia-500",
  "from-amber-500 to-rose-500",
  "from-sky-500 to-indigo-500",
  "from-emerald-500 to-teal-500",
  "from-rose-500 to-orange-400",
  "from-indigo-500 to-purple-500",
];
function avatarGradient(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}
function GroupAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const dims = size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-12 w-12 text-lg" : "h-9 w-9 text-sm";
  return (
    <span
      className={`flex ${dims} shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradient(
        name,
      )} font-display font-bold text-white`}
    >
      {name.trim().charAt(0) || "?"}
    </span>
  );
}

type MessageRow = {
  id: string;
  group_id: string;
  sender_id: string;
  channel: "general" | "announcements";
  type: "text" | "image" | "video" | "audio" | "gif" | "sticker";
  content: string | null;
  media_url: string | null;
  is_deleted: boolean;
  created_at: string;
  sender_name?: string;
};

type MemberRow = {
  id: string;
  user_id: string;
  status: "active" | "banned";
  muted_until: string | null;
  full_name?: string;
  level?: number;
};

const DAYS: { key: string; label: string }[] = [
  { key: "sat", label: "السبت" },
  { key: "sun", label: "الأحد" },
  { key: "mon", label: "الإثنين" },
  { key: "tue", label: "الثلاثاء" },
  { key: "wed", label: "الأربعاء" },
  { key: "thu", label: "الخميس" },
  { key: "fri", label: "الجمعة" },
];

function formatBytes(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميجا`;
}

function fileNameFromUrl(url: string) {
  try {
    const clean = url.split("?")[0];
    const last = clean.split("/").pop() ?? "ملف";
    return decodeURIComponent(last.replace(/^\d+-/, ""));
  } catch {
    return "ملف";
  }
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

// How long after sending a normal member can still "delete for everyone".
const DELETE_FOR_EVERYONE_WINDOW_MS = 20 * 60 * 1000;

function typingLabel(names: string[]) {
  if (names.length === 0) return "";
  if (names.length === 1) return `${names[0]} بيكتب...`;
  if (names.length === 2) return `${names[0]} و ${names[1]} بيكتبوا...`;
  return `${names[0]} و ${names[1]} و آخرون بيكتبوا...`;
}

function blobToFile(blob: Blob, ext = "webm") {
  return new File([blob], `voice-${Date.now()}.${ext}`, { type: blob.type || "audio/webm" });
}

function formatRecordTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Fullscreen image viewer — tap any chat image to open it like WhatsApp/Discord.
function ImageLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        title="قفل"
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={url}
        onClick={(e) => e.stopPropagation()}
        className="max-h-full max-w-full rounded-lg object-contain"
      />
    </div>
  );
}

// Shared composer bar used by both group chat and DMs — one pill-shaped
// input instead of separate boxy controls.
function Composer({
  text,
  onTextChange,
  onSend,
  onPickFile,
  onSendVoice,
  uploading,
  disabled,
  disabledMessage,
  typingNames,
}: {
  text: string;
  onTextChange: (v: string) => void;
  onSend: () => void;
  onPickFile: (file: File) => void;
  onSendVoice?: (blob: Blob) => void;
  uploading: boolean;
  disabled?: boolean;
  disabledMessage?: string;
  typingNames?: string[];
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }

  async function startRecording() {
    if (!onSendVoice) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      cancelledRef.current = false;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stopStream();
        if (!cancelledRef.current && chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
          onSendVoice(blob);
        }
        chunksRef.current = [];
      };
      recorder.start();
      setRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch {
      toast.error("محتاج إذن الميكروفون علشان تسجل رسالة صوتية");
    }
  }

  function stopRecording(cancel: boolean) {
    cancelledRef.current = cancel;
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  }

  useEffect(() => () => stopStream(), []);

  if (disabled) {
    return (
      <p className="mt-3 rounded-full border border-border/60 bg-card/40 px-4 py-2.5 text-center text-xs text-foreground/60">
        {disabledMessage}
      </p>
    );
  }

  const hasText = text.trim().length > 0;

  return (
    <div className="mt-3">
      {typingNames && typingNames.length > 0 && (
        <p className="mb-1 truncate px-2 text-[11px] text-foreground/50">{typingLabel(typingNames)}</p>
      )}
      {recording ? (
        <div className="flex items-center gap-2 rounded-full border border-border/60 bg-card/50 py-1.5 pl-1.5 pr-3 backdrop-blur">
          <button
            onClick={() => stopRecording(true)}
            title="إلغاء"
            className="shrink-0 rounded-full p-2 text-destructive transition hover:bg-destructive/10"
          >
            <Trash className="h-4 w-4" />
          </button>
          <span className="flex flex-1 items-center gap-2 text-sm text-foreground/70">
            <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-destructive" />
            {formatRecordTime(recordSeconds)}
          </span>
          <button
            onClick={() => stopRecording(false)}
            title="إرسال"
            className="flex shrink-0 items-center justify-center rounded-full bg-gradient-cosmic p-2.5 text-primary-foreground transition"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-card/50 py-1 pl-1.5 pr-3 backdrop-blur">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPickFile(f);
              e.target.value = "";
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="إرفاق صورة/فيديو/صوت/ملف"
            className="shrink-0 rounded-full p-2 text-foreground/60 transition hover:bg-background/60 hover:text-foreground disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
          </button>
          <input
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSend()}
            placeholder="اكتب رسالة..."
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-foreground/40"
          />
          {hasText ? (
            <button
              onClick={onSend}
              className="flex shrink-0 items-center justify-center rounded-full bg-gradient-cosmic p-2.5 text-primary-foreground transition"
            >
              <Send className="h-4 w-4" />
            </button>
          ) : onSendVoice ? (
            <button
              onClick={startRecording}
              title="تسجيل رسالة صوتية"
              className="flex shrink-0 items-center justify-center rounded-full bg-gradient-cosmic p-2.5 text-primary-foreground transition"
            >
              <Mic className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

// Discord-style attachment card: icon + name + size + download, no giant
// mismatched thumbnails crammed into the bubble.
function FileCard({
  name,
  url,
  size,
  tint = "self",
}: {
  name: string;
  url: string;
  size?: number | null;
  tint?: "self" | "other";
}) {
  const ext = (name.split(".").pop() || "").toUpperCase().slice(0, 4);
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      download
      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition hover:brightness-110 ${
        tint === "self"
          ? "border-primary-foreground/20 bg-primary-foreground/10"
          : "border-border/60 bg-background/50"
      }`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/20 text-[10px] font-bold text-accent">
        {ext || "FILE"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{name}</span>
        {!!size && <span className="block text-[11px] opacity-70">{formatBytes(size)}</span>}
      </span>
    </a>
  );
}

function CommunicationPage() {
  const { user, loading, roles, profile } = useAuth();
  const navigate = useNavigate();
  const isBigBoss = !!roles?.includes("super_admin");
  const canCreateGroups = isBigBoss || !!roles?.includes("admin");
  const myName = profile?.full_name || user?.email || "أنا";

  const [mode, setMode] = useState<"groups" | "dm">("groups");

  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [activeGroup, setActiveGroup] = useState<GroupRow | null>(null);
  const [myLevel, setMyLevel] = useState(0); // 0 none · 1 member · 2 admin/doctor/assistant · 3 big boss
  const [busy, setBusy] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  // When set, the create-group dialog opens pre-scoped to add a sub-group
  // inside this community instead of a brand-new top-level group.
  const [createParentId, setCreateParentId] = useState<string | null>(null);

  const [activeConversation, setActiveConversation] = useState<{
    id: string;
    otherId: string;
    otherName: string;
  } | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  async function loadGroups() {
    setBusy(true);
    const { data, error } = await db
      .from("groups")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setGroups((data as GroupRow[]) ?? []);
    setBusy(false);
  }

  useEffect(() => {
    if (user) void loadGroups();
  }, [user]);

  useEffect(() => {
    if (!activeGroup || !user) return;
    (async () => {
      const { data } = await db.rpc("group_user_level", {
        p_user_id: user.id,
        p_group_id: activeGroup.id,
      });
      setMyLevel(typeof data === "number" ? data : 0);
    })();
  }, [activeGroup, user]);

  async function createGroup(
    name: string,
    description: string,
    subject: string,
    parentGroupId: string | null,
  ) {
    if (!name.trim() || !user) return;
    const { data, error } = await db
      .from("groups")
      .insert({
        name,
        description,
        subject,
        created_by: user.id,
        parent_group_id: parentGroupId,
      })
      .select("*")
      .single();
    if (error) return toast.error(error.message);
    await db.from("group_members").insert({ group_id: data.id, user_id: user.id, status: "active" });
    toast.success(parentGroupId ? "اتعمل الجروب الفرعي" : "اتعمل الجروب");
    setCreateOpen(false);
    setCreateParentId(null);
    setActiveGroup(data as GroupRow);
    await loadGroups();
  }

  // Big Boss only: wipe every file that belongs to the group from Storage,
  // THEN delete the group row (DB cascade takes care of every related
  // table: messages, members, pins, schedules, reports, audit log...).
  async function deleteGroup(group: GroupRow) {
    if (!isBigBoss) return;
    const confirmed = window.confirm(
      `متأكد إنك عايز تمسح جروب "${group.name}"؟ ده هيمسح كل الرسايل والصور والفيديوهات بتاعته نهائيًا ومش هترجع.`,
    );
    if (!confirmed) return;

    const { data: files, error: listErr } = await db.storage.from("group-media").list(group.id, {
      limit: 1000,
    });
    if (listErr) {
      toast.error("حصلت مشكلة في قراءة ملفات الجروب: " + listErr.message);
    } else if (files && files.length > 0) {
      const paths = files.map((f: { name: string }) => `${group.id}/${f.name}`);
      const { error: removeErr } = await db.storage.from("group-media").remove(paths);
      if (removeErr) toast.error("حصلت مشكلة في مسح الملفات: " + removeErr.message);
    }

    const { error } = await db.from("groups").delete().eq("id", group.id);
    if (error) return toast.error(error.message);

    toast.success("اتمسح الجروب وكل حاجة تخصه");
    if (activeGroup?.id === group.id) setActiveGroup(null);
    await loadGroups();
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
      <StarsBackground />
      <header className="relative z-10 border-b border-border/60 bg-background/60 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm hover:text-accent">
            <ArrowRight className="h-4 w-4" /> الرئيسية
          </Link>
          <h1 className="font-display text-lg">التواصل</h1>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-8 md:grid-cols-[280px_1fr]">
        {/* Sidebar */}
        <aside className="cosmic-card rounded-3xl p-4 h-fit">
          <div className="mb-3 flex gap-1.5 rounded-full bg-background/40 p-1">
            <button
              onClick={() => setMode("groups")}
              className={`flex-1 rounded-full py-1.5 text-xs font-semibold transition ${
                mode === "groups" ? "bg-gradient-cosmic text-primary-foreground" : "text-foreground/60"
              }`}
            >
              <Users className="ml-1 inline h-3.5 w-3.5" /> الجروبات
            </button>
            <button
              onClick={() => setMode("dm")}
              className={`flex-1 rounded-full py-1.5 text-xs font-semibold transition ${
                mode === "dm" ? "bg-gradient-cosmic text-primary-foreground" : "text-foreground/60"
              }`}
            >
              <MessageCircle className="ml-1 inline h-3.5 w-3.5" /> الخاص
            </button>
          </div>

          {mode === "groups" ? (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-base">الجروبات</h2>
                {canCreateGroups && (
                  <Dialog
                    open={createOpen}
                    onOpenChange={(open) => {
                      setCreateOpen(open);
                      if (!open) setCreateParentId(null);
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8 rounded-full"
                        onClick={() => setCreateParentId(null)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent dir="rtl">
                      <DialogHeader>
                        <DialogTitle>
                          {createParentId ? "جروب فرعي جديد" : "جروب أو مجتمع جديد"}
                        </DialogTitle>
                      </DialogHeader>
                      <CreateGroupForm
                        groups={groups}
                        defaultParentId={createParentId}
                        onCreate={createGroup}
                      />
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin text-accent" />
              ) : groups.length === 0 ? (
                <p className="text-xs text-foreground/60">مفيش جروبات لسه</p>
              ) : (
                <GroupsTree
                  groups={groups}
                  activeGroupId={activeGroup?.id ?? null}
                  onSelect={setActiveGroup}
                  isBigBoss={isBigBoss}
                  onDelete={deleteGroup}
                  canCreateGroups={canCreateGroups}
                  onAddSubgroup={(parentId) => {
                    setCreateParentId(parentId);
                    setCreateOpen(true);
                  }}
                />
              )}
            </>
          ) : (
            <DMList
              userId={user.id}
              activeConversationId={activeConversation?.id ?? null}
              onOpen={(c) => setActiveConversation(c)}
            />
          )}
        </aside>

        {/* Main panel */}
        {mode === "groups" ? (
          !activeGroup ? (
            <div className="cosmic-card flex min-h-[300px] items-center justify-center rounded-3xl p-8 text-sm text-foreground/60">
              اختار جروب من القايمة
            </div>
          ) : (
            <GroupPanel
              group={activeGroup}
              groups={groups}
              myLevel={myLevel}
              userId={user.id}
              myName={myName}
              isBigBoss={isBigBoss}
              canCreateGroups={canCreateGroups}
              onSelectGroup={setActiveGroup}
              onAddSubgroup={(parentId) => {
                setCreateParentId(parentId);
                setCreateOpen(true);
              }}
              onDeleteGroup={deleteGroup}
            />
          )
        ) : !activeConversation ? (
          <div className="cosmic-card flex min-h-[300px] items-center justify-center rounded-3xl p-8 text-sm text-foreground/60">
            اختار حد تكلمه أو دور على شخص جديد
          </div>
        ) : (
          <div className="cosmic-card rounded-3xl p-4 md:p-6">
            <h2 className="mb-4 font-display text-xl">{activeConversation.otherName}</h2>
            <DMChatView conversationId={activeConversation.id} userId={user.id} />
          </div>
        )}
      </main>
    </div>
  );
}

// ============================================================
// Sidebar groups tree — top-level groups act as "communities" and can
// contain sub-groups, similar to WhatsApp communities.
// ============================================================
function GroupsTree({
  groups,
  activeGroupId,
  onSelect,
  isBigBoss,
  onDelete,
  canCreateGroups,
  onAddSubgroup,
}: {
  groups: GroupRow[];
  activeGroupId: string | null;
  onSelect: (g: GroupRow) => void;
  isBigBoss: boolean;
  onDelete: (g: GroupRow) => void;
  canCreateGroups: boolean;
  onAddSubgroup: (parentId: string) => void;
}) {
  const topLevel = groups.filter((g) => !g.parent_group_id);
  const childrenOf = (id: string) => groups.filter((g) => g.parent_group_id === id);

  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? null;
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    // Auto-expand the community that currently contains the active group.
    const initial = new Set<string>();
    if (activeGroup?.parent_group_id) initial.add(activeGroup.parent_group_id);
    return initial;
  });

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function Row({ g, depth }: { g: GroupRow; depth: number }) {
    const children = childrenOf(g.id);
    const hasChildren = children.length > 0;
    const isOpen = expanded.has(g.id);
    const isActive = activeGroupId === g.id;
    return (
      <div>
        <div
          className={`group flex items-center gap-1 rounded-xl transition ${
            isActive ? "bg-accent/15 text-accent" : "hover:bg-card/60"
          }`}
          style={{ paddingInlineStart: depth ? depth * 14 : 0 }}
        >
          {hasChildren ? (
            <button
              onClick={() => toggle(g.id)}
              className="shrink-0 rounded-full p-1 text-foreground/50 transition hover:text-foreground"
            >
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${isOpen ? "" : "-rotate-90"}`}
              />
            </button>
          ) : (
            <span className="w-3.5 shrink-0" />
          )}
          <button
            onClick={() => onSelect(g)}
            className="flex min-w-0 flex-1 items-center gap-2 py-2 text-right"
          >
            {depth === 0 ? (
              <GroupAvatar name={g.name} size="sm" />
            ) : (
              <Hash className="h-3.5 w-3.5 shrink-0 opacity-50" />
            )}
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{g.name}</span>
            {hasChildren && (
              <span className="shrink-0 rounded-full bg-background/60 px-1.5 py-0.5 text-[10px] text-foreground/50">
                {children.length}
              </span>
            )}
          </button>
          <div className="flex shrink-0 items-center opacity-0 transition group-hover:opacity-100">
            {canCreateGroups && depth === 0 && (
              <button
                onClick={() => onAddSubgroup(g.id)}
                title="إضافة جروب فرعي"
                className="rounded-full p-1.5 hover:bg-accent/15"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
            {isBigBoss && (
              <button
                onClick={() => onDelete(g)}
                title="مسح نهائيًا (Big Boss)"
                className="rounded-full p-1.5 hover:bg-destructive/20"
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </button>
            )}
          </div>
        </div>
        {hasChildren && isOpen && (
          <div className="space-y-0.5 border-r border-border/40 pr-2">
            {children.map((c) => (
              <Row key={c.id} g={c} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {topLevel.map((g) => (
        <Row key={g.id} g={g} depth={0} />
      ))}
    </div>
  );
}

function CreateGroupForm({
  groups,
  defaultParentId,
  onCreate,
}: {
  groups: GroupRow[];
  defaultParentId: string | null;
  onCreate: (
    name: string,
    description: string,
    subject: string,
    parentGroupId: string | null,
  ) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [parentId, setParentId] = useState<string | null>(defaultParentId);
  const communities = groups.filter((g) => !g.parent_group_id);
  const lockedParent = communities.find((c) => c.id === defaultParentId);

  return (
    <div className="space-y-3">
      <Input placeholder="اسم الجروب" value={name} onChange={(e) => setName(e.target.value)} />
      <Input placeholder="المادة (اختياري)" value={subject} onChange={(e) => setSubject(e.target.value)} />
      <Textarea
        placeholder="وصف مختصر (اختياري)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-xs text-foreground/70">
          <FolderTree className="h-3.5 w-3.5" /> جزء من مجتمع؟
        </Label>
        {lockedParent ? (
          <p className="rounded-xl bg-card/60 px-3 py-2 text-sm">
            هيتحط كجروب فرعي جوة <span className="font-semibold text-accent">{lockedParent.name}</span>
          </p>
        ) : (
          <Select value={parentId ?? "none"} onValueChange={(v) => setParentId(v === "none" ? null : v)}>
            <SelectTrigger>
              <SelectValue placeholder="بدون — جروب مستقل" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">بدون — جروب مستقل / مجتمع جديد</SelectItem>
              {communities.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  فرعي جوة: {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Button className="w-full" onClick={() => onCreate(name, description, subject, parentId)}>
        إنشاء
      </Button>
    </div>
  );
}

function GroupPanel({
  group,
  groups,
  myLevel,
  userId,
  myName,
  isBigBoss: isGlobalBigBoss,
  canCreateGroups,
  onSelectGroup,
  onAddSubgroup,
  onDeleteGroup,
}: {
  group: GroupRow;
  groups: GroupRow[];
  myLevel: number;
  userId: string;
  myName: string;
  isBigBoss: boolean;
  canCreateGroups: boolean;
  onSelectGroup: (g: GroupRow) => void;
  onAddSubgroup: (parentId: string) => void;
  onDeleteGroup: (g: GroupRow) => void;
}) {
  const isAdmin = myLevel >= 2;
  const isBigBoss = myLevel >= 3;

  const parent = group.parent_group_id
    ? groups.find((g) => g.id === group.parent_group_id) ?? null
    : null;
  const children = groups.filter((g) => g.parent_group_id === group.id);

  return (
    <div className="cosmic-card rounded-3xl p-4 md:p-6">
      {parent && (
        <button
          onClick={() => onSelectGroup(parent)}
          className="mb-3 flex items-center gap-1 text-xs text-foreground/60 hover:text-accent"
        >
          <FolderTree className="h-3.5 w-3.5" /> {parent.name}
          <span className="opacity-50">/</span>
          <span className="text-foreground/80">{group.name}</span>
        </button>
      )}

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <GroupAvatar name={group.name} size="lg" />
          <div className="min-w-0">
            <h2 className="truncate font-display text-xl">{group.name}</h2>
            <p className="truncate text-xs text-foreground/60">
              {[group.subject, group.description].filter(Boolean).join(" · ") || "من غير وصف"}
            </p>
          </div>
        </div>

        {(canCreateGroups || isGlobalBigBoss) && !parent && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="secondary" className="h-8 w-8 shrink-0 rounded-full">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" dir="rtl">
              {canCreateGroups && (
                <DropdownMenuItem onClick={() => onAddSubgroup(group.id)}>
                  <Plus className="ml-2 h-3.5 w-3.5" /> إضافة جروب فرعي
                </DropdownMenuItem>
              )}
              {isGlobalBigBoss && (
                <DropdownMenuItem
                  onClick={() => onDeleteGroup(group)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="ml-2 h-3.5 w-3.5" /> مسح الجروب نهائيًا
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {children.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {children.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelectGroup(c)}
              className="flex items-center gap-1 rounded-full border border-border/60 bg-card/50 px-2.5 py-1 text-xs transition hover:border-accent/50 hover:text-accent"
            >
              <Hash className="h-3 w-3" /> {c.name}
            </button>
          ))}
        </div>
      )}

      <Tabs defaultValue="chat" dir="rtl">
        <TabsList className="w-full flex-nowrap justify-start gap-1 overflow-x-auto scrollbar-none">
          <TabsTrigger value="chat" className="shrink-0">
            <MessageSquare className="ml-1 h-3.5 w-3.5" /> الشات
          </TabsTrigger>
          <TabsTrigger value="announcements" className="shrink-0">
            <Megaphone className="ml-1 h-3.5 w-3.5" /> الإعلانات
          </TabsTrigger>
          <TabsTrigger value="pins" className="shrink-0">
            <Pin className="ml-1 h-3.5 w-3.5" /> Pins
          </TabsTrigger>
          <TabsTrigger value="media" className="shrink-0">
            <Images className="ml-1 h-3.5 w-3.5" /> الوسائط
          </TabsTrigger>
          <TabsTrigger value="links" className="shrink-0">
            <Link2 className="ml-1 h-3.5 w-3.5" /> الروابط
          </TabsTrigger>
          <TabsTrigger value="schedule" className="shrink-0">
            <CalendarClock className="ml-1 h-3.5 w-3.5" /> الجدول
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="members" className="shrink-0">
              <Users className="ml-1 h-3.5 w-3.5" /> الأعضاء
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="chat">
          <ChatView group={group} channel="general" userId={userId} myName={myName} isAdmin={isAdmin} muted={false} />
        </TabsContent>
        <TabsContent value="announcements">
          <ChatView
            group={group}
            channel="announcements"
            userId={userId}
            myName={myName}
            isAdmin={isAdmin}
            muted={false}
            readOnly={!isAdmin}
          />
        </TabsContent>
        <TabsContent value="pins">
          <PinsView groupId={group.id} />
        </TabsContent>
        <TabsContent value="media">
          <MediaView groupId={group.id} />
        </TabsContent>
        <TabsContent value="links">
          <LinksView groupId={group.id} />
        </TabsContent>
        <TabsContent value="schedule">
          <ScheduleView groupId={group.id} isAdmin={isAdmin} userId={userId} />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="members">
            <MembersView groupId={group.id} isBigBoss={isBigBoss} actorId={userId} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// ============================================================
// Chat (general + announcements share this component)
// ============================================================
// Per-message "..." menu: delete for me / delete for everyone (own message,
// within the time window) / admin pin / admin add-to-announcements.
function MessageActions({
  message,
  isSelf,
  isAdmin,
  channel,
  onDeleteForMe,
  onDeleteForEveryone,
  onPin,
  onAddToAnnouncements,
}: {
  message: MessageRow;
  isSelf: boolean;
  isAdmin: boolean;
  channel: "general" | "announcements";
  onDeleteForMe: (id: string) => void;
  onDeleteForEveryone: (id: string) => void;
  onPin: (id: string) => void;
  onAddToAnnouncements: (m: MessageRow) => void;
}) {
  const withinWindow = Date.now() - new Date(message.created_at).getTime() < DELETE_FOR_EVERYONE_WINDOW_MS;
  const canDeleteForEveryone = isAdmin || (isSelf && withinWindow);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          title="خيارات الرسالة"
          className="shrink-0 self-center rounded-full p-1 text-foreground/35 transition hover:bg-card/60 hover:text-foreground"
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" dir="rtl">
        <DropdownMenuItem onClick={() => onDeleteForMe(message.id)}>
          <Trash2 className="ml-2 h-3.5 w-3.5" /> حذف عندي
        </DropdownMenuItem>
        {canDeleteForEveryone && (
          <DropdownMenuItem
            onClick={() => onDeleteForEveryone(message.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="ml-2 h-3.5 w-3.5" /> حذف عند الجميع
          </DropdownMenuItem>
        )}
        {isAdmin && (
          <DropdownMenuItem onClick={() => onPin(message.id)}>
            <Pin className="ml-2 h-3.5 w-3.5" /> تثبيت الرسالة
          </DropdownMenuItem>
        )}
        {isAdmin && channel === "general" && (
          <DropdownMenuItem onClick={() => onAddToAnnouncements(message)}>
            <Megaphone className="ml-2 h-3.5 w-3.5" /> إضافة للإعلانات
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ChatView({
  group,
  channel,
  userId,
  myName,
  isAdmin,
  muted,
  readOnly = false,
}: {
  group: GroupRow;
  channel: "general" | "announcements";
  userId: string;
  myName: string;
  isAdmin: boolean;
  muted: boolean;
  readOnly?: boolean;
}) {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // "Delete for me" is a per-device/local hide — no schema change needed.
  const hiddenKey = `hidden_messages_${group.id}_${channel}`;
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(hiddenKey) || "[]"));
    } catch {
      return new Set();
    }
  });

  // Typing indicator (Supabase realtime broadcast, no DB writes involved).
  const channelRef = useRef<any>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const typingTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const lastTypingSentRef = useRef(0);

  function notifyTyping() {
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1500) return;
    lastTypingSentRef.current = now;
    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { userId, name: myName },
    });
  }

  async function load() {
    const { data } = await db
      .from("group_messages")
      .select("*")
      .eq("group_id", group.id)
      .eq("channel", channel)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true })
      .limit(200);
    setMessages((data as MessageRow[]) ?? []);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  useEffect(() => {
    void load();
    const ch = db
      .channel(`group-${group.id}-${channel}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${group.id}` },
        (payload: any) => {
          if (payload.new.channel !== channel) return;
          setMessages((prev) => [...prev, payload.new as MessageRow]);
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        },
      )
      .on("broadcast", { event: "typing" }, ({ payload }: any) => {
        if (!payload || payload.userId === userId) return;
        setTypingUsers((prev) => ({ ...prev, [payload.userId]: payload.name || "حد" }));
        if (typingTimeouts.current[payload.userId]) clearTimeout(typingTimeouts.current[payload.userId]);
        typingTimeouts.current[payload.userId] = setTimeout(() => {
          setTypingUsers((prev) => {
            const next = { ...prev };
            delete next[payload.userId];
            return next;
          });
        }, 3000);
      })
      .subscribe();
    channelRef.current = ch;
    return () => {
      db.removeChannel(ch);
      channelRef.current = null;
      Object.values(typingTimeouts.current).forEach(clearTimeout);
      typingTimeouts.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.id, channel]);

  async function sendText() {
    if (!text.trim()) return;
    const body = text;
    setText("");
    const { error } = await db
      .from("group_messages")
      .insert({ group_id: group.id, sender_id: userId, channel, type: "text", content: body });
    if (error) toast.error(error.message);
  }

  async function sendFile(file: File) {
    const type = file.type.startsWith("image")
      ? "image"
      : file.type.startsWith("video")
        ? "video"
        : file.type.startsWith("audio")
          ? "audio"
          : "file"; // PDFs, Word, PowerPoint, zip... — shown as a clean file card, not a broken thumbnail

    // optimistic placeholder
    const tempId = `temp-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        group_id: group.id,
        sender_id: userId,
        channel,
        type,
        content: type === "file" ? file.name : "بيترفع...",
        media_url: null,
        is_deleted: false,
        created_at: new Date().toISOString(),
      },
    ]);
    setUploading(true);

    const path = `${group.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await db.storage.from("group-media").upload(path, file, {
      upsert: false,
    });
    setUploading(false);
    if (upErr) {
      toast.error(upErr.message);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      return;
    }
    const publicUrl = db.storage.from("group-media").getPublicUrl(path).data.publicUrl;
    setMessages((prev) => prev.filter((m) => m.id !== tempId));
    const { error } = await db.from("group_messages").insert({
      group_id: group.id,
      sender_id: userId,
      channel,
      type,
      content: type === "file" ? file.name : null,
      media_url: publicUrl,
      media_size_bytes: file.size,
    });
    if (error) toast.error(error.message);
  }

  async function pinMessage(messageId: string) {
    const { error } = await db
      .from("group_pinned_messages")
      .insert({ group_id: group.id, message_id: messageId, pinned_by: userId });
    if (error) toast.error(error.message);
    else toast.success("اتعمله pin");
  }

  async function addToAnnouncements(m: MessageRow) {
    const { error } = await db.from("group_messages").insert({
      group_id: group.id,
      sender_id: m.sender_id,
      channel: "announcements",
      type: m.type,
      content: m.content,
      media_url: m.media_url,
      media_size_bytes: (m as any).media_size_bytes,
    });
    if (error) toast.error(error.message);
    else toast.success("اتضافت للإعلانات");
  }

  // Admin (or the anyone within the time window) — removes for everyone.
  async function deleteForEveryone(messageId: string) {
    await db.from("group_messages").update({ is_deleted: true }).eq("id", messageId);
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }

  // Local-only hide — the message stays for everyone else.
  function deleteForMe(messageId: string) {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      next.add(messageId);
      try {
        localStorage.setItem(hiddenKey, JSON.stringify([...next]));
      } catch {
        /* ignore quota errors */
      }
      return next;
    });
  }

  const visibleMessages = messages.filter((m) => !hiddenIds.has(m.id));

  return (
    <div className="flex h-[500px] flex-col">
      <div className="flex-1 space-y-2.5 overflow-y-auto py-1 pr-1">
        {visibleMessages.map((m) => {
          const isSelf = m.sender_id === userId;
          const isMedia = (m.type === "image" || m.type === "video") && !!m.media_url;
          const isTemp = m.id.startsWith("temp-");
          return (
            <div key={m.id} className={`flex items-end gap-1 ${isSelf ? "justify-start" : "justify-end"}`}>
              {isSelf && !isTemp && (
                <MessageActions
                  message={m}
                  isSelf={isSelf}
                  isAdmin={isAdmin}
                  channel={channel}
                  onDeleteForMe={deleteForMe}
                  onDeleteForEveryone={deleteForEveryone}
                  onPin={pinMessage}
                  onAddToAnnouncements={addToAnnouncements}
                />
              )}
              <div
                className={
                  isMedia
                    ? "relative max-w-[75%] overflow-hidden rounded-2xl shadow-soft"
                    : `relative max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-soft ${
                        isSelf
                          ? "rounded-br-md bg-gradient-cosmic text-primary-foreground"
                          : "rounded-bl-md border border-border/50 bg-card/70"
                      }`
                }
              >
                {m.type === "text" && <p className="whitespace-pre-wrap break-words">{m.content}</p>}

                {m.type === "image" && m.media_url && (
                  <div className="relative">
                    <img
                      src={m.media_url}
                      onClick={() => setLightboxUrl(m.media_url!)}
                      className="max-h-72 w-full cursor-pointer rounded-2xl object-cover"
                    />
                    <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                      {formatTime(m.created_at)}
                    </span>
                  </div>
                )}

                {m.type === "video" && m.media_url && (
                  <video src={m.media_url} controls className="max-h-72 w-full rounded-2xl" />
                )}

                {m.type === "audio" && m.media_url && (
                  <audio src={m.media_url} controls className="h-9 w-56 max-w-full" />
                )}
                {m.type === "file" && m.media_url && (
                  <FileCard
                    name={m.content || fileNameFromUrl(m.media_url)}
                    url={m.media_url}
                    size={(m as any).media_size_bytes}
                    tint={isSelf ? "self" : "other"}
                  />
                )}
                {m.type !== "text" && !m.media_url && (
                  <p className="flex items-center gap-1.5 text-xs opacity-70">
                    <Loader2 className="h-3 w-3 animate-spin" /> {m.content}
                  </p>
                )}

                {!isMedia && (
                  <span
                    className={`mt-1 block text-left text-[10px] ${
                      isSelf ? "text-primary-foreground/70" : "text-foreground/40"
                    }`}
                  >
                    {formatTime(m.created_at)}
                  </span>
                )}
              </div>
              {!isSelf && !isTemp && (
                <MessageActions
                  message={m}
                  isSelf={isSelf}
                  isAdmin={isAdmin}
                  channel={channel}
                  onDeleteForMe={deleteForMe}
                  onDeleteForEveryone={deleteForEveryone}
                  onPin={pinMessage}
                  onAddToAnnouncements={addToAnnouncements}
                />
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <Composer
        text={text}
        onTextChange={(v) => {
          setText(v);
          if (v.trim()) notifyTyping();
        }}
        onSend={sendText}
        onPickFile={(f) => void sendFile(f)}
        onSendVoice={(blob) => void sendFile(blobToFile(blob))}
        uploading={uploading}
        disabled={readOnly || muted}
        disabledMessage={
          readOnly
            ? "القناة دي للإعلانات بس — الأدمنز/الدكاترة/المعيدين هما اللي يكتبوا فيها"
            : "انت متكتوم دلوقتي في الجروب ده"
        }
        typingNames={Object.values(typingUsers)}
      />

      {lightboxUrl && <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  );
}

// ============================================================
// Pins
// ============================================================
function PinsView({ groupId }: { groupId: string }) {
  const [pins, setPins] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await db
        .from("group_pinned_messages")
        .select("*, group_messages(*)")
        .eq("group_id", groupId)
        .order("pinned_at", { ascending: false });
      setPins(data ?? []);
    })();
  }, [groupId]);
  if (pins.length === 0)
    return <p className="py-8 text-center text-sm text-foreground/60">مفيش رسايل متثبتة</p>;
  return (
    <div className="space-y-2 py-2">
      {pins.map((p) => (
        <div key={p.id} className="rounded-xl bg-card/60 px-3 py-2 text-sm">
          {p.group_messages?.content ?? "(ميديا)"}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Media grid
// ============================================================
function MediaView({ groupId }: { groupId: string }) {
  const [items, setItems] = useState<MessageRow[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await db
        .from("group_messages")
        .select("*")
        .eq("group_id", groupId)
        .in("type", ["image", "video"])
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      setItems((data as MessageRow[]) ?? []);
    })();
  }, [groupId]);
  if (items.length === 0)
    return <p className="py-8 text-center text-sm text-foreground/60">مفيش وسائط لسه</p>;
  return (
    <div className="grid grid-cols-3 gap-2 py-2 sm:grid-cols-4">
      {items.map((m) =>
        m.type === "image" ? (
          <img key={m.id} src={m.media_url!} className="aspect-square rounded-lg object-cover" />
        ) : (
          <video key={m.id} src={m.media_url!} className="aspect-square rounded-lg object-cover" />
        ),
      )}
    </div>
  );
}

// ============================================================
// Links
// ============================================================
const URL_REGEX = /(https?:\/\/[^\s]+)/g;
function LinksView({ groupId }: { groupId: string }) {
  const [links, setLinks] = useState<{ id: string; url: string; created_at: string }[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await db
        .from("group_messages")
        .select("id, content, created_at")
        .eq("group_id", groupId)
        .eq("type", "text")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(300);
      const found: { id: string; url: string; created_at: string }[] = [];
      for (const row of data ?? []) {
        const matches = (row.content as string)?.match(URL_REGEX);
        matches?.forEach((url) => found.push({ id: row.id, url, created_at: row.created_at }));
      }
      setLinks(found);
    })();
  }, [groupId]);
  if (links.length === 0)
    return <p className="py-8 text-center text-sm text-foreground/60">مفيش روابط اتبعتت لسه</p>;
  return (
    <div className="space-y-1.5 py-2">
      {links.map((l, i) => (
        <a
          key={i}
          href={l.url}
          target="_blank"
          rel="noreferrer"
          className="block truncate rounded-xl bg-card/60 px-3 py-2 text-sm text-accent hover:underline"
        >
          {l.url}
        </a>
      ))}
    </div>
  );
}

// ============================================================
// Schedule
// ============================================================
function ScheduleView({
  groupId,
  isAdmin,
  userId,
}: {
  groupId: string;
  isAdmin: boolean;
  userId: string;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", day_of_week: "sat", start_time: "09:00", location: "" });

  async function load() {
    const { data } = await db
      .from("group_schedules")
      .select("*")
      .eq("group_id", groupId)
      .order("day_of_week");
    setItems(data ?? []);
  }
  useEffect(() => {
    void load();
  }, [groupId]);

  async function add() {
    if (!form.title.trim()) return;
    const { error } = await db.from("group_schedules").insert({ ...form, group_id: groupId, created_by: userId });
    if (error) return toast.error(error.message);
    setForm({ title: "", day_of_week: "sat", start_time: "09:00", location: "" });
    await load();
  }

  async function remove(id: string) {
    await db.from("group_schedules").delete().eq("id", id);
    await load();
  }

  return (
    <div className="space-y-3 py-2">
      {items.map((s) => (
        <div key={s.id} className="flex items-center justify-between rounded-xl bg-card/60 px-3 py-2 text-sm">
          <div>
            <span className="font-semibold text-accent">
              {DAYS.find((d) => d.key === s.day_of_week)?.label} — {s.start_time?.slice(0, 5)}
            </span>{" "}
            {s.title} {s.location && `· ${s.location}`}
          </div>
          {isAdmin && (
            <button onClick={() => remove(s.id)}>
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </button>
          )}
        </div>
      ))}
      {items.length === 0 && (
        <p className="text-center text-sm text-foreground/60">مفيش جدول متحط لسه</p>
      )}

      {isAdmin && (
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl border border-border/60 p-3 sm:grid-cols-4">
          <Input
            placeholder="اسم المحاضرة"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <select
            className="rounded-md border border-border bg-background px-2 text-sm"
            value={form.day_of_week}
            onChange={(e) => setForm({ ...form, day_of_week: e.target.value })}
          >
            {DAYS.map((d) => (
              <option key={d.key} value={d.key}>
                {d.label}
              </option>
            ))}
          </select>
          <Input
            type="time"
            value={form.start_time}
            onChange={(e) => setForm({ ...form, start_time: e.target.value })}
          />
          <Input
            placeholder="المكان/اللينك"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
          <Button className="col-span-2 sm:col-span-4" onClick={add}>
            إضافة
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Members + moderation
// ============================================================
function MembersView({
  groupId,
  isBigBoss,
  actorId,
}: {
  groupId: string;
  isBigBoss: boolean;
  actorId: string;
}) {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [newAdminId, setNewAdminId] = useState("");

  async function load() {
    const { data } = await db.from("group_members").select("*").eq("group_id", groupId);
    const rows = data ?? [];
    // Resolve names through the get_profile_names() RPC instead of embedding
    // `profiles` directly — a per-group doctor/assistant isn't necessarily a
    // global `admin`, and the base RLS on `profiles` would hide other
    // students' names from them if we queried the table straight.
    const ids = rows.map((r: any) => r.user_id);
    const { data: names } = ids.length
      ? await db.rpc("get_profile_names", { p_ids: ids })
      : { data: [] };
    const nameMap = new Map((names ?? []).map((n: any) => [n.id, n.full_name]));
    setMembers(rows.map((m: any) => ({ ...m, full_name: nameMap.get(m.user_id) ?? m.user_id })));
  }
  useEffect(() => {
    void load();
  }, [groupId]);

  async function ban(userId: string) {
    await db.from("group_members").update({ status: "banned" }).eq("group_id", groupId).eq("user_id", userId);
    await db.from("group_audit_log").insert({ group_id: groupId, actor_id: actorId, action: "ban", target_user_id: userId });
    await load();
  }

  async function unban(userId: string) {
    await db.from("group_members").update({ status: "active" }).eq("group_id", groupId).eq("user_id", userId);
    await load();
  }

  async function mute(userId: string, minutes: number) {
    const until = new Date(Date.now() + minutes * 60_000).toISOString();
    await db.from("group_members").update({ muted_until: until }).eq("group_id", groupId).eq("user_id", userId);
    await db.from("group_audit_log").insert({
      group_id: groupId,
      actor_id: actorId,
      action: "mute",
      target_user_id: userId,
      details: { minutes },
    });
    await load();
    toast.success(`اتكتم لمدة ${minutes} دقيقة`);
  }

  async function promote(userId: string, role: "admin" | "doctor" | "assistant") {
    if (!isBigBoss) return toast.error("البيج بوس بس اللي يقدر يعين رتب");
    const { error } = await db
      .from("group_role_assignments")
      .upsert({ group_id: groupId, user_id: userId, role, assigned_by: actorId }, { onConflict: "group_id,user_id" });
    if (error) toast.error(error.message);
    else toast.success("اتعينت الرتبة");
  }

  return (
    <div className="space-y-1.5 py-2">
      {members.map((m) => (
        <div
          key={m.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/40 bg-card/50 px-3 py-2 text-sm"
        >
          <span className="flex items-center gap-2">
            <GroupAvatar name={m.full_name || "?"} size="sm" />
            {m.full_name}
            {m.status === "banned" && (
              <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] text-destructive">
                محظور
              </span>
            )}
          </span>
          <div className="flex items-center gap-1.5">
            {m.status === "active" ? (
              <button onClick={() => ban(m.user_id)} title="حظر" className="rounded-full bg-background/80 p-1.5">
                <ShieldOff className="h-3.5 w-3.5 text-destructive" />
              </button>
            ) : (
              <button onClick={() => unban(m.user_id)} title="فك الحظر" className="rounded-full bg-background/80 p-1.5 text-xs">
                فك الحظر
              </button>
            )}
            <button onClick={() => mute(m.user_id, 60)} title="كتم ساعة" className="rounded-full bg-background/80 p-1.5">
              <VolumeX className="h-3.5 w-3.5" />
            </button>
            {isBigBoss && (
              <button onClick={() => promote(m.user_id, "admin")} title="تعيين أدمن" className="rounded-full bg-background/80 p-1.5">
                <UserPlus className="h-3.5 w-3.5 text-accent" />
              </button>
            )}
          </div>
        </div>
      ))}
      {members.length === 0 && (
        <p className="text-center text-sm text-foreground/60">مفيش أعضاء لسه</p>
      )}
    </div>
  );
}

// ============================================================
// Direct messages ("الخاص")
// ============================================================
function DMList({
  userId,
  activeConversationId,
  onOpen,
}: {
  userId: string;
  activeConversationId: string | null;
  onOpen: (c: { id: string; otherId: string; otherName: string }) => void;
}) {
  const [conversations, setConversations] = useState<
    { id: string; otherId: string; otherName: string }[]
  >([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [busy, setBusy] = useState(true);

  async function load() {
    setBusy(true);
    const { data } = await db
      .from("direct_conversations")
      .select("*")
      .or(`user_a.eq.${userId},user_b.eq.${userId}`)
      .order("created_at", { ascending: false });
    const rows = data ?? [];
    const otherIds = rows.map((r: any) => (r.user_a === userId ? r.user_b : r.user_a));
    const { data: names } = otherIds.length
      ? await db.rpc("get_profile_names", { p_ids: otherIds })
      : { data: [] };
    const nameMap = new Map((names ?? []).map((n: any) => [n.id, n.full_name]));
    setConversations(
      rows.map((r: any) => {
        const otherId = r.user_a === userId ? r.user_b : r.user_a;
        return { id: r.id, otherId, otherName: nameMap.get(otherId) ?? "مستخدم" };
      }),
    );
    setBusy(false);
  }

  useEffect(() => {
    void load();
  }, [userId]);

  async function startWith(otherId: string, otherName: string) {
    const { data, error } = await db.rpc("get_or_create_dm", { p_other_user: otherId });
    if (error) return toast.error(error.message);
    setSearchOpen(false);
    onOpen({ id: data as string, otherId, otherName });
    await load();
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-base">الخاص</h2>
        <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
          <DialogTrigger asChild>
            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full">
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>ابدأ محادثة جديدة</DialogTitle>
            </DialogHeader>
            <SearchUsers onPick={startWith} />
          </DialogContent>
        </Dialog>
      </div>
      {busy ? (
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
      ) : conversations.length === 0 ? (
        <p className="text-xs text-foreground/60">مفيش محادثات لسه</p>
      ) : (
        <div className="space-y-1.5">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => onOpen(c)}
              className={`flex w-full items-center gap-2 truncate rounded-xl px-2.5 py-2 text-right text-sm transition ${
                activeConversationId === c.id ? "bg-accent/15 text-accent" : "hover:bg-card/60"
              }`}
            >
              <GroupAvatar name={c.otherName} size="sm" />
              <span className="truncate">{c.otherName}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function SearchUsers({ onPick }: { onPick: (id: string, name: string) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ id: string; full_name: string }[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setBusy(true);
      const { data, error } = await db.rpc("search_profiles", { p_query: q.trim() });
      if (error) toast.error(error.message);
      setResults((data as any[]) ?? []);
      setBusy(false);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="دور بالاسم..."
          className="pr-9"
        />
      </div>
      {busy && <Loader2 className="h-4 w-4 animate-spin text-accent" />}
      <div className="max-h-60 space-y-1 overflow-y-auto">
        {results.map((r) => (
          <button
            key={r.id}
            onClick={() => onPick(r.id, r.full_name)}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-right text-sm hover:bg-card/60"
          >
            <GroupAvatar name={r.full_name} size="sm" />
            {r.full_name}
          </button>
        ))}
      </div>
    </div>
  );
}

function DMChatView({ conversationId, userId }: { conversationId: string; userId: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    const { data } = await db
      .from("direct_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: true })
      .limit(200);
    setMessages(data ?? []);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  useEffect(() => {
    void load();
    const ch = db
      .channel(`dm-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          setMessages((prev) => [...prev, payload.new]);
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        },
      )
      .subscribe();
    return () => {
      db.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  async function sendText() {
    if (!text.trim()) return;
    const body = text;
    setText("");
    const { error } = await db
      .from("direct_messages")
      .insert({ conversation_id: conversationId, sender_id: userId, type: "text", content: body });
    if (error) toast.error(error.message);
  }

  async function sendFile(file: File) {
    const type = file.type.startsWith("image")
      ? "image"
      : file.type.startsWith("video")
        ? "video"
        : file.type.startsWith("audio")
          ? "audio"
          : "file";
    setUploading(true);
    const path = `${conversationId}/${Date.now()}-${file.name}`;
    const { error: upErr } = await db.storage.from("dm-media").upload(path, file);
    setUploading(false);
    if (upErr) return toast.error(upErr.message);
    // dm-media is a private bucket — build a signed URL instead of a public one
    const { data: signed } = await db.storage.from("dm-media").createSignedUrl(path, 60 * 60 * 24 * 7);
    const { error } = await db.from("direct_messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      type,
      content: type === "file" ? file.name : null,
      media_url: signed?.signedUrl ?? null,
      media_size_bytes: file.size,
    });
    if (error) toast.error(error.message);
  }

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  return (
    <div className="flex h-[500px] flex-col">
      <div className="flex-1 space-y-2.5 overflow-y-auto py-1 pr-1">
        {messages.map((m) => {
          const isSelf = m.sender_id === userId;
          const isMedia = (m.type === "image" || m.type === "video") && !!m.media_url;
          return (
            <div key={m.id} className={`flex ${isSelf ? "justify-start" : "justify-end"}`}>
              <div
                className={
                  isMedia
                    ? "relative max-w-[75%] overflow-hidden rounded-2xl shadow-soft"
                    : `max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-soft ${
                        isSelf
                          ? "rounded-br-md bg-gradient-cosmic text-primary-foreground"
                          : "rounded-bl-md border border-border/50 bg-card/70"
                      }`
                }
              >
                {m.type === "text" && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                {m.type === "image" && m.media_url && (
                  <div className="relative">
                    <img
                      src={m.media_url}
                      onClick={() => setLightboxUrl(m.media_url!)}
                      className="max-h-72 w-full cursor-pointer rounded-2xl object-cover"
                    />
                    <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/50 px-1.5 py-0.5 text-[10px] text-white">
                      {formatTime(m.created_at)}
                    </span>
                  </div>
                )}
                {m.type === "video" && m.media_url && (
                  <video src={m.media_url} controls className="max-h-72 w-full rounded-2xl" />
                )}
                {m.type === "audio" && m.media_url && (
                  <audio src={m.media_url} controls className="h-9 w-56 max-w-full" />
                )}
                {m.type === "file" && m.media_url && (
                  <FileCard
                    name={m.content || fileNameFromUrl(m.media_url)}
                    url={m.media_url}
                    size={m.media_size_bytes}
                    tint={isSelf ? "self" : "other"}
                  />
                )}
                {!isMedia && (
                  <span
                    className={`mt-1 block text-left text-[10px] ${
                      isSelf ? "text-primary-foreground/70" : "text-foreground/40"
                    }`}
                  >
                    {formatTime(m.created_at)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <Composer
        text={text}
        onTextChange={setText}
        onSend={sendText}
        onPickFile={(f) => void sendFile(f)}
        onSendVoice={(blob) => void sendFile(blobToFile(blob))}
        uploading={uploading}
      />
      {lightboxUrl && <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
    </div>
  );
}
