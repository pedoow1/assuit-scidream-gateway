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

function CommunicationPage() {
  const { user, loading, roles } = useAuth();
  const navigate = useNavigate();
  const isBigBoss = roles?.includes("super_admin");

  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [activeGroup, setActiveGroup] = useState<GroupRow | null>(null);
  const [myLevel, setMyLevel] = useState(0); // 0 none · 1 member · 2 admin/doctor/assistant · 3 big boss
  const [busy, setBusy] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

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
        {/* Groups sidebar */}
        <aside className="cosmic-card rounded-3xl p-4 h-fit">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base">الجروبات</h2>
            {isBigBoss && (
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
                <button
                  key={g.id}
                  onClick={() => setActiveGroup(g)}
                  className={`block w-full rounded-xl px-3 py-2 text-right text-sm transition ${
                    activeGroup?.id === g.id
                      ? "bg-gradient-cosmic text-primary-foreground shadow-rose"
                      : "hover:bg-card/60"
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* Active group panel */}
        {!activeGroup ? (
          <div className="cosmic-card flex min-h-[300px] items-center justify-center rounded-3xl p-8 text-sm text-foreground/60">
            اختار جروب من القايمة
          </div>
        ) : (
          <GroupPanel group={activeGroup} myLevel={myLevel} userId={user.id} />
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
          : "image";

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
        content: "بيترفع...",
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
            className={`group relative max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
              m.sender_id === userId
                ? "mr-auto bg-gradient-cosmic text-primary-foreground"
                : "ml-auto bg-card/70"
            }`}
          >
            {m.type === "text" && <p>{m.content}</p>}
            {m.type === "image" && m.media_url && (
              <img src={m.media_url} className="max-h-64 rounded-xl" />
            )}
            {m.type === "video" && m.media_url && (
              <video src={m.media_url} controls className="max-h-64 rounded-xl" />
            )}
            {m.type === "audio" && m.media_url && <audio src={m.media_url} controls />}
            {(m.type === "image" || m.type === "video" || m.type === "audio") &&
              !m.media_url && <p className="text-xs opacity-70">{m.content}</p>}

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
            accept="image/*,video/*,audio/*"
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
    const { data } = await db
      .from("group_members")
      .select("*, profiles(full_name)")
      .eq("group_id", groupId);
    setMembers(
      (data ?? []).map((m: any) => ({ ...m, full_name: m.profiles?.full_name ?? m.user_id })),
    );
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
