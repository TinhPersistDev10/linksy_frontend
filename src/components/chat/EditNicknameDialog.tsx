"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const NICKNAME_MAX_LENGTH = 50;

interface EditNicknameDialogProps {
  open: boolean;
  targetName: string;
  currentNickname?: string | null;
  onOpenChange: (open: boolean) => void;
  onSave: (nickname: string) => Promise<void> | void;
}

export default function EditNicknameDialog({
  open,
  targetName,
  currentNickname,
  onOpenChange,
  onSave,
}: EditNicknameDialogProps) {
  const [value, setValue] = useState(currentNickname ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setValue(currentNickname ?? "");
      setError("");
    }
  }, [open, currentNickname]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await onSave(value.trim());
      onOpenChange(false);
    } catch (err) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;
      setError(message || "Không thể cập nhật biệt danh.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (saving) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="z-[95] sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Đặt biệt danh</DialogTitle>
          <DialogDescription>
            Biệt danh cho {targetName} sẽ hiển thị với mọi người trong đoạn
            chat này. Để trống để xóa biệt danh.
          </DialogDescription>
        </DialogHeader>

        <div>
          <input
            autoFocus
            value={value}
            maxLength={NICKNAME_MAX_LENGTH}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleSave();
            }}
            placeholder={targetName}
            className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
          />
          <p className="mt-1 text-right text-xs text-muted-foreground">
            {value.length}/{NICKNAME_MAX_LENGTH}
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          <Button type="button" disabled={saving} onClick={() => void handleSave()}>
            {saving ? <Loader2 className="animate-spin" size={16} /> : "Lưu"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
