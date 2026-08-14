"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { zodResolver } from "@hookform/resolvers/zod";
import { type RegisterFormData, registerSchema } from "@/lib/utils/validators";
import { Eye, EyeOff } from "lucide-react";
import { LinksyLogo } from "../brand/LinksyLogo";
import { extractErrorMessage } from "@/lib/utils/extractErrorMessage";
import axios from "axios";

type FieldErrors = Partial<Record<"email" | "username", string>>;

function parseRegisterFieldErrors(err: unknown): FieldErrors {
  if (!axios.isAxiosError(err)) return {};
  const errors = err.response?.data?.errors;
  if (!errors || typeof errors !== "object") return {};

  const result: FieldErrors = {};
  const record = errors as Record<string, unknown>;
  if (typeof record.email === "string" && record.email.trim()) {
    result.email = record.email;
  }
  if (typeof record.username === "string" && record.username.trim()) {
    result.username = record.username;
  }
  return result;
}

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
    setError: setFieldError,
    clearErrors,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });
  const onSubmit = async (data: RegisterFormData) => {
    try {
      setIsLoading(true);
      setError("");
      clearErrors(["email", "username"]);

      const result = await registerUser({
        ...data,
        dateOfBirth: data.dateOfBirth || undefined,
      });
      router.push(`/verify-email?email=${encodeURIComponent(result.email)}`);
    } catch (err: unknown) {
      const fieldErrors = parseRegisterFieldErrors(err);
      if (fieldErrors.email) {
        setFieldError("email", { type: "server", message: fieldErrors.email });
      }
      if (fieldErrors.username) {
        setFieldError("username", {
          type: "server",
          message: fieldErrors.username,
        });
      }

      const message = extractErrorMessage(err, "Đăng ký thất bại. Vui lòng thử lại.");
      // Banner when both conflict, or generic non-field errors
      if (fieldErrors.email && fieldErrors.username) {
        setError("Email và Username đã tồn tại");
      } else if (!fieldErrors.email && !fieldErrors.username) {
        setError(message);
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-xl bg-white p-8 text-gray-900 shadow-lg [&_input]:bg-white [&_input]:text-gray-900 [&_input]:caret-gray-900 [&_input]:placeholder:text-gray-400">
      <div className="text-center mb-8">
        <div className="mb-4 flex justify-center">
          <LinksyLogo size={48} />
        </div>

        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Tạo tài khoản mới
        </h1>
        <p className="text-gray-600">
          Tham gia Linksy để kết nối với mọi người
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <Input
          label="Họ và tên"
          type="text"
          placeholder="Nguyễn Văn A"
          error={errors.fullname?.message}
          {...register("fullname")}
        />

        <Input
          label="Tên người dùng"
          type="text"
          placeholder="username"
          error={errors.username?.message}
          {...register("username")}
        />

        <Input
          label="Email"
          type="email"
          placeholder="example@email.com"
          error={errors.email?.message}
          {...register("email")}
        />

        <Input
          label="Ngày sinh (không bắt buộc)"
          type="date"
          error={errors.dateOfBirth?.message}
          {...register("dateOfBirth")}
        />

        <div className="relative">
          <Input
            label="Mật khẩu"
            type={showPassword ? "text" : "password"}
            placeholder="Ít nhất 8 ký tự, có chữ và số"
            error={errors.password?.message}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <div className="relative">
          <Input
            label="Xác nhận mật khẩu"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="••••••••"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
          >
            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

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

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isLoading}
          className="w-full"
        >
          Đăng ký
        </Button>

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
