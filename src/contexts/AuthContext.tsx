// contexts/AuthContext.tsx

'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginRequest, RegisterRequest, VerifyEmailRequest, ResendOtpRequest } from '@/lib/types/auth';
import { authApi } from '@/lib/api/auth';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<{email: string}>;
  verifyEmail: (data: VerifyEmailRequest) => Promise<void>;
  resendOtp: (data: ResendOtpRequest) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Gọi API getCurrentUser - cookie sẽ tự động được gửi
      const userData = await authApi.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (data: LoginRequest) => {
    try {
      const response = await authApi.login(data);
      
      if (response.success) {
        setUser(response.user);
        router.push('/chat');
      } else {
        throw new Error(response.message || 'Đăng nhập thất bại');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Đăng nhập thất bại';
      throw new Error(errorMessage);
    }
  };

  const register = async (data: RegisterRequest): Promise<{ email: string }> => {
    try {
      const response = await authApi.register(data);
      
      if (response.success) {
        // Không set user, chỉ trả về email để chuyển sang màn verify
        return { email: response.email };
      } else {
        throw new Error(response.message || 'Đăng ký thất bại');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Đăng ký thất bại';
      throw new Error(errorMessage);
    }
  };

  const verifyEmail = async (data: VerifyEmailRequest) => {
    try {
      const response = await authApi.verifyEmail(data);
      
      if (response.success) {
        // Cookie đã được set tự động
        setUser(response.user);
        router.push('/chat');
      } else {
        throw new Error(response.message || 'Xác thực thất bại');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Xác thực thất bại';
      throw new Error(errorMessage);
    }
  };

  const resendOtp = async (data: ResendOtpRequest) => {
    try {
      const response = await authApi.resendOtp(data);
      
      if (!response.success) {
        throw new Error(response.message || 'Gửi lại OTP thất bại');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Gửi lại OTP thất bại';
      throw new Error(errorMessage);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        verifyEmail,
        resendOtp,
        logout,
        isAuthenticated: !!user,
      }}
    >
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