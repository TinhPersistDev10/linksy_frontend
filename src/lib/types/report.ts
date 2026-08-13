export type ReportReasonCode =
  | "spam"
  | "harassment"
  | "fake_account"
  | "inappropriate"
  | "scam"
  | "violence"
  | "other";

export type ReportStatus =
  | "pending"
  | "reviewing"
  | "resolved"
  | "dismissed";

export type ModerationLevel =
  | "none"
  | "warning"
  | "restricted"
  | "temporary_lock"
  | "permanent_lock";

export interface ReportReason {
  code: ReportReasonCode;
  label: string;
}

export interface UserModerationStatus {
  level: ModerationLevel | string;
  levelLabel: string;
  reason?: string | null;
  expiresAt?: string | null;
  moderatedAt?: string | null;
  violationPoints: number;
  isFlaggedForReview: boolean;
  canLogin: boolean;
  canSendMessages: boolean;
  canStartCalls: boolean;
}

export interface UserReport {
  reportId: string;
  reporterUserId: string;
  reporterUsername: string;
  reporterFullname?: string | null;
  reporterAvatar?: string | null;
  reportedUserId: string;
  reportedUsername: string;
  reportedFullname?: string | null;
  reportedAvatar?: string | null;
  reason: ReportReasonCode | string;
  description?: string | null;
  status: ReportStatus | string;
  adminNote?: string | null;
  reviewedByAdminId?: string | null;
  reviewedByAdminUsername?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  totalCount?: number;
  currentPage?: number;
  totalPages?: number;
  reportedUserModerationLevel?: ModerationLevel | string;
  reportedUserIsFlagged?: boolean;
  reportedUserViolationPoints?: number;
}

export interface CreateUserReportRequest {
  reportedUserId: string;
  reason: ReportReasonCode | string;
  description?: string;
  alsoBlock?: boolean;
}

export interface UpdateReportStatusRequest {
  status: Exclude<ReportStatus, "pending"> | string;
  adminNote?: string;
  moderationAction?: ModerationLevel | string;
  durationDays?: number;
  incrementStrike?: boolean;
  /** @deprecated use moderationAction=permanent_lock */
  deactivateReportedUser?: boolean;
}

export interface ApplyModerationRequest {
  level: ModerationLevel | string;
  reason?: string;
  durationDays?: number;
  incrementStrike?: boolean;
}

export interface UserReportsListResult {
  reports: UserReport[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export interface RegistrationBucket {
  label: string;
  periodStart: string;
  count: number;
}

export interface RegistrationStats {
  period: "day" | "month" | "year" | string;
  from: string;
  to: string;
  totalRegistrations: number;
  buckets: RegistrationBucket[];
}

export const REPORT_REASON_LABELS: Record<string, string> = {
  spam: "Spam hoặc quảng cáo",
  harassment: "Quấy rối hoặc bắt nạt",
  fake_account: "Tài khoản giả mạo",
  inappropriate: "Nội dung không phù hợp",
  scam: "Lừa đảo / gian lận",
  violence: "Bạo lực hoặc đe dọa",
  other: "Khác",
};

export const REPORT_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ xử lý",
  reviewing: "Đang xem xét",
  resolved: "Đã xử lý",
  dismissed: "Từ chối",
};

export const MODERATION_LEVEL_LABELS: Record<string, string> = {
  none: "Không xử lý thêm",
  warning: "Cảnh báo",
  restricted: "Hạn chế nhắn tin/gọi (tạm)",
  temporary_lock: "Khóa tạm thời",
  permanent_lock: "Khóa vĩnh viễn",
};

export const MODERATION_DURATION_DEFAULTS: Record<string, number> = {
  restricted: 7,
  temporary_lock: 30,
};
