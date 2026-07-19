"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";
import { adminQueryKeys } from "@/lib/queries/queryKeys";
import type {
  AssignRoleRequest,
  CreateAdminUserRequest,
  UpdateAdminUserRequest,
} from "@/lib/types/admin";
import { isSystemAdmin } from "@/lib/types/user";
import type { User } from "@/lib/types/user";

export function useIsSystemAdmin(user: User | null | undefined) {
  return isSystemAdmin(user);
}

export function useAdminUsersQuery(
  page = 1,
  pageSize = 10,
  search = "",
  enabled = true,
) {
  return useQuery({
    queryKey: adminQueryKeys.users(page, pageSize, search),
    queryFn: () => adminApi.getUsers(page, pageSize, search),
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useAdminUserQuery(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: adminQueryKeys.user(userId ?? ""),
    queryFn: () => adminApi.getUserById(userId!),
    enabled: Boolean(userId) && enabled,
    staleTime: 30 * 1000,
  });
}

export function useAdminRolesQuery(enabled = true) {
  return useQuery({
    queryKey: adminQueryKeys.roles,
    queryFn: adminApi.getRoles,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminUserRolesQuery(
  userId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: adminQueryKeys.userRoles(userId ?? ""),
    queryFn: () => adminApi.getUserRoles(userId!),
    enabled: Boolean(userId) && enabled,
    staleTime: 30 * 1000,
  });
}

export function useAdminStatisticsQuery(enabled = true) {
  return useQuery({
    queryKey: adminQueryKeys.statistics,
    queryFn: adminApi.getStatistics,
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useAdminRecentActivitiesQuery(limit = 10, enabled = true) {
  return useQuery({
    queryKey: adminQueryKeys.recentActivities(limit),
    queryFn: () => adminApi.getRecentActivities(limit),
    enabled,
    staleTime: 60 * 1000,
  });
}

function useInvalidateAdminUsers(queryClient: ReturnType<typeof useQueryClient>) {
  return () => {
    queryClient.invalidateQueries({ queryKey: adminQueryKeys.all });
  };
}

export function useCreateAdminUserMutation() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateAdminUsers(queryClient);

  return useMutation({
    mutationFn: (payload: CreateAdminUserRequest) => adminApi.createUser(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateAdminUserMutation() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateAdminUsers(queryClient);

  return useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: string;
      payload: UpdateAdminUserRequest;
    }) => adminApi.updateUser(userId, payload),
    onSuccess: (_data, variables) => {
      invalidate();
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.user(variables.userId),
      });
    },
  });
}

export function useDeleteAdminUserMutation() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateAdminUsers(queryClient);

  return useMutation({
    mutationFn: (userId: string) => adminApi.deleteUser(userId),
    onSuccess: invalidate,
  });
}

export function useToggleAdminUserStatusMutation() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateAdminUsers(queryClient);

  return useMutation({
    mutationFn: (userId: string) => adminApi.toggleUserStatus(userId),
    onSuccess: (_data, userId) => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.user(userId) });
    },
  });
}

export function useAdminResetPasswordMutation() {
  return useMutation({
    mutationFn: ({
      userId,
      newPassword,
    }: {
      userId: string;
      newPassword: string;
    }) => adminApi.resetPassword(userId, { newPassword }),
  });
}

export function useAssignAdminRoleMutation() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateAdminUsers(queryClient);

  return useMutation({
    mutationFn: (payload: AssignRoleRequest) => adminApi.assignRole(payload),
    onSuccess: (_data, variables) => {
      invalidate();
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.userRoles(variables.userId),
      });
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.user(variables.userId),
      });
    },
  });
}

export function useRemoveAdminRoleMutation() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateAdminUsers(queryClient);

  return useMutation({
    mutationFn: ({
      userId,
      roleId,
    }: {
      userId: string;
      roleId: number;
    }) => adminApi.removeRole(userId, roleId),
    onSuccess: (_data, variables) => {
      invalidate();
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.userRoles(variables.userId),
      });
      queryClient.invalidateQueries({
        queryKey: adminQueryKeys.user(variables.userId),
      });
    },
  });
}
