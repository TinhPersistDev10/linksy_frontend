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
  privacy: (userId: string) => ["settings", userId, "privacy"] as const,
};

export const friendQueryKeys = {
  all: ["friends"] as const,
  list: (userId: string) => ["friends", userId, "list"] as const,
  receivedRequests: (userId: string) =>
    ["friends", userId, "requests", "received"] as const,
  relationship: (userId: string, otherUserId: string) =>
    ["friends", userId, "relationship", otherUserId] as const,
};

export const blockedUserQueryKeys = {
  all: ["blocked-users"] as const,
  list: (userId: string) => ["blocked-users", userId, "list"] as const,
  status: (userId: string, otherUserId: string) =>
    ["blocked-users", userId, "status", otherUserId] as const,
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
  registrationStats: (
    period: string,
    from?: string,
    to?: string,
  ) => ["admin", "statistics", "registrations", period, from ?? "", to ?? ""] as const,
  recentActivities: (limit: number) =>
    ["admin", "activities", "recent", limit] as const,
  reports: (page: number, pageSize: number, status: string) =>
    ["admin", "reports", page, pageSize, status] as const,
  report: (reportId: string) => ["admin", "reports", reportId] as const,
};

export const scheduledMessageQueryKeys = {
  all: ["scheduled-messages"] as const,
  pending: (chatroomId: string) =>
    ["scheduled-messages", chatroomId, "pending"] as const,
};

export const stickerQueryKeys = {
  all: ["stickers"] as const,
  mine: (userId: string) => ["stickers", userId, "mine"] as const,
};

export const reportQueryKeys = {
  all: ["reports"] as const,
  reasons: ["reports", "reasons"] as const,
  mine: (userId: string, page: number) =>
    ["reports", userId, "mine", page] as const,
};
