"use client";

import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, ShieldBan, UserRound } from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { blockedUsersApi } from "@/lib/api/blocked-users";
import { useAuth } from "@/lib/hooks/useAuth";
import { blockedUserQueryKeys } from "@/lib/queries/queryKeys";
import type { BlockedUser } from "@/lib/types/blocked-user";

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

function formatBlockedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function BlockedUsersSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pendingUser, setPendingUser] = useState<BlockedUser | null>(null);
  const [unblocking, setUnblocking] = useState(false);

  const loadBlockedUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setUsers(await blockedUsersApi.getBlockedUsers());
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Không tải được danh sách người đã chặn";
      setError(message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBlockedUsers();
  }, [loadBlockedUsers]);

  const handleUnblock = async () => {
    if (!pendingUser) return;
    setUnblocking(true);
    setError("");
    try {
      await blockedUsersApi.unblockUser(pendingUser.userId);
      setUsers((prev) => prev.filter((u) => u.userId !== pendingUser.userId));
      if (user?.userId) {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: blockedUserQueryKeys.list(user.userId),
          }),
          queryClient.invalidateQueries({
            queryKey: blockedUserQueryKeys.status(
              user.userId,
              pendingUser.userId,
            ),
          }),
        ]);
      }
      setPendingUser(null);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || "Bỏ chặn thất bại");
    } finally {
      setUnblocking(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">Người đã chặn</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Quản lý danh sách người dùng bạn đã chặn. Bỏ chặn để họ có thể liên hệ lại.
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/15 dark:text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center text-muted-foreground">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-4 py-12 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <ShieldBan size={22} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">Chưa chặn ai</p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            Khi bạn chặn ai đó, họ sẽ xuất hiện tại đây để bạn có thể bỏ chặn sau.
          </p>
        </div>
      ) : (
        <ul className="divide-y overflow-hidden rounded-xl border border-border bg-card">
          {users.map((user) => {
            const displayName = user.fullname || user.username || "Người dùng";
            const blockedAt = formatBlockedAt(user.blockedAt);
            return (
              <li
                key={user.blockId || user.userId}
                className="flex items-center gap-3 px-3 py-3"
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={displayName}
                    className="h-10 w-10 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-600 text-sm font-semibold text-white">
                    {getInitials(displayName)}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {displayName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    @{user.username}
                    {blockedAt ? ` · Chặn ngày ${blockedAt}` : ""}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setPendingUser(user)}
                >
                  <UserRound size={14} />
                  Bỏ chặn
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(pendingUser)}
        onOpenChange={(open) => {
          if (!open && !unblocking) setPendingUser(null);
        }}
        title="Bỏ chặn người dùng"
        description={
          <>
            Bạn có chắc muốn bỏ chặn{" "}
            <span className="font-semibold text-foreground">
              {pendingUser?.fullname || pendingUser?.username}
            </span>
            ? Họ sẽ có thể gửi lời mời kết bạn và nhắn tin lại.
          </>
        }
        confirmLabel="Bỏ chặn"
        loading={unblocking}
        onConfirm={() => void handleUnblock()}
      />
    </div>
  );
}
