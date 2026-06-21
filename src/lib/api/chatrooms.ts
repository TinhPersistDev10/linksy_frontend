// src/lib/api/chatrooms.ts
import apiClient from './axios';
import type { ChatroomResponse, CreateGroupChatroomRequest, UpdateChatroomRequest } from '../types/chatroom';
import { MessageResponse, SendMessageRequest } from '../types/message';

interface AvatarResponse {
  success?: boolean;
  message?: string;
  avatarUrl: string | null;
}

const unwrapMessages = (data: unknown): MessageResponse[] => {
  if (Array.isArray(data)) return data;

  if (data && typeof data === 'object') {
    const payload = data as {
      messages?: MessageResponse[];
      items?: MessageResponse[];
      data?: MessageResponse[] | { messages?: MessageResponse[]; items?: MessageResponse[] };
      result?: MessageResponse[] | { messages?: MessageResponse[]; items?: MessageResponse[] };
    };

    if (Array.isArray(payload.messages)) return payload.messages;
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.data)) return payload.data;
    if (payload.data && typeof payload.data === 'object') {
      if (Array.isArray(payload.data.messages)) return payload.data.messages;
      if (Array.isArray(payload.data.items)) return payload.data.items;
    }
    if (Array.isArray(payload.result)) return payload.result;
    if (payload.result && typeof payload.result === 'object') {
      if (Array.isArray(payload.result.messages)) return payload.result.messages;
      if (Array.isArray(payload.result.items)) return payload.result.items;
    }
  }

  return [];
};

export const chatroomsApi = {
  getChatrooms: async (): Promise<ChatroomResponse[]> => {
    const res = await apiClient.get('/chatrooms');
    // Backend trả về array trực tiếp []
    return Array.isArray(res.data) ? res.data : (res.data.chatrooms ?? []);
  },

  getChatroom: async (chatroomId: string): Promise<ChatroomResponse> => {
    const res = await apiClient.get(`/chatrooms/${chatroomId}`);
    return res.data.chatroom ?? res.data;
  },

  createDirect: async (otherUserId : string): Promise<ChatroomResponse> => {
    const res = await apiClient.post('/chatrooms/direct', { otherUserId });
    return res.data.chatroom ?? res.data;
  },

  createGroup: async (data: CreateGroupChatroomRequest): Promise<ChatroomResponse> => {
    const res = await apiClient.post('/chatrooms/group', data);
    return res.data.chatroom ?? res.data;
  },

  getMessages: async (chatroomId: string, page = 1, limit = 50): Promise<MessageResponse[]> => {
    const res = await apiClient.get(`/messages/${chatroomId}`, {
      params: { page, pageSize: limit },
    });
    return unwrapMessages(res.data);
  },

  sendMessage: async (chatroomId: string, data: SendMessageRequest): Promise<MessageResponse> => {
    const res = await apiClient.post(`/messages/${chatroomId}`, data);
    return res.data.message ?? res.data;
  },

  deleteMessage: async (messageId: string): Promise<void> => {
    await apiClient.delete(`/messages/${messageId}`);
  },

  archiveChatroom: async (chatroomId: string, isArchived = true): Promise<void> => {
    await apiClient.put(`/chatrooms/${chatroomId}/archive`, { isArchived });
  },

  leaveChatroom: async (chatroomId: string): Promise<void> => {
    await apiClient.post(`/chatrooms/${chatroomId}/leave`);
  },

  updateChatroom: async (
    chatroomId: string,
    data: UpdateChatroomRequest,
  ): Promise<ChatroomResponse> => {
    const res = await apiClient.put(`/chatrooms/${chatroomId}`, data);
    return res.data.chatroom ?? res.data;
  },

  addMembers: async (chatroomId: string, memberIds: string[]): Promise<void> => {
    await apiClient.post(`/chatrooms/${chatroomId}/members`, { memberIds });
  },

  removeMember: async (chatroomId: string, userId: string): Promise<void> => {
    await apiClient.delete(`/chatrooms/${chatroomId}/members/${userId}`);
  },

  updateGroupAvatar: async (chatroomId: string, file: File): Promise<AvatarResponse> => {
    const formData = new FormData();
    formData.append('avatarFile', file);

    const res = await apiClient.put<AvatarResponse>(`/chatrooms/${chatroomId}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return res.data;
  },

  deleteGroupAvatar: async (chatroomId: string): Promise<AvatarResponse> => {
    const res = await apiClient.delete<AvatarResponse>(`/chatrooms/${chatroomId}/avatar`);
    return res.data;
  },
};
