"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Search, UserPlus, X } from "lucide-react";
import { friendsApi } from "@/lib/api/friends";
import { chatroomsApi } from "@/lib/api/chatrooms";
import type { Friend } from "@/lib/types/friend";
import type { ChatroomMemberResponse } from "@/lib/types/chatroom-member";
import ChatAvatar from "./ChatAvatar";
import { usersApi } from "@/lib/api/users";
import type { UserLookup } from "@/lib/types/user";

interface AddGroupMembersDialogProps {
  open: boolean;
  chatroomId: string;
  currentMembers: ChatroomMemberResponse[];
  onClose: () => void;
  onAdded: () => Promise<void> | void;
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "response" in error) {
    return (error as { response?: { data?: { message?: string } } }).response
      ?.data?.message;
  }
  return undefined;
}

export default function AddGroupMembersDialog({
  open,
  chatroomId,
  currentMembers,
  onClose,
  onAdded,
}: AddGroupMembersDialogProps) {
  const [users, setUsers] = useState<UserLookup[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    setSelectedIds([]);
    setQuery("");
    setUsers([]);
    setFriends([]);
    setError("");
    setLoading(true);
    friendsApi
      .getFriends()
      .then(setFriends)
      .catch((error) => {
        console.error("Load friends failed:", error);
        setError("Không thể tải danh sách bạn bè.");
      })
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const keyword = query.trim();

    if (keyword.length < 2) {
      setUsers([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");

      try {
        setUsers(await usersApi.searchUsers(keyword, 20));
      } catch (error) {
        console.error("Search users failed:", error);
        setUsers([]);
        setError("Không thể tìm kiếm người dùng.");
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [open, query]);

  const candidates = useMemo(() => {
    const keyword = query.trim();
    return keyword.length >= 2 ? users : friends;
  }, [friends, query, users]);

  const availableUsers = useMemo(() => {
    const memberIds = new Set(currentMembers.map((member) => member.userId));
    return candidates.filter((candidates) => !memberIds.has(candidates.userId));
  }, [candidates, currentMembers]);

  const toggle = (userId: string) => {
    setSelectedIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    );
  };

  const submit = async () => {
    if (selectedIds.length === 0) return;
    setSubmitting(true);
    setError("");
    try {
      await chatroomsApi.addMembers(chatroomId, selectedIds);
      await onAdded();
      onClose();
    } catch (requestError) {
      setError(getErrorMessage(requestError) ?? "Thêm thành viên thất bại.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4"
      onClick={onClose}
    >
      <section
        className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-background shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-semibold">Thêm thành viên</h2>
            <p className="text-xs text-muted-foreground">
              Chọn bạn bè để thêm vào nhóm
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-muted"
          >
            <X size={18} />
          </button>
        </header>

        <div className="border-b p-4">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm theo tên hoặc username"
              className="h-10 w-full rounded-full border bg-muted/30 pl-9 pr-4 text-sm outline-none focus:border-sky-400"
            />
          </div>
          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </p>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin" />
            </div>
          ) : availableUsers.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <UserPlus className="mx-auto mb-2" size={28} />
              Không còn bạn bè phù hợp để thêm.
            </div>
          ) : (
            availableUsers.map((user) => {
              const selected = selectedIds.includes(user.userId);
              return (
                <button
                  key={user.userId}
                  type="button"
                  onClick={() => toggle(user.userId)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-muted"
                >
                  <ChatAvatar
                    src={user.avatar || undefined}
                    name={user.fullname || user.username}
                    size={10}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {user.fullname || user.username}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      @{user.username}
                    </span>
                  </span>
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border ${selected ? "border-sky-500 bg-sky-500 text-white" : "border-muted-foreground/30"}`}
                  >
                    {selected && <Check size={13} />}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <footer className="flex items-center justify-between border-t px-5 py-4">
          <span className="text-xs text-muted-foreground">
            Đã chọn {selectedIds.length}
          </span>
          <button
            type="button"
            disabled={selectedIds.length === 0 || submitting}
            onClick={() => void submit()}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-sky-500 px-4 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-50"
          >
            {submitting && <Loader2 size={15} className="animate-spin" />}
            Thêm
          </button>
        </footer>
      </section>
    </div>
  );
}
