"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Plus,
  Power,
  Search,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { CreateAdminUserDialog } from "@/components/admin/CreateAdminUserDialog";
import { ResetPasswordDialog } from "@/components/admin/ResetPasswordDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAdminUsersQuery,
  useToggleAdminUserStatusMutation,
} from "@/lib/hooks/useAdminQueries";
import type { AdminUser } from "@/lib/types/admin";
import { formatAdminDate, getApiErrorMessage } from "@/lib/utils/admin-errors";
import { useAuth } from "@/lib/hooks/useAuth";

const PAGE_SIZE = 10;

export function AdminUsersList() {
  const { user: currentUser } = useAuth();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [actionError, setActionError] = useState("");

  const usersQuery = useAdminUsersQuery(page, PAGE_SIZE, search);
  const toggleMutation = useToggleAdminUserStatusMutation();

  const result = usersQuery.data;
  const users = result?.users ?? [];

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleToggle = async (target: AdminUser) => {
    setActionError("");
    if (target.userId === currentUser?.userId) {
      setActionError("Không thể thay đổi trạng thái tài khoản của chính bạn.");
      return;
    }

    try {
      await toggleMutation.mutateAsync(target.userId);
    } catch (err) {
      setActionError(getApiErrorMessage(err, "Không thể thay đổi trạng thái"));
    }
  };

  return (
    <AdminShell title="Người dùng">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Quản lý người dùng</h2>
            <p className="text-sm text-muted-foreground">
              {result
                ? `${result.totalCount} user · trang ${result.currentPage}/${Math.max(result.totalPages, 1)}`
                : "Đang tải..."}
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus />
            Tạo user
          </Button>
        </div>

        <form
          onSubmit={handleSearch}
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <Input
              label="Tìm kiếm"
              placeholder="Username, email, họ tên..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Button type="submit" variant="outline" className="sm:mb-0.5">
            <Search />
            Tìm
          </Button>
        </form>

        {actionError ? (
          <p className="text-sm text-destructive">{actionError}</p>
        ) : null}

        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead className="border-b bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Roles</th>
                  <th className="px-4 py-3 font-medium">Trạng thái</th>
                  <th className="px-4 py-3 font-medium">Đăng nhập cuối</th>
                  <th className="px-4 py-3 font-medium text-right">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {usersQuery.isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <tr key={index} className="border-b">
                      <td className="px-4 py-3" colSpan={5}>
                        <Skeleton className="h-8 w-full" />
                      </td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      Không tìm thấy user.
                    </td>
                  </tr>
                ) : (
                  users.map((item) => (
                    <tr key={item.userId} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <div>
                          <Link
                            href={`/admin/users/${item.userId}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {item.fullname || item.username}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            @{item.username} · {item.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(item.roles?.length ? item.roles : ["User"]).map(
                            (role) => (
                              <Badge key={role} variant="secondary">
                                {role}
                              </Badge>
                            ),
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <Badge
                            variant={item.isActive ? "default" : "destructive"}
                          >
                            {item.isActive ? "Active" : "Inactive"}
                          </Badge>
                          {!item.isEmailVerified ? (
                            <Badge variant="outline">Chưa verify</Badge>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatAdminDate(item.lastLoginAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/admin/users/${item.userId}`}>
                              Chi tiết
                            </Link>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setResetTarget(item)}
                          >
                            <KeyRound />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={
                              toggleMutation.isPending ||
                              item.userId === currentUser?.userId
                            }
                            onClick={() => handleToggle(item)}
                          >
                            <Power />
                            {item.isActive ? "Khóa" : "Mở"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || usersQuery.isLoading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft />
            Trước
          </Button>
          <span className="text-sm text-muted-foreground">
            Trang {result?.currentPage ?? page}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={
              usersQuery.isLoading ||
              !result ||
              result.currentPage >= result.totalPages
            }
            onClick={() => setPage((p) => p + 1)}
          >
            Sau
            <ChevronRight />
          </Button>
        </div>
      </div>

      <CreateAdminUserDialog open={createOpen} onOpenChange={setCreateOpen} />

      {resetTarget ? (
        <ResetPasswordDialog
          open={Boolean(resetTarget)}
          onOpenChange={(open) => {
            if (!open) setResetTarget(null);
          }}
          userId={resetTarget.userId}
          username={resetTarget.username}
        />
      ) : null}
    </AdminShell>
  );
}
