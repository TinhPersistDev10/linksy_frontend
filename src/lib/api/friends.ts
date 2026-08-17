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

  createInviteLink: async (): Promise<FriendInviteLink> => {
    const res = await apiClient.post("/friends/invite-link");
    return (res.data?.data ?? res.data) as FriendInviteLink;
  },

  getInvitePreview: async (token: string): Promise<FriendInvitePreview> => {
    const res = await apiClient.get(`/friends/invite/${encodeURIComponent(token)}`);
    return (res.data?.data ?? res.data) as FriendInvitePreview;
  },

  acceptInvite: async (token: string): Promise<AcceptFriendInviteResult> => {
    const res = await apiClient.post(
      `/friends/invite/${encodeURIComponent(token)}/accept`,
    );
    return (res.data?.data ?? res.data) as AcceptFriendInviteResult;
  },
};

export interface FriendInviteLink {
  token: string;
  expiresAt: string;
}

export interface FriendInvitePreview {
  userId?: string;
  inviterId: string;
  username: string;
  fullname: string;
  avatar?: string | null;
  expiresAt?: string;
  isExpired?: boolean;
  isUsed?: boolean;
}

export interface AcceptFriendInviteResult {
  status: string;
  inviterId: string;
}