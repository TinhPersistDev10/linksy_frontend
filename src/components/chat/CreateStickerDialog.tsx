"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/hooks/useAuth";
import { useCreateStickerMutation } from "@/lib/hooks/useStickerQueries";
import { removeImageBackground } from "@/lib/utils/backgroundRemoval";
import { applyStickerOutline } from "@/lib/utils/stickerOutline";

type CreateStickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (imageUrl: string) => void;
};

type Stage = "idle" | "processing" | "ready" | "uploading";

export default function CreateStickerDialog({
  open,
  onOpenChange,
  onSend,
}: CreateStickerDialogProps) {
  const { user } = useAuth();
  const createSticker = useCreateStickerMutation(user?.userId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultPreview, setResultPreview] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState("");
  const [uploadAction, setUploadAction] = useState<"send" | "save" | null>(
    null,
  );

  const reset = () => {
    setSourcePreview(null);
    setResultBlob(null);
    setResultPreview(null);
    setStage("idle");
    setError("");
    setUploadAction(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setResultBlob(null);
    setResultPreview(null);
    setSourcePreview(URL.createObjectURL(file));

    try {
      setStage("processing");
      const cutout = await removeImageBackground(file);
      const outlined = await applyStickerOutline(cutout);
      setResultBlob(outlined);
      setResultPreview(URL.createObjectURL(outlined));
      setStage("ready");
    } catch {
      setError("Không thể xử lý ảnh. Hãy thử ảnh khác.");
      setStage("idle");
    }
  };

  const uploadResult = async (): Promise<string> => {
    if (!resultBlob) throw new Error("Chưa có sticker để lưu");
    const file = new File([resultBlob], "sticker.png", { type: "image/png" });
    const sticker = await createSticker.mutateAsync(file);
    return sticker.imageUrl;
  };

  const handleSendNow = async () => {
    try {
      setStage("uploading");
      setUploadAction("send");
      const imageUrl = await uploadResult();
      onSend(imageUrl);
      onOpenChange(false);
      reset();
    } catch {
      setError("Không thể gửi sticker. Vui lòng thử lại.");
      setStage("ready");
      setUploadAction(null);
    }
  };

  const handleSaveToLibrary = async () => {
    try {
      setStage("uploading");
      setUploadAction("save");
      await uploadResult();
      onOpenChange(false);
      reset();
    } catch {
      setError("Không thể lưu sticker. Vui lòng thử lại.");
      setStage("ready");
      setUploadAction(null);
    }
  };

  const isBusy = stage === "processing" || stage === "uploading";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isBusy) return;
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Tạo sticker</DialogTitle>
          <DialogDescription>
            Chọn 1 ảnh có chủ thể rõ ràng — trình duyệt sẽ tự tách nền và thêm
            viền trắng, không cần gửi ảnh lên server AI.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => void handleFileChange(e)}
        />

        <div className="flex flex-col items-center gap-4">
          {!sourcePreview && (
            <Button
              type="button"
              variant="outline"
              className="flex h-32 w-full flex-col items-center justify-center gap-2 border-dashed"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={24} />
              <span className="text-sm">Chọn ảnh</span>
            </Button>
          )}

          {sourcePreview && (
            <div className="flex w-full items-center justify-center gap-6">
              <div className="flex flex-col items-center gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sourcePreview}
                  alt="Ảnh gốc"
                  className="h-28 w-28 rounded-lg border object-cover"
                />
                <span className="text-xs text-muted-foreground">Ảnh gốc</span>
              </div>

              <div className="flex h-28 w-28 items-center justify-center">
                {stage === "processing" ? (
                  <Loader2
                    className="animate-spin text-muted-foreground"
                    size={28}
                  />
                ) : resultPreview ? (
                  <div className="flex flex-col items-center gap-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resultPreview}
                      alt="Sticker"
                      className="h-28 w-28 object-contain"
                    />
                    <span className="text-xs text-muted-foreground">
                      Kết quả
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {sourcePreview && !isBusy && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              Chọn ảnh khác
            </Button>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={stage !== "ready"}
            onClick={() => void handleSaveToLibrary()}
          >
            {stage === "uploading" && uploadAction === "save" ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              "Lưu vào kho"
            )}
          </Button>
          <Button
            type="button"
            disabled={stage !== "ready"}
            onClick={() => void handleSendNow()}
          >
            {stage === "uploading" && uploadAction === "send" ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              "Gửi ngay"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
