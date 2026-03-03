// components/auth/LoginForm.tsx

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { LoginRequest } from "@/lib/types/auth";
import { Eye, EyeOff, MessageCircle } from "lucide-react";

export default function LoginForm() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [justVerified, setJustVerified] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>();

  const onSubmit = async (data: LoginRequest) => {
    try {
      setIsLoading(true);
      setError("");
      await login(data);
    } catch (err: any) {
      setError(err.message || "Đăng nhập thất bại. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-8 bg-white rounded-xl shadow-lg">
      {/* Logo và Title */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-blue-100 rounded-full">
            <MessageCircle className="text-blue-600" size={40} />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Chào mừng trở lại!
        </h1>
        <p className="text-gray-600">
          Đăng nhập vào Linksy để tiếp tục trò chuyện
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Email or Username Input */}
        <Input
          label="Email hoặc Tên người dùng"
          type="text"
          placeholder="example@email.com hoặc username"
          error={errors.emailOrUsername?.message}
          {...register("emailOrUsername", {
            required: "Email hoặc tên người dùng là bắt buộc",
          })}
        />

        {/* Password Input */}
        <div className="relative">
          <Input
            label="Mật khẩu"
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            error={errors.password?.message}
            {...register("password", {
              required: "Mật khẩu là bắt buộc",
            })}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {/* Remember & Forgot Password */}
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center cursor-pointer">
            <input type="checkbox" className="mr-2 w-4 h-4" />
            <span className="text-gray-600">Ghi nhớ đăng nhập</span>
          </label>
          <Link
            href="/forgot-password"
            className="text-blue-600 hover:text-blue-700"
          >
            Quên mật khẩu?
          </Link>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isLoading}
          className="w-full"
        >
          Đăng nhập
        </Button>

        {/* Register Link */}
        <div className="text-center text-sm text-gray-600">
          Chưa có tài khoản?{" "}
          <Link
            href="/register"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Đăng ký ngay
          </Link>
        </div>
      </form>
    </div>
  );
}
