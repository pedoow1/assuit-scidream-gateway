import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
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
  VolumeX,
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
  Crown,
  Ban,
  Reply,
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
  // Who can even SEE this group in the list (before joining): every batch,
  // one specific batch (visibility_batch_year), or a hand-picked list of
  // people (group_visible_users). Ignored entirely when is_closed is true —
  // a closed group is invisible to everyone except members/admins/Big Boss
  // and can only be joined via a one-time invite sent over DM.
  visibility?: "all" | "batch" | "people";
  visibility_batch_year?: number | null;
  is_closed?: boolean;
};

// Group-invite DMs are just a normal direct_messages row whose content is
// this JSON marker — no new message "type" needed, so it can't collide with
// any check constraint we don't know about on the live table.
const GROUP_INVITE_PREFIX = "@@GROUP_INVITE@@";
function buildGroupInviteContent(code: string, groupName: string) {
  return GROUP_INVITE_PREFIX + JSON.stringify({ code, groupName });
}
function parseGroupInvite(content: string | null | undefined): { code: string; groupName: string } | null {
  if (!content || !content.startsWith(GROUP_INVITE_PREFIX)) return null;
  try {
    return JSON.parse(content.slice(GROUP_INVITE_PREFIX.length));
  } catch {
    return null;
  }
}

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

