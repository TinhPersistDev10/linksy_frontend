"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Camera, Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { usersApi } from "@/lib/api/users";
import { useAuth } from "@/lib/hooks/useAuth";

interface ProfileFormData {
  fullname: string;
  username: string;
  bio: string;
  dateOfBirth: string;
}

export default function ProfileSettings() {
  const { user, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    defaultValues: {
      fullname: user?.fullname || "",
      username: user?.username || "",
      bio: user?.bio || "",
      dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.split("T")[0] : "",
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setIsLoading(true);
      setError("");
      setSuccess("");

      await usersApi.updateProfile({
        fullname: data.fullname.trim(),
        username: data.username.trim(),
        bio: data.bio.trim(),
        dateOfBirth: data.dateOfBirth || undefined,
      });

      setSuccess("Cập nhật thông tin thành công!");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || "Cập nhật thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Ảnh đại diện không được vượt quá 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    try {
      setAvatarLoading(true);
      setError("");
      await usersApi.updateAvatar(file);
      setSuccess("Cập nhật ảnh đại diện thành công!");
    } catch {
      setError("Tải ảnh lên thất bại");
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      setAvatarLoading(true);
      setError("");
      await usersApi.deleteAvatar();
      setAvatarPreview(null);
      await refreshUser();
      setSuccess("Xóa ảnh đại diện thành công!");
    } catch {
      setError("Xóa ảnh đại diện thất bại");
    } finally {
      setAvatarLoading(false);
    }
  };

  const avatarSrc = avatarPreview || user?.avatar || "";
  const initials =
    user?.fullname
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Thông tin cá nhân</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cập nhật ảnh đại diện và thông tin cá nhân của bạn
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-primary/10">
            {avatarSrc ? (
              <img src={avatarSrc} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-primary">{initials}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarLoading}
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Cập nhật ảnh đại diện"
          >
            {avatarLoading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>
        <div>
          <p className="font-medium">{user?.fullname}</p>
          <p className="text-sm text-muted-foreground">@{user?.username}</p>
          <p className="mt-1 text-xs text-muted-foreground">JPG, PNG tối đa 5MB</p>
        </div>
      </div>

      <div className="border-t" />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {success}
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Họ và tên"
            placeholder="Nguyễn Văn A"
            error={errors.fullname?.message}
            {...register("fullname", { required: "Họ và tên là bắt buộc" })}
          />
          <Input
            label="Tên người dùng"
            placeholder="username"
            error={errors.username?.message}
            {...register("username", {
              required: "Tên người dùng là bắt buộc",
              pattern: {
                value: /^[a-zA-Z0-9_]+$/,
                message: "Chỉ được dùng chữ, số và dấu _",
              },
            })}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Giới thiệu bản thân
          </label>
          <textarea
            placeholder="Nói gì đó về bạn..."
            className="min-h-[80px] w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            {...register("bio")}
          />
        </div>

        <Input label="Ngày sinh" type="date" {...register("dateOfBirth")} />

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
          <div className="flex items-center gap-2">
            <input
              type="email"
              value={user?.email || ""}
              readOnly
              className="h-9 flex-1 cursor-not-allowed rounded-md border border-input bg-muted/50 px-3 py-1 text-sm text-muted-foreground"
            />
            {user?.isEmailVerified && (
              <span className="whitespace-nowrap rounded-md border border-green-200 bg-green-50 px-2 py-1 text-xs text-green-600">
                Đã xác thực
              </span>
            )}
          </div>
        </div>

        <div className="pt-2">
          <Button type="submit" variant="primary" isLoading={isLoading} className="gap-2">
            <Save size={16} />
            Lưu thay đổi
          </Button>
        </div>
      </form>
    </div>
  );
}
