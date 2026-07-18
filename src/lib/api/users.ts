import apiClient from "./axios";
import type {
  ChangePasswordRequest,
  UserLookup,
  UpdateProfileRequest,
  User,
} from "../types/user";

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
  user?: T;
}

interface AvatarResponse {
  avatarUrl: string;
}

const unwrap = <T>(payload: ApiEnvelope<T> | T): T => {
  const envelope = payload as ApiEnvelope<T>;
  return envelope.data ?? envelope.user ?? (payload as T);
};

export const usersApi = {
  getProfile: async (): Promise<User> => {
    const res = await apiClient.get<ApiEnvelope<User>>("/users/profile");
    return unwrap<User>(res.data);
  },

  updateProfile: async (data: UpdateProfileRequest): Promise<User> => {
    const res = await apiClient.put<ApiEnvelope<User>>("/users/profile", data);
    return unwrap<User>(res.data);
  },

  updateAvatar: async (file: File): Promise<AvatarResponse> => {
    const formData = new FormData();
    formData.append("avatar", file);

    const res = await apiClient.post<
      ApiEnvelope<AvatarResponse> | AvatarResponse
    >("/users/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return unwrap<AvatarResponse>(res.data);
  },

  deleteAvatar: async (): Promise<void> => {
    await apiClient.delete("/users/avatar");
  },

  changePassword: async (
    data: Omit<ChangePasswordRequest, "confirmPassword">,
  ): Promise<void> => {
    const payload: ChangePasswordRequest = {
      ...data,
      confirmPassword: data.newPassword,
    };

    await apiClient.post("/auth/change-password", payload);
  },
  searchUsers: async (query: string, limit = 20): Promise<UserLookup[]> => {
    const keyword = query.trim();
    const res = await apiClient.get("/users/search", {
      params: { query: keyword, limit },
    });
    return res.data.data ?? [];
  },

  getById: async (userId: string): Promise<User> => {
    const res = await apiClient.get<ApiEnvelope<User>>(`/users/${userId}`);
    return unwrap<User>(res.data);
  },
};
