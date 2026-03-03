"use client";

import { createContext, useState, useEffect, useRef, ReactNode } from "react";
import type { User } from "@/lib/types/user";
import type { LoginRequest, RegisterRequest, VerifyEmailRequest, ResendOtpRequest } from "@/lib/types/auth";
import { authApi } from "@/lib/api/auth";
import { storage } from "@/lib/utils/storage";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<{ email: string }>;
  verifyEmail: (data: VerifyEmailRequest) => Promise<void>;
  resendOtp: (data: ResendOtpRequest) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false); // ← KEY: track hydration
  const router = useRouter();
  const hasFetched = useRef(false);

  const setUser = (u: User | null) => {
    if (u) storage.setUser(u);
    else storage.removeUser();
    setUserState(u);
  };

  // Step 1: đánh dấu đã hydrate xong — không gây mismatch vì chỉ chạy ở client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Step 2: chỉ fetch auth SAU KHI mounted
  useEffect(() => {
    if (!isMounted || hasFetched.current) return;
    hasFetched.current = true;

    const checkAuth = async () => {
      try {
        const userData = await authApi.getCurrentUser();
        setUser(userData?.isEmailVerified ? userData : null);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [isMounted]);

  const login = async (data: LoginRequest) => {
    const response = await authApi.login(data).catch((error: any) => {
      const status = error.response?.status;
      const email = error.response?.data?.email || "";
      if (status === 403 && email) {
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        return null;
      }
      throw new Error(error.response?.data?.message || error.message || "Đăng nhập thất bại");
    });
    if (response?.success) {
      setUser(response.user);
      router.push("/dashboard");
    }
  };

  const register = async (data: RegisterRequest): Promise<{ email: string }> => {
    try {
      const response = await authApi.register(data);
      if (response.success && response.email) return { email: response.email };
      throw new Error(response.message || "Đăng ký thất bại");
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || "Đăng ký thất bại");
    }
  };

  const verifyEmail = async (data: VerifyEmailRequest) => {
    try {
      const response = await authApi.verifyEmail(data);
      if (response.success) {
        setUser(response.user);
        router.push("/dashboard");
      } else throw new Error(response.message || "Xác thực thất bại");
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || "Xác thực thất bại");
    }
  };

  const resendOtp = async (data: ResendOtpRequest) => {
    try {
      const response = await authApi.resendOtp(data);
      if (!response.success) throw new Error(response.message || "Gửi lại OTP thất bại");
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || "Gửi lại OTP thất bại");
    }
  };

  const logout = async () => {
    setUser(null);
    hasFetched.current = false;
    try {
      await authApi.logout();
    } catch (error: any) {
      if (error?.response?.status !== 401) console.error("Logout error:", error);
    }
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{
      user,
      // loading=true khi: belum mount ATAU sedang fetch
      // Cả server lẫn client đều bắt đầu với loading=true → không mismatch
      loading: !isMounted || loading,
      isAuthenticated: !!user && (user.isEmailVerified ?? false),
      login, register, verifyEmail, resendOtp, logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}