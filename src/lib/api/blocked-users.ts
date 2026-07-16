import apiClient from './axios';

export const blockedUsersApi = {
  blockUser: async (blockedUserId: string, reason = ''): Promise<void> => {
    await apiClient.post('/BlockedUser/block', {
      blockedUserId,
      reason,
    });
  },

  unblockUser: async (blockedUserId: string): Promise<void> => {
    await apiClient.delete(`/BlockedUser/block/${blockedUserId}`);
  },
};
