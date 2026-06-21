import apiClient from "./axios";
import type { ApiResponse } from "../types/common";
import type {
  GetNotificationsData,
  NotificationResponse,
} from "../types/notification";

export const notificationsApi = {
  getNotifications: async (
    page = 1,
    pageSize = 20,
  ): Promise<GetNotificationsData | NotificationResponse[]> => {
    const res = await apiClient.get<
      ApiResponse<GetNotificationsData | NotificationResponse[]>
    >("/notifications", {
      params: { page, pageSize },
    });

    return res.data.data;
  },

  markAsRead: async (notificationId: string): Promise<void> => {
    await apiClient.post(`/notifications/${notificationId}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await apiClient.post("/notifications/read-all");
  },

  deleteNotification: async (notificationId: string): Promise<void> => {
    await apiClient.delete(`/notifications/${notificationId}`);
  },

  deleteAllNotifications: async (): Promise<void> => {
    await apiClient.delete("/notifications");
  },
  getUnreadCount: async (): Promise<number> => {
    const res =
      await apiClient.get<ApiResponse<{ unreadCount: number }>>("/notifications/unread-count");
    const unreadCount = Number(res.data.data?.unreadCount);

    if (!Number.isFinite(unreadCount) || unreadCount < 0) {
      throw new Error("Invalid unread notification count response");
    }

    return unreadCount;
  },
};
