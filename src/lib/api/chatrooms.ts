// src/lib/api/chatrooms.ts
import apiClient from './axios';
import type { Chatroom, Message, SendMessageRequest } from '../types/chatroom';

export const chatroomsApi = {
  getChatrooms: async (): Promise<Chatroom[]> => {
    const res = await apiClient.get('/chatrooms');
    // Backend trả về array trực tiếp []
    return Array.isArray(res.data) ? res.data : (res.data.chatrooms ?? []);
  },

  getChatroom: async (chatroomId: string): Promise<Chatroom> => {
    const res = await apiClient.get(`/chatrooms/${chatroomId}`);
    return res.data.chatroom ?? res.data;
  },

  createDirect: async (otherUserId : string): Promise<Chatroom> => {
    const res = await apiClient.post('/chatrooms/direct', { otherUserId });
    return res.data.chatroom ?? res.data;
  },

  getMessages: async (chatroomId: string, page = 1, limit = 50): Promise<Message[]> => {
    const res = await apiClient.get(`/messages/${chatroomId}`, {
      params: { page, limit },
    });
    return Array.isArray(res.data) ? res.data : (res.data.messages ?? []);
  },

  sendMessage: async (chatroomId: string, data: SendMessageRequest): Promise<Message> => {
    const res = await apiClient.post(`/messages/${chatroomId}`, data);
    return res.data.message ?? res.data;
  },

  deleteMessage: async (messageId: string): Promise<void> => {
    await apiClient.delete(`/messages/${messageId}`);
  },
};