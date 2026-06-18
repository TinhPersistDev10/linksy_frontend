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
  replyCount: number;
  isEdited: boolean;
  isDeleted: boolean;
  isOwn: boolean;
  sentAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  attachments: unknown | null;
  deliveryStatus?: "sent" | "delivered" | "read" | string;
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