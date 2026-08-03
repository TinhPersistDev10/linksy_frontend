import apiClient from "./axios";
import type { ApiResponse } from "../types/common";
import type {
  AdminRecentActivity,
  AdminResetPasswordRequest,
  AdminStatistics,
  AdminUser,
  AdminUserDetail,
  AdminUsersListResult,
  AssignRoleRequest,
  CreateAdminUserRequest,
  Role,
  UpdateAdminUserRequest,
  UserRoleAssignment,
} from "../types/admin";

function unwrap<T>(response: ApiResponse<T>, fallback?: T): T {
  if (response.data == null) {
    if (fallback !== undefined) return fallback;
    throw new Error(response.message || "Empty API response");
  }
  return response.data;
}

function normalizeUsersList(users: AdminUser[]): AdminUsersListResult {
  const first = users[0];
  return {
    users,
    totalCount: first?.totalCount ?? users.length,
    currentPage: first?.currentPage ?? 1,
    totalPages: first?.totalPages ?? 1,
  };
}

export const adminApi = {
  getUsers: async (
    page = 1,
    pageSize = 10,
    search?: string,
  ): Promise<AdminUsersListResult> => {
    const res = await apiClient.get<ApiResponse<AdminUser[]>>("/admin/users", {
      params: { page, pageSize, search: search?.trim() || undefined },
    });
    const users = unwrap(res.data);
    return normalizeUsersList(Array.isArray(users) ? users : []);
  },

  getUserById: async (userId: string): Promise<AdminUserDetail> => {
    const res = await apiClient.get<ApiResponse<AdminUserDetail>>(
      `/admin/users/${userId}`,
    );
    return unwrap(res.data);
  },

  createUser: async (payload: CreateAdminUserRequest): Promise<AdminUser> => {
    const res = await apiClient.post<ApiResponse<AdminUser>>(
      "/admin/users",
      payload,
    );
    return unwrap(res.data);
  },

  updateUser: async (
    userId: string,
    payload: UpdateAdminUserRequest,
  ): Promise<AdminUser> => {
    const res = await apiClient.put<ApiResponse<AdminUser>>(
      `/admin/users/${userId}`,
      payload,
    );
    return unwrap(res.data);
  },

  deleteUser: async (userId: string): Promise<void> => {
    await apiClient.delete<ApiResponse<unknown>>(`/admin/users/${userId}`);
  },

  toggleUserStatus: async (userId: string): Promise<void> => {
    await apiClient.patch<ApiResponse<unknown>>(
      `/admin/users/${userId}/toggle-status`,
    );
  },

  resetPassword: async (
    userId: string,
    payload: Omit<AdminResetPasswordRequest, "userId">,
  ): Promise<void> => {
    await apiClient.post<ApiResponse<unknown>>(
      `/admin/users/${userId}/reset-password`,
      { userId, newPassword: payload.newPassword },
    );
  },

  getRoles: async (): Promise<Role[]> => {
    const res = await apiClient.get<ApiResponse<Role[]>>("/admin/roles");
    const roles = unwrap(res.data);
    return Array.isArray(roles) ? roles : [];
  },

  getUserRoles: async (userId: string): Promise<UserRoleAssignment[]> => {
    const res = await apiClient.get<ApiResponse<UserRoleAssignment[]>>(
      `/admin/users/${userId}/roles`,
    );
    const roles = unwrap(res.data);
    return Array.isArray(roles) ? roles : [];
  },

  assignRole: async (payload: AssignRoleRequest): Promise<void> => {
    await apiClient.post<ApiResponse<unknown>>(
      "/admin/users/assign-role",
      payload,
    );
  },

  removeRole: async (userId: string, roleId: number): Promise<void> => {
    await apiClient.delete<ApiResponse<unknown>>(
      `/admin/users/${userId}/roles/${roleId}`,
    );
  },

  getStatistics: async (): Promise<AdminStatistics> => {
    const res = await apiClient.get<ApiResponse<AdminStatistics>>(
      "/admin/statistics",
    );
    return unwrap(res.data, {
      totalUsers: 0,
      activeUsers: 0,
      inactiveUsers: 0,
      totalMessages: 0,
      totalChatrooms: 0,
      newUsersThisMonth: 0,
    });
  },

  getRecentActivities: async (limit = 10): Promise<AdminRecentActivity[]> => {
    const res = await apiClient.get<ApiResponse<AdminRecentActivity[]>>(
      "/admin/activities/recent",
      { params: { limit } },
    );
    const activities = unwrap(res.data, []);
    return Array.isArray(activities) ? activities : [];
  },
};
