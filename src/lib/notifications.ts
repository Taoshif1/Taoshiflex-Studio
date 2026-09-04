import { supabaseRest } from "./supabase-rest";
import { cache } from "react";

export const notificationTypes = [
  "project_update",
  "milestone_status",
  "deliverable_review",
  "studio_feedback_response",
  "feedback_resolved",
  "client_feedback",
  "client_changes_requested",
  "new_inquiry",
  "payment_submitted",
  "payment_confirmed",
  "payment_rejected",
] as const;

export type NotificationType = typeof notificationTypes[number];
export type NotificationAudience = "client" | "studio";
export type NotificationPriority = "normal" | "attention";

export type AppNotification = {
  id: string;
  recipient_user_id: string;
  audience: NotificationAudience;
  project_id: string | null;
  type: NotificationType;
  priority: NotificationPriority;
  source_type: string;
  source_id: string;
  title: string;
  message: string;
  href: string;
  read_at: string | null;
  created_at: string;
};

export type NotificationInbox = {
  items: AppNotification[];
  unreadCount: number;
  unreadProjectCounts: Record<string, number>;
  unreadTypeCounts: Partial<Record<NotificationType, number>>;
  capped: boolean;
};

type NotificationAccess = { userAccessToken: string };
export type NotificationCounts = Omit<NotificationInbox, "items">;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const select = "id,recipient_user_id,audience,project_id,type,priority,source_type,source_id,title,message,href,read_at,created_at";
const unreadLimit = 250;
const loadUnreadRows = cache(async (userId: string, token: string) => {
  const filter = "recipient_user_id=eq." + encodeURIComponent(userId);
  return supabaseRest<Array<Pick<AppNotification, "id" | "project_id" | "type">>>(
    "notifications?" + filter + "&read_at=is.null&select=id,project_id,type&order=created_at.desc,id.desc&limit=" + (unreadLimit + 1),
    {},
    { userAccessToken: token },
  );
});

export const emptyNotificationInbox = (): NotificationInbox => ({
  items: [],
  unreadCount: 0,
  unreadProjectCounts: {},
  unreadTypeCounts: {},
  capped: false,
});

export async function loadNotificationCounts(
  userId: string,
  access: NotificationAccess,
): Promise<NotificationCounts> {
  if (!uuid.test(userId)) {
    return { unreadCount: 0, unreadProjectCounts: {}, unreadTypeCounts: {}, capped: false };
  }
  try {
    const unread = await loadUnreadRows(userId, access.userAccessToken);
    const counted = unread.slice(0, unreadLimit);
    const unreadProjectCounts: Record<string, number> = {};
    const unreadTypeCounts: Partial<Record<NotificationType, number>> = {};
    for (const item of counted) {
      if (item.project_id) {
        unreadProjectCounts[item.project_id] = (unreadProjectCounts[item.project_id] ?? 0) + 1;
      }
      unreadTypeCounts[item.type] = (unreadTypeCounts[item.type] ?? 0) + 1;
    }
    return {
      unreadCount: counted.length,
      unreadProjectCounts,
      unreadTypeCounts,
      capped: unread.length > unreadLimit,
    };
  } catch {
    return { unreadCount: 0, unreadProjectCounts: {}, unreadTypeCounts: {}, capped: false };
  }
}

export async function loadNotificationInbox(
  userId: string,
  access: NotificationAccess,
  limit = 12,
): Promise<NotificationInbox> {
  if (!uuid.test(userId)) return emptyNotificationInbox();
  const safeLimit = Math.max(1, Math.min(30, Math.floor(limit)));
  const filter = "recipient_user_id=eq." + encodeURIComponent(userId);
  try {
    const [items, counts] = await Promise.all([
      supabaseRest<AppNotification[]>(
        "notifications?" + filter + "&select=" + select + "&order=created_at.desc,id.desc&limit=" + safeLimit,
        {},
        access,
      ),
      loadNotificationCounts(userId, access),
    ]);
    return {
      items,
      ...counts,
    };
  } catch {
    return emptyNotificationInbox();
  }
}

export async function loadAttentionNotifications(
  userId: string,
  access: NotificationAccess,
  limit = 6,
) {
  if (!uuid.test(userId)) return [];
  const safeLimit = Math.max(1, Math.min(12, Math.floor(limit)));
  const filter =
    "recipient_user_id=eq." +
    encodeURIComponent(userId) +
    "&audience=eq.studio&priority=eq.attention&read_at=is.null";
  try {
    return await supabaseRest<AppNotification[]>(
      "notifications?" +
        filter +
        "&select=" +
        select +
        "&order=created_at.desc,id.desc&limit=" +
        safeLimit,
      {},
      access,
    );
  } catch {
    return [];
  }
}
