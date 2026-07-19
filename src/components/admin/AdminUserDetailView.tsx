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
  useAssignAdminRoleMutation,
  useDeleteAdminUserMutation,
  useRemoveAdminRoleMutation,
  useToggleAdminUserStatusMutation,
  useUpdateAdminUserMutation,
} from "@/lib/hooks/useAdminQueries";
import type { UpdateAdminUserRequest } from "@/lib/types/admin";
import { formatAdminDate, getApiErrorMessage } from "@/lib/utils/admin-errors";
import { useAuth } from "@/lib/hooks/useAuth";

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

  const [form, setForm] = useState<UpdateAdminUserRequest>({});
  const [resetOpen, setResetOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState<number | "">("");

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
  }, [detail]);

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

    const confirmed = window.confirm(
      "Xóa vĩnh viễn user này? Hành động không thể hoàn tác.",
    );
    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(userId);
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
          </dl>
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
              onClick={handleToggle}
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
                  onClick={() => handleRemoveRole(role.roleId)}
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
            onClick={handleDelete}
          >
            {deleteMutation.isPending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Trash2 />
            )}
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
    </AdminShell>
  );
}
