import type { ApiResponse } from "../types/common";
import type { StickerResponse } from "../types/sticker";
import apiClient from "./axios";

function requireData<T>(response: ApiResponse<T>, fallbackMessage: string): T {
  if (response.data === null || response.data === undefined) {
    throw new Error(response.message || fallbackMessage);
  }
  return response.data;
}

export const stickersApi = {
  getMyStickers: async (): Promise<StickerResponse[]> => {
    const res = await apiClient.get<ApiResponse<StickerResponse[]>>("/stickers");
    return requireData(res.data, "Không thể tải kho sticker") ?? [];
  },

  createSticker: async (file: File): Promise<StickerResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await apiClient.post<ApiResponse<StickerResponse>>(
      "/stickers",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return requireData(res.data, "Không thể tạo sticker");
  },

  deleteSticker: async (id: string): Promise<void> => {
    await apiClient.delete(`/stickers/${id}`);
  },
};
