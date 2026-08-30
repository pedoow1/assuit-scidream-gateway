import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, AtSign, UserPlus, Megaphone, UserCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useNotificationsFeed, type AppNotification, type NotificationType } from "@/hooks/use-notifications";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "دلوقتي";
  if (mins < 60) return `من ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `من ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `من ${days} يوم`;
}

function iconFor(type: NotificationType) {
  if (type === "mention") return <AtSign className="h-4 w-4 text-accent" />;
  if (type === "friend_request") return <UserPlus className="h-4 w-4 text-accent" />;
  if (type === "friend_accept") return <UserCheck className="h-4 w-4 text-accent" />;
  return <Megaphone className="h-4 w-4 text-accent" />;
}

export function NotificationsBell({ userId }: { userId: string | null | undefined }) {
  const { notifications, unreadCount, unreadByType, markRead, markAllRead } = useNotificationsFeed(userId);
  const [tab, setTab] = useState<"all" | NotificationType>("all");
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const filtered = tab === "all" ? notifications : notifications.filter((n) => n.type === tab);

  function goTo(n: AppNotification) {
    void markRead(n.id);
    setOpen(false);
    if (n.type === "mention" && n.group_id) {
      try {
        sessionStorage.setItem(
          "sd_open_mention",
          JSON.stringify({ groupId: n.group_id, messageId: n.message_id ?? null, nonce: Date.now() }),
        );
      } catch {
        /* ignore */
      }
      navigate({ to: "/communication" });
    } else if (n.type === "friend_request" || n.type === "friend_accept") {
      if (n.actor_id) {
        navigate({ to: "/profile/$userId", params: { userId: n.actor_id } });
      } else {
        navigate({ to: "/profile" });
      }
    } else if (n.type === "announcement") {
      navigate({ to: "/announcements" });
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-border hover:border-accent"
          title="الإشعارات"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -left-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" dir="rtl" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
          <span className="text-sm font-semibold">الإشعارات</span>
          {unreadCount > 0 && (
            <button
              onClick={() => void markAllRead(tab === "all" ? undefined : tab)}
              className="text-[11px] text-accent hover:underline"
            >
              علّم الكل كمقروء
            </button>
          )}
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} dir="rtl">
          <TabsList className="grid w-full grid-cols-4 rounded-none bg-transparent px-2 pt-2">
            <TabsTrigger value="all" className="text-[11px]">
              الكل
            </TabsTrigger>
            <TabsTrigger value="mention" className="relative text-[11px]">
              منشن {unreadByType("mention") > 0 && <span className="mr-1 h-1.5 w-1.5 rounded-full bg-accent" />}
            </TabsTrigger>
            <TabsTrigger value="friend_request" className="relative text-[11px]">
              أصدقاء {unreadByType("friend_request") + unreadByType("friend_accept") > 0 && (
                <span className="mr-1 h-1.5 w-1.5 rounded-full bg-accent" />
              )}
            </TabsTrigger>
            <TabsTrigger value="announcement" className="relative text-[11px]">
              إعلانات {unreadByType("announcement") > 0 && <span className="mr-1 h-1.5 w-1.5 rounded-full bg-accent" />}
            </TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="m-0 max-h-80 overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-xs text-foreground/50">مفيش إشعارات هنا</p>
            ) : (
              <div className="space-y-1">
                {filtered.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => goTo(n)}
                    className={`flex w-full items-start gap-2 rounded-xl px-2.5 py-2 text-right text-xs transition hover:bg-card/70 ${
                      !n.is_read ? "bg-accent/10" : ""
                    }`}
                  >
                    <span className="mt-0.5 shrink-0">{iconFor(n.type)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{n.title ?? "إشعار جديد"}</span>
                      {n.body && <span className="mt-0.5 block truncate text-foreground/60">{n.body}</span>}
                      <span className="mt-0.5 block text-[10px] text-foreground/40">{timeAgo(n.created_at)}</span>
                    </span>
                    {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />}
                  </button>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
