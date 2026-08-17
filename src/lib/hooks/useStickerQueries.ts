"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { stickersApi } from "@/lib/api/stickers";
import { stickerQueryKeys } from "@/lib/queries/queryKeys";

export function useCreateStickerMutation(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => stickersApi.createSticker(file),
    onSuccess: () => {
      if (!userId) return;
      queryClient.invalidateQueries({ queryKey: stickerQueryKeys.mine(userId) });
    },
  });
}

export function useDeleteStickerMutation(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => stickersApi.deleteSticker(id),
    onSuccess: () => {
      if (!userId) return;
      queryClient.invalidateQueries({ queryKey: stickerQueryKeys.mine(userId) });
    },
  });
}
