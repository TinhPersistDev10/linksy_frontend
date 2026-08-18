export interface ScheduledMessageResponse {
  id: string;
  chatroomId: string;
  senderId: string;
  messageType: string;
  messageText: string;
  parentMessageId: string | null;
  sendAt: string;
  status: string;
  createdAt: string;
}

export interface ScheduleMessageRequest {
  chatroomId: string;
  messageType: "text" | "sticker";
  messageText: string;
  parentMessageId?: string | null;
  sendAt: string;
}