// Deterministic per-sender name color for group chats (Telegram-style),
// so each member's name is visually distinct above their messages.
const SENDER_NAME_COLORS = [
  "text-violet-400",
  "text-amber-400",
  "text-sky-400",
  "text-emerald-400",
  "text-rose-400",
  "text-indigo-400",
  "text-teal-400",
  "text-orange-400",
];
function senderNameColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return SENDER_NAME_COLORS[hash % SENDER_NAME_COLORS.length];
}
function GroupAvatar({
  name,
  size = "md",
  avatarUrl,
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  // Real profile picture, when we have one — falls back to the initial-letter
  // gradient (used for groups, or users with no avatar_url).
  avatarUrl?: string | null;
}) {
  const dims = size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-12 w-12 text-lg" : "h-9 w-9 text-sm";
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${dims} shrink-0 rounded-full object-cover`}
      />
    );
  }
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
  reply_to_id?: string | null;
  media_size_bytes?: number | null;
  // Set when this message was forwarded from somewhere else — holds the
  // original sender's display name so the bubble can show "↪ محولة من ...".
  forwarded_from_name?: string | null;
};

type MemberRow = {
  id: string;
  user_id: string;
  status: "active" | "banned";
  muted_until: string | null;
  banned_until?: string | null;
  full_name?: string;
  level?: number;
};

// A member is actually muted right now if muted_until is in the future (or
// the "مكتوم للأبد" sentinel, which Postgres stores as 'infinity').
function isCurrentlyMuted(mutedUntil: string | null | undefined) {
  if (!mutedUntil) return false;
  if (mutedUntil === "infinity") return true;
  return new Date(mutedUntil).getTime() > Date.now();
}

// Duration options shown before every mute/ban — "قد ايه؟" — null = forever.
const DURATION_OPTIONS: { key: string; label: string; seconds: number | null }[] = [
  { key: "1h", label: "ساعة", seconds: 60 * 60 },
  { key: "6h", label: "6 ساعات", seconds: 6 * 60 * 60 },
  { key: "1d", label: "يوم", seconds: 24 * 60 * 60 },
  { key: "1w", label: "أسبوع", seconds: 7 * 24 * 60 * 60 },
  { key: "1mo", label: "شهر", seconds: 30 * 24 * 60 * 60 },
  { key: "1y", label: "سنة", seconds: 365 * 24 * 60 * 60 },
  { key: "forever", label: "للأبد", seconds: null },
];

// Badge shown next to a member's name inside a specific group. Big Boss /
// site admin are global; group role (admin/doctor/assistant) is per-group,
// with the subject pulled straight from that group's `subject` field.
function groupBadgeLabel(
  info: { is_big_boss?: boolean; is_site_admin?: boolean; group_role?: string | null; display_title?: string | null } | undefined,
  groupSubject?: string | null,
): string | null {
  if (!info) return null;
  if (info.display_title?.trim()) return info.display_title.trim();
  if (info.is_big_boss) return "Big Boss";
  if (info.is_site_admin) return "أدمن الموقع";
  if (info.group_role === "admin") return "أدمن الجروب";
  if (info.group_role === "doctor") return groupSubject ? `د. ${groupSubject}` : "دكتور";
  if (info.group_role === "assistant") return groupSubject ? `معيد ${groupSubject}` : "معيد";
  return null;
}

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

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Discord-style short preview of a message for reply-quote UI — media
// messages fall back to a friendly label since there's no text to show.
function messagePreviewText(m: { type: string; content: string | null } | null | undefined) {
  if (!m) return "رسالة محذوفة";
  if (m.type === "text") return (m.content || "").slice(0, 120);
  if (m.type === "image") return "📷 صورة";
  if (m.type === "video") return "🎬 فيديو";
  if (m.type === "audio") return "🎙️ رسالة صوتية";
  if (m.type === "file") return `📎 ${m.content || "ملف"}`;
  return m.content || "";
}

// Renders message text with "@Full Name" mentions highlighted in purple and
// linked to that person's public profile — matches against known member
// names so random "@" usage that isn't an actual mention stays plain text.
function MessageContent({
  content,
  mentionCandidates,
  isSelf,
}: {
  content: string;
  mentionCandidates?: { id: string; full_name: string }[];
  // Own messages sit on the purple/gold `bg-gradient-cosmic` bubble, where
  // the default purple-400 mention color nearly disappears (purple text on
  // a purple/rose gradient). Use a high-contrast style there instead.
  isSelf?: boolean;
}) {
  if (!content) return null;
  const candidates = (mentionCandidates ?? []).filter((c) => c.full_name?.trim());
  if (candidates.length === 0) return <>{content}</>;

  // Longest names first so "Ahmed Ali" wins over a shorter "Ahmed" candidate
  // when both could match at the same position.
  const sorted = [...candidates].sort((a, b) => b.full_name.length - a.full_name.length);
  const pattern = sorted.map((c) => escapeRegExp(c.full_name)).join("|");
  const regex = new RegExp(`@(${pattern})(?=\\s|$)`, "g");

  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(content))) {
    if (match.index > lastIndex) parts.push(content.slice(lastIndex, match.index));
    const name = match[1];
    const candidate = sorted.find((c) => c.full_name === name);
    parts.push(
      candidate ? (
        <Link
          key={`mention-${key++}`}
          to="/profile/$userId"
          params={{ userId: candidate.id }}
          onClick={(e) => e.stopPropagation()}
          className={
            isSelf
              ? "font-bold text-white underline decoration-white/70 underline-offset-2 hover:decoration-white"
              : "font-semibold text-purple-400 hover:underline"
          }
        >
          @{name}
        </Link>
      ) : (
        `@${name}`
      ),
    );
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < content.length) parts.push(content.slice(lastIndex));
  return <>{parts}</>;
}

// Discord-style "swipe the bubble to reply" gesture for touch devices —
// wraps a message row and fires onReply once the drag passes a threshold.
function SwipeToReply({
  children,
  onReply,
  justify,
}: {
  children: ReactNode;
  onReply: () => void;
  justify: "start" | "end";
}) {
  const [dragX, setDragX] = useState(0);
  const startX = useRef<number | null>(null);
  const triggered = useRef(false);
  const THRESHOLD = 52;
  const MAX_DRAG = 84;

  function handleStart(x: number) {
    startX.current = x;
    triggered.current = false;
  }
  function handleMove(x: number) {
    if (startX.current === null) return;
    const raw = x - startX.current;
    const clamped = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, raw));
    setDragX(clamped);
    if (!triggered.current && Math.abs(clamped) >= THRESHOLD) {
      triggered.current = true;
      if (navigator.vibrate) navigator.vibrate(12);
    }
  }
  function handleEnd() {
    if (triggered.current) onReply();
    setDragX(0);
    startX.current = null;
    triggered.current = false;
  }

  return (
    <div
      onTouchStart={(e) => handleStart(e.touches[0].clientX)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
      onTouchEnd={handleEnd}
      onTouchCancel={handleEnd}
      className={`relative flex w-full items-end gap-1 ${justify === "start" ? "justify-start" : "justify-end"}`}
      style={{
        transform: `translateX(${dragX}px)`,
        transition: startX.current === null ? "transform 0.18s ease" : "none",
      }}
    >
      {Math.abs(dragX) > 8 && (
        <Reply
          className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-accent ${
            dragX > 0 ? "-right-6 scale-x-[-1]" : "-left-6"
          }`}
          style={{ opacity: Math.min(1, Math.abs(dragX) / THRESHOLD) }}
        />
      )}
      {children}
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
  mentionCandidates,
  replyingTo,
  onCancelReply,
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
  // Discord-style "@" autocomplete — pass the group's members to enable it.
  mentionCandidates?: { id: string; full_name: string }[];
  // Discord-style "replying to ..." bar shown above the input.
  replyingTo?: { senderName: string; preview: string } | null;
  onCancelReply?: () => void;
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

  // "@" mention — triggers on an @ that starts the message or follows a
  // space, matches against the group's member names (Discord-style).
  const mentionMatch = mentionCandidates ? text.match(/(^|\s)@([^\s@]*)$/) : null;
  const mentionQuery = mentionMatch ? mentionMatch[2] : null;
  const mentionResults =
    mentionQuery !== null && mentionCandidates
      ? mentionCandidates
          .filter((c) => c.full_name.toLowerCase().includes(mentionQuery.toLowerCase()))
          .slice(0, 6)
      : [];

  function pickMention(name: string) {
    const idx = text.lastIndexOf("@");
    onTextChange(`${text.slice(0, idx)}@${name} `);
  }

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
      {replyingTo && (
        <div className="mb-1.5 flex items-center justify-between gap-2 rounded-2xl border border-border/60 bg-card/50 px-3 py-1.5">
          <div className="min-w-0 flex-1 border-r-2 border-accent pr-2 text-right">
            <p className="truncate text-xs font-semibold text-accent">{replyingTo.senderName}</p>
            <p className="truncate text-xs text-foreground/60">{replyingTo.preview}</p>
          </div>
          <button
            onClick={onCancelReply}
            title="إلغاء الرد"
            className="shrink-0 rounded-full p-1 text-foreground/50 transition hover:bg-background/60 hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
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
        <div className="relative flex items-center gap-1.5 rounded-full border border-border/60 bg-card/50 py-1 pl-1.5 pr-3 backdrop-blur">
          {mentionResults.length > 0 && (
            <div className="absolute bottom-full right-0 mb-1.5 w-56 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft">
              {mentionResults.map((c) => (
                <button
                  key={c.id}
                  onClick={() => pickMention(c.full_name)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-right text-sm hover:bg-accent/15"
                >
                  <GroupAvatar name={c.full_name} size="sm" />
                  <span className="truncate">{c.full_name}</span>
                </button>
              ))}
            </div>
          )}
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
  const isSiteAdmin = isBigBoss || !!roles?.includes("admin");
  const canCreateGroups = isSiteAdmin;
  const myName = profile?.full_name || user?.email || "أنا";

  const [mode, setMode] = useState<"groups" | "dm">("groups");

  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [activeGroup, setActiveGroup] = useState<GroupRow | null>(null);
  const [myLevel, setMyLevel] = useState(0); // 0 none · 1 member · 2 admin/doctor/assistant/site admin · 3 big boss
  // My own membership row for the active group — the source of truth for
  // whether *I* am muted/banned right now (fixes the old hardcoded `false`).
  const [myMembership, setMyMembership] = useState<MemberRow | null>(null);
  const [busy, setBusy] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  // When set, the create-group dialog opens pre-scoped to add a sub-group
  // inside this community instead of a brand-new top-level group.
  const [createParentId, setCreateParentId] = useState<string | null>(null);

  const [activeConversation, setActiveConversation] = useState<{
    id: string;
    otherId: string;
    otherName: string;
    otherAvatarUrl?: string | null;
  } | null>(null);

  // Sidebar "دور على جروب" search — purely a client-side filter over
  // whatever groups() RLS already returned us.
  const [groupQuery, setGroupQuery] = useState("");
  const filteredGroups = groupQuery.trim()
    ? groups.filter(
        (g) =>
          g.name.toLowerCase().includes(groupQuery.trim().toLowerCase()) ||
          (g.subject ?? "").toLowerCase().includes(groupQuery.trim().toLowerCase()),
      )
    : groups;

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
    if (!activeGroup || !user) {
      setMyMembership(null);
      return;
    }
    (async () => {
      // Opening a group registers you as an active member — unless you
      // already have a row (e.g. you're banned; that must stick).
      await db
        .from("group_members")
        .upsert(
          { group_id: activeGroup.id, user_id: user.id, status: "active" },
          { onConflict: "group_id,user_id", ignoreDuplicates: true },
        );

      const [{ data: levelData }, { data: memberRow }] = await Promise.all([
        db.rpc("group_user_level", { p_user_id: user.id, p_group_id: activeGroup.id }),
        db.from("group_members").select("*").eq("group_id", activeGroup.id).eq("user_id", user.id).maybeSingle(),
      ]);
      setMyLevel(typeof levelData === "number" ? levelData : 0);
      setMyMembership((memberRow as MemberRow) ?? null);
    })();
  }, [activeGroup, user]);

  async function createGroup(
    name: string,
    description: string,
    subject: string,
    parentGroupId: string | null,
    visibilityOpts: {
      visibility: "all" | "batch" | "people";
      visibilityBatchYear: number | null;
      isClosed: boolean;
      visiblePeople: { id: string; full_name: string }[];
    },
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
        visibility: visibilityOpts.visibility,
        visibility_batch_year:
          visibilityOpts.visibility === "batch" ? visibilityOpts.visibilityBatchYear : null,
        is_closed: visibilityOpts.isClosed,
      })
      .select("*")
      .single();
    if (error) return toast.error(error.message);
    await db.from("group_members").insert({ group_id: data.id, user_id: user.id, status: "active" });
    if (visibilityOpts.visibility === "people" && visibilityOpts.visiblePeople.length) {
      await db.from("group_visible_users").insert(
        visibilityOpts.visiblePeople.map((p) => ({
          group_id: data.id,
          user_id: p.id,
          added_by: user.id,
        })),
      );
    }
    toast.success(parentGroupId ? "اتعمل الجروب الفرعي" : "اتعمل الجروب");
    setCreateOpen(false);
    setCreateParentId(null);
    setActiveGroup(data as GroupRow);
    await loadGroups();
  }

  // Used both after editing a group's settings and after redeeming a DM
  // invite to a closed group — keeps the sidebar list + the open panel in
  // sync with the DB without a full page reload.
  function applyGroupUpdate(updated: GroupRow) {
    setGroups((prev) => prev.map((g) => (g.id === updated.id ? { ...g, ...updated } : g)));
    setActiveGroup((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
  }

  // Called after a "دخول الجروب" tap on a group-invite DM card.
  async function openGroupById(groupId: string) {
    await loadGroups();
    const { data } = await db.from("groups").select("*").eq("id", groupId).maybeSingle();
    if (data) {
      setActiveGroup(data as GroupRow);
      setMode("groups");
    }
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
              {groups.length > 0 && (
                <div className="relative mb-2.5">
                  <Search className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground/50" />
                  <Input
                    value={groupQuery}
                    onChange={(e) => setGroupQuery(e.target.value)}
                    placeholder="دور على جروب..."
                    className="h-8 pr-8 text-xs"
                  />
                </div>
              )}
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin text-accent" />
              ) : groups.length === 0 ? (
                <p className="text-xs text-foreground/60">مفيش جروبات لسه</p>
              ) : filteredGroups.length === 0 ? (
                <p className="text-xs text-foreground/60">مفيش جروب بالاسم ده</p>
              ) : (
                <GroupsTree
                  groups={filteredGroups}
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
              isSiteAdmin={isSiteAdmin}
              myMembership={myMembership}
              canCreateGroups={canCreateGroups}
              onSelectGroup={setActiveGroup}
              onAddSubgroup={(parentId) => {
                setCreateParentId(parentId);
                setCreateOpen(true);
              }}
              onDeleteGroup={deleteGroup}
              onGroupUpdated={applyGroupUpdate}
            />
          )
        ) : !activeConversation ? (
          <div className="cosmic-card flex min-h-[300px] items-center justify-center rounded-3xl p-8 text-sm text-foreground/60">
            اختار حد تكلمه أو دور على شخص جديد
          </div>
        ) : (
          <div className="cosmic-card rounded-3xl p-4 md:p-6">
            <Link
              to="/profile/$userId"
              params={{ userId: activeConversation.otherId }}
              className="mb-4 flex items-center gap-2 hover:opacity-80"
            >
              <GroupAvatar name={activeConversation.otherName} size="sm" avatarUrl={activeConversation.otherAvatarUrl} />
              <h2 className="font-display text-xl">{activeConversation.otherName}</h2>
            </Link>
            <DMChatView
              conversationId={activeConversation.id}
              userId={user.id}
              myName={myName}
              otherId={activeConversation.otherId}
              otherName={activeConversation.otherName}
              onJoinedGroup={openGroupById}
            />
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
    visibilityOpts: {
      visibility: "all" | "batch" | "people";
      visibilityBatchYear: number | null;
      isClosed: boolean;
      visiblePeople: { id: string; full_name: string }[];
    },
  ) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [parentId, setParentId] = useState<string | null>(defaultParentId);
  const communities = groups.filter((g) => !g.parent_group_id);
  const lockedParent = communities.find((c) => c.id === defaultParentId);

  const [visibility, setVisibility] = useState<"all" | "batch" | "people">("all");
  const [batchYear, setBatchYear] = useState("");
  const [isClosed, setIsClosed] = useState(false);
  const [visiblePeople, setVisiblePeople] = useState<{ id: string; full_name: string }[]>([]);

  return (
    <div className="max-h-[70vh] space-y-3 overflow-y-auto pl-1">
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

      <div className="space-y-1.5 border-t border-border/50 pt-3">
        <Label className="text-xs text-foreground/70">مين يقدر يشوف الجروب ده؟</Label>
        <Select value={visibility} onValueChange={(v) => setVisibility(v as "all" | "batch" | "people")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الدفعات</SelectItem>
            <SelectItem value="batch">دفعة معينة بس</SelectItem>
            <SelectItem value="people">أشخاص محددين بس</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {visibility === "batch" && (
        <Input
          type="number"
          placeholder="سنة الدفعة (مثال 2023)"
          value={batchYear}
          onChange={(e) => setBatchYear(e.target.value)}
        />
      )}

      {visibility === "people" && (
        <div className="space-y-2">
          <SearchUsers
            onPick={(id, fullName) =>
              setVisiblePeople((prev) => (prev.some((p) => p.id === id) ? prev : [...prev, { id, full_name: fullName }]))
            }
          />
          {visiblePeople.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {visiblePeople.map((p) => (
                <span key={p.id} className="flex items-center gap-1 rounded-full bg-card/70 px-2 py-1 text-xs">
                  {p.full_name}
                  <button onClick={() => setVisiblePeople((prev) => prev.filter((x) => x.id !== p.id))}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-foreground/80">
        <input type="checkbox" checked={isClosed} onChange={(e) => setIsClosed(e.target.checked)} />
        الجروب مغلق — مايظهرش لحد، الدخول بدعوة بس من الأدمن
      </label>

      <Button
        className="w-full"
        onClick={() =>
          onCreate(name, description, subject, parentId, {
            visibility,
            visibilityBatchYear: batchYear ? Number(batchYear) : null,
            isClosed,
            visiblePeople,
          })
        }
      >
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
  isSiteAdmin,
  myMembership,
  canCreateGroups,
  onSelectGroup,
  onAddSubgroup,
  onDeleteGroup,
  onGroupUpdated,
}: {
  group: GroupRow;
  groups: GroupRow[];
  myLevel: number;
  userId: string;
  myName: string;
  isBigBoss: boolean;
  isSiteAdmin: boolean;
  myMembership: MemberRow | null;
  canCreateGroups: boolean;
  onSelectGroup: (g: GroupRow) => void;
  onAddSubgroup: (parentId: string) => void;
  onDeleteGroup: (g: GroupRow) => void;
  onGroupUpdated: (g: GroupRow) => void;
}) {
  const isAdmin = myLevel >= 2;
  const isBigBoss = myLevel >= 3;
  // Big Boss is immune by definition — even if a stale membership row says
  // otherwise, it can never actually apply to them.
  const iAmMuted = !isBigBoss && isCurrentlyMuted(myMembership?.muted_until);
  const iAmBanned = !isBigBoss && myMembership?.status === "banned";

  const parent = group.parent_group_id
    ? groups.find((g) => g.id === group.parent_group_id) ?? null
    : null;
  const children = groups.filter((g) => g.parent_group_id === group.id);

  const [settingsOpen, setSettingsOpen] = useState(false);

  // Tabs are controlled so tapping a pinned message can jump straight to
  // "الشات" (or "الإعلانات", if that's where the message lives) and scroll
  // to it — a fresh jumpTarget forces the effect in ChatView to re-run even
  // if the id repeats (e.g. tapping the same pin twice in a row).
  const [activeTab, setActiveTab] = useState("chat");
  const [jumpTarget, setJumpTarget] = useState<{ message: MessageRow; nonce: number } | null>(null);
  function jumpToPinnedMessage(message: MessageRow) {
    setActiveTab(message.channel === "announcements" ? "announcements" : "chat");
    setJumpTarget({ message, nonce: Date.now() });
  }

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
              {isSiteAdmin && (
                <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                  <Users className="ml-2 h-3.5 w-3.5" /> إعدادات الجروب
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

      {isSiteAdmin && (
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>إعدادات جروب {group.name}</DialogTitle>
            </DialogHeader>
            <GroupSettingsDialog
              group={group}
              userId={userId}
              onUpdated={(g) => {
                onGroupUpdated(g);
                setSettingsOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

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

      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
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
          <ChatView
            group={group}
            channel="general"
            userId={userId}
            myName={myName}
            isAdmin={isAdmin}
            isBigBoss={isBigBoss}
            isSiteAdmin={isSiteAdmin}
            muted={iAmMuted}
            banned={iAmBanned}
            jumpTarget={jumpTarget}
          />
        </TabsContent>
        <TabsContent value="announcements">
          <ChatView
            group={group}
            channel="announcements"
            userId={userId}
            myName={myName}
            isAdmin={isAdmin}
            isBigBoss={isBigBoss}
            isSiteAdmin={isSiteAdmin}
            muted={iAmMuted}
            banned={iAmBanned}
            readOnly={!isAdmin}
            jumpTarget={jumpTarget}
          />
        </TabsContent>

        <TabsContent value="pins">
          <PinsView groupId={group.id} isAdmin={isAdmin} onJump={jumpToPinnedMessage} />
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
            <MembersView
              groupId={group.id}
              groupSubject={group.subject}
              isBigBoss={isBigBoss}
              isSiteAdmin={isSiteAdmin}
              actorId={userId}
            />
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
  canDeleteForEveryone,
  channel,
  onDeleteForMe,
  onDeleteForEveryone,
  onPin,
  onAddToAnnouncements,
  onForward,
}: {
  message: MessageRow;
  isSelf: boolean;
  isAdmin: boolean;
  // Pre-computed per-message: true only if this actor actually outranks the
  // sender (or it's their own recent message) — see canModerate().
  canDeleteForEveryone: boolean;
  channel: "general" | "announcements";
  onDeleteForMe: (id: string) => void;
  onDeleteForEveryone: (id: string) => void;
  onPin: (id: string) => void;
  onAddToAnnouncements: (m: MessageRow) => void;
  onForward: (m: MessageRow) => void;
}) {
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
        <DropdownMenuItem onClick={() => onForward(message)}>
          <Reply className="ml-2 h-3.5 w-3.5 -scale-x-100" /> توجيه
        </DropdownMenuItem>
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
  isBigBoss,
  isSiteAdmin,
  muted,
  banned = false,
  readOnly = false,
  jumpTarget = null,
}: {
  group: GroupRow;
  channel: "general" | "announcements";
  userId: string;
  myName: string;
  isAdmin: boolean;
  isBigBoss: boolean;
  isSiteAdmin: boolean;
  muted: boolean;
  banned?: boolean;
  readOnly?: boolean;
  // Set from the Pins tab: "jump to this message" — a fresh nonce re-fires
  // the effect even for the same message id.
  jumpTarget?: { message: MessageRow; nonce: number } | null;
}) {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  // Sender role info for the group — lets "delete for everyone" follow the
  // same hierarchy as banning/muting (canModerate) instead of a flat
  // "isAdmin can nuke anything" rule.
  const [senderBadges, setSenderBadges] = useState<Map<string, MemberBadgeInfo>>(new Map());
  const iHaveGroupRole = !!senderBadges.get(userId)?.group_role;

  useEffect(() => {
    (async () => {
      const { data: rows } = await db.from("group_members").select("user_id").eq("group_id", group.id);
      const ids = (rows ?? []).map((r: any) => r.user_id);
      if (!ids.length) {
        setSenderBadges(new Map());
        return;
      }
      const { data: badges } = await db.rpc("get_member_badges", { p_group_id: group.id, p_ids: ids });
      setSenderBadges(new Map((badges ?? []).map((b: any) => [b.user_id, b as MemberBadgeInfo])));
    })();
  }, [group.id]);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Discord-style reply: which message (if any) the composer is replying to,
  // plus refs/highlight so tapping a quoted reply jumps to & flashes the
  // original message.
  const [replyingTo, setReplyingTo] = useState<MessageRow | null>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const messagesById = new Map(messages.map((m) => [m.id, m]));

  function scrollToMessage(id: string | null | undefined) {
    if (!id) return;
    const el = messageRefs.current[id];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(id);
    setTimeout(() => setHighlightId((cur) => (cur === id ? null : cur)), 1500);
  }

  // Jumping to a pinned message: if it's a channel we're not showing here,
  // ignore it (the other ChatView instance handles it). If it's already
  // among the loaded messages, just scroll; otherwise fetch a window of
  // messages around it (it may be older than our default 200-message load)
  // and merge those in before scrolling.
  useEffect(() => {
    if (!jumpTarget || jumpTarget.message.channel !== channel) return;
    const target = jumpTarget.message;
    if (messageRefs.current[target.id]) {
      scrollToMessage(target.id);
      return;
    }
    (async () => {
      const [{ data: before }, { data: after }] = await Promise.all([
        db
          .from("group_messages")
          .select("*")
          .eq("group_id", group.id)
          .eq("channel", channel)
          .eq("is_deleted", false)
          .lte("created_at", target.created_at)
          .order("created_at", { ascending: false })
          .limit(60),
        db
          .from("group_messages")
          .select("*")
          .eq("group_id", group.id)
          .eq("channel", channel)
          .eq("is_deleted", false)
          .gt("created_at", target.created_at)
          .order("created_at", { ascending: true })
          .limit(60),
      ]);
      const merged = [...((before as MessageRow[]) ?? []).reverse(), ...((after as MessageRow[]) ?? [])];
      if (merged.length) setMessages(merged);
      setTimeout(() => scrollToMessage(target.id), 80);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpTarget]);

  // Forward-to-another-chat: which message (if any) is currently queued up
  // in the forward picker.
  const [forwardMessage, setForwardMessage] = useState<MessageRow | null>(null);

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
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "group_messages", filter: `group_id=eq.${group.id}` },
        (payload: any) => {
          if (payload.new.channel !== channel) return;
          // Covers "delete for everyone" (is_deleted flips to true) as well as
          // any other in-place edit — everyone in the chat sees it instantly,
          // no refresh needed.
          if (payload.new.is_deleted) {
            setMessages((prev) => prev.filter((m) => m.id !== payload.new.id));
          } else {
            setMessages((prev) => prev.map((m) => (m.id === payload.new.id ? (payload.new as MessageRow) : m)));
          }
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
    if (banned) return toast.error("انت محظور من الجروب ده");
    if (muted) return toast.error("انت متكتوم دلوقتي في الجروب ده");
    const body = text;
    const replyId = replyingTo?.id ?? null;
    setText("");
    setReplyingTo(null);
    const { error } = await db.from("group_messages").insert({
      group_id: group.id,
      sender_id: userId,
      channel,
      type: "text",
      content: body,
      reply_to_id: replyId,
    });
    if (error) toast.error(error.message);
  }

  async function sendFile(file: File) {
    if (banned) return toast.error("انت محظور من الجروب ده");
    if (muted) return toast.error("انت متكتوم دلوقتي في الجروب ده");
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
    const replyId = replyingTo?.id ?? null;
    setReplyingTo(null);
    const { error } = await db.from("group_messages").insert({
      group_id: group.id,
      sender_id: userId,
      channel,
      type,
      content: type === "file" ? file.name : null,
      media_url: publicUrl,
      media_size_bytes: file.size,
      reply_to_id: replyId,
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

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const visibleMessages = messages
    .filter((m) => !hiddenIds.has(m.id))
    .filter((m) => !searchQuery.trim() || (m.content ?? "").toLowerCase().includes(searchQuery.trim().toLowerCase()));

  return (
    <div className="flex h-[500px] flex-col">
      <div className="mb-1.5 flex items-center justify-end">
        <button
          onClick={() => {
            setSearchOpen((v) => !v);
            if (searchOpen) setSearchQuery("");
          }}
          title="بحث في الشات"
          className="rounded-full p-1.5 text-foreground/50 transition hover:bg-card/60 hover:text-foreground"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>
      {searchOpen && (
        <div className="relative mb-2">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
          <Input
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="دور في رسايل الشات..."
            className="pr-9"
          />
        </div>
      )}
      <div className="flex-1 space-y-2.5 overflow-y-auto py-1 pr-1">
        {visibleMessages.map((m) => {
          const isSelf = m.sender_id === userId;
          const isMedia = (m.type === "image" || m.type === "video") && !!m.media_url;
          const isTemp = m.id.startsWith("temp-");
          const withinWindow = Date.now() - new Date(m.created_at).getTime() < DELETE_FOR_EVERYONE_WINDOW_MS;
          // Own recent message: always deletable. Someone else's message:
          // only if this actor actually outranks the sender in this group
          // (mirrors the ban/mute hierarchy) — a regular member can never
          // delete another member's message, a group admin can't touch a
          // site admin's, etc.
          const senderBadge = senderBadges.get(m.sender_id);
          const canDeleteForEveryone = isSelf
            ? withinWindow
            : canModerate(userId, isBigBoss, isSiteAdmin, iHaveGroupRole, {
                user_id: m.sender_id,
                full_name: senderBadge?.full_name ?? "",
                is_big_boss: !!senderBadge?.is_big_boss,
                is_site_admin: !!senderBadge?.is_site_admin,
                group_role: senderBadge?.group_role ?? null,
              });
          const repliedMessage = m.reply_to_id ? messagesById.get(m.reply_to_id) : null;
          const repliedSenderName = repliedMessage
            ? repliedMessage.sender_id === userId
              ? myName
              : senderBadges.get(repliedMessage.sender_id)?.full_name || "حد"
            : null;
          const mentionCandidates = Array.from(senderBadges.entries()).map(([id, b]) => ({
            id,
            full_name: b.full_name,
          }));
          const senderDisplayName = senderBadge?.full_name || "؟";
          return (
            <SwipeToReply key={m.id} onReply={() => setReplyingTo(m)} justify={isSelf ? "start" : "end"}>
              {isSelf && !isTemp && (
                <MessageActions
                  message={m}
                  isSelf={isSelf}
                  isAdmin={isAdmin}
                  canDeleteForEveryone={canDeleteForEveryone}
                  channel={channel}
                  onDeleteForMe={deleteForMe}
                  onDeleteForEveryone={deleteForEveryone}
                  onPin={pinMessage}
                  onAddToAnnouncements={addToAnnouncements}
                  onForward={setForwardMessage}
                />
              )}
              {!isTemp && (
                <button
                  onClick={() => setReplyingTo(m)}
                  title="رد"
                  className="shrink-0 self-center rounded-full p-1 text-foreground/35 transition hover:bg-card/60 hover:text-foreground"
                >
                  <Reply className="h-3.5 w-3.5" />
                </button>
              )}
              {/* Sender avatar — only for other members' messages, WhatsApp/Telegram-group style */}
              {!isSelf && (
                <GroupAvatar name={senderDisplayName} avatarUrl={senderBadge?.avatar_url} size="sm" />
              )}
              <div
                ref={(el) => (messageRefs.current[m.id] = el)}
                className={
                  isMedia
                    ? `relative max-w-[75%] overflow-hidden rounded-2xl shadow-soft transition ${
                        highlightId === m.id ? "ring-2 ring-accent" : ""
                      }`
                    : `relative max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-soft transition ${
                        isSelf
                          ? "rounded-br-md bg-gradient-cosmic text-primary-foreground"
                          : "rounded-bl-md border border-border/50 bg-card/70"
                      } ${highlightId === m.id ? "ring-2 ring-accent" : ""}`
                }
              >
                {!isSelf && (
                  <span
                    className={`mb-0.5 block truncate text-[11px] font-bold ${senderNameColor(senderDisplayName)} ${
                      isMedia ? "bg-card/80 px-2 pt-1.5" : ""
                    }`}
                  >
                    {senderDisplayName}
                  </span>
                )}
                {m.forwarded_from_name && (
                  <span
                    className={`mb-1 flex items-center gap-1 text-[10px] italic ${
                      isSelf ? "text-primary-foreground/70" : "text-foreground/50"
                    }`}
                  >
                    <Reply className="h-3 w-3 -scale-x-100" /> محولة من {m.forwarded_from_name}
                  </span>
                )}
                {m.reply_to_id && (
                  <button
                    onClick={() => scrollToMessage(m.reply_to_id)}
                    className={`mb-1.5 block w-full max-w-full truncate rounded-lg border-r-2 px-2 py-1 text-right text-[11px] transition hover:brightness-110 ${
                      isSelf
                        ? "border-primary-foreground/50 bg-black/10 text-primary-foreground/85"
                        : "border-accent bg-accent/10 text-foreground/70"
                    }`}
                  >
                    <span className="block truncate font-semibold">{repliedSenderName}</span>
                    <span className="block truncate opacity-80">{messagePreviewText(repliedMessage)}</span>
                  </button>
                )}
                {m.type === "text" && (
                  <p className="whitespace-pre-wrap break-words">
                    <MessageContent content={m.content ?? ""} mentionCandidates={mentionCandidates} isSelf={isSelf} />
                  </p>
                )}

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
                  canDeleteForEveryone={canDeleteForEveryone}
                  channel={channel}
                  onDeleteForMe={deleteForMe}
                  onDeleteForEveryone={deleteForEveryone}
                  onPin={pinMessage}
                  onAddToAnnouncements={addToAnnouncements}
                  onForward={setForwardMessage}
                />
              )}
            </SwipeToReply>
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
        replyingTo={
          replyingTo
            ? {
                senderName: replyingTo.sender_id === userId ? myName : senderBadges.get(replyingTo.sender_id)?.full_name || "حد",
                preview: messagePreviewText(replyingTo),
              }
            : null
        }
        onCancelReply={() => setReplyingTo(null)}
        disabled={readOnly || muted || banned}
        disabledMessage={
          banned
            ? "انت محظور من الجروب ده"
            : muted
              ? "انت متكتوم دلوقتي في الجروب ده"
              : "القناة دي للإعلانات بس — الأدمنز/الدكاترة/المعيدين هما اللي يكتبوا فيها"
        }
        typingNames={Object.values(typingUsers)}
        mentionCandidates={Array.from(senderBadges.entries()).map(([id, b]) => ({ id, full_name: b.full_name }))}
      />

      {lightboxUrl && <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
      <ForwardDialog
        message={
          forwardMessage
            ? {
                type: forwardMessage.type,
                content: forwardMessage.content,
                media_url: forwardMessage.media_url,
                media_size_bytes: forwardMessage.media_size_bytes ?? null,
                senderName:
                  forwardMessage.sender_id === userId
                    ? myName
                    : senderBadges.get(forwardMessage.sender_id)?.full_name || "حد",
              }
            : null
        }
        userId={userId}
        onClose={() => setForwardMessage(null)}
      />
    </div>
  );
}

// ============================================================
// Pins
// ============================================================
function PinsView({
  groupId,
  isAdmin,
  onJump,
}: {
  groupId: string;
  isAdmin: boolean;
  onJump: (message: MessageRow) => void;
}) {
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
  async function unpin(pinId: string) {
    // Optimistic remove so the list feels instant even before the delete
    // round-trip finishes.
    setPins((prev) => prev.filter((p) => p.id !== pinId));
    const { error } = await db.from("group_pinned_messages").delete().eq("id", pinId);
    if (error) toast.error("حصل خطأ وإحنا بنشيل التثبيت");
  }
  if (pins.length === 0)
    return <p className="py-8 text-center text-sm text-foreground/60">مفيش رسايل متثبتة</p>;
  return (
    <div className="space-y-2 py-2">
      {pins.map((p) => (
        <div key={p.id} className="flex items-center gap-2 rounded-xl bg-card/60 px-3 py-2 text-sm">
          <button
            onClick={() => p.group_messages && onJump(p.group_messages as MessageRow)}
            title="روح للرسالة في الشات"
            className="flex-1 truncate text-right transition hover:text-accent"
          >
            {p.group_messages?.content ?? "(ميديا)"}
          </button>
          {isAdmin && (
            <button
              onClick={() => unpin(p.id)}
              title="إلغاء التثبيت"
              className="shrink-0 rounded-full p-1 text-foreground/40 transition hover:bg-destructive/20 hover:text-destructive"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
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
type MemberBadgeInfo = {
  full_name: string;
  avatar_url?: string | null;
  display_title?: string | null;
  group_role?: "admin" | "doctor" | "assistant" | null;
  is_big_boss: boolean;
  is_site_admin: boolean;
};

// Mirrors public.can_moderate_in_group() so buttons only show up when the
// action would actually succeed — the RPC is still the real gatekeeper.
function canModerate(
  actorId: string,
  actorIsBigBoss: boolean,
  actorIsSiteAdmin: boolean,
  actorHasGroupRole: boolean,
  target: MemberBadgeInfo & { user_id: string },
) {
  if (actorId === target.user_id) return false;
  if (target.is_big_boss) return false;
  if (actorIsBigBoss) return true;
  if (actorIsSiteAdmin) return !target.is_site_admin;
  if (target.is_site_admin) return false;
  if (!actorHasGroupRole) return false;
  return !target.group_role;
}

// Shared "قد ايه؟" duration picker used before every mute/ban.
function DurationDialog({
  open,
  onOpenChange,
  title,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  confirmLabel: string;
  onConfirm: (seconds: number | null) => void;
}) {
  const [key, setKey] = useState("1h");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Label className="text-xs text-foreground/70">لمدة قد ايه؟</Label>
          <Select value={key} onValueChange={setKey}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DURATION_OPTIONS.map((o) => (
                <SelectItem key={o.key} value={o.key}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            className="w-full"
            variant="destructive"
            onClick={() => {
              const opt = DURATION_OPTIONS.find((o) => o.key === key);
              onConfirm(opt ? opt.seconds : null);
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Site admins / Big Boss assign a group-level title to a member.
function AssignRoleDialog({
  open,
  onOpenChange,
  onAssign,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (role: "admin" | "doctor" | "assistant" | null) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>تعيين رتبة</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Button className="w-full justify-start" variant="secondary" onClick={() => { onAssign("admin"); onOpenChange(false); }}>
            أدمن الجروب
          </Button>
          <Button className="w-full justify-start" variant="secondary" onClick={() => { onAssign("doctor"); onOpenChange(false); }}>
            دكتور المادة
          </Button>
          <Button className="w-full justify-start" variant="secondary" onClick={() => { onAssign("assistant"); onOpenChange(false); }}>
            معيد المادة
          </Button>
          <Button className="w-full justify-start text-destructive" variant="outline" onClick={() => { onAssign(null); onOpenChange(false); }}>
            إزالة الرتبة
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MembersView({
  groupId,
  groupSubject,
  isBigBoss,
  isSiteAdmin,
  actorId,
}: {
  groupId: string;
  groupSubject?: string | null;
  isBigBoss: boolean;
  isSiteAdmin: boolean;
  actorId: string;
}) {
  const [members, setMembers] = useState<(MemberRow & MemberBadgeInfo)[]>([]);
  const [busy, setBusy] = useState(true);
  const [moderationTarget, setModerationTarget] = useState<{ userId: string; action: "ban" | "mute" } | null>(null);
  const [roleTarget, setRoleTarget] = useState<string | null>(null);

  // Do I hold an admin/doctor/assistant role in *this* group?
  const iHaveGroupRole = members.some((m) => m.user_id === actorId && !!m.group_role);

  async function load() {
    setBusy(true);
    await db.rpc("group_expire_moderation", { p_group_id: groupId }); // lift expired mutes/bans first
    const { data } = await db.from("group_members").select("*").eq("group_id", groupId);
    const rows = data ?? [];
    const ids = rows.map((r: any) => r.user_id);
    const { data: badges } = ids.length
      ? await db.rpc("get_member_badges", { p_group_id: groupId, p_ids: ids })
      : { data: [] };
    const badgeMap = new Map((badges ?? []).map((b: any) => [b.user_id, b]));
    setMembers(
      rows.map((m: any) => {
        const b = badgeMap.get(m.user_id);
        return {
          ...m,
          full_name: b?.full_name ?? m.user_id,
          avatar_url: b?.avatar_url ?? null,
          display_title: b?.display_title ?? null,
          group_role: b?.group_role ?? null,
          is_big_boss: !!b?.is_big_boss,
          is_site_admin: !!b?.is_site_admin,
        };
      }),
    );
    setBusy(false);
  }
  useEffect(() => {
    void load();
  }, [groupId]);

  async function ban(userId: string, seconds: number | null) {
    const { error } = await db.rpc("group_ban_member", { p_group_id: groupId, p_target: userId, p_seconds: seconds });
    if (error) return toast.error(error.message);
    toast.success("اتحظر");
    await load();
  }

  async function unban(userId: string) {
    const { error } = await db.rpc("group_unban_member", { p_group_id: groupId, p_target: userId });
    if (error) return toast.error(error.message);
    toast.success("اتفك الحظر");
    await load();
  }

  async function mute(userId: string, seconds: number | null) {
    const { error } = await db.rpc("group_mute_member", { p_group_id: groupId, p_target: userId, p_seconds: seconds });
    if (error) return toast.error(error.message);
    toast.success(seconds === null ? "اتكتم للأبد" : "اتكتم");
    await load();
  }

  async function unmute(userId: string) {
    const { error } = await db.rpc("group_unmute_member", { p_group_id: groupId, p_target: userId });
    if (error) return toast.error(error.message);
    toast.success("اتفك الكتم");
    await load();
  }

  async function assignRole(userId: string, role: "admin" | "doctor" | "assistant" | null) {
    const { error } = await db.rpc("group_assign_role", { p_group_id: groupId, p_target: userId, p_role: role });
    if (error) return toast.error(error.message);
    toast.success(role ? "اتعينت الرتبة" : "اتشالت الرتبة");
    await load();
  }

  if (busy) return <Loader2 className="mx-auto h-5 w-5 animate-spin text-accent" />;

  return (
    <div className="space-y-1.5 py-2">
      {members.map((m) => {
        const iCanModerate = canModerate(actorId, isBigBoss, isSiteAdmin, iHaveGroupRole, m);
        const canAssignRole = isSiteAdmin && m.user_id !== actorId && !m.is_big_boss;
        const badge = groupBadgeLabel(m, groupSubject);
        const muted = isCurrentlyMuted(m.muted_until);
        return (
          <div
            key={m.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/40 bg-card/50 px-3 py-2 text-sm"
          >
            <Link
              to="/profile/$userId"
              params={{ userId: m.user_id }}
              className="flex min-w-0 items-center gap-2 hover:opacity-80"
            >
              <GroupAvatar name={m.full_name || "?"} size="sm" avatarUrl={m.avatar_url} />
              <span className="min-w-0 truncate">{m.full_name}</span>
              {badge && (
                <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">
                  {badge}
                </span>
              )}
              {m.status === "banned" && (
                <span className="shrink-0 rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] text-destructive">
                  محظور
                </span>
              )}
              {muted && (
                <span className="shrink-0 rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] text-foreground/60">
                  مكتوم
                </span>
              )}
            </Link>
            <div className="flex shrink-0 items-center gap-1.5">
              {iCanModerate && (
                <>
                  {m.status === "active" ? (
                    <button
                      onClick={() => setModerationTarget({ userId: m.user_id, action: "ban" })}
                      title="حظر"
                      className="rounded-full bg-background/80 p-1.5"
                    >
                      <Ban className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  ) : (
                    <button onClick={() => unban(m.user_id)} title="فك الحظر" className="rounded-full bg-background/80 p-1.5 text-xs">
                      فك الحظر
                    </button>
                  )}
                  {muted ? (
                    <button onClick={() => unmute(m.user_id)} title="فك الكتم" className="rounded-full bg-background/80 p-1.5 text-xs">
                      فك الكتم
                    </button>
                  ) : (
                    <button
                      onClick={() => setModerationTarget({ userId: m.user_id, action: "mute" })}
                      title="كتم"
                      className="rounded-full bg-background/80 p-1.5"
                    >
                      <VolumeX className="h-3.5 w-3.5" />
                    </button>
                  )}
                </>
              )}
              {canAssignRole && (
                <button onClick={() => setRoleTarget(m.user_id)} title="تعيين رتبة" className="rounded-full bg-background/80 p-1.5">
                  <Crown className="h-3.5 w-3.5 text-accent" />
                </button>
              )}
            </div>
          </div>
        );
      })}
      {members.length === 0 && (
        <p className="text-center text-sm text-foreground/60">مفيش أعضاء لسه</p>
      )}

      <DurationDialog
        open={!!moderationTarget}
        onOpenChange={(open) => !open && setModerationTarget(null)}
        title={moderationTarget?.action === "ban" ? "حظر العضو — لمدة قد ايه؟" : "كتم العضو — لمدة قد ايه؟"}
        confirmLabel={moderationTarget?.action === "ban" ? "أكد الحظر" : "أكد الكتم"}
        onConfirm={(seconds) => {
          if (!moderationTarget) return;
          if (moderationTarget.action === "ban") void ban(moderationTarget.userId, seconds);
          else void mute(moderationTarget.userId, seconds);
        }}
      />
      <AssignRoleDialog
        open={!!roleTarget}
        onOpenChange={(open) => !open && setRoleTarget(null)}
        onAssign={(role) => {
          if (!roleTarget) return;
          void assignRole(roleTarget, role);
        }}
      />
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
  onOpen: (c: { id: string; otherId: string; otherName: string; otherAvatarUrl?: string | null }) => void;
}) {
  const [conversations, setConversations] = useState<
    { id: string; otherId: string; otherName: string; otherAvatarUrl: string | null }[]
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
    // Some deployments of get_profile_names only return {id, full_name}; read
    // avatar_url opportunistically so this upgrades automatically once the
    // RPC includes it, without breaking anything if it doesn't yet.
    const nameMap = new Map((names ?? []).map((n: any) => [n.id, n]));
    setConversations(
      rows.map((r: any) => {
        const otherId = r.user_a === userId ? r.user_b : r.user_a;
        const n = nameMap.get(otherId) as any;
        return {
          id: r.id,
          otherId,
          otherName: n?.full_name ?? "مستخدم",
          otherAvatarUrl: n?.avatar_url ?? null,
        };
      }),
    );
    setBusy(false);
  }

  useEffect(() => {
    void load();
  }, [userId]);

  async function startWith(otherId: string, otherName: string, otherAvatarUrl?: string | null) {
    const { data, error } = await db.rpc("get_or_create_dm", { p_other_user: otherId });
    if (error) return toast.error(error.message);
    setSearchOpen(false);
    onOpen({ id: data as string, otherId, otherName, otherAvatarUrl });
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
              <GroupAvatar name={c.otherName} size="sm" avatarUrl={c.otherAvatarUrl} />
              <span className="truncate">{c.otherName}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function SearchUsers({
  onPick,
}: {
  onPick: (id: string, name: string, avatarUrl?: string | null) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ id: string; full_name: string; avatar_url?: string | null }[]>([]);
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
            onClick={() => onPick(r.id, r.full_name, r.avatar_url)}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-right text-sm hover:bg-card/60"
          >
            <GroupAvatar name={r.full_name} size="sm" avatarUrl={r.avatar_url} />
            {r.full_name}
          </button>
        ))}
      </div>
    </div>
  );
}

function DmMediaView({ conversationId }: { conversationId: string }) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await db
        .from("direct_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .in("type", ["image", "video"])
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });
      setItems(data ?? []);
    })();
  }, [conversationId]);
  if (items.length === 0) return <p className="py-8 text-center text-sm text-foreground/60">مفيش وسائط لسه</p>;
  return (
    <div className="grid grid-cols-3 gap-2 py-2">
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

function DmLinksView({ conversationId }: { conversationId: string }) {
  const [links, setLinks] = useState<{ id: string; url: string }[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await db
        .from("direct_messages")
        .select("id, content")
        .eq("conversation_id", conversationId)
        .eq("type", "text")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(300);
      const found: { id: string; url: string }[] = [];
      for (const row of data ?? []) {
        const matches = (row.content as string)?.match(URL_REGEX);
        matches?.forEach((url) => found.push({ id: row.id, url }));
      }
      setLinks(found);
    })();
  }, [conversationId]);
  if (links.length === 0) return <p className="py-8 text-center text-sm text-foreground/60">مفيش روابط اتبعتت لسه</p>;
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

function DMChatView({
  conversationId,
  userId,
  myName,
  otherId,
  otherName,
  onJoinedGroup,
}: {
  conversationId: string;
  userId: string;
  myName: string;
  otherId: string;
  otherName: string;
  // Called after successfully redeeming a group-invite card in this DM, so
  // the parent page can switch over to "الجروبات" and open it.
  onJoinedGroup: (groupId: string) => void;
}) {
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [forwardMessage, setForwardMessage] = useState<any | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Discord-style reply — same pattern as group chat's ChatView.
  const [replyingTo, setReplyingTo] = useState<any | null>(null);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const messagesById = new Map(messages.map((m: any) => [m.id, m]));
  const mentionCandidates = [
    { id: userId, full_name: myName },
    { id: otherId, full_name: otherName },
  ];

  function scrollToMessage(id: string | null | undefined) {
    if (!id) return;
    const el = messageRefs.current[id];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(id);
    setTimeout(() => setHighlightId((cur) => (cur === id ? null : cur)), 1500);
  }

  // "Delete for me" — same per-device local hide used in group chat.
  const hiddenKey = `hidden_dm_messages_${conversationId}`;
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(hiddenKey) || "[]"));
    } catch {
      return new Set();
    }
  });

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [infoView, setInfoView] = useState<"media" | "links" | null>(null);

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
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "direct_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          // Mirrors the group-chat fix: a "delete for everyone" flips
          // is_deleted, and both sides should see it vanish immediately —
          // no refresh needed.
          if (payload.new.is_deleted) {
            setMessages((prev) => prev.filter((m) => m.id !== payload.new.id));
          } else {
            setMessages((prev) => prev.map((m) => (m.id === payload.new.id ? payload.new : m)));
          }
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
    const replyId = replyingTo?.id ?? null;
    setText("");
    setReplyingTo(null);
    const { error } = await db.from("direct_messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      type: "text",
      content: body,
      reply_to_id: replyId,
    });
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
    const replyId = replyingTo?.id ?? null;
    setReplyingTo(null);
    const { error } = await db.from("direct_messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      type,
      content: type === "file" ? file.name : null,
      media_url: signed?.signedUrl ?? null,
      media_size_bytes: file.size,
      reply_to_id: replyId,
    });
    if (error) toast.error(error.message);
  }

  // Each side can only ever manage their own messages in a DM — there's no
  // "admin" here, so this mirrors the "regular member" rule from group chat.
  async function deleteForEveryone(messageId: string) {
    await db.from("direct_messages").update({ is_deleted: true }).eq("id", messageId);
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }

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

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const visibleMessages = messages
    .filter((m) => !hiddenIds.has(m.id))
    .filter((m) => !searchQuery.trim() || (m.content ?? "").toLowerCase().includes(searchQuery.trim().toLowerCase()));

  return (
    <div className="flex h-[500px] flex-col">
      <div className="mb-1.5 flex items-center justify-between gap-1">
        {infoView ? (
          <>
            <button
              onClick={() => setInfoView(null)}
              className="flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-foreground/70 transition hover:bg-card/60 hover:text-foreground"
            >
              <ArrowRight className="h-4 w-4" /> رجوع للشات
            </button>
            <span className="text-xs font-semibold text-foreground/50">
              {infoView === "media" ? "الوسائط" : "الروابط"}
            </span>
          </>
        ) : (
          <div className="flex w-full items-center justify-end gap-1">
            <button
              onClick={() => setInfoView(infoView === "media" ? null : "media")}
              title="الوسائط"
              className={`rounded-full p-1.5 transition hover:bg-card/60 hover:text-foreground ${
                infoView === "media" ? "bg-card/60 text-accent" : "text-foreground/50"
              }`}
            >
              <Images className="h-4 w-4" />
            </button>
            <button
              onClick={() => setInfoView(infoView === "links" ? null : "links")}
              title="الروابط"
              className={`rounded-full p-1.5 transition hover:bg-card/60 hover:text-foreground ${
                infoView === "links" ? "bg-card/60 text-accent" : "text-foreground/50"
              }`}
            >
              <Link2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setSearchOpen((v) => !v);
                if (searchOpen) setSearchQuery("");
              }}
              title="بحث في الشات"
              className="rounded-full p-1.5 text-foreground/50 transition hover:bg-card/60 hover:text-foreground"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      {searchOpen && (
        <div className="relative mb-2">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
          <Input
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="دور في رسايل الشات..."
            className="pr-9"
          />
        </div>
      )}
      {infoView === "media" ? (
        <div className="flex-1 overflow-y-auto">
          <DmMediaView conversationId={conversationId} />
        </div>
      ) : infoView === "links" ? (
        <div className="flex-1 overflow-y-auto">
          <DmLinksView conversationId={conversationId} />
        </div>
      ) : (
        <div className="flex-1 space-y-2.5 overflow-y-auto py-1 pr-1">
          {visibleMessages.map((m) => {
            const isSelf = m.sender_id === userId;
            const isMedia = (m.type === "image" || m.type === "video") && !!m.media_url;
            const isTemp = String(m.id).startsWith("temp-");
            const withinWindow = Date.now() - new Date(m.created_at).getTime() < DELETE_FOR_EVERYONE_WINDOW_MS;
            // A DM has no admin hierarchy — you can only ever nuke your own
            // recent message for everyone; the other side's message can only
            // ever be hidden locally ("delete for me").
            const canDeleteForEveryone = isSelf && withinWindow;
            const invite = m.type === "text" ? parseGroupInvite(m.content) : null;
            const repliedMessage = m.reply_to_id ? messagesById.get(m.reply_to_id) : null;
            const repliedSenderName = repliedMessage
              ? repliedMessage.sender_id === userId
                ? myName
                : otherName
              : null;
            const actions = !isTemp && (
              <DropdownMenu key={`actions-${m.id}`}>
                <DropdownMenuTrigger asChild>
                  <button
                    title="خيارات الرسالة"
                    className="shrink-0 self-center rounded-full p-1 text-foreground/35 transition hover:bg-card/60 hover:text-foreground"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" dir="rtl">
                  <DropdownMenuItem onClick={() => setForwardMessage(m)}>
                    <Reply className="ml-2 h-3.5 w-3.5 -scale-x-100" /> توجيه
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => deleteForMe(m.id)}>
                    <Trash2 className="ml-2 h-3.5 w-3.5" /> حذف عندي
                  </DropdownMenuItem>
                  {canDeleteForEveryone && (
                    <DropdownMenuItem
                      onClick={() => deleteForEveryone(m.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="ml-2 h-3.5 w-3.5" /> حذف عند الجميع
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            );
            return (
              <SwipeToReply key={m.id} onReply={() => setReplyingTo(m)} justify={isSelf ? "start" : "end"}>
                {isSelf && actions}
                {!isTemp && (
                  <button
                    onClick={() => setReplyingTo(m)}
                    title="رد"
                    className="shrink-0 self-center rounded-full p-1 text-foreground/35 transition hover:bg-card/60 hover:text-foreground"
                  >
                    <Reply className="h-3.5 w-3.5" />
                  </button>
                )}
                <div
                  ref={(el) => (messageRefs.current[m.id] = el)}
                  className={
                    isMedia
                      ? `relative max-w-[75%] overflow-hidden rounded-2xl shadow-soft transition ${
                          highlightId === m.id ? "ring-2 ring-accent" : ""
                        }`
                      : `relative max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-soft transition ${
                          isSelf
                            ? "rounded-br-md bg-gradient-cosmic text-primary-foreground"
                            : "rounded-bl-md border border-border/50 bg-card/70"
                        } ${highlightId === m.id ? "ring-2 ring-accent" : ""}`
                  }
                >
                  {m.forwarded_from_name && (
                    <span
                      className={`mb-1 flex items-center gap-1 text-[10px] italic ${
                        isSelf ? "text-primary-foreground/70" : "text-foreground/50"
                      }`}
                    >
                      <Reply className="h-3 w-3 -scale-x-100" /> محولة من {m.forwarded_from_name}
                    </span>
                  )}
                  {m.reply_to_id && !invite && (
                    <button
                      onClick={() => scrollToMessage(m.reply_to_id)}
                      className={`mb-1.5 block w-full max-w-full truncate rounded-lg border-r-2 px-2 py-1 text-right text-[11px] transition hover:brightness-110 ${
                        isSelf
                          ? "border-primary-foreground/50 bg-black/10 text-primary-foreground/85"
                          : "border-accent bg-accent/10 text-foreground/70"
                      }`}
                    >
                      <span className="block truncate font-semibold">{repliedSenderName}</span>
                      <span className="block truncate opacity-80">{messagePreviewText(repliedMessage)}</span>
                    </button>
                  )}
                  {invite ? (
                    <GroupInviteCard invite={invite} onJoined={onJoinedGroup} />
                  ) : (
                    m.type === "text" && (
                      <p className="whitespace-pre-wrap break-words">
                        <MessageContent content={m.content ?? ""} mentionCandidates={mentionCandidates} isSelf={isSelf} />
                      </p>
                    )
                  )}

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
                {!isSelf && actions}
              </SwipeToReply>
            );
          })}
          <div ref={bottomRef} />
        </div>
      )}

      <Composer
        text={text}
        onTextChange={setText}
        onSend={sendText}
        onPickFile={(f) => void sendFile(f)}
        onSendVoice={(blob) => void sendFile(blobToFile(blob))}
        uploading={uploading}
        replyingTo={
          replyingTo
            ? {
                senderName: replyingTo.sender_id === userId ? myName : otherName,
                preview: messagePreviewText(replyingTo),
              }
            : null
        }
        onCancelReply={() => setReplyingTo(null)}
        mentionCandidates={mentionCandidates}
      />

      {lightboxUrl && <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />}
      <ForwardDialog
        message={
          forwardMessage
            ? {
                type: forwardMessage.type,
                content: forwardMessage.content,
                media_url: forwardMessage.media_url,
                media_size_bytes: forwardMessage.media_size_bytes ?? null,
                senderName: forwardMessage.sender_id === userId ? myName : otherName,
              }
            : null
        }
        userId={userId}
        onClose={() => setForwardMessage(null)}
      />
    </div>
  );
}

// ============================================================
// Forward — pick a group (that I'm a member of) or a DM contact to forward
// a message to. Works for both group-chat and DM messages since it only
// needs the bare content/type/media, not the source row itself.
// ============================================================
type ForwardableMessage = {
  type: string;
  content: string | null;
  media_url: string | null;
  media_size_bytes?: number | null;
  senderName: string;
};

function ForwardDialog({
  message,
  userId,
  onClose,
}: {
  message: ForwardableMessage | null;
  userId: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"groups" | "dm">("groups");
  const [myGroups, setMyGroups] = useState<{ id: string; name: string }[]>([]);
  const [conversations, setConversations] = useState<
    { id: string; otherId: string; otherName: string; otherAvatarUrl: string | null }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!message) return;
    setSentTo(new Set());
    setTab("groups");
    (async () => {
      const { data: gm } = await db
        .from("group_members")
        .select("group_id, groups(id, name)")
        .eq("user_id", userId)
        .eq("status", "active");
      setMyGroups(((gm ?? []) as any[]).map((r) => r.groups).filter(Boolean));

      const { data: convos } = await db
        .from("direct_conversations")
        .select("*")
        .or(`user_a.eq.${userId},user_b.eq.${userId}`)
        .order("created_at", { ascending: false });
      const rows = convos ?? [];
      const otherIds = rows.map((r: any) => (r.user_a === userId ? r.user_b : r.user_a));
      const { data: names } = otherIds.length
        ? await db.rpc("get_profile_names", { p_ids: otherIds })
        : { data: [] };
      const nameMap = new Map((names ?? []).map((n: any) => [n.id, n]));
      setConversations(
        rows.map((r: any) => {
          const otherId = r.user_a === userId ? r.user_b : r.user_a;
          const n = nameMap.get(otherId) as any;
          return {
            id: r.id,
            otherId,
            otherName: n?.full_name ?? "مستخدم",
            otherAvatarUrl: n?.avatar_url ?? null,
          };
        }),
      );
    })();
  }, [message, userId]);

  async function forwardToGroup(groupId: string) {
    if (!message) return;
    setBusy(true);
    const { error } = await db.from("group_messages").insert({
      group_id: groupId,
      sender_id: userId,
      channel: "general",
      type: message.type,
      content: message.content,
      media_url: message.media_url,
      media_size_bytes: message.media_size_bytes ?? null,
      forwarded_from_name: message.senderName,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setSentTo((prev) => new Set(prev).add(groupId));
    toast.success("اتوجهت الرسالة");
  }

  async function forwardToConversation(conversationId: string) {
    if (!message) return;
    setBusy(true);
    const { error } = await db.from("direct_messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      type: message.type,
      content: message.content,
      media_url: message.media_url,
      media_size_bytes: message.media_size_bytes ?? null,
      forwarded_from_name: message.senderName,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setSentTo((prev) => new Set(prev).add(conversationId));
    toast.success("اتوجهت الرسالة");
  }

  async function forwardToNewUser(otherId: string) {
    const { data, error } = await db.rpc("get_or_create_dm", { p_other_user: otherId });
    if (error) return toast.error(error.message);
    await forwardToConversation(data as string);
  }

  return (
    <Dialog open={!!message} onOpenChange={(open) => !open && onClose()}>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>توجيه الرسالة</DialogTitle>
        </DialogHeader>
        <div className="mb-2 flex gap-1.5 rounded-full bg-background/40 p-1">
          <button
            onClick={() => setTab("groups")}
            className={`flex-1 rounded-full py-1.5 text-xs font-semibold transition ${
              tab === "groups" ? "bg-gradient-cosmic text-primary-foreground" : "text-foreground/60"
            }`}
          >
            الجروبات
          </button>
          <button
            onClick={() => setTab("dm")}
            className={`flex-1 rounded-full py-1.5 text-xs font-semibold transition ${
              tab === "dm" ? "bg-gradient-cosmic text-primary-foreground" : "text-foreground/60"
            }`}
          >
            الخاص
          </button>
        </div>
        {tab === "groups" ? (
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {myGroups.length === 0 && (
              <p className="py-4 text-center text-xs text-foreground/60">مش عضو في أي جروب</p>
            )}
            {myGroups.map((g) => (
              <button
                key={g.id}
                disabled={busy}
                onClick={() => forwardToGroup(g.id)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-right text-sm transition hover:bg-card/60 disabled:opacity-50"
              >
                <GroupAvatar name={g.name} size="sm" />
                <span className="flex-1 truncate">{g.name}</span>
                {sentTo.has(g.id) && <span className="text-[10px] text-accent">اتبعتت ✓</span>}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="max-h-48 space-y-1 overflow-y-auto">
              {conversations.length === 0 && (
                <p className="py-2 text-center text-xs text-foreground/60">مفيش محادثات لسه</p>
              )}
              {conversations.map((c) => (
                <button
                  key={c.id}
                  disabled={busy}
                  onClick={() => forwardToConversation(c.id)}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-right text-sm transition hover:bg-card/60 disabled:opacity-50"
                >
                  <GroupAvatar name={c.otherName} size="sm" avatarUrl={c.otherAvatarUrl} />
                  <span className="flex-1 truncate">{c.otherName}</span>
                  {sentTo.has(c.id) && <span className="text-[10px] text-accent">اتبعتت ✓</span>}
                </button>
              ))}
            </div>
            <div className="border-t border-border/50 pt-2">
              <p className="mb-1 text-xs text-foreground/60">أو ابعتها لحد جديد</p>
              <SearchUsers onPick={(id) => forwardToNewUser(id)} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Group settings — visibility ("مين يشوف الجروب؟") + closed/invite-only.
// ============================================================
function GroupSettingsDialog({
  group,
  userId,
  onUpdated,
}: {
  group: GroupRow;
  userId: string;
  onUpdated: (g: GroupRow) => void;
}) {
  const [visibility, setVisibility] = useState<"all" | "batch" | "people">(group.visibility ?? "all");
  const [batchYear, setBatchYear] = useState<string>(
    group.visibility_batch_year ? String(group.visibility_batch_year) : "",
  );
  const [isClosed, setIsClosed] = useState<boolean>(!!group.is_closed);
  const [people, setPeople] = useState<{ id: string; full_name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [inviteTarget, setInviteTarget] = useState<{ id: string; full_name: string } | null>(null);
  const [sendingInvite, setSendingInvite] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await db
        .from("group_visible_users")
        .select("user_id, profiles(id, full_name)")
        .eq("group_id", group.id);
      setPeople(((data ?? []) as any[]).map((r) => r.profiles).filter(Boolean));
    })();
  }, [group.id]);

  async function save() {
    setSaving(true);
    const { data, error } = await db
      .from("groups")
      .update({
        visibility,
        visibility_batch_year: visibility === "batch" ? Number(batchYear) || null : null,
        is_closed: isClosed,
      })
      .eq("id", group.id)
      .select("*")
      .single();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("اتحفظت إعدادات الجروب");
    onUpdated(data as GroupRow);
  }

  async function addPerson(id: string, name: string) {
    if (people.some((p) => p.id === id)) return;
    const { error } = await db
      .from("group_visible_users")
      .insert({ group_id: group.id, user_id: id, added_by: userId });
    if (error) return toast.error(error.message);
    setPeople((prev) => [...prev, { id, full_name: name }]);
  }

  async function removePerson(id: string) {
    await db.from("group_visible_users").delete().eq("group_id", group.id).eq("user_id", id);
    setPeople((prev) => prev.filter((p) => p.id !== id));
  }

  async function sendInvite() {
    if (!inviteTarget) return;
    setSendingInvite(true);
    const { data: code, error } = await db.rpc("create_group_invite", {
      p_group_id: group.id,
      p_target_user_id: inviteTarget.id,
    });
    if (error) {
      setSendingInvite(false);
      return toast.error(error.message);
    }
    const { data: conversationId, error: dmErr } = await db.rpc("get_or_create_dm", {
      p_other_user: inviteTarget.id,
    });
    if (dmErr) {
      setSendingInvite(false);
      return toast.error(dmErr.message);
    }
    const { error: msgErr } = await db.from("direct_messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      type: "text",
      content: buildGroupInviteContent(code as string, group.name),
    });
    setSendingInvite(false);
    if (msgErr) return toast.error(msgErr.message);
    toast.success(`اتبعتت الدعوة لـ ${inviteTarget.full_name}`);
    setInviteTarget(null);
  }

  return (
    <div className="max-h-[70vh] space-y-4 overflow-y-auto pl-1">
      <div className="space-y-1.5">
        <Label className="text-xs text-foreground/70">مين يقدر يشوف الجروب ده؟</Label>
        <Select value={visibility} onValueChange={(v) => setVisibility(v as "all" | "batch" | "people")}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الدفعات</SelectItem>
            <SelectItem value="batch">دفعة معينة بس</SelectItem>
            <SelectItem value="people">أشخاص محددين بس</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {visibility === "batch" && (
        <Input
          type="number"
          placeholder="سنة الدفعة (مثال 2023)"
          value={batchYear}
          onChange={(e) => setBatchYear(e.target.value)}
        />
      )}

      {visibility === "people" && (
        <div className="space-y-2">
          <SearchUsers onPick={(id, name) => addPerson(id, name)} />
          {people.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {people.map((p) => (
                <span key={p.id} className="flex items-center gap-1 rounded-full bg-card/70 px-2 py-1 text-xs">
                  {p.full_name}
                  <button onClick={() => removePerson(p.id)}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-foreground/80">
        <input type="checkbox" checked={isClosed} onChange={(e) => setIsClosed(e.target.checked)} />
        الجروب مغلق — مايظهرش لحد، الدخول بدعوة بس من الأدمن
      </label>

      <Button className="w-full" onClick={save} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ الإعدادات"}
      </Button>

      {isClosed && (
        <div className="space-y-2 border-t border-border/50 pt-3">
          <Label className="text-xs text-foreground/70">ابعت دعوة دخول (تستخدم مرة واحدة)</Label>
          {inviteTarget ? (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-card/60 px-3 py-2 text-sm">
              <span className="truncate">{inviteTarget.full_name}</span>
              <div className="flex shrink-0 gap-1.5">
                <Button size="sm" onClick={sendInvite} disabled={sendingInvite}>
                  {sendingInvite ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "بعت الدعوة"}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setInviteTarget(null)}>
                  إلغاء
                </Button>
              </div>
            </div>
          ) : (
            <SearchUsers onPick={(id, name) => setInviteTarget({ id, full_name: name })} />
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// The card rendered inside a DM when its content is a group-invite marker
// — "دعوة لجروب X" with a one-tap join button. Redeeming burns the invite
// server-side (redeem_group_invite), so a second tap on the same card (by
// anyone, including the original recipient) will just fail cleanly.
// ============================================================
function GroupInviteCard({
  invite,
  onJoined,
}: {
  invite: { code: string; groupName: string };
  onJoined: (groupId: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function join() {
    setBusy(true);
    const { data, error } = await db.rpc("redeem_group_invite", { p_code: invite.code });
    setBusy(false);
    if (error) return toast.error(error.message);
    setDone(true);
    toast.success("انضممت للجروب");
    onJoined(data as string);
  }

  return (
    <div className="flex items-center gap-2 rounded-xl bg-card/60 px-3 py-2">
      <Users className="h-4 w-4 shrink-0 text-accent" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">دعوة لجروب: {invite.groupName}</p>
        <p className="text-[11px] text-foreground/60">الدعوة دي تستخدم مرة واحدة بس</p>
      </div>
      <Button size="sm" disabled={busy || done} onClick={join}>
        {done ? "اتضم ✓" : busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "دخول"}
      </Button>
    </div>
  );
}
