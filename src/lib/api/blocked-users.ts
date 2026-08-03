import apiClient from "./axios";
import type { BlockedUser } from "@/lib/types/blocked-user";

export const blockedUsersApi = {
  getBlockedUsers: async (): Promise<BlockedUser[]> => {
    const res = await apiClient.get("/BlockedUser/blocked");
    return Array.isArray(res.data) ? res.data : (res.data.blockedUsers ?? []);
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
