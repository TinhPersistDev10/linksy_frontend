"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { usersApi } from "@/lib/api/users";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  PASSWORD_RULE_MESSAGE,
  changePasswordSchema,
  type ChangePasswordFormData,
} from "@/lib/utils/validators";
import { cn } from "@/lib/utils/cn";

export default function PasswordSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  });
  const newPassword = watch("newPassword");

  const onSubmit = async (data: ChangePasswordFormData) => {
    try {
      setIsLoading(true);
      setError("");
      setSuccess("");

      await usersApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      setSuccess("Đổi mật khẩu thành công!");
      reset();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || "Đổi mật khẩu thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    if (!password) return { level: 0, label: "", color: "" };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    if (score <= 1) return { level: 1, label: "Yếu", color: "bg-red-500" };
    if (score === 2) return { level: 2, label: "Trung bình", color: "bg-yellow-500" };
    if (score === 3) return { level: 3, label: "Mạnh", color: "bg-blue-500" };
    return { level: 4, label: "Rất mạnh", color: "bg-green-500" };
  };

  const strength = getPasswordStrength(newPassword || "");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Đổi mật khẩu</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Bảo vệ tài khoản bằng mật khẩu mạnh
        </p>
      </div>

      <div className="flex gap-3 rounded-xl border border-sky-500/20 bg-sky-500/10 p-4 dark:border-sky-400/20 dark:bg-sky-500/10">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/15 text-sky-700 dark:text-sky-300">
          <ShieldCheck size={18} />
        </div>
        <div className="min-w-0 text-sm">
          <p className="font-medium text-sky-800 dark:text-sky-200">Mẹo bảo mật</p>
          <p className="mt-1 text-muted-foreground">
            {PASSWORD_RULE_MESSAGE}. Không dùng mật khẩu đã dùng ở nơi khác.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {success && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
            {success}
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="relative">
          <Input
            label="Mật khẩu hiện tại"
            type={showCurrent ? "text" : "password"}
            placeholder="********"
            error={errors.currentPassword?.message}
            {...register("currentPassword")}
          />
          <button
            type="button"
            onClick={() => setShowCurrent(!showCurrent)}
            className="absolute right-3 top-9 text-muted-foreground hover:text-foreground"
          >
            {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <div className="border-t border-border" />

        <div className="relative">
          <Input
            label="Mật khẩu mới"
            type={showNew ? "text" : "password"}
            placeholder="********"
            error={errors.newPassword?.message}
            {...register("newPassword")}
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="absolute right-3 top-9 text-muted-foreground hover:text-foreground"
          >
            {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {newPassword && (
          <div className="space-y-1.5">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    i <= strength.level ? strength.color : "bg-muted",
                  )}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Độ mạnh: <span className="font-medium text-foreground">{strength.label}</span>
            </p>
          </div>
        )}

        <div className="relative">
          <Input
            label="Xác nhận mật khẩu mới"
            type={showConfirm ? "text" : "password"}
            placeholder="********"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-9 text-muted-foreground hover:text-foreground"
          >
            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <div className="pt-2">
          <Button type="submit" variant="primary" isLoading={isLoading} className="gap-2">
            <Lock size={16} />
            Đổi mật khẩu
          </Button>
        </div>
      </form>
    </div>
  );
}
