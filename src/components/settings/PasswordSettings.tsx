"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { usersApi } from "@/lib/api/users";

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

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
  } = useForm<PasswordFormData>();
  const newPassword = watch("newPassword");

  const onSubmit = async (data: PasswordFormData) => {
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

      <div className="flex gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4">
        <ShieldCheck size={20} className="mt-0.5 shrink-0 text-blue-500" />
        <div className="text-sm text-blue-700">
          <p className="font-medium">Mẹo bảo mật</p>
          <p className="mt-0.5 text-blue-600">
            Sử dụng ít nhất 8 ký tự, kết hợp chữ hoa, số và ký tự đặc biệt
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {success && <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div>}
        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="relative">
          <Input
            label="Mật khẩu hiện tại"
            type={showCurrent ? "text" : "password"}
            placeholder="********"
            error={errors.currentPassword?.message}
            {...register("currentPassword", { required: "Vui lòng nhập mật khẩu hiện tại" })}
          />
          <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-9 text-gray-500 hover:text-gray-700">
            {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <div className="border-t" />

        <div className="relative">
          <Input
            label="Mật khẩu mới"
            type={showNew ? "text" : "password"}
            placeholder="********"
            error={errors.newPassword?.message}
            {...register("newPassword", {
              required: "Vui lòng nhập mật khẩu mới",
              minLength: { value: 6, message: "Ít nhất 6 ký tự" },
            })}
          />
          <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-9 text-gray-500 hover:text-gray-700">
            {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {newPassword && (
          <div className="space-y-1.5">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= strength.level ? strength.color : "bg-gray-200"}`} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Độ mạnh: <span className="font-medium">{strength.label}</span>
            </p>
          </div>
        )}

        <div className="relative">
          <Input
            label="Xác nhận mật khẩu mới"
            type={showConfirm ? "text" : "password"}
            placeholder="********"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword", {
              required: "Vui lòng xác nhận mật khẩu",
              validate: (value) => value === newPassword || "Mật khẩu không khớp",
            })}
          />
          <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-9 text-gray-500 hover:text-gray-700">
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
