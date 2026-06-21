import { GroupInvitationResponse } from "../types/group-intivitation";
import apiClient from "./axios";


const unwrapInvitations = (data: unknown): GroupInvitationResponse[] => {
  if (Array.isArray(data)) return data;

  if (data && typeof data === "object") {
    const payload = data as {
      invitations?: GroupInvitationResponse[];
      data?:
        | GroupInvitationResponse[]
        | { invitations?: GroupInvitationResponse[] };
    };

    if (Array.isArray(payload.invitations)) return payload.invitations;
    if (Array.isArray(payload.data)) return payload.data;
    if (payload.data && typeof payload.data === "object") {
      return payload.data.invitations ?? [];
    }
  }

  return [];
};

export const groupInvitationsApi = {
  getReceived: async (): Promise<GroupInvitationResponse[]> => {
    const res = await apiClient.get("/invitations/received");
    return unwrapInvitations(res.data);
  },

  accept: async (invitationId: string): Promise<void> => {
    await apiClient.post(`/invitations/${invitationId}/accept`);
  },

  reject: async (invitationId: string): Promise<void> => {
    await apiClient.post(`/invitations/${invitationId}/reject`);
  },
  send: async (
    chatroomId: string,
    invitedUserId: string,
    message?: string,
  ): Promise<void> => {
    await apiClient.post(`/invitations/chatrooms/${chatroomId}`, {
      invitedUserId,
      message: message ?? "",
    });
  },
};
