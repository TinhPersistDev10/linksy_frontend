import type { MessageResponse } from "./message";
import type {
  ChatroomMemberDetailResponse,
  ChatroomMemberResponse,
  MemberInfoResponse,
} from "./chatroom-member";

export interface ChatroomResponse {
  chatroomId: string;
  roomName: string;
  description: string;
  avatar: string | null;
  roomType: "direct" | "group" | string;
  isActive: boolean;
  isArchived: boolean;
  createdAt: string;
  lastActivityAt: string | null;
  lastMessage: MessageResponse | null;
  members: ChatroomMemberResponse[];
  unreadCount: number;
  myMemberInfo: MemberInfoResponse | null;
}
export interface ChatroomDetailResponse {
  chatroomId: string;
  roomName: string;
  description: string;
  avatar: string | null;
  roomType: "direct" | "group" | string;
  isActive: boolean;
  isArchived: boolean;
  createdAt: string;
  createdBy: string;
  createdByUsername: string;
  members: ChatroomMemberDetailResponse[];
  settings: unknown;
  statistics: unknown;
}
export interface CreateDirectChatRequest {
  otherUserId: string;
}

export interface CreateGroupChatroomRequest {
  roomName: string;
  description?: string;
  memberIds: string[];
}

export interface UpdateChatroomRequest {
  roomName?: string;
  description?: string;
}

export interface ArchiveChatroomRequest {
  isArchived: boolean;
}
export type Chatroom = ChatroomResponse;
export type ChatroomMember = ChatroomMemberResponse;
export type Message = MessageResponse;

export type { ChatroomMemberResponse, ChatroomMemberDetailResponse, MemberInfoResponse } from "./chatroom-member";
export type { Friend, FriendRequest, SearchUserResult } from "./friend";

