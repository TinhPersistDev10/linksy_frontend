import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).+$/;

export const PASSWORD_RULE_MESSAGE =
  "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ và số";

export const BIO_MAX_LENGTH = 500;

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

const emailField = z
  .string()
  .min(1, "Email là bắt buộc")
  .pipe(z.email("Email không hợp lệ"));

const usernameField = z
  .string()
  .min(1, "Tên người dùng là bắt buộc")
  .min(3, "Tên người dùng phải có ít nhất 3 ký tự")
  .max(50, "Tên người dùng không được quá 50 ký tự")
  .regex(
    /^[a-zA-Z0-9_]+$/,
    "Tên người dùng chỉ được chứa chữ, số và dấu gạch dưới",
  );

const fullnameField = z
  .string()
  .min(1, "Họ và tên là bắt buộc")
  .min(2, "Họ và tên phải có ít nhất 2 ký tự")
  .max(100, "Họ và tên không được quá 100 ký tự");

const optionalFullnameField = z
  .string()
  .max(100, "Họ và tên không được quá 100 ký tự")
  .refine(
    (value) => !value.trim() || value.trim().length >= 2,
    "Họ và tên phải có ít nhất 2 ký tự",
  );

const bioField = z
  .string()
  .max(BIO_MAX_LENGTH, `Giới thiệu không được quá ${BIO_MAX_LENGTH} ký tự`);

const passwordField = z
  .string()
  .min(1, "Mật khẩu là bắt buộc")
  .min(PASSWORD_MIN_LENGTH, PASSWORD_RULE_MESSAGE)
  .max(100, "Mật khẩu không được quá 100 ký tự")
  .regex(PASSWORD_PATTERN, PASSWORD_RULE_MESSAGE);

const confirmPasswordField = z.string().min(1, "Vui lòng xác nhận mật khẩu");

const otpField = z
  .string()
  .min(1, "Vui lòng nhập mã OTP")
  .regex(/^\d{6}$/, "Mã OTP phải gồm 6 chữ số");

const dateOfBirthField = z.string().refine((value) => {
  if (!value) return true;

  const birth = new Date(value);
  if (Number.isNaN(birth.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  birth.setHours(0, 0, 0, 0);

  const minAge = new Date(today);
  minAge.setFullYear(minAge.getFullYear() - 13);
  const maxAge = new Date(today);
  maxAge.setFullYear(maxAge.getFullYear() - 120);

  return birth <= today && birth <= minAge && birth >= maxAge;
}, "Ngày sinh không hợp lệ (phải từ 13 tuổi trở lên)");

export function getZodErrorMessage(
  error: z.ZodError,
  fallback = "Dữ liệu không hợp lệ",
): string {
  return error.issues[0]?.message ?? fallback;
}

export const loginSchema = z.object({
  emailOrUsername: z.string().min(1, "Email hoặc tên người dùng là bắt buộc"),
  password: z.string().min(1, "Mật khẩu là bắt buộc"),
});

export const registerSchema = z
  .object({
    fullname: fullnameField,
    username: usernameField,
    email: emailField,
    dateOfBirth: dateOfBirthField,
    password: passwordField,
    confirmPassword: confirmPasswordField,
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu xác nhận không khớp",
  });

export const forgotEmailSchema = z.object({
  email: emailField,
});

export const forgotResetSchema = z
  .object({
    otpCode: otpField,
    newPassword: passwordField,
    confirmPassword: confirmPasswordField,
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu xác nhận không khớp",
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
    newPassword: passwordField,
    confirmPassword: confirmPasswordField,
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu xác nhận không khớp",
  });

export const profileSchema = z.object({
  fullname: fullnameField,
  username: usernameField,
  bio: bioField,
  dateOfBirth: dateOfBirthField,
});

export const createAdminUserSchema = z.object({
  username: usernameField,
  email: emailField,
  password: passwordField,
  fullname: optionalFullnameField.optional(),
  bio: bioField.optional(),
  dateOfBirth: dateOfBirthField.optional(),
  isActive: z.boolean().optional(),
  isEmailVerified: z.boolean().optional(),
});

export const adminResetPasswordSchema = z
  .object({
    password: passwordField,
    confirmPassword: confirmPasswordField,
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu xác nhận không khớp",
  });

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type ForgotEmailFormData = z.infer<typeof forgotEmailSchema>;
export type ForgotResetFormData = z.infer<typeof forgotResetSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
export type CreateAdminUserFormData = z.infer<typeof createAdminUserSchema>;
export type AdminResetPasswordFormData = z.infer<
  typeof adminResetPasswordSchema
>;
