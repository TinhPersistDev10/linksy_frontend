export interface Friend {
  userId: string;
  username: string;
  fullname: string;
  avatar: string;
  friendsSince: string;
}
export interface FriendRequest {
  requestId: string;       // Guid → string
  senderId: string | null;
  senderUsername: string;
  senderFullname: string;
  senderAvatar: string;
  receiverId: string | null;
  receiverUsername: string;
  receiverFullname: string;
  receiverAvatar: string;
  message: string;
  status: string;
  sentAt: string;
  respondedAt: string | null;
}

export interface SearchUserResult {
  userId: string;
  username: string;
  fullname: string;
  avatar: string;
  bio: string | null;
  relationshipStatus: string;
  actionButtonText: string | null;
  canSendRequest: boolean;
}