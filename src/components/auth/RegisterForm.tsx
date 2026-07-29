"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { RegisterRequest } from "@/lib/types/auth";
import { matchPassword, validators } from "@/lib/utils/validators";
import { Eye, EyeOff, MessageCircle } from "lucide-react";

export default function RegisterForm() {
  const { register: registerUser } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterRequest>();

  const password = watch("password");

  const onSubmit = async (data: RegisterRequest) => {
    try {
      setIsLoading(true);
      setError("");

      const result = await registerUser(data);

      console.log("Register result:", result); // Thêm dòng này
      console.log(
        "Redirecting to:",
        `/verify-email?email=${encodeURIComponent(result.email)}`,
      );
      router.push(`/verify-email?email=${encodeURIComponent(result.email)}`);
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : "Đăng ký thất bại. Vui lòng thử lại."));
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
          Tạo tài khoản mới
        </h1>
        <p className="text-gray-600">
          Tham gia Linksy để kết nối với mọi người
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Họ và tên */}
        <Input
          label="Họ và tên"
          type="text"
          placeholder="Nguyễn Văn A"
          error={errors.fullname?.message}
          {...register("fullname", validators.fullname)}
        />

        {/* Tên người dùng */}
        <Input
          label="Tên người dùng"
          type="text"
          placeholder="username"
          error={errors.username?.message}
          {...register("username", validators.username)}
        />

        {/* Email */}
        <Input
          label="Email"
          type="email"
          placeholder="example@email.com"
          error={errors.email?.message}
          {...register("email", validators.email)}
        />

        {/* Ngày sinh */}
        <Input
          label="Ngày sinh (không bắt buộc)"
          type="date"
          error={errors.dateOfBirth?.message}
          {...register("dateOfBirth", validators.dateOfBirth)}
        />

        {/* Mật khẩu */}
        <div className="relative">
          <Input
            label="Mật khẩu"
            type={showPassword ? "text" : "password"}
            placeholder="Ít nhất 8 ký tự, có chữ và số"
            error={errors.password?.message}
            {...register("password", validators.password)}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {/* Xác nhận mật khẩu */}
        <div className="relative">
          <Input
            label="Xác nhận mật khẩu"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="••••••••"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword", {
              required: "Vui lòng xác nhận mật khẩu",
              validate: matchPassword(password),
            })}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
          >
            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {/* Terms */}
        <div className="text-xs text-gray-600">
          Bằng cách đăng ký, bạn đồng ý với{" "}
          <Link href="/terms" className="text-blue-600 hover:text-blue-700">
            Điều khoản sử dụng
          </Link>{" "}
          và{" "}
          <Link href="/privacy" className="text-blue-600 hover:text-blue-700">
            Chính sách bảo mật
          </Link>{" "}
          của chúng tôi.
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isLoading}
          className="w-full"
        >
          Đăng ký
        </Button>

        {/* Login Link */}
        <div className="text-center text-sm text-gray-600">
          Đã có tài khoản?{" "}
          <Link
            href="/login"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Đăng nhập
          </Link>
        </div>
      </form>
    </div>
  );
}
