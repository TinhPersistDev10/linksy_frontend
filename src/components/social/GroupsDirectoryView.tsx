"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Loader2,
  LogOut,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { chatroomsApi } from "@/lib/api/chatrooms";
import { friendsApi } from "@/lib/api/friends";
import type { ChatroomResponse, Friend } from "@/lib/types/chatroom";
import CreateGroupDialog from "./CreateGroupDialog";

interface GroupsDirectoryViewProps {
  onSelectChat?: (chatroom: ChatroomResponse) => void;
}

type PendingConfirm =
  | { type: "leave"; group: ChatroomResponse }
  | { type: "archive"; group: ChatroomResponse };

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "#"
  );
}

function GroupAvatar({ group }: { group: ChatroomResponse }) {
  const name = group.roomName || "Nhóm";

  if (group.avatar) {
    return (
      <img
        src={group.avatar}
        alt={name}
        className="h-12 w-12 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-700 text-sm font-semibold text-white">
      {initials(name)}
    </div>
  );
}

function GroupMenuItem({
  icon: Icon,
  label,
  destructive,
  loading,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  destructive?: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
        destructive
          ? "text-red-600 hover:bg-red-500/10 dark:text-red-400"
          : "text-foreground hover:bg-muted/60"
      } ${loading ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <Icon size={17} className="shrink-0" />
      <span>{loading ? "Đang xử lý..." : label}</span>
    </button>
  );
}

export default function GroupsDirectoryView({
  onSelectChat,
}: GroupsDirectoryViewProps) {
  const [groups, setGroups] = useState<ChatroomResponse[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<PendingConfirm | null>(
    null,
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [chatrooms, friendList] = await Promise.all([
        chatroomsApi.getChatrooms(),
        friendsApi.getFriends(),
      ]);
      setGroups(chatrooms.filter((room) => room.roomType === "group"));
      setFriends(friendList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return groups.filter((group) =>
      `${group.roomName} ${group.description ?? ""}`.toLowerCase().includes(q),
    );
  }, [groups, query]);

  const openGroup = (group: ChatroomResponse) => {
    setOpenMenuId(null);
    onSelectChat?.(group);
  };

  const requestLeave = (group: ChatroomResponse) => {
    setOpenMenuId(null);
    setConfirmAction({ type: "leave", group });
  };

  const requestArchive = (group: ChatroomResponse) => {
    setOpenMenuId(null);
    setConfirmAction({ type: "archive", group });
  };

  const executeConfirmedAction = async () => {
    if (!confirmAction) return;
    const { group } = confirmAction;
    const key = `${confirmAction.type}-${group.chatroomId}`;

    setPendingAction(key);
    try {
      if (confirmAction.type === "leave") {
        await chatroomsApi.leaveChatroom(group.chatroomId);
      } else {
        await chatroomsApi.archiveChatroom(group.chatroomId, true);
      }
      setGroups((current) =>
        current.filter((item) => item.chatroomId !== group.chatroomId),
      );
      setConfirmAction(null);
    } finally {
      setPendingAction(null);
    }
  };

  const confirmGroupName =
    confirmAction?.group.roomName || "Nhóm chưa đặt tên";

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <Loader2 size={22} className="animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold">Nhóm ({filtered.length})</p>
          <button
            type="button"
            onClick={() => setCreateGroupOpen(true)}
            className="flex h-9 items-center gap-2 rounded-md bg-sky-500 px-3 text-sm font-semibold text-white hover:bg-sky-600"
          >
            <Plus size={16} /> Tạo nhóm chat
          </button>
        </div>

        <div className="mb-5 grid gap-2 lg:grid-cols-[1fr_320px_260px]">
          <div className="flex h-10 items-center gap-2 rounded-md bg-muted/60 px-3">
            <Search size={16} className="text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm kiếm..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <button
            type="button"
            className="flex h-10 items-center justify-between rounded-md bg-muted/60 px-3 text-sm text-foreground"
          >
            Hoạt động (mới → cũ)
          </button>

          <button
            type="button"
            className="flex h-10 items-center justify-between rounded-md bg-muted/60 px-3 text-sm text-foreground"
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal size={16} /> Tất cả
            </span>
          </button>
        </div>

        <div className="rounded-md border border-border bg-card p-2 sm:p-4">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Không có nhóm nào
            </p>
          ) : (
            filtered.map((group) => {
              const isMenuOpen = openMenuId === group.chatroomId;

              return (
                <div
                  key={group.chatroomId}
                  className="group relative flex min-h-20 w-full items-center justify-between gap-3 rounded-md px-2 py-3 text-foreground hover:bg-muted/60 sm:px-3"
                >
                  <button
                    type="button"
                    onClick={() => openGroup(group)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <GroupAvatar group={group} />
                    <div className="min-w-0">
                      <p className="flex min-w-0 items-center gap-2 font-semibold">
                        <UsersRound
                          size={15}
                          className="shrink-0 text-muted-foreground"
                        />
                        <span className="truncate">
                          {group.roomName || "Nhóm chưa đặt tên"}
                        </span>
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {group.members?.length ?? 0} thành viên
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    title="Tùy chọn"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenMenuId(isMenuOpen ? null : group.chatroomId);
                    }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <MoreHorizontal size={18} />
                  </button>

                  {isMenuOpen && (
                    <>
                      <button
                        type="button"
                        aria-label="Đóng menu tùy chọn"
                        className="fixed inset-0 z-20 cursor-default bg-transparent"
                        onClick={() => setOpenMenuId(null)}
                      />
                      <div className="absolute right-2 top-14 z-30 w-56 rounded-xl border border-border bg-card p-2 text-sm shadow-xl">
                        <GroupMenuItem
                          icon={MessageCircle}
                          label="Mở cuộc trò chuyện"
                          onClick={() => openGroup(group)}
                        />
                        <GroupMenuItem
                          icon={Archive}
                          label="Lưu trữ nhóm"
                          loading={
                            pendingAction === `archive-${group.chatroomId}`
                          }
                          onClick={() => requestArchive(group)}
                        />
                        <div className="my-1 border-t border-border" />
                        <GroupMenuItem
                          icon={LogOut}
                          label="Rời nhóm"
                          destructive
                          loading={
                            pendingAction === `leave-${group.chatroomId}`
                          }
                          onClick={() => requestLeave(group)}
                        />
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <CreateGroupDialog
        open={createGroupOpen}
        friends={friends}
        onClose={() => setCreateGroupOpen(false)}
        onCreated={(chatroom) => {
          setGroups((current) => [
            chatroom,
            ...current.filter((item) => item.chatroomId !== chatroom.chatroomId),
          ]);
          onSelectChat?.(chatroom);
        }}
      />

      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open && !pendingAction) setConfirmAction(null);
        }}
        title={
          confirmAction?.type === "leave" ? "Rời nhóm" : "Lưu trữ nhóm"
        }
        description={
          confirmAction?.type === "leave" ? (
            <>
              Bạn có chắc chắn muốn rời nhóm{" "}
              <span className="font-semibold text-foreground">
                {confirmGroupName}
              </span>
              ? Bạn sẽ không còn nhận được tin nhắn từ nhóm này.
            </>
          ) : (
            <>
              Bạn có chắc chắn muốn lưu trữ nhóm{" "}
              <span className="font-semibold text-foreground">
                {confirmGroupName}
              </span>
              ? Nhóm sẽ chuyển vào mục đã lưu trữ.
            </>
          )
        }
        confirmLabel={
          confirmAction?.type === "leave" ? "Rời nhóm" : "Lưu trữ"
        }
        cancelLabel="Hủy"
        variant="destructive"
        loading={Boolean(pendingAction)}
        onConfirm={() => void executeConfirmedAction()}
      />
    </>
  );
}
