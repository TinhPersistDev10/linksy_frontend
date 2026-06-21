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
