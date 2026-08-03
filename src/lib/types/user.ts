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
  roles?: string[];
}

/** System admin (JWT role `Admin`), not group chat admin. */
export function isSystemAdmin(user: User | null | undefined): boolean {
  return Boolean(user?.roles?.includes("Admin"));
}
export interface UserLookup {
  userId: string;
  username: string;
  fullname: string;
  avatar: string;
  bio: string;
}
export interface UpdateProfileRequest {
  fullname?: string;
  username?: string;
  bio?: string;
  dateOfBirth?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
