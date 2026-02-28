'use client';

import {
  createContext, useContext, useState,
  useEffect, useRef, ReactNode,
} from 'react';
import { User, LoginRequest, RegisterRequest, VerifyEmailRequest, ResendOtpRequest } from '@/lib/types/auth';
import { authApi } from '@/lib/api/auth';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<{ email: string }>;
  verifyEmail: (data: VerifyEmailRequest) => Promise<void>;
  resendOtp: (data: ResendOtpRequest) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // ✅ Bắt đầu false để server và client render giống nhau
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    // ✅ Set loading true chỉ ở client, trong useEffect
    setLoading(true);

    const checkAuth = async () => {
      try {
        const userData = await authApi.getCurrentUser();
        if (userData && userData.isEmailVerified) {
          setUser(userData);
        } else {
          setUser(null);
        }
      } catch (error) {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []); // ✅ Empty dependency - chỉ chạy 1 lần

  const login = async (data: LoginRequest) => {
    let response;
    try {
      response = await authApi.login(data);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || error.message || 'Đăng nhập thất bại'
      );
    }
    if (response.success) {
      setUser(response.user);
      router.push('/chat');
    } else {
      throw new Error(response.message || 'Đăng nhập thất bại');
    }
  };

  const register = async (data: RegisterRequest): Promise<{ email: string }> => {
    let response;
    try {
      response = await authApi.register(data);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || error.message || 'Đăng ký thất bại'
      );
    }
    if (response.success && response.email) {
      return { email: response.email };
    }
    throw new Error(response.message || 'Đăng ký thất bại');
  };

  const verifyEmail = async (data: VerifyEmailRequest) => {
    let response;
    try {
      response = await authApi.verifyEmail(data);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || error.message || 'Xác thực thất bại'
      );
    }
    if (response.success) {
      setUser(response.user);
      router.push('/chat');
    } else {
      throw new Error(response.message || 'Xác thực thất bại');
    }
  };

  const resendOtp = async (data: ResendOtpRequest) => {
    let response;
    try {
      response = await authApi.resendOtp(data);
    } catch (error: any) {
      throw new Error(
        error.response?.data?.message || error.message || 'Gửi lại OTP thất bại'
      );
    }
    if (!response.success) {
      throw new Error(response.message || 'Gửi lại OTP thất bại');
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      hasFetched.current = false; // ✅ Reset để checkAuth chạy lại sau logout
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider value={{
      user, loading, login, register,
      verifyEmail, resendOtp, logout,
      isAuthenticated: !!user && (user.isEmailVerified ?? false),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}