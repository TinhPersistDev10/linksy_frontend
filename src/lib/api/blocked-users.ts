import apiClient from "./axios";
import type { BlockedUser } from "@/lib/types/blocked-user";

export interface BlockStatusResponse {
  iBlocked: boolean;
  blockedBy: boolean;
}

export const blockedUsersApi = {
  getBlockedUsers: async (): Promise<BlockedUser[]> => {
    const res = await apiClient.get("/BlockedUser/blocked");
    return Array.isArray(res.data) ? res.data : (res.data.blockedUsers ?? []);
  },

  getBlockStatus: async (otherUserId: string): Promise<BlockStatusResponse> => {
    const res = await apiClient.get(`/BlockedUser/status/${otherUserId}`);
    const data = res.data?.data ?? res.data;
    return {
      iBlocked: Boolean(data?.iBlocked),
      blockedBy: Boolean(data?.blockedBy),
    };
  },

  blockUser: async (blockedUserId: string, reason = ""): Promise<void> => {
    await apiClient.post("/BlockedUser/block", {
      blockedUserId,
      reason,
    });
  },

  unblockUser: async (blockedUserId: string): Promise<void> => {
    await apiClient.delete(`/BlockedUser/block/${blockedUserId}`);
  },
};
