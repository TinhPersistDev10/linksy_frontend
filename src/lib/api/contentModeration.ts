import type { ApiResponse } from "../types/common";
import type { ContentModerationConfig } from "../types/contentModeration";
import apiClient from "./axios";

function requireData<T>(response: ApiResponse<T>, fallbackMessage: string): T {
  if (response.data === null || response.data === undefined) {
    throw new Error(response.message || fallbackMessage);
  }
  return response.data;
}

export const contentModerationApi = {
  getConfig: async (): Promise<ContentModerationConfig> => {
    const res = await apiClient.get<ApiResponse<ContentModerationConfig>>(
      "/content-moderation/config",
    );
    return requireData(res.data, "Không thể tải cấu hình kiểm duyệt nội dung");
  },
};
