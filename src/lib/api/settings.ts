import apiClient from "./axios";
import type { ApiResponse } from "../types/common";
import type {
  AllSettings,
  UpdateNotificationSettingsRequest,
  UpdateUserSettingsRequest,
  UserSettings,
  NotificationSettingsData,
} from "../types/settings";

function unwrap<T>(response: ApiResponse<T>, fallbackMessage: string): T {
  if (!response.success || response.data == null) {
    throw new Error(response.message || fallbackMessage);
  }
  return response.data;
}

export const settingsApi = {
  getAll: async (): Promise<AllSettings> => {
    const res = await apiClient.get<ApiResponse<AllSettings>>("/settings");
    return unwrap(res.data, "Không thể tải cài đặt");
  },

  updateGeneral: async (
    payload: UpdateUserSettingsRequest,
  ): Promise<UserSettings> => {
    const res = await apiClient.put<ApiResponse<UserSettings>>(
      "/settings/general",
      payload,
    );
    return unwrap(res.data, "Không thể cập nhật giao diện");
  },

  updateNotifications: async (
    payload: UpdateNotificationSettingsRequest,
  ): Promise<NotificationSettingsData> => {
    const res = await apiClient.put<ApiResponse<NotificationSettingsData>>(
      "/settings/notifications",
      payload,
    );
    return unwrap(res.data, "Không thể cập nhật thông báo");
  },
};
