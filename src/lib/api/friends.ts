// src/lib/api/friends.ts
import apiClient from './axios';
import type { Friend, FriendRequest, SearchUserResult } from '../types/chatroom';

export type RelationshipStatus =
  | "none"
  | "self"
  | "friends"
  | "request_sent"
  | "request_received"
  | "blocked"
  | "blocked_by"
  | string;

export interface RelationshipResponse {
  userId?: string;
  status: RelationshipStatus;
  requestId?: string | null;
}

export const friendsApi = {
  getFriends: async (): Promise<Friend[]> => {
    const res = await apiClient.get('/friends');
    return Array.isArray(res.data) ? res.data : (res.data.friends ?? []);
  },

  getRelationship: async (otherUserId: string): Promise<RelationshipResponse> => {
    const res = await apiClient.get(`/friends/relationship/${otherUserId}`);
    const data = res.data?.data ?? res.data;
    return {
      userId: data?.userId,
      status: data?.status ?? "none",
      requestId: data?.requestId ?? null,
    };
  },

  // ✅ param đúng là "query", backend: /api/friends/search?query=xxx
  searchUsers: async (query: string): Promise<SearchUserResult[]> => {
    const res = await apiClient.get('/friends/search', {
      params: { query },
    });
    return Array.isArray(res.data) ? res.data : (res.data.users ?? []);
  },

  // ✅ Backend nhận { receiverId: string (UUID) }
  sendRequest: async (receiverId: string): Promise<void> => {
    await apiClient.post('/friends/requests', { receiverId });
  },

  getReceivedRequests: async (): Promise<FriendRequest[]> => {
    const res = await apiClient.get('/friends/requests/received');
    return Array.isArray(res.data) ? res.data : (res.data.requests ?? []);
  },

  getSentRequests: async (): Promise<FriendRequest[]> => {
    const res = await apiClient.get('/friends/requests/sent');
    return Array.isArray(res.data) ? res.data : (res.data.requests ?? []);
  },

  acceptRequest: async (requestId: string): Promise<void> => {
    await apiClient.post(`/friends/requests/${requestId}/accept`);
  },

  rejectRequest: async (requestId: string): Promise<void> => {
    await apiClient.post(`/friends/requests/${requestId}/reject`);
  },

  cancelRequest: async (requestId: string): Promise<void> => {
    await apiClient.delete(`/friends/requests/${requestId}`);
  },

  removeFriend: async (friendId: string): Promise<void> => {
    await apiClient.delete(`/friends/${friendId}`);
  },
};