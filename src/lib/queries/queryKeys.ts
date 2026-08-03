export const notificationQueryKeys = {
  all: ["notifications"] as const,
  list: (userId: string, page = 1, pageSize = 20) =>
    ["notifications", userId, "list", page, pageSize] as const,
  unreadCount: (userId: string) =>
    ["notifications", userId, "unread-count"] as const,
};

export const settingsQueryKeys = {
  all: ["settings"] as const,
  detail: (userId: string) => ["settings", userId] as const,
};

export const friendQueryKeys = {
  all: ["friends"] as const,
  receivedRequests: (userId: string) =>
    ["friends", userId, "requests", "received"] as const,
};

export const chatroomQueryKeys = {
  all: ["chatrooms"] as const,
  list: (userId: string, includeArchived = false) =>
    ["chatrooms", userId, "list", includeArchived ? "archived" : "active"] as const,
};

export const adminQueryKeys = {
  all: ["admin"] as const,
  users: (page: number, pageSize: number, search: string) =>
    ["admin", "users", page, pageSize, search] as const,
  user: (userId: string) => ["admin", "users", userId] as const,
  userRoles: (userId: string) => ["admin", "users", userId, "roles"] as const,
  roles: ["admin", "roles"] as const,
  statistics: ["admin", "statistics"] as const,
  recentActivities: (limit: number) =>
    ["admin", "activities", "recent", limit] as const,
};
