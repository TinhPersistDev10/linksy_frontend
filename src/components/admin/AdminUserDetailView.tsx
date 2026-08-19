"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, Loader2, Save, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ResetPasswordDialog } from "@/components/admin/ResetPasswordDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useAdminRolesQuery,
  useAdminUserQuery,
  useApplyModerationMutation,
  useAssignAdminRoleMutation,
  useDeleteAdminUserMutation,
  useRemoveAdminRoleMutation,
  useToggleAdminUserStatusMutation,
  useUpdateAdminUserMutation,
} from "@/lib/hooks/useAdminQueries";
import type { UpdateAdminUserRequest } from "@/lib/types/admin";
import {
  MODERATION_DURATION_DEFAULTS,
  MODERATION_LEVEL_LABELS,
  type ModerationLevel,
} from "@/lib/types/report";
import { formatAdminDate, getApiErrorMessage } from "@/lib/utils/admin-errors";
import { useAuth } from "@/lib/hooks/useAuth";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export function AdminUserDetailView() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;
  const router = useRouter();
  const { user: currentUser } = useAuth();

  const userQuery = useAdminUserQuery(userId);
  const rolesQuery = useAdminRolesQuery();
  const updateMutation = useUpdateAdminUserMutation();
  const toggleMutation = useToggleAdminUserStatusMutation();
  const deleteMutation = useDeleteAdminUserMutation();
  const assignRoleMutation = useAssignAdminRoleMutation();
  const removeRoleMutation = useRemoveAdminRoleMutation();
  const moderationMutation = useApplyModerationMutation();

  const [form, setForm] = useState<UpdateAdminUserRequest>({});
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toggleConfirmOpen, setToggleConfirmOpen] = useState(false);
  const [moderationConfirmOpen, setModerationConfirmOpen] = useState(false);
  const [confirmRemoveRoleId, setConfirmRemoveRoleId] = useState<
    number | null
  >(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState<number | "">("");
  const [modLevel, setModLevel] = useState<ModerationLevel>("none");
  const [modReason, setModReason] = useState("");
  const [modDays, setModDays] = useState(7);

  const detail = userQuery.data;
  const isSelf = currentUser?.userId === userId;

  useEffect(() => {
    if (!detail) return;
    setForm({
      username: detail.username,
      email: detail.email,
      fullname: detail.fullname ?? "",
      bio: detail.bio ?? "",
      dateOfBirth: detail.dateOfBirth?.split("T")[0] ?? "",
      isActive: detail.isActive,
      isEmailVerified: detail.isEmailVerified,
    });
    setModLevel((detail.moderationLevel as ModerationLevel) || "none");
    setModReason(detail.moderationReason ?? "");
    const def =
      MODERATION_DURATION_DEFAULTS[detail.moderationLevel ?? ""] ?? 7;
    setModDays(def);
  }, [detail]);

  const handleApplyModeration = async () => {
    if (isSelf) return;
    setError("");
    setMessage("");
    try {
      await moderationMutation.mutateAsync({
        userId,
        payload: {
          level: modLevel,
          reason: modReason.trim() || undefined,
          durationDays:
            modLevel === "restricted" || modLevel === "temporary_lock"
              ? modDays
              : undefined,
          incrementStrike: modLevel !== "none",
        },
      });
      setModerationConfirmOpen(false);
      setMessage(
        modLevel === "none"
          ? "Đã gỡ hạn chế moderation."
          : `Đã áp dụng: ${MODERATION_LEVEL_LABELS[modLevel]}`,
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "Áp dụng moderation thất bại"));
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      await updateMutation.mutateAsync({ userId, payload: form });
      setMessage("Đã cập nhật user.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Cập nhật thất bại"));
    }
  };

  const handleToggle = async () => {
    setError("");
    setMessage("");
    if (isSelf) {
      setError("Không thể thay đổi trạng thái tài khoản của chính bạn.");
      return;
    }

    try {
      await toggleMutation.mutateAsync(userId);
      setToggleConfirmOpen(false);
      setMessage("Đã thay đổi trạng thái user.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Thao tác thất bại"));
    }
  };

  const handleDelete = async () => {
    setError("");
    if (isSelf) {
      setError("Không thể xóa tài khoản của chính bạn.");
      return;
    }

    try {
      await deleteMutation.mutateAsync(userId);
      setDeleteOpen(false);
      router.push("/admin/users");
    } catch (err) {
      setError(getApiErrorMessage(err, "Xóa user thất bại"));
    }
  };

  const handleAssignRole = async () => {
    if (selectedRoleId === "") return;
    setError("");
    setMessage("");

    try {
      await assignRoleMutation.mutateAsync({ userId, roleId: selectedRoleId });
      setMessage("Đã gán role.");
      setSelectedRoleId("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Gán role thất bại"));
    }
  };

  const handleRemoveRole = async (roleId: number) => {
    setError("");
    setMessage("");
    if (isSelf) {
      setError("Không thể gỡ role của chính bạn.");
      return;
    }

    try {
      await removeRoleMutation.mutateAsync({ userId, roleId });
      setConfirmRemoveRoleId(null);
      setMessage("Đã gỡ role.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Gỡ role thất bại"));
    }
  };

  if (userQuery.isLoading) {
    return (
      <AdminShell title="Chi tiết user">
        <Skeleton className="h-40 w-full" />
      </AdminShell>
    );
  }

  if (!detail) {
    return (
      <AdminShell title="Chi tiết user">
        <p className="text-sm text-muted-foreground">Không tìm thấy user.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/admin/users">Quay lại danh sách</Link>
        </Button>
      </AdminShell>
    );
  }

  const assignedRoleIds = new Set((detail.roles ?? []).map((r) => r.roleId));
  const availableRoles =
    rolesQuery.data?.filter((role) => !assignedRoleIds.has(role.roleId)) ?? [];

  return (
    <AdminShell title="Chi tiết user">
      <div className="mx-auto max-w-3xl space-y-6">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/users">
            <ArrowLeft />
            Danh sách user
          </Link>
        </Button>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">
                {detail.fullname || detail.username}
              </h2>
              <p className="text-sm text-muted-foreground">
                @{detail.username} · {detail.email}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={detail.isActive ? "default" : "destructive"}>
                {detail.isActive ? "Active" : "Inactive"}
              </Badge>
              {(detail.roles ?? []).map((role) => (
                <Badge key={role.roleId} variant="secondary">
                  {role.roleName}
                </Badge>
              ))}
            </div>
          </div>

          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Tạo lúc</dt>
              <dd>{formatAdminDate(detail.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Đăng nhập cuối</dt>
              <dd>{formatAdminDate(detail.lastLoginAt)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Tin nhắn</dt>
              <dd>{detail.messageCount}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Bạn bè</dt>
              <dd>{detail.friendCount}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Sai mật khẩu</dt>
              <dd>{detail.failedLoginAttempts}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Khóa đến</dt>
              <dd>{formatAdminDate(detail.accountLockedUntil)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Moderation</dt>
              <dd>
                {MODERATION_LEVEL_LABELS[detail.moderationLevel ?? "none"] ??
                  detail.moderationLevel}
                {detail.isFlaggedForReview ? " · Ưu tiên review" : ""}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Điểm vi phạm</dt>
              <dd>{detail.violationPoints ?? 0}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Hết hạn moderation</dt>
              <dd>{formatAdminDate(detail.moderationExpiresAt)}</dd>
            </div>
          </dl>
        </div>

        <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="font-medium">Xử lý vi phạm (hybrid)</h3>
          <p className="text-xs text-muted-foreground">
            Cảnh báo → hạn chế → khóa tạm → khóa vĩnh viễn. Không khóa tự động
            chỉ vì nhiều báo cáo.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Mức xử lý
              </label>
              <select
                value={modLevel}
                disabled={isSelf}
                onChange={(e) => {
                  const next = e.target.value as ModerationLevel;
                  setModLevel(next);
                  const def = MODERATION_DURATION_DEFAULTS[next];
                  if (def) setModDays(def);
                }}
                className="h-10 w-full rounded-lg border bg-transparent px-3 text-sm"
              >
                {(
                  Object.keys(MODERATION_LEVEL_LABELS) as ModerationLevel[]
                ).map((key) => (
                  <option key={key} value={key}>
                    {MODERATION_LEVEL_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>
            {(modLevel === "restricted" || modLevel === "temporary_lock") && (
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Số ngày
                </label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={String(modDays)}
                  disabled={isSelf}
                  onChange={(e) =>
                    setModDays(
                      Math.min(365, Math.max(1, Number(e.target.value) || 1)),
                    )
                  }
                />
              </div>
            )}
          </div>
          <Input
            label="Lý do (hiển thị cho user)"
            value={modReason}
            disabled={isSelf}
            onChange={(e) => setModReason(e.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            disabled={isSelf || moderationMutation.isPending}
            onClick={() => setModerationConfirmOpen(true)}
          >
            {moderationMutation.isPending ? (
              <Loader2 className="animate-spin" />
            ) : null}
            Áp dụng moderation
          </Button>
        </div>

        <form
          onSubmit={handleSave}
          className="space-y-4 rounded-xl border bg-card p-4 shadow-sm"
        >
          <h3 className="font-medium">Chỉnh sửa thông tin</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Username"
              value={form.username ?? ""}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
            <Input
              label="Email"
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
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
              onChange={(e) =>
                setForm({ ...form, dateOfBirth: e.target.value })
              }
            />
          </div>
          <Input
            label="Bio"
            value={form.bio ?? ""}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm font-medium">Active</span>
              <Switch
                checked={form.isActive ?? false}
                disabled={isSelf}
                onCheckedChange={(checked) =>
                  setForm({ ...form, isActive: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm font-medium">Email verified</span>
              <Switch
                checked={form.isEmailVerified ?? false}
                onCheckedChange={(checked) =>
                  setForm({ ...form, isEmailVerified: checked })
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Save />
              )}
              Lưu thay đổi
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSelf || toggleMutation.isPending}
              onClick={() => setToggleConfirmOpen(true)}
            >
              {detail.isActive ? "Khóa user" : "Mở khóa user"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setResetOpen(true)}
            >
              <KeyRound />
              Reset mật khẩu
            </Button>
          </div>
        </form>

        <div className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
          <h3 className="font-medium">Roles</h3>
          <div className="flex flex-wrap gap-2">
            {(detail.roles ?? []).map((role) => (
              <div key={role.roleId} className="flex items-center gap-2">
                <Badge variant="secondary">{role.roleName}</Badge>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isSelf || removeRoleMutation.isPending}
                  onClick={() => setConfirmRemoveRoleId(role.roleId)}
                >
                  Gỡ
                </Button>
              </div>
            ))}
          </div>

          {availableRoles.length > 0 ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="flex-1 text-sm">
                <span className="mb-1 block font-medium">Gán role</span>
                <select
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                  value={selectedRoleId}
                  onChange={(e) =>
                    setSelectedRoleId(
                      e.target.value ? Number(e.target.value) : "",
                    )
                  }
                >
                  <option value="">Chọn role...</option>
                  {availableRoles.map((role) => (
                    <option key={role.roleId} value={role.roleId}>
                      {role.roleName}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                type="button"
                variant="outline"
                disabled={
                  selectedRoleId === "" || assignRoleMutation.isPending
                }
                onClick={handleAssignRole}
              >
                Gán
              </Button>
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-destructive/30 bg-card p-4 shadow-sm">
          <h3 className="font-medium text-destructive">Vùng nguy hiểm</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Ưu tiên khóa user thay vì xóa. Xóa sẽ gỡ toàn bộ dữ liệu liên quan.
          </p>
          <Button
            type="button"
            variant="destructive"
            className="mt-3"
            disabled={isSelf || deleteMutation.isPending}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 />
            Xóa vĩnh viễn
          </Button>
        </div>

        {message ? <p className="text-sm text-green-600">{message}</p> : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      <ResetPasswordDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        userId={userId}
        username={detail.username}
      />

      <ConfirmDialog
        open={toggleConfirmOpen}
        onOpenChange={(open) => {
          if (!open && !toggleMutation.isPending) setToggleConfirmOpen(open);
        }}
        title={detail.isActive ? "Khóa tài khoản" : "Mở khóa tài khoản"}
        description={
          <>
            Bạn có chắc chắn muốn{" "}
            {detail.isActive ? "khóa" : "mở khóa"} tài khoản{" "}
            <span className="font-semibold text-foreground">
              {detail.fullname || detail.username}
            </span>
            ?{" "}
            {detail.isActive
              ? "Người dùng sẽ không thể đăng nhập cho tới khi được mở khóa lại."
              : ""}
          </>
        }
        confirmLabel={detail.isActive ? "Khóa" : "Mở khóa"}
        cancelLabel="Hủy"
        variant={detail.isActive ? "destructive" : "default"}
        loading={toggleMutation.isPending}
        onConfirm={() => void handleToggle()}
      />

      <ConfirmDialog
        open={moderationConfirmOpen}
        onOpenChange={(open) => {
          if (!open && !moderationMutation.isPending)
            setModerationConfirmOpen(open);
        }}
        title="Áp dụng xử lý vi phạm"
        description={
          <>
            Áp dụng mức{" "}
            <span className="font-semibold text-foreground">
              {MODERATION_LEVEL_LABELS[modLevel]}
            </span>{" "}
            cho{" "}
            <span className="font-semibold text-foreground">
              {detail.fullname || detail.username}
            </span>
            ?{" "}
            {modLevel === "temporary_lock" || modLevel === "permanent_lock"
              ? "Tài khoản sẽ không thể đăng nhập."
              : modLevel === "restricted"
                ? "Tài khoản sẽ không thể nhắn tin/gọi."
                : ""}
          </>
        }
        confirmLabel="Áp dụng"
        cancelLabel="Hủy"
        variant={modLevel === "none" ? "default" : "destructive"}
        loading={moderationMutation.isPending}
        onConfirm={() => void handleApplyModeration()}
      />

      <ConfirmDialog
        open={confirmRemoveRoleId !== null}
        onOpenChange={(open) => {
          if (!open && !removeRoleMutation.isPending)
            setConfirmRemoveRoleId(null);
        }}
        title="Gỡ role"
        description={
          <>
            Bạn có chắc chắn muốn gỡ role{" "}
            <span className="font-semibold text-foreground">
              {
                (detail.roles ?? []).find(
                  (r) => r.roleId === confirmRemoveRoleId,
                )?.roleName
              }
            </span>{" "}
            khỏi{" "}
            <span className="font-semibold text-foreground">
              {detail.fullname || detail.username}
            </span>
            ?
          </>
        }
        confirmLabel="Gỡ role"
        cancelLabel="Hủy"
        variant="destructive"
        loading={removeRoleMutation.isPending}
        onConfirm={() => {
          if (confirmRemoveRoleId !== null) void handleRemoveRole(confirmRemoveRoleId);
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) setDeleteOpen(open);
        }}
        title="Xóa người dùng"
        description={
          <>
            Bạn có chắc chắn muốn xóa vĩnh viễn{" "}
            <span className="font-semibold text-foreground">
              {detail.fullname || detail.username}
            </span>
            ? Hành động này không thể hoàn tác.
          </>
        }
        confirmLabel="Xóa vĩnh viễn"
        cancelLabel="Hủy"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => void handleDelete()}
      />
    </AdminShell>
  );
}
