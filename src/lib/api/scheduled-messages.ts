import type { ApiResponse } from "../types/common";
import type {
  ScheduleMessageRequest,
  ScheduledMessageResponse,
} from "../types/scheduled-message";
import apiClient from "./axios";

function requireData<T>(response: ApiResponse<T>, fallbackMessage: string): T {
  if (response.data === null || response.data === undefined) {
    throw new Error(response.message || fallbackMessage);
  }
  return response.data;
}

export const scheduledMessagesApi = {
  schedule: async (
    data: ScheduleMessageRequest,
  ): Promise<ScheduledMessageResponse> => {
    const res = await apiClient.post<ApiResponse<ScheduledMessageResponse>>(
      "/scheduled-messages",
      data,
    );
    return requireData(res.data, "Không thể hẹn giờ tin nhắn");
  },

  listPending: async (
    chatroomId: string,
  ): Promise<ScheduledMessageResponse[]> => {
    const res = await apiClient.get<ApiResponse<ScheduledMessageResponse[]>>(
      "/scheduled-messages",
      { params: { chatroomId } },
    );
    return requireData(res.data, "Không thể tải tin nhắn hẹn giờ") ?? [];
  },

  cancel: async (id: string): Promise<void> => {
    await apiClient.delete(`/scheduled-messages/${id}`);
  },
};
