import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { playNotificationSound } from "@/lib/sounds";

const db = supabase as any;

export type NotificationType = "mention" | "friend_request" | "friend_accept" | "announcement";

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  actor_id: string | null;
  actor_name: string | null;
  group_id: string | null;
  group_name: string | null;
  message_id: string | null;
  announcement_id: string | null;
  title: string | null;
  body: string | null;
  is_read: boolean;
  created_at: string;
}

/**
 * Loads the current user's notifications, keeps them live via realtime, and
 * plays the notification sound whenever a fresh one arrives (not on the
 * initial load). Any screen (dashboard header, communication page, ...) can
 * call this independently — it's a plain hook, not a shared context, mirroring
 * how useAuth() is used elsewhere in this app.
 */
export function useNotificationsFeed(userId: string | null | undefined) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [busy, setBusy] = useState(true);
  const loadedOnce = useRef(false);

  const load = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setBusy(false);
      return;
    }
    setBusy(true);
    const { data } = await db
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    setNotifications((data as AppNotification[]) ?? []);
    setBusy(false);
    loadedOnce.current = true;
  }, [userId]);

  useEffect(() => {
    void load();
    if (!userId) return;
    const ch = db
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload: any) => {
          setNotifications((prev) => [payload.new as AppNotification, ...prev]);
          if (loadedOnce.current) playNotificationSound();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload: any) => {
          setNotifications((prev) => prev.map((n) => (n.id === payload.new.id ? (payload.new as AppNotification) : n)));
        },
      )
      .subscribe();
    return () => {
      db.removeChannel(ch);
    };
  }, [userId, load]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const unreadByType = (type: NotificationType) => notifications.filter((n) => !n.is_read && n.type === type).length;

  async function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    await db.from("notifications").update({ is_read: true }).eq("id", id);
  }

  async function markAllRead(type?: NotificationType) {
    setNotifications((prev) => prev.map((n) => (!type || n.type === type ? { ...n, is_read: true } : n)));
    let q = db.from("notifications").update({ is_read: true }).eq("user_id", userId).eq("is_read", false);
    if (type) q = q.eq("type", type);
    await q;
  }

  return { notifications, busy, unreadCount, unreadByType, markRead, markAllRead, reload: load };
}

/** Fire-and-forget: inserts a notification the client is allowed to send
 * (friend request / friend accept), right after the corresponding RPC call
 * succeeds. Silently ignores failures — a missed notification shouldn't
 * block the actual friend-request flow. */
export async function sendFriendNotification(opts: {
  toUserId: string;
  type: "friend_request" | "friend_accept";
  actorId: string;
  actorName: string | null;
}) {
  try {
    await db.from("notifications").insert({
      user_id: opts.toUserId,
      type: opts.type,
      actor_id: opts.actorId,
      actor_name: opts.actorName,
      title: opts.type === "friend_request" ? `${opts.actorName ?? "حد"} بعتلك طلب صداقة` : `${opts.actorName ?? "حد"} قبل طلب صداقتك`,
    });
  } catch {
    /* best-effort */
  }
}
