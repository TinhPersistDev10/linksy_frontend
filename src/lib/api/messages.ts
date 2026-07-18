import type { ApiResponse } from "../types/common";
import type {
  EditMessageRequest,
  GetMessagesAroundData,
  GetMessagesData,
  MessageDeliveryStatusResponse,
  MessageResponse,
  PinnedMessageResponse,
  SearchMessagesData,
  SendMessageAttachmentRequest,
  SendMessageRequest,
} from "../types/message";
import apiClient from "./axios";
function requireData<T>(response: ApiResponse<T>, fallbackMessage: string): T {
  if (response.data === null || response.data === undefined) {
    throw new Error(response.message || fallbackMessage);
  }

  return response.data;
}
export const messagesApi = {
  getMessages: async (
    chatroomId: string,
    page = 1,
    pageSize = 30,
    beforeMessageId?: string,
  ): Promise<GetMessagesData> => {
    const res = await apiClient.get<ApiResponse<GetMessagesData>>(
      `/messages/${chatroomId}`,
      {
        params: beforeMessageId
          ? { beforeMessageId, pageSize }
          : { page, pageSize },
      },
    );
    if (!res.data.data) {
      throw new Error(res.data.message || "Invalid API response");
    }
    return requireData(res.data, "Không thể tải tin nhắn");
  },

  getMessagesAround: async (
    chatroomId: string,
    messageId: string,
    before = 20,
    after = 15,
  ): Promise<GetMessagesAroundData> => {
    const res = await apiClient.get<ApiResponse<GetMessagesAroundData>>(
      `/messages/${chatroomId}/around/${messageId}`,
      {
        params: { before, after },
      },
    );
    return requireData(res.data, "Không thể tải tin nhắn quanh vị trí đã chọn");
  },

  sendMessage: async (data: SendMessageRequest): Promise<MessageResponse> => {
    const res = await apiClient.post<ApiResponse<MessageResponse>>(
      "/messages",
      data,
    );
    if (!res.data.data) {
      throw new Error(res.data.message || "Invalid API response");
    }
    return requireData(res.data, "Không thể gửi tin nhắn");
  },

  editMessage: async (
    messageId: string,
    data: EditMessageRequest,
  ): Promise<MessageResponse> => {
    const res = await apiClient.put<ApiResponse<MessageResponse>>(
      `/messages/${messageId}`,
      data,
    );
    if (!res.data.data) {
      throw new Error(res.data.message || "Invalid API response");
    }
    return requireData(res.data, "Không thể chỉnh sửa tin nhắn");
  },

  deleteMessage: async (messageId: string): Promise<void> => {
    await apiClient.delete(`/messages/${messageId}`);
  },

  toggleReaction: async (
    messageId: string,
    emojiCode: string,
  ): Promise<{ added: boolean; emojiCode: string }> => {
    const res = await apiClient.post<
      ApiResponse<{ added: boolean; emojiCode: string }>
    >(`/messages/${messageId}/reactions`, { emojiCode });
    return requireData(res.data, "Không thể cập nhật cảm xúc");
  },
  markMessageRead: async (
    chatroomId: string,
    messageId: string,
  ): Promise<void> => {
    await apiClient.post(`/messages/${chatroomId}/read/${messageId}`);
  },

  markAllRead: async (chatroomId: string): Promise<void> => {
    await apiClient.post(`/messages/${chatroomId}/read-all`);
  },

  markDelivered: async (messageId: string): Promise<void> => {
    await apiClient.post(`/messages/${messageId}/delivered`);
  },
  getPinnedMessages: async (
    chatroomId: string,
  ): Promise<PinnedMessageResponse[]> => {
    const res = await apiClient.get<ApiResponse<PinnedMessageResponse[]>>(
      `/messages/${chatroomId}/pinned`,
    );
    return requireData(res.data, "Không thể tải tin nhắn đã ghim") ?? [];
  },

  searchMessages: async (
    chatroomId: string,
    keyword: string,
    limit = 50,
  ): Promise<SearchMessagesData> => {
    const res = await apiClient.get<ApiResponse<SearchMessagesData>>(
      `/messages/${chatroomId}/search`,
      {
        params: { keyword, limit },
      },
    );
    if (!res.data.data) {
      throw new Error(res.data.message || "Invalid API response");
    }
    return requireData(res.data, "Không thể tìm kiếm tin nhắn");
  },
  getDeliveryStatus: async (
    messageId: string,
  ): Promise<MessageDeliveryStatusResponse> => {
    const res = await apiClient.get<ApiResponse<MessageDeliveryStatusResponse>>(
      `/messages/${messageId}/deliveries`,
    );
    if (!res.data.data) {
      throw new Error(res.data.message || "Invalid API response");
    }
    return requireData(res.data, "Không thể lấy trạng thái tin nhắn");
  },
  getReplies: async (messageId: string): Promise<MessageResponse[]> => {
    const res = await apiClient.get<ApiResponse<MessageResponse[]>>(
      `/messages/${messageId}/replies`,
    );
    if (!res.data.data) {
      throw new Error(res.data.message || "Invalid API response");
    }
    return requireData(res.data, "Không thể tải phản hồi");
  },
  uploadAttachment: async (
    file: File,
    chatroomId: string,
    attachmentType: "image" | "video" | "file",
  ): Promise<SendMessageAttachmentRequest> => {
    const formData = new FormData();
    formData.append("File", file);
    formData.append("ChatroomId", chatroomId);
    formData.append("AttachmentType", attachmentType);

    const res = await apiClient.post<ApiResponse<SendMessageAttachmentRequest>>(
      "/messages/attachments/upload",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return requireData(res.data, "Không thể tải tệp đính kèm");
  },
};
