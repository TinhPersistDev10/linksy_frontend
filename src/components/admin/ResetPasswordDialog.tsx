"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAdminResetPasswordMutation } from "@/lib/hooks/useAdminQueries";
import { getApiErrorMessage } from "@/lib/utils/admin-errors";
import {
  adminResetPasswordSchema,
  getZodErrorMessage,
} from "@/lib/utils/validators";

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  username: string;
}

export function ResetPasswordDialog({
  open,
  onOpenChange,
  userId,
  username,
}: ResetPasswordDialogProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const resetMutation = useAdminResetPasswordMutation();

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setPassword("");
      setConfirm("");
      setError("");
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    const parsed = adminResetPasswordSchema.safeParse({
      password,
      confirmPassword: confirm,
    });

    if (!parsed.success) {
      setError(getZodErrorMessage(parsed.error));
      return;
    }

    try {
      await resetMutation.mutateAsync({
        userId,
        newPassword: parsed.data.password,
      });
      handleClose(false);
    } catch (err) {
      setError(getApiErrorMessage(err, "Reset mật khẩu thất bại"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reset mật khẩu</DialogTitle>
          <DialogDescription>
            Đặt mật khẩu mới cho <strong>{username}</strong>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Mật khẩu mới"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input
            label="Xác nhận mật khẩu"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={resetMutation.isPending}>
              {resetMutation.isPending ? (
                <Loader2 className="animate-spin" />
              ) : null}
              Xác nhận
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
