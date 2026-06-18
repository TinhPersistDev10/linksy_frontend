import apiClient from './axios';

export interface GroupInvitationResponse {
  invitationId: string;
  chatroomId: string;
  chatroomName: string;
  chatroomAvatar: string | null;
  memberCount: number;
  invitedBy: string;
  invitedByUsername: string;
  invitedByFullname: string;
  invitedByAvatar: string | null;
  status: string;
  message: string | null;
  sentAt: string;
  respondedAt: string | null;
  expiresAt: string | null;
}

const unwrapInvitations = (data: unknown): GroupInvitationResponse[] => {
  if (Array.isArray(data)) return data;

  if (data && typeof data === 'object') {
    const payload = data as {
      invitations?: GroupInvitationResponse[];
      data?: GroupInvitationResponse[] | { invitations?: GroupInvitationResponse[] };
    };

    if (Array.isArray(payload.invitations)) return payload.invitations;
    if (Array.isArray(payload.data)) return payload.data;
    if (payload.data && typeof payload.data === 'object') {
      return payload.data.invitations ?? [];
    }
  }

  return [];
};

export const groupInvitationsApi = {
  getReceived: async (): Promise<GroupInvitationResponse[]> => {
    const res = await apiClient.get('/invitations/received');
    return unwrapInvitations(res.data);
  },

  accept: async (invitationId: string): Promise<void> => {
    await apiClient.post(`/invitations/${invitationId}/accept`);
  },

  reject: async (invitationId: string): Promise<void> => {
    await apiClient.post(`/invitations/${invitationId}/reject`);
  },
};
