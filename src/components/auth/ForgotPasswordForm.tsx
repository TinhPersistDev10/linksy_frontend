"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, KeyRound, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { authApi } from "@/lib/api/auth";
import { Button } from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { matchPassword, validators } from "@/lib/utils/validators";

type Step = "email" | "reset";

interface EmailFormData {
  email: string;
}

interface ResetFormData {
  otpCode: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ForgotPasswordForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const emailForm = useForm<EmailFormData>();
  const resetForm = useForm<ResetFormData>();
  const newPassword = resetForm.watch("newPassword");

  const getApiErrorMessage = (err: unknown, fallback: string) => {
    const error = err as {
      response?: {
        data?: {
          message?: string;
          errors?: Record<string, string[]>;
        };
      };
      message?: string;
    };

    const validationErrors = error.response?.data?.errors;
    const firstValidationError = validationErrors
      ? Object.values(validationErrors).flat()[0]
      : undefined;

    return (
      firstValidationError ||
      error.response?.data?.message ||
      error.message ||
      fallback
    );
  };

  const submitEmail = async (data: EmailFormData) => {
    try {
      setIsLoading(true);
      setError("");
      setMessage("");

      const response = await authApi.forgotPassword({
        email: data.email,
      });

      setEmail(data.email);
      setMessage(response.message || "Mã OTP đã được gửi đến email của bạn");
      setStep("reset");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Không thể gửi mã OTP"));
    } finally {
      setIsLoading(false);
    }
  };

  const submitReset = async (data: ResetFormData) => {
    try {
      setIsLoading(true);
      setError("");
      setMessage("");

      const response = await authApi.resetPassword({
        email,
        otpCode: data.otpCode,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });

      setMessage(response.message || "Đặt lại mật khẩu thành công");
      router.push("/login");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Không thể đặt lại mật khẩu"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!email) return;

    try {
      setIsLoading(true);
      setError("");
      setMessage("");

      const response = await authApi.resendOtp({
        email,
        purpose: "password_reset",
      });

      setMessage(response.message || "Mã OTP mới đã được gửi");
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Không thể gửi lại mã OTP"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
      <div className="mb-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full bg-blue-100 p-3">
            {step === "email" ? (
              <Mail className="text-blue-600" size={40} />
            ) : (
              <KeyRound className="text-blue-600" size={40} />
            )}
          </div>
        </div>

        <h1 className="mb-2 text-3xl font-bold text-gray-800">
          Quên mật khẩu
        </h1>
        <p className="text-gray-600">
          {step === "email"
            ? "Nhập email để nhận mã OTP đặt lại mật khẩu"
            : `Nhập mã OTP đã gửi đến ${email}`}
        </p>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {step === "email" ? (
        <form onSubmit={emailForm.handleSubmit(submitEmail)} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="example@email.com"
            error={emailForm.formState.errors.email?.message}
            {...emailForm.register("email", validators.email)}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full"
          >
            Gửi mã OTP
          </Button>

          <div className="text-center text-sm text-gray-600">
            Nhớ mật khẩu?{" "}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
              Đăng nhập
            </Link>
          </div>
        </form>
      ) : (
        <form onSubmit={resetForm.handleSubmit(submitReset)} className="space-y-4">
          <Input
            label="Mã OTP"
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            error={resetForm.formState.errors.otpCode?.message}
            {...resetForm.register("otpCode", validators.otp)}
          />

          <div className="relative">
            <Input
              label="Mật khẩu mới"
              type={showNewPassword ? "text" : "password"}
              placeholder="********"
              error={resetForm.formState.errors.newPassword?.message}
              {...resetForm.register("newPassword", validators.password)}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword((value) => !value)}
              className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
              aria-label={showNewPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="relative">
            <Input
              label="Xác nhận mật khẩu mới"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="********"
              error={resetForm.formState.errors.confirmPassword?.message}
              {...resetForm.register("confirmPassword", {
                required: "Vui lòng xác nhận mật khẩu",
                validate: matchPassword(newPassword),
              })}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((value) => !value)}
              className="absolute right-3 top-9 text-gray-500 hover:text-gray-700"
              aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full"
          >
            Đặt lại mật khẩu
          </Button>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => setStep("email")}
              className="text-gray-600 hover:text-gray-800"
            >
              Đổi email
            </button>

            <button
              type="button"
              onClick={handleResendOtp}
              disabled={isLoading}
              className="font-medium text-blue-600 hover:text-blue-700 disabled:opacity-60"
            >
              Gửi lại OTP
            </button>
          </div>

          <div className="text-center text-sm text-gray-600">
            Nhớ mật khẩu?{" "}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
              Đăng nhập
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}