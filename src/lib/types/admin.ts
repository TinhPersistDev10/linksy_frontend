export interface Role {
  roleId: number;
  roleName: string;
  description?: string | null;
  assignedAt?: string | null;
}

export interface AdminUser {
  userId: string;
  username: string;
  email: string;
  fullname?: string | null;
  avatar?: string | null;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  lastLoginAt?: string | null;
  roles: string[];
  totalCount?: number;
  currentPage?: number;
  totalPages?: number;
}

export interface AdminUserDetail {
  userId: string;
  username: string;
  email: string;
  fullname?: string | null;
  avatar?: string | null;
  bio?: string | null;
  dateOfBirth?: string | null;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt?: string | null;
  lastLoginAt?: string | null;
  emailVerifiedAt?: string | null;
  failedLoginAttempts: number;
  accountLockedUntil?: string | null;
  roles: Role[];
  messageCount: number;
  friendCount: number;
}

export interface AdminUsersListResult {
  users: AdminUser[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

export interface CreateAdminUserRequest {
  username: string;
  email: string;
  password: string;
  fullname?: string;
  bio?: string;
  dateOfBirth?: string;
  isActive?: boolean;
  isEmailVerified?: boolean;
  roleId?: number;
}

export interface UpdateAdminUserRequest {
  username?: string;
  email?: string;
  fullname?: string;
  bio?: string;
  dateOfBirth?: string;
  isActive?: boolean;
  isEmailVerified?: boolean;
}

export interface AssignRoleRequest {
  userId: string;
  roleId: number;
}

export interface AdminResetPasswordRequest {
  userId: string;
  newPassword: string;
}

export interface AdminStatistics {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalMessages: number;
  totalChatrooms: number;
  newUsersThisMonth: number;
}

export interface AdminRecentActivity {
  activityType: string;
  description: string;
  timestamp: string;
  userId?: string | null;
  username?: string | null;
}

export interface UserRoleAssignment {
  userRoleId: number;
  userId: string;
  roleId: number;
  roleName: string;
  assignedAt: string;
}
