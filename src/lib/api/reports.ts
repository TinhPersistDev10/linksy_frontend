import apiClient from "./axios";
import type { ApiResponse } from "../types/common";
import type {
  CreateUserReportRequest,
  ReportReason,
  UpdateReportStatusRequest,
  UserReport,
  UserReportsListResult,
} from "../types/report";

function unwrap<T>(response: ApiResponse<T>, fallback?: T): T {
  if (response.data == null) {
    if (fallback !== undefined) return fallback;
    throw new Error(response.message || "Empty API response");
  }
  return response.data;
}

function normalizeList(reports: UserReport[]): UserReportsListResult {
  const first = reports[0];
  return {
    reports,
    totalCount: first?.totalCount ?? reports.length,
    currentPage: first?.currentPage ?? 1,
    totalPages: first?.totalPages ?? 1,
  };
}

export const reportsApi = {
  getReasons: async (): Promise<ReportReason[]> => {
    const res = await apiClient.get<ApiResponse<ReportReason[]>>(
      "/reports/reasons",
    );
    const reasons = unwrap(res.data, []);
    return Array.isArray(reasons) ? reasons : [];
  },

  create: async (payload: CreateUserReportRequest): Promise<UserReport> => {
    const res = await apiClient.post<ApiResponse<UserReport>>(
      "/reports",
      payload,
    );
    return unwrap(res.data);
  },

  getMine: async (page = 1, pageSize = 20): Promise<UserReportsListResult> => {
    const res = await apiClient.get<ApiResponse<UserReport[]>>(
      "/reports/mine",
      { params: { page, pageSize } },
    );
    const reports = unwrap(res.data, []);
    return normalizeList(Array.isArray(reports) ? reports : []);
  },

  // Admin
  getAdminReports: async (
    page = 1,
    pageSize = 20,
    status?: string,
  ): Promise<UserReportsListResult> => {
    const res = await apiClient.get<ApiResponse<UserReport[]>>(
      "/admin/reports",
      {
        params: {
          page,
          pageSize,
          status: status?.trim() || undefined,
        },
      },
    );
    const reports = unwrap(res.data, []);
    return normalizeList(Array.isArray(reports) ? reports : []);
  },

  getAdminReport: async (reportId: string): Promise<UserReport> => {
    const res = await apiClient.get<ApiResponse<UserReport>>(
      `/admin/reports/${reportId}`,
    );
    return unwrap(res.data);
  },

  updateAdminReport: async (
    reportId: string,
    payload: UpdateReportStatusRequest,
  ): Promise<UserReport> => {
    const res = await apiClient.patch<ApiResponse<UserReport>>(
      `/admin/reports/${reportId}`,
      payload,
    );
    return unwrap(res.data);
  },
};
