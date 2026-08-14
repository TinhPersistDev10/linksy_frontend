"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Camera,
  Loader2,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { usersApi } from "@/lib/api/users";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  AVATAR_MAX_BYTES,
  BIO_MAX_LENGTH,
  profileSchema,
  type ProfileFormData,
} from "@/lib/utils/validators";
import { zodResolver } from "@hookform/resolvers/zod";
import { cn } from "@/lib/utils/cn";
import AvatarViewer from "@/components/ui/AvatarViewer";

interface AccountInfoDialogProps {
  open: boolean;
  onClose: () => void;
}

function formatBirthDate(value?: string | null) {
  if (!value) return "Chưa cập nhật";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  return date.toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] items-start gap-x-3 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="break-words text-sm font-medium text-foreground [overflow-wrap:anywhere]">
        {value}
      </span>
    </div>
  );
}

export default function AccountInfoDialog({
  open,
  onClose,
}: AccountInfoDialogProps) {
  const { user, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarViewerOpen, setAvatarViewerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullname: "",
      username: "",
      bio: "",
      dateOfBirth: "",
    },
  });

  useEffect(() => {
    if (!open) {
      setEditing(false);
      setSuccess("");
      setError("");
      setAvatarPreview(null);
      setAvatarViewerOpen(false);
      return;
    }

    reset({
      fullname: user?.fullname || "",
      username: user?.username || "",
      bio: user?.bio || "",
      dateOfBirth: user?.dateOfBirth ? user.dateOfBirth.split("T")[0] : "",
    });
  }, [open, user, reset]);

  if (!open) return null;

  const displayName = user?.fullname || "Người dùng";
  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";
  const avatarSrc = avatarPreview || user?.avatar || "";

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
      await refreshUser();
      setSuccess("Cập nhật thông tin thành công!");
      setEditing(false);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || "Cập nhật thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > AVATAR_MAX_BYTES) {
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
      await refreshUser();
      setSuccess("Cập nhật ảnh đại diện thành công!");
    } catch {
      setError("Tải ảnh lên thất bại");
      setAvatarPreview(null);
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <article
        className="relative flex max-h-[min(92vh,720px)] w-full max-w-[420px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold text-foreground">
            Thông tin tài khoản
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col items-center px-6 pb-2 pt-8 text-center">
            <div className="relative">
              <button
                type="button"
                onClick={() => setAvatarViewerOpen(true)}
                className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-card bg-sky-600 shadow-md ring-1 ring-border transition hover:ring-sky-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                title="Xem ảnh đại diện"
                aria-label="Xem ảnh đại diện"
              >
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-white">{initials}</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarLoading}
                className="absolute bottom-0.5 right-0.5 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-md transition hover:bg-muted disabled:opacity-60"
                aria-label="Cập nhật ảnh đại diện"
              >
                {avatarLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Camera size={14} />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => void handleAvatarChange(e)}
                className="hidden"
              />
            </div>

            <div className="mt-4 flex items-center justify-center gap-1.5">
              <h3 className="text-xl font-semibold tracking-tight text-foreground">
                {displayName}
              </h3>
              {!editing && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  aria-label="Chỉnh sửa"
                >
                  <Pencil size={14} />
                </button>
              )}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              @{user?.username}
            </p>
          </div>

          <div className="px-6 pb-6">
            {(success || error) && (
              <div
                className={cn(
                  "mb-3 rounded-lg border px-3 py-2 text-sm",
                  success
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300",
                )}
              >
                {success || error}
              </div>
            )}

            {editing ? (
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-3 text-left"
              >
                <Input
                  label="Họ và tên"
                  placeholder="Nguyễn Văn A"
                  error={errors.fullname?.message}
                  {...register("fullname")}
                />
                <Input
                  label="Tên người dùng"
                  placeholder="username"
                  error={errors.username?.message}
                  {...register("username")}
                />
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Giới thiệu
                  </label>
                  <textarea
                    placeholder="Nói gì đó về bạn..."
                    maxLength={BIO_MAX_LENGTH}
                    className="min-h-[72px] w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    {...register("bio")}
                  />
                  {errors.bio?.message ? (
                    <p className="mt-1 text-xs text-red-500">{errors.bio.message}</p>
                  ) : null}
                </div>
                <Input
                  label="Ngày sinh"
                  type="date"
                  error={errors.dateOfBirth?.message}
                  {...register("dateOfBirth")}
                />

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    disabled={isLoading}
                    onClick={() => {
                      setEditing(false);
                      setError("");
                      setSuccess("");
                      reset({
                        fullname: user?.fullname || "",
                        username: user?.username || "",
                        bio: user?.bio || "",
                        dateOfBirth: user?.dateOfBirth
                          ? user.dateOfBirth.split("T")[0]
                          : "",
                      });
                    }}
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isLoading}
                    className="flex-1 gap-2"
                  >
                    <Save size={16} />
                    Lưu
                  </Button>
                </div>
              </form>
            ) : (
              <>
                <div className="mt-2 overflow-hidden rounded-xl border border-border bg-muted/30 px-4 py-2">
                  <p className="mb-1 text-sm font-semibold text-foreground">
                    Thông tin cá nhân
                  </p>
                  <InfoRow label="Họ và tên" value={displayName} />
                  <InfoRow
                    label="Tên người dùng"
                    value={user?.username ? `@${user.username}` : "Chưa cập nhật"}
                  />
                  <InfoRow
                    label="Email"
                    value={user?.email || "Chưa cập nhật"}
                  />
                  {user?.email && user.isEmailVerified ? (
                    <p className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 pb-1 text-xs text-emerald-600 dark:text-emerald-400">
                      <span />
                      <span>Đã xác thực</span>
                    </p>
                  ) : null}
                  <InfoRow
                    label="Ngày sinh"
                    value={formatBirthDate(user?.dateOfBirth)}
                  />
                  <InfoRow
                    label="Giới thiệu"
                    value={user?.bio?.trim() || "Chưa cập nhật"}
                  />
                </div>

                <div className="mt-5 flex justify-center">
                  <Button
                    type="button"
                    variant="primary"
                    className="min-w-40 gap-2"
                    onClick={() => setEditing(true)}
                  >
                    <Pencil size={16} />
                    Cập nhật
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </article>

      <AvatarViewer
        open={avatarViewerOpen}
        src={avatarSrc || user?.avatar}
        name={displayName}
        onClose={() => setAvatarViewerOpen(false)}
      />
    </div>
  );
}
