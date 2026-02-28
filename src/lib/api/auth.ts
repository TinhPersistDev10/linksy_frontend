// lib/api/auth.ts

import apiClient from "./axios";
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
  ResendOtpRequest,
  User,
} from "../types/auth";

export const authApi = {
  // Đăng nhập
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>("/auth/login", data);
    return response.data;
  },

  // Đăng ký
  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    const response = await apiClient.post<RegisterResponse>(
      "/auth/register",
      data,
    );
    return response.data;
  },
  verifyEmail: async (
    data: VerifyEmailRequest,
  ): Promise<VerifyEmailResponse> => {
    const response = await apiClient.post<VerifyEmailResponse>(
      "/auth/verify-email",
      data,
    );
    return response.data;
  },
  resendOtp: async (
    data: ResendOtpRequest,
  ): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post("/auth/resend-otp", data);
    return response.data;
  },
  // Đăng xuất
  logout: async (): Promise<void> => {
    await apiClient.post("/auth/logout");
  },

  // Lấy thông tin user hiện tại
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<{ success: boolean; user: User }>(
      "/users/profile",
    );
    return response.data.user;
  },

  // Refresh token (tự động được gọi bởi axios interceptor)
  refreshToken: async (): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post("/auth/refresh-token");
    return response.data;
  },
};
