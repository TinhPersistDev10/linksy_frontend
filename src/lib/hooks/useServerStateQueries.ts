"use client";

import { useQuery } from "@tanstack/react-query";
import { chatroomsApi } from "@/lib/api/chatrooms";
import { notificationsApi } from "@/lib/api/notifications";
import {
  chatroomQueryKeys,
  notificationQueryKeys,
} from "@/lib/queries/queryKeys";
import type { NotificationResponse } from "@/lib/types/notification";

async function getVisibleNotifications(
  page: number,
  pageSize: number,
): Promise<NotificationResponse[]> {
  const data = await notificationsApi.getNotifications(page, pageSize);
  const notifications = Array.isArray(data) ? data : data.notifications;

  return (notifications ?? []).filter(
    (notification) => notification.notificationType !== "new_message",
  );
}

export function useNotificationsQuery(
  userId: string | undefined,
  page = 1,
  pageSize = 20,
) {
  return useQuery({
    queryKey: notificationQueryKeys.list(userId ?? "anonymous", page, pageSize),
    queryFn: () => getVisibleNotifications(page, pageSize),
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUnreadNotificationCountQuery(userId: string | undefined) {
  return useQuery({
    queryKey: notificationQueryKeys.unreadCount(userId ?? "anonymous"),
    queryFn: notificationsApi.getUnreadCount,
    enabled: Boolean(userId),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
  });
}

export function useChatroomsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: chatroomQueryKeys.list(userId ?? "anonymous"),
    queryFn: async () => {
      const chatrooms = await chatroomsApi.getChatrooms();
      return chatrooms.filter((chatroom) => chatroom.isActive !== false);
    },
    enabled: Boolean(userId),
    staleTime: 2 * 60 * 1000,
  });
}
