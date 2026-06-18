export interface NotificationResponse {
  notificationId: string;
  userId?: string;
  notificationType: string;
  title: string;
  body?: string;
  content?: string;
  relatedEntityId?: string | null;
  relatedEntityType?: string | null;
  actionUrl?: string | null;
  imageUrl?: string | null;
  data?: unknown | null;
  isRead: boolean;
  createdAt: string;
  readAt?: string | null;
}

export interface GetNotificationsData {
  notifications: NotificationResponse[];
  page?: number;
  pageSize?: number;
  totalCount?: number;
  unreadCount?: number;
  currentPage?: number;
  totalPages?: number;
  hasMore?: boolean;
}
