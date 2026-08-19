"use client";

import { useQuery } from "@tanstack/react-query";
import { chatroomsApi } from "@/lib/api/chatrooms";
import { contentModerationApi } from "@/lib/api/contentModeration";
import { friendsApi } from "@/lib/api/friends";
import { notificationsApi } from "@/lib/api/notifications";
import { settingsApi } from "@/lib/api/settings";
import { stickersApi } from "@/lib/api/stickers";
import {
  chatroomQueryKeys,
  contentModerationQueryKeys,
  friendQueryKeys,
  notificationQueryKeys,
  settingsQueryKeys,
  stickerQueryKeys,
} from "@/lib/queries/queryKeys";
import type { NotificationResponse } from "@/lib/types/notification";
import type { NotificationSettingsData, PrivacySettingsData } from "@/lib/types/settings";

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

export const defaultNotificationSettings: Omit<NotificationSettingsData, "id"> =
  {
    notificationsEnabled: true,
    notificationSoundEnabled: true,
    messagePreviewEnabled: true,
    emailNotifications: false,
  };

export const defaultPrivacySettings: Omit<PrivacySettingsData, "id"> = {
  readReceiptsEnabled: true,
  typingIndicatorsEnabled: true,
  lastSeenEnabled: true,
  profilePhotoVisibility: "everyone",
  statusVisibility: "everyone",
  whoCanAddToGroups: "everyone",
  whoCanMessageMe: "everyone",
};

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

/** Content moderation config, fail-open (enabled: true, empty list) while loading/erroring. */
export function useContentModerationConfigQuery(userId: string | undefined) {
  return useQuery({
    queryKey: contentModerationQueryKeys.config,
    queryFn: contentModerationApi.getConfig,
    enabled: Boolean(userId),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });
}

export function useNotificationSettingsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: settingsQueryKeys.detail(userId ?? "anonymous"),
    queryFn: async (): Promise<NotificationSettingsData> => {
      const all = await settingsApi.getAll();
      const notif = all.notificationSettings;
      if (!notif) {
        return { id: "local", ...defaultNotificationSettings };
      }
      return notif;
    },
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePrivacySettingsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: settingsQueryKeys.privacy(userId ?? "anonymous"),
    queryFn: async (): Promise<PrivacySettingsData> => {
      const all = await settingsApi.getAll();
      const privacy = all.privacySettings;
      if (!privacy) {
        return { id: "local", ...defaultPrivacySettings };
      }
      return privacy;
    },
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useChatroomsQuery(
  userId: string | undefined,
  options?: { includeArchived?: boolean },
) {
  const includeArchived = options?.includeArchived ?? false;

  return useQuery({
    queryKey: chatroomQueryKeys.list(userId ?? "anonymous", includeArchived),
    queryFn: async () => {
      const chatrooms = await chatroomsApi.getChatrooms(includeArchived);
      return chatrooms.filter((chatroom) => {
        if (chatroom.isActive === false) return false;
        return includeArchived ? chatroom.isArchived === true : !chatroom.isArchived;
      });
    },
    enabled: Boolean(userId),
    staleTime: 2 * 60 * 1000,
  });
}

export function useReceivedFriendRequestsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: friendQueryKeys.receivedRequests(userId ?? "anonymous"),
    queryFn: friendsApi.getReceivedRequests,
    enabled: Boolean(userId),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
  });
}

export function useFriendsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: friendQueryKeys.list(userId ?? "anonymous"),
    queryFn: friendsApi.getFriends,
    enabled: Boolean(userId),
    staleTime: 2 * 60 * 1000,
  });
}

export function useMyStickersQuery(userId: string | undefined) {
  return useQuery({
    queryKey: stickerQueryKeys.mine(userId ?? "anonymous"),
    queryFn: stickersApi.getMyStickers,
    enabled: Boolean(userId),
    staleTime: 60 * 1000,
  });
}
