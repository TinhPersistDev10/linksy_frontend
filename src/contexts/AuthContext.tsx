// src/contexts/AuthContext.tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import type { User } from "@/lib/types/user";
import type {
  LoginRequest,
  RegisterRequest,
  VerifyEmailRequest,
  ResendOtpRequest,
} from "@/lib/types/auth";
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(() =>
    storage.getUser<User>(),
  );
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const hasFetched = useRef(false);

  // Luôn sync storage khi set user
  const setUser = (u: User | null) => {
    if (u) {
      storage.setUser(u);
    } else {
      storage.removeUser();
    }
    setUserState(u);
  };

  // Verify session với server khi app khởi động
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const checkAuth = async () => {
      try {
        const userData = await authApi.getCurrentUser();
        if (userData?.isEmailVerified) {
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch {
        // Nếu API lỗi nhưng có cache → giữ nguyên để tránh flicker
        // axios interceptor sẽ tự refresh token nếu cần
        if (!storage.getUser()) {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (data: LoginRequest) => {
    try {
      const response = await authApi.login(data);
      if (response.success) {
        setUser(response.user);
        router.push("/dashboard");
      } else {
        throw new Error(response.message || "Đăng nhập thất bại");
      }
    } catch (error: any) {
      const status = error.response?.status;
      const message = error.response?.data?.message || "";
      const email = error.response?.data?.email || "";

      if (status === 403 && email) {
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
        return;
      }

      throw new Error(message || error.message || "Đăng nhập thất bại");
    }
  };

  const register = async (
    data: RegisterRequest,
  ): Promise<{ email: string }> => {
    try {
      const response = await authApi.register(data);
      if (response.success && response.email) {
        return { email: response.email };
      }
      throw new Error(response.message || "Đăng ký thất bại");
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || error.message || "Đăng ký thất bại",
      );
    }
  };

  const verifyEmail = async (data: VerifyEmailRequest) => {
    try {
      const response = await authApi.verifyEmail(data);
      if (response.success) {
        setUser(response.user);
        router.push("/dashboard");
      } else {
        throw new Error(response.message || "Xác thực thất bại");
      }
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || error.message || "Xác thực thất bại",
      );
    }
  };

  const resendOtp = async (data: ResendOtpRequest) => {
    try {
      const response = await authApi.resendOtp(data);
      if (!response.success) {
        throw new Error(response.message || "Gửi lại OTP thất bại");
      }
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          "Gửi lại OTP thất bại",
      );
    }
  };
  const logout = async () => {
    // 1. Clear state + storage ngay
    setUser(null);
    hasFetched.current = false;

    // 2. Gọi API logout TRƯỚC - chờ backend xóa cookie
    try {
      await authApi.logout();
    } catch (error: any) {
      if (error?.response?.status !== 401) {
        console.error("Logout error:", error);
      }
    }

    // 3. Dùng window.location thay vì router.replace
    // router.replace là client-side navigation → middleware có thể chưa thấy cookie mới
    // window.location.href là full page reload → browser đọc lại cookie từ đầu
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user && (user.isEmailVerified ?? false),
        login,
        register,
        verifyEmail,
        resendOtp,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Export context để dùng trong useAuth hook
export { AuthContext };
