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
import { Switch } from "@/components/ui/switch";
import { useCreateAdminUserMutation } from "@/lib/hooks/useAdminQueries";
import type { CreateAdminUserRequest } from "@/lib/types/admin";
import { getApiErrorMessage } from "@/lib/utils/admin-errors";

interface CreateAdminUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

const initialForm: CreateAdminUserRequest = {
  username: "",
  email: "",
  password: "",
  fullname: "",
  bio: "",
  dateOfBirth: "",
  isActive: true,
  isEmailVerified: true,
};

export function CreateAdminUserDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateAdminUserDialogProps) {
  const [form, setForm] = useState<CreateAdminUserRequest>(initialForm);
  const [error, setError] = useState("");
  const createMutation = useCreateAdminUserMutation();

  const resetForm = () => {
    setForm(initialForm);
    setError("");
  };

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!form.username.trim() || !form.email.trim() || !form.password.trim()) {
      setError("Username, email và mật khẩu là bắt buộc.");
      return;
    }

    if (form.password.length < 6) {
      setError("Mật khẩu tối thiểu 6 ký tự.");
      return;
    }

    try {
      await createMutation.mutateAsync({
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        fullname: form.fullname?.trim() || undefined,
        bio: form.bio?.trim() || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        isActive: form.isActive ?? true,
        isEmailVerified: form.isEmailVerified ?? true,
      });
      onCreated?.();
      handleClose(false);
    } catch (err) {
      setError(getApiErrorMessage(err, "Tạo user thất bại"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tạo người dùng</DialogTitle>
          <DialogDescription>
            Tạo tài khoản mới từ Admin Console.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <Input
            label="Mật khẩu"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <Input
            label="Họ tên"
            value={form.fullname ?? ""}
            onChange={(e) => setForm({ ...form, fullname: e.target.value })}
          />
          <Input
            label="Ngày sinh"
            type="date"
            value={form.dateOfBirth ?? ""}
            onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
          />

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Kích hoạt</p>
              <p className="text-xs text-muted-foreground">User có thể đăng nhập</p>
            </div>
            <Switch
              checked={form.isActive ?? true}
              onCheckedChange={(checked) =>
                setForm({ ...form, isActive: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium">Email đã xác thực</p>
              <p className="text-xs text-muted-foreground">
                Bỏ qua bước verify OTP
              </p>
            </div>
            <Switch
              checked={form.isEmailVerified ?? true}
              onCheckedChange={(checked) =>
                setForm({ ...form, isEmailVerified: checked })
              }
            />
          </div>

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
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <Loader2 className="animate-spin" />
              ) : null}
              Tạo user
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
