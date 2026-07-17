export interface MentionDto {
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
}

export interface MessageResponse {
  messageId: string;
  chatroomId: string;
  senderId: string;
  senderUsername: string;
  senderFullname: string;
  senderAvatar: string | null;
  senderNickname: string | null;
  messageType: string;
  messageText: string;
  parentMessageId: string | null;
  parentMessage: MessageResponse | null;
  isEdited: boolean;
  isDeleted: boolean;
  isOwn: boolean;
  sentAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  attachments: MessageAttachment[] | null;
  deliveryStatus?: "sent" | "delivered" | "read" | string;
  recipientCount: number;
  deliveredCount: number;
  readCount: number;
  mentions?: MentionDto[] | null;
}

export interface GetMessagesData {
  messages: MessageResponse[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface SendMessageRequest {
  chatroomId: string;
  messageText: string;
  messageType?: "text" | "image" | "file" | string;
  parentMessageId?: string | null;
  attachments?: SendMessageAttachmentRequest[] | null;
  mentions?: string[] | null;
}

export interface PendingMention {
  userId: string;
  displayName: string;
}

export interface EditMessageRequest {
  messageText: string;
}

export interface SearchMessagesData {
  keyword: string;
  results: MessageResponse[];
  count: number;
}
export interface MessageDeliveryResponse {
  deliveryId: string;
  messageId: string;
  userId: string;
  username: string;
  avatar: string | null;
  status: "sent" | "delivered" | "read" | string;
  deliveredAt: string | null;
  readAt: string | null;
}

export interface MessageDeliveryStatusResponse {
  messageId: string;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  deliveries: MessageDeliveryResponse[];
}

//event
export interface MessageEditedEvent {
  messageId: string;
  chatroomId: string;
  messageText: string;
  isEdited: boolean;
  editedAt: string | null;
  editedBy: string;
}

export interface MessageDeletedEvent {
  messageId: string;
  chatroomId: string;
  deletedBy: string;
  deletedAt: string;
}

export interface MessageDeliverySummaryEvent {
  messageId: string;
  recipientCount: number;
  deliveredCount: number;
  readCount: number;
  deliveryStatus: "sent" | "delivered" | "read" | string;
}

export interface MessageReadEvent {
  chatroomId: string;
  readBy: string;
  readAt: string;
  message: MessageDeliverySummaryEvent;
}

export interface MessageDeliveredEvent {
  chatroomId: string;
  deliveredBy: string;
  deliveredAt: string;
  message: MessageDeliverySummaryEvent;
}

export interface AllMessagesReadEvent {
  chatroomId: string;
  readBy: string;
  readAt: string;
  messages: MessageDeliverySummaryEvent[];
}

export interface MessageAttachment {
  attachmentId?: string;
  fileName: string;
  fileUrl?: string;
  cdnUrl?: string;
  fileType?: string;
  attachmentType?: string;
  fileSize: number;
  mimeType?: string;
  thumbnailUrl?: string | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  durationMs?: number | null;
}

export interface SendMessageAttachmentRequest {
  attachmentType: "image" | "video" | "file" | "audio" | string;
  fileName?: string | null;
  cdnUrl: string;
  filePath?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  thumbnailUrl?: string | null;
  width?: number | null;
  height?: number | null;
  durationMs?: number | null;
}
