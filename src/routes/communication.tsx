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
} from "lucide-react";
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
};

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
  const { user, loading, roles } = useAuth();
  const navigate = useNavigate();
  const isBigBoss = !!roles?.includes("super_admin");
  const canCreateGroups = isBigBoss || !!roles?.includes("admin");

  const [mode, setMode] = useState<"groups" | "dm">("groups");

  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [activeGroup, setActiveGroup] = useState<GroupRow | null>(null);
  const [myLevel, setMyLevel] = useState(0); // 0 none · 1 member · 2 admin/doctor/assistant · 3 big boss
  const [busy, setBusy] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

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

  async function createGroup(name: string, description: string, subject: string) {
    if (!name.trim() || !user) return;
    const { data, error } = await db
      .from("groups")
      .insert({ name, description, subject, created_by: user.id })
      .select("*")
      .single();
    if (error) return toast.error(error.message);
    await db.from("group_members").insert({ group_id: data.id, user_id: user.id, status: "active" });
    toast.success("اتعمل الجروب");
    setCreateOpen(false);
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
                  <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogTrigger asChild>
                      <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent dir="rtl">
                      <DialogHeader>
                        <DialogTitle>جروب جديد</DialogTitle>
                      </DialogHeader>
                      <CreateGroupForm onCreate={createGroup} />
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin text-accent" />
              ) : groups.length === 0 ? (
                <p className="text-xs text-foreground/60">مفيش جروبات لسه</p>
              ) : (
                <div className="space-y-1.5">
                  {groups.map((g) => (
                    <div
                      key={g.id}
                      className={`group flex items-center rounded-xl transition ${
                        activeGroup?.id === g.id
                          ? "bg-gradient-cosmic text-primary-foreground shadow-rose"
                          : "hover:bg-card/60"
                      }`}
                    >
                      <button
                        onClick={() => setActiveGroup(g)}
                        className="flex-1 truncate px-3 py-2 text-right text-sm"
                      >
                        {g.name}
                      </button>
                      {isBigBoss && (
                        <button
                          onClick={() => deleteGroup(g)}
                          title="مسح الجروب نهائيًا (Big Boss)"
                          className="ml-1 mr-1 shrink-0 rounded-full p-1.5 opacity-0 transition hover:bg-destructive/20 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
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
            <GroupPanel group={activeGroup} myLevel={myLevel} userId={user.id} />
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

function CreateGroupForm({
  onCreate,
}: {
  onCreate: (name: string, description: string, subject: string) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  return (
    <div className="space-y-3">
      <Input placeholder="اسم الجروب" value={name} onChange={(e) => setName(e.target.value)} />
      <Input placeholder="المادة (اختياري)" value={subject} onChange={(e) => setSubject(e.target.value)} />
      <Textarea
        placeholder="وصف مختصر (اختياري)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <Button className="w-full" onClick={() => onCreate(name, description, subject)}>
        إنشاء
      </Button>
    </div>
  );
}

function GroupPanel({
  group,
  myLevel,
  userId,
}: {
  group: GroupRow;
  myLevel: number;
  userId: string;
}) {
  const isAdmin = myLevel >= 2;
  const isBigBoss = myLevel >= 3;

  return (
    <div className="cosmic-card rounded-3xl p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl">{group.name}</h2>
          {group.description && (
            <p className="text-xs text-foreground/60">{group.description}</p>
          )}
        </div>
      </div>

      <Tabs defaultValue="chat" dir="rtl">
        <TabsList className="flex-wrap">
          <TabsTrigger value="chat">
            <MessageSquare className="ml-1 h-3.5 w-3.5" /> الشات
          </TabsTrigger>
          <TabsTrigger value="announcements">
            <Megaphone className="ml-1 h-3.5 w-3.5" /> الإعلانات
          </TabsTrigger>
          <TabsTrigger value="pins">
            <Pin className="ml-1 h-3.5 w-3.5" /> Pins
          </TabsTrigger>
          <TabsTrigger value="media">
            <Images className="ml-1 h-3.5 w-3.5" /> الوسائط
          </TabsTrigger>
          <TabsTrigger value="links">
            <Link2 className="ml-1 h-3.5 w-3.5" /> الروابط
          </TabsTrigger>
          <TabsTrigger value="schedule">
            <CalendarClock className="ml-1 h-3.5 w-3.5" /> الجدول
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="members">
              <Users className="ml-1 h-3.5 w-3.5" /> الأعضاء
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="chat">
          <ChatView group={group} channel="general" userId={userId} isAdmin={isAdmin} muted={false} />
        </TabsContent>
        <TabsContent value="announcements">
          <ChatView
            group={group}
            channel="announcements"
            userId={userId}
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
function ChatView({
  group,
  channel,
  userId,
  isAdmin,
  muted,
  readOnly = false,
}: {
  group: GroupRow;
  channel: "general" | "announcements";
  userId: string;
  isAdmin: boolean;
  muted: boolean;
  readOnly?: boolean;
}) {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      .subscribe();
    return () => {
      db.removeChannel(ch);
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
    setProgress(0);

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

  async function deleteMessage(messageId: string) {
    await db.from("group_messages").update({ is_deleted: true }).eq("id", messageId);
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }

  return (
    <div className="flex h-[500px] flex-col">
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`group relative max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
              m.sender_id === userId
                ? "mr-auto bg-accent/90 text-accent-foreground"
                : "ml-auto bg-card/80 border border-border/50"
            }`}
          >
            {m.type === "text" && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
            {m.type === "image" && m.media_url && (
              <img src={m.media_url} className="max-h-64 rounded-xl object-cover" />
            )}
            {m.type === "video" && m.media_url && (
              <video src={m.media_url} controls className="max-h-64 rounded-xl" />
            )}
            {m.type === "audio" && m.media_url && (
              <audio src={m.media_url} controls className="h-9 w-56 max-w-full" />
            )}
            {m.type === "file" && m.media_url && (
              <FileCard
                name={m.content || fileNameFromUrl(m.media_url)}
                url={m.media_url}
                size={(m as any).media_size_bytes}
                tint={m.sender_id === userId ? "self" : "other"}
              />
            )}
            {m.type !== "text" && !m.media_url && (
              <p className="flex items-center gap-1.5 text-xs opacity-70">
                <Loader2 className="h-3 w-3 animate-spin" /> {m.content}
              </p>
            )}

            {isAdmin && !m.id.startsWith("temp-") && (
              <div className="absolute -top-3 right-1 hidden gap-1 group-hover:flex">
                <button
                  onClick={() => pinMessage(m.id)}
                  className="rounded-full bg-background/90 p-1 shadow"
                  title="Pin"
                >
                  <Pin className="h-3 w-3" />
                </button>
                <button
                  onClick={() => deleteMessage(m.id)}
                  className="rounded-full bg-background/90 p-1 shadow"
                  title="حذف"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {readOnly ? (
        <p className="mt-3 rounded-xl border border-border/60 px-3 py-2 text-center text-xs text-foreground/60">
          القناة دي للإعلانات بس — الأدمنز/الدكاترة/المعيدين هما اللي يكتبوا فيها
        </p>
      ) : muted ? (
        <p className="mt-3 rounded-xl border border-destructive/50 px-3 py-2 text-center text-xs text-destructive">
          انت متكتوم دلوقتي في الجروب ده
        </p>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void sendFile(f);
              e.target.value = "";
            }}
          />
          <Button
            size="icon"
            variant="secondary"
            className="rounded-full"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            title="إرفاق صورة/فيديو/صوت"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
          </Button>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendText()}
            placeholder="اكتب رسالة..."
            className="flex-1"
          />
          <Button size="icon" className="rounded-full" onClick={sendText}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
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
    <div className="space-y-2 py-2">
      {members.map((m) => (
        <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-card/60 px-3 py-2 text-sm">
          <span>{m.full_name}</span>
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
              className={`block w-full truncate rounded-xl px-3 py-2 text-right text-sm transition ${
                activeConversationId === c.id
                  ? "bg-gradient-cosmic text-primary-foreground shadow-rose"
                  : "hover:bg-card/60"
              }`}
            >
              {c.otherName}
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
            className="block w-full rounded-lg px-3 py-2 text-right text-sm hover:bg-card/60"
          >
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="flex h-[500px] flex-col">
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
              m.sender_id === userId
                ? "mr-auto bg-accent/90 text-accent-foreground"
                : "ml-auto bg-card/80 border border-border/50"
            }`}
          >
            {m.type === "text" && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
            {m.type === "image" && m.media_url && <img src={m.media_url} className="max-h-64 rounded-xl object-cover" />}
            {m.type === "video" && m.media_url && <video src={m.media_url} controls className="max-h-64 rounded-xl" />}
            {m.type === "audio" && m.media_url && <audio src={m.media_url} controls className="h-9 w-56 max-w-full" />}
            {m.type === "file" && m.media_url && (
              <FileCard
                name={m.content || fileNameFromUrl(m.media_url)}
                url={m.media_url}
                size={m.media_size_bytes}
                tint={m.sender_id === userId ? "self" : "other"}
              />
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void sendFile(f);
            e.target.value = "";
          }}
        />
        <Button
          size="icon"
          variant="secondary"
          className="rounded-full"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
        </Button>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendText()}
          placeholder="اكتب رسالة..."
          className="flex-1"
        />
        <Button size="icon" className="rounded-full" onClick={sendText}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
