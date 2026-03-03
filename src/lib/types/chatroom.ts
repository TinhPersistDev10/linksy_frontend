// src/lib/types/chat.ts - Sync với backend response

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
  requestId: string;
  senderId: string;
  senderUsername: string;
  senderFullname: string;
  senderAvatar: string;
  receiverId: string;
  receiverUsername: string;
  receiverFullname: string;
  receiverAvatar: string;
  status: string;
  message?: string;
  sentAt: string;
  respondedAt?: string;
}

// ✅ Đúng theo backend response
export interface ChatroomMember {
  userId: string;
  username: string;
  fullname: string;
  avatar: string;
  memberRole: 'admin' | 'member';   // backend: memberRole
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
  messageType: string;              // backend: messageType
  messageText: string;              // backend: messageText (không phải content)
  parentMessageId: string | null;
  replyCount: number;
  isEdited: boolean;
  isDeleted: boolean;
  isOwn: boolean;
  sentAt: string;                   // backend: sentAt (không phải createdAt)
  editedAt: string | null;
  deletedAt: string | null;
  attachments: unknown | null;
}

export interface Chatroom {
  chatroomId: string;
  roomName: string;                 // backend: roomName (không phải name)
  description: string;
  avatar: string;
  roomType: 'direct' | 'group';    // backend: roomType (không phải type)
  isActive: boolean;
  isArchived: boolean;
  createdAt: string;
  lastActivityAt: string;          // backend: lastActivityAt (không phải lastMessageAt)
  lastMessage?: Message;
  members: ChatroomMember[];
  unreadCount: number;
  myMemberInfo: unknown | null;
}

export interface SendMessageRequest {
  messageText: string;             // backend nhận: messageText
  messageType?: string;
  parentMessageId?: string | null;
}