export const notificationQueryKeys = {
  all: ["notifications"] as const,
  list: (userId: string, page = 1, pageSize = 20) =>
    ["notifications", userId, "list", page, pageSize] as const,
  unreadCount: (userId: string) =>
    ["notifications", userId, "unread-count"] as const,
};

export const chatroomQueryKeys = {
  all: ["chatrooms"] as const,
  list: (userId: string) => ["chatrooms", userId, "list"] as const,
};
