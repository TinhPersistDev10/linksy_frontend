export type ChatroomMemberRole = "admin" | "member" | string;

export type NotificationPreference = "all" | "mentions" | "mute" | string;

export interface MemberPermissionResponse {
  canSendMessages: boolean;
  canSendMedia: boolean;
  canSendVoice: boolean;
  canSendFiles: boolean;
  canInviteMembers: boolean;
  canRemoveMembers: boolean;
  canEditGroupInfo: boolean;
  canPinMessages: boolean;
  canDeleteMessages: boolean;
  canManageCalls: boolean;
}

export interface ChatroomMemberResponse {
  userId: string;
  username: string;
  fullname: string;
  avatar: string | null;
  memberRole: ChatroomMemberRole;
  joinedAt: string;
  isOnline: boolean;
  lastActiveAt: string | null;
  nickname: string | null;
  addedBy?: string | null;
  addedByUsername?: string | null;
  addedByFullname?: string | null;
}

export interface ChatroomMemberDetailResponse {
  memberId: string;
  userId: string;
  username: string;
  fullname: string;
  avatar: string | null;
  memberRole: ChatroomMemberRole;
  nickname: string | null;
  isMuted: boolean;
  mutedUntil: string | null;
  notificationPreference: NotificationPreference;
  messageCount: number;
  joinedAt: string;
  addedBy: string | null;
  addedByUsername: string | null;
  permissions: MemberPermissionResponse;
}

export interface MemberInfoResponse {
  memberId: string;
  memberRole: ChatroomMemberRole;
  nickname: string | null;
  isMuted: boolean;
  mutedUntil: string | null;
  notificationPreference: NotificationPreference;
  messageCount: number;
  lastReadAt: string | null;
  joinedAt: string;
  permissions: MemberPermissionResponse;
}

export interface AddMembersRequest {
  memberIds: string[];
}

export interface UpdateMemberPermissionsRequest {
  canSendMessages?: boolean | null;
  canSendMedia?: boolean | null;
  canSendVoice?: boolean | null;
  canSendFiles?: boolean | null;
  canInviteMembers?: boolean | null;
  canRemoveMembers?: boolean | null;
  canEditGroupInfo?: boolean | null;
  canPinMessages?: boolean | null;
  canDeleteMessages?: boolean | null;
  canManageCalls?: boolean | null;
}