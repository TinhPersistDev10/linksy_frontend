export interface User {
  userId: string;
  username: string;
  email: string;
  fullname: string;
  avatar: string;
  bio: string;
  isActive: boolean;
  dateOfBirth: string;
  isEmailVerified: boolean;
  createdAt: string;
  lastLoginAt: string;
}

export interface LoginRequest {
  emailOrUsername: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user: User;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  fullname: string;
  dateOfBirth?: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  userId: string;
  email: string;
}

export interface VerifyEmailRequest {
  email: string;
  otpCode: string;
}

export interface VerifyEmailResponse {
  success: boolean;
  message: string;
  user: User;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}
export interface ResendOtpRequest {
  email: string;
}