import { string } from "zod";
import type { ApiResponse } from "../types/common";
import type {
  EditMessageRequest,
  GetMessagesData,
  MessageDeliveryStatusResponse,
  MessageResponse,
  SearchMessagesData,
  SendMessageRequest,
} from "../types/message";
import apiClient from "./axios";

export const messagesApi = {
  getMessages: async (
    chatroomId: string,
    page = 1,
    pageSize = 30,
  ): Promise<GetMessagesData> => {
    const res = await apiClient.get<ApiResponse<GetMessagesData>>(
      `/messages/${chatroomId}`,
      {
        params: { page, pageSize },
      },
    );

    return res.data.data;
  },

  sendMessage: async (data: SendMessageRequest): Promise<MessageResponse> => {
    const res = await apiClient.post<ApiResponse<MessageResponse>>(
      "/messages",
      data,
    );

    return res.data.data;
  },

  editMessage: async (
    messageId: string,
    data: EditMessageRequest,
  ): Promise<MessageResponse> => {
    const res = await apiClient.put<ApiResponse<MessageResponse>>(
      `/messages/${messageId}`,
      data,
    );

    return res.data.data;
  },

  deleteMessage: async (messageId: string): Promise<void> => {
    await apiClient.delete(`/messages/${messageId}`);
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

    return res.data.data;
  },
  getDeliveryStatus: async (
    messageId: string,
  ): Promise<MessageDeliveryStatusResponse> => {
    const res = await apiClient.get<ApiResponse<MessageDeliveryStatusResponse>>(
      `/messages/${messageId}/deliveries`,
    );

    return res.data.data;
  },
  getReplies: async (messageId: string): Promise<MessageResponse[]> => {
    const response = await apiClient.get<ApiResponse<MessageResponse[]>>(
      `/messages/${messageId}/replies`,
    );

    return response.data.data;
  },
};
