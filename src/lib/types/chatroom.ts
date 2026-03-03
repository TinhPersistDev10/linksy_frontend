// src/lib/types/chatroom.ts - Sync với backend response

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

// ✅ Đúng theo backend response
export interface ChatroomMember {
  userId: string;
  username: string;
  fullname: string;
  avatar: string;
  memberRole: 'admin' | 'member';
  joinedAt: string;
  isOnline: boolean;
}

export interface Message {
  messageId: string;
  chatroomId: string;
  senderId: string;
  senderUsername: string;
  senderFullname: string;
  senderAvatar: string;
  senderNickname: string | null;
  messageType: string;
  messageText: string;
  parentMessageId: string | null;
  replyCount: number;
  isEdited: boolean;
  isDeleted: boolean;
  isOwn: boolean;
  sentAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  attachments: unknown | null;
}

export interface Chatroom {
  chatroomId: string;
  roomName: string;
  description: string;
  avatar: string;
  roomType: 'direct' | 'group';
  isActive: boolean;
  isArchived: boolean;
  createdAt: string;
  lastActivityAt: string;
  lastMessage?: Message;
  members: ChatroomMember[];
  unreadCount: number;
  myMemberInfo: unknown | null;
}

export interface SendMessageRequest {
  messageText: string;
  messageType?: string;
  parentMessageId?: string | null;
}