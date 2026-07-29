"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArchiveRestore,
  Ban,
  Eye,
  LogOut,
  MailCheck,
  MessageCircle,
  MoreHorizontal,
  UsersRound,
} from "lucide-react";
import { blockedUsersApi } from "@/lib/api/blocked-users";
import { chatroomsApi } from "@/lib/api/chatrooms";
import { messagesApi } from "@/lib/api/messages";
import { useAuth } from "@/lib/hooks/useAuth";
import { useChatroomsQuery } from "@/lib/hooks/useServerStateQueries";
import { chatroomQueryKeys } from "@/lib/queries/queryKeys";
import type {
  ChatroomMemberResponse,
  ChatroomResponse,
} from "@/lib/types/chatroom";
import { getApiOrigin } from "@/lib/utils/apiUrl";
import { cn } from "@/lib/utils/cn";
import { formatConversationTime } from "@/lib/utils/datetime";
import { formatCallLogPreview, parseCallLogPayload } from "@/lib/types/call";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface DirectMessageListProps {
  onSelectChat: (chatroom: ChatroomResponse) => void;
  selectedChatroomId?: string;
  refreshTrigger?: number;
  searchQuery?: string;
}

type PendingConfirm =
  | { type: "leave"; chatroom: ChatroomResponse }
  | { type: "block"; chatroom: ChatroomResponse };

function Avatar({
  src,
  name,
  size = 8,
}: {
  src?: string | null;
  name: string;
  size?: number;
}) {
  const initials =
    name
      ?.split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";
  const BASE_URL = getApiOrigin();
  const avatarSrc = src
    ? src.startsWith("http")
      ? src
      : `${BASE_URL}${src}`
    : undefined;

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-400 to-indigo-500",
        `w-${size} h-${size}`,
      )}
    >
      {avatarSrc ? (
        <img
          src={avatarSrc}
          alt={name}
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <span className="text-xs font-semibold text-white">{initials}</span>
      )}
    </div>
  );
}
function isGroupChat(chatroom: ChatroomResponse) {
  return chatroom.roomType === "group";
}

function getOtherMember(chatroom: ChatroomResponse, currentUserId?: string) {
  return chatroom.members?.find((member) => member.userId !== currentUserId);
}

function getDisplayName(
  chatroom: ChatroomResponse,
  otherMember: ChatroomMemberResponse | undefined,
) {
  if (isGroupChat(chatroom)) return chatroom.roomName || "Nhóm chưa đặt tên";
  return otherMember?.fullname || chatroom.roomName || "Chưa đặt tên";
}

function getAvatar(
  chatroom: ChatroomResponse,
  otherMember: ChatroomMemberResponse | undefined,
) {
  return isGroupChat(chatroom) ? chatroom.avatar : otherMember?.avatar;
}

function getLastMessagePreview(
  chatroom: ChatroomResponse,
  currentUserId?: string,
) {
  const lastMsg = chatroom.lastMessage;
  if (lastMsg?.messageType === "system") return lastMsg.messageText;
  if (!lastMsg) return "Bắt đầu cuộc trò chuyện";
  if (lastMsg.isDeleted) return "Tin nhắn đã bị xóa";

  const isOwn = lastMsg.senderId === currentUserId;

  let text = lastMsg.messageText || "Tin nhắn";
  if (lastMsg.messageType === "call_log") {
    const payload = parseCallLogPayload(lastMsg.messageText ?? "");
    text = payload ? formatCallLogPreview(payload, isOwn) : "Cuộc gọi";
  }

  if (isOwn) return `Bạn: ${text}`;
  if (isGroupChat(chatroom))
    return `${lastMsg.senderFullname || lastMsg.senderUsername}: ${text}`;
  return text;
}

type InboxView = "active" | "archived";

export default function DirectMessageList({
  onSelectChat,
  selectedChatroomId,
  refreshTrigger,
  searchQuery = "",
}: DirectMessageListProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [inboxView, setInboxView] = useState<InboxView>("active");
  const includeArchived = inboxView === "archived";
  const { data: chatrooms = [], isLoading: loading } = useChatroomsQuery(
    user?.userId,
    { includeArchived },
  );
  const chatroomListKey = useMemo(
    () =>
      chatroomQueryKeys.list(user?.userId ?? "anonymous", includeArchived),
    [includeArchived, user?.userId],
  );
  const activeListKey = useMemo(
    () => chatroomQueryKeys.list(user?.userId ?? "anonymous", false),
    [user?.userId],
  );
  const archivedListKey = useMemo(
    () => chatroomQueryKeys.list(user?.userId ?? "anonymous", true),
    [user?.userId],
  );
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<PendingConfirm | null>(
    null,
  );
  const previousRefreshTrigger = useRef(refreshTrigger);

  useEffect(() => {
    if (previousRefreshTrigger.current === refreshTrigger) return;
    previousRefreshTrigger.current = refreshTrigger;
    if (!user?.userId) return;
    void queryClient.invalidateQueries({
      queryKey: chatroomQueryKeys.all,
    });
  }, [queryClient, refreshTrigger, user?.userId]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return chatrooms;
    const q = searchQuery.toLowerCase();

    return chatrooms.filter((chatroom) => {
      const other = getOtherMember(chatroom, user?.userId);
      const displayName = getDisplayName(chatroom, other);
      const username = other?.username || "";
      const lastMsg = chatroom.lastMessage?.messageText || "";
      return (
        displayName.toLowerCase().includes(q) ||
        username.toLowerCase().includes(q) ||
        lastMsg.toLowerCase().includes(q)
      );
    });
  }, [chatrooms, searchQuery, user?.userId]);

  const closeMenu = () => setOpenMenuId(null);

  const runAction = async (key: string, action: () => Promise<void>) => {
    try {
      setPendingAction(key);
      await action();
    } catch (error) {
      console.error("Chatroom action failed:", error);
    } finally {
      setPendingAction(null);
      closeMenu();
    }
  };

  const handleMarkRead = async (chatroomId: string) => {
    await runAction(`read-${chatroomId}`, async () => {
      await messagesApi.markAllRead(chatroomId);
      queryClient.setQueryData<ChatroomResponse[]>(
        chatroomListKey,
        (current = []) =>
          current.map((item) =>
            item.chatroomId === chatroomId ? { ...item, unreadCount: 0 } : item,
          ),
      );
    });
  };

  const handleArchive = async (chatroomId: string) => {
    await runAction(`archive-${chatroomId}`, async () => {
      await chatroomsApi.archiveChatroom(chatroomId, true);
      const archivedRoom = chatrooms.find(
        (item) => item.chatroomId === chatroomId,
      );
      queryClient.setQueryData<ChatroomResponse[]>(
        activeListKey,
        (current = []) =>
          current.filter((item) => item.chatroomId !== chatroomId),
      );
      if (archivedRoom) {
        queryClient.setQueryData<ChatroomResponse[]>(
          archivedListKey,
          (current = []) => [
            { ...archivedRoom, isArchived: true },
            ...current.filter((item) => item.chatroomId !== chatroomId),
          ],
        );
      } else {
        void queryClient.invalidateQueries({ queryKey: archivedListKey });
      }
    });
  };

  const handleUnarchive = async (chatroomId: string) => {
    await runAction(`unarchive-${chatroomId}`, async () => {
      await chatroomsApi.archiveChatroom(chatroomId, false);
      const restoredRoom = chatrooms.find(
        (item) => item.chatroomId === chatroomId,
      );
      queryClient.setQueryData<ChatroomResponse[]>(
        archivedListKey,
        (current = []) =>
          current.filter((item) => item.chatroomId !== chatroomId),
      );
      if (restoredRoom) {
        queryClient.setQueryData<ChatroomResponse[]>(
          activeListKey,
          (current = []) => [
            { ...restoredRoom, isArchived: false },
            ...current.filter((item) => item.chatroomId !== chatroomId),
          ],
        );
      } else {
        void queryClient.invalidateQueries({ queryKey: activeListKey });
      }
    });
  };

  const handleLeave = async (chatroom: ChatroomResponse) => {
    closeMenu();
    setConfirmAction({ type: "leave", chatroom });
  };

  const handleBlock = async (chatroom: ChatroomResponse) => {
    const other = getOtherMember(chatroom, user?.userId);
    if (!other) return;
    closeMenu();
    setConfirmAction({ type: "block", chatroom });
  };

  const executeConfirmedAction = async () => {
    if (!confirmAction) return;
    const { chatroom } = confirmAction;
    const key = `${confirmAction.type}-${chatroom.chatroomId}`;

    try {
      setPendingAction(key);

      if (confirmAction.type === "leave") {
        await chatroomsApi.leaveChatroom(chatroom.chatroomId);
        queryClient.setQueryData<ChatroomResponse[]>(
          activeListKey,
          (current = []) =>
            current.filter((item) => item.chatroomId !== chatroom.chatroomId),
        );
        queryClient.setQueryData<ChatroomResponse[]>(
          archivedListKey,
          (current = []) =>
            current.filter((item) => item.chatroomId !== chatroom.chatroomId),
        );
      } else {
        const other = getOtherMember(chatroom, user?.userId);
        if (!other) return;
        await blockedUsersApi.blockUser(other.userId);
        queryClient.setQueryData<ChatroomResponse[]>(
          activeListKey,
          (current = []) =>
            current.filter((item) => item.chatroomId !== chatroom.chatroomId),
        );
        queryClient.setQueryData<ChatroomResponse[]>(
          archivedListKey,
          (current = []) =>
            current.filter((item) => item.chatroomId !== chatroom.chatroomId),
        );
      }

      setConfirmAction(null);
    } catch (error) {
      console.error("Chatroom action failed:", error);
    } finally {
      setPendingAction(null);
    }
  };

  const confirmTitle =
    confirmAction?.type === "leave"
      ? isGroupChat(confirmAction.chatroom)
        ? "Rời nhóm"
        : "Rời cuộc trò chuyện"
      : confirmAction?.type === "block"
        ? "Chặn người dùng"
        : "";

  const confirmDescription = (() => {
    if (!confirmAction) return null;
    const other = getOtherMember(confirmAction.chatroom, user?.userId);
    const name = getDisplayName(confirmAction.chatroom, other);

    if (confirmAction.type === "leave") {
      if (isGroupChat(confirmAction.chatroom)) {
        return (
          <>
            Bạn có chắc chắn muốn rời nhóm{" "}
            <span className="font-semibold text-foreground">{name}</span>? Bạn
            sẽ không còn nhận được tin nhắn từ nhóm này.
          </>
        );
      }
      return (
        <>
          Bạn có chắc chắn muốn rời cuộc trò chuyện với{" "}
          <span className="font-semibold text-foreground">{name}</span>?
        </>
      );
    }

    return (
      <>
        Bạn có chắc chắn muốn chặn{" "}
        <span className="font-semibold text-foreground">{name}</span>? Người
        này sẽ không thể nhắn tin cho bạn.
      </>
    );
  })();

  const confirmLabel =
    confirmAction?.type === "leave"
      ? isGroupChat(confirmAction.chatroom)
        ? "Rời nhóm"
        : "Rời cuộc trò chuyện"
      : "Chặn";

  return (
    <div className="space-y-2">
      <div className="mx-1 flex rounded-lg bg-muted/60 p-1">
        <button
          type="button"
          onClick={() => {
            setInboxView("active");
            closeMenu();
          }}
          className={cn(
            "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
            inboxView === "active"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Hội thoại
        </button>
        <button
          type="button"
          onClick={() => {
            setInboxView("archived");
            closeMenu();
          }}
          className={cn(
            "flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
            inboxView === "archived"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Đã lưu trữ
        </button>
      </div>

      {loading ? (
        <div className="space-y-2 px-1">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex animate-pulse items-center gap-2 rounded-lg p-2"
            >
              <div className="h-8 w-8 rounded-full bg-muted" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-2/3 rounded bg-muted" />
                <div className="h-2 w-1/2 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : chatrooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-2 py-8 text-center">
          <MessageCircle size={20} className="text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">
            {includeArchived
              ? "Chưa có cuộc trò chuyện nào được lưu trữ"
              : "Chưa có cuộc hội thoại nào"}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-2 py-8 text-center">
          <MessageCircle size={20} className="text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">Không tìm thấy kết quả</p>
        </div>
      ) : (
        <div className="space-y-0.5">
      {filtered.map((chatroom) => {
        const other = getOtherMember(chatroom, user?.userId);
        const group = isGroupChat(chatroom);
        const isSelected = chatroom.chatroomId === selectedChatroomId;
        const unreadCount = isSelected ? 0 : chatroom.unreadCount;
        const displayName = getDisplayName(chatroom, other);
        const avatar = getAvatar(chatroom, other);
        const preview = getLastMessagePreview(chatroom, user?.userId);
        const isMenuOpen = openMenuId === chatroom.chatroomId;

        return (
          <div key={chatroom.chatroomId} className="group relative">
            <button
              type="button"
              onClick={() => onSelectChat(chatroom)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 pr-12 text-left transition-colors",
                isSelected
                  ? "bg-sky-500/10 text-sky-700 dark:text-sky-400"
                  : "hover:bg-sidebar-accent/60",
              )}
            >
              <div className="relative shrink-0">
                <Avatar src={avatar ?? undefined} name={displayName} size={9} />
                {group ? (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-background bg-slate-700 text-white">
                    <UsersRound size={10} />
                  </span>
                ) : other?.isOnline ? (
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-green-500" />
                ) : null}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={cn(
                      "truncate text-sm",
                      unreadCount > 0 ? "font-semibold" : "font-medium",
                    )}
                  >
                    {displayName}
                  </span>
                  {chatroom.lastActivityAt && (
                    <span className="shrink-0 text-[10px] text-muted-foreground group-hover:opacity-0">
                      {formatConversationTime(chatroom.lastActivityAt)}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate text-xs text-muted-foreground">
                    {preview}
                  </span>
                  {unreadCount > 0 && (
                    <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-sky-500 px-1 text-[10px] font-medium text-white group-hover:opacity-0">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>

            <div className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 items-center gap-1 group-hover:flex">
              <button
                type="button"
                title="Tùy chọn"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenMenuId(isMenuOpen ? null : chatroom.chatroomId);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm ring-1 ring-border hover:bg-muted hover:text-foreground"
              >
                <MoreHorizontal size={16} />
              </button>
            </div>

            {isMenuOpen && (
              <>
                <button
                  type="button"
                  aria-label="Đóng menu tùy chọn"
                  className="fixed inset-0 z-20 cursor-default bg-transparent"
                  onClick={closeMenu}
                />
                <div className="absolute right-2 top-12 z-30 w-60 rounded-xl border bg-background p-2 shadow-xl">
                  <MenuItem
                    icon={MailCheck}
                    label="Đánh dấu đã đọc"
                    loading={pendingAction === `read-${chatroom.chatroomId}`}
                    onClick={() => void handleMarkRead(chatroom.chatroomId)}
                  />
                  <MenuItem
                    icon={Eye}
                    label={
                      group ? "Xem thông tin nhóm" : "Xem thông tin hội thoại"
                    }
                    onClick={() => {
                      closeMenu();
                      onSelectChat(chatroom);
                    }}
                  />
                  <div className="my-1 border-t" />
                  {includeArchived ? (
                    <MenuItem
                      icon={ArchiveRestore}
                      label="Bỏ lưu trữ"
                      loading={
                        pendingAction === `unarchive-${chatroom.chatroomId}`
                      }
                      onClick={() => void handleUnarchive(chatroom.chatroomId)}
                    />
                  ) : (
                    <MenuItem
                      icon={Archive}
                      label="Lưu trữ cuộc trò chuyện"
                      loading={
                        pendingAction === `archive-${chatroom.chatroomId}`
                      }
                      onClick={() => void handleArchive(chatroom.chatroomId)}
                    />
                  )}
                  {group ? (
                    <MenuItem
                      icon={LogOut}
                      label="Rời nhóm"
                      destructive
                      loading={pendingAction === `leave-${chatroom.chatroomId}`}
                      onClick={() => void handleLeave(chatroom)}
                    />
                  ) : (
                    <MenuItem
                      icon={Ban}
                      label="Chặn người dùng"
                      destructive
                      loading={pendingAction === `block-${chatroom.chatroomId}`}
                      onClick={() => void handleBlock(chatroom)}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}
        </div>
      )}

      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open && !pendingAction) setConfirmAction(null);
        }}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel={confirmLabel}
        cancelLabel="Hủy"
        variant="destructive"
        loading={Boolean(
          confirmAction &&
            pendingAction ===
              `${confirmAction.type}-${confirmAction.chatroom.chatroomId}`,
        )}
        onConfirm={() => void executeConfirmedAction()}
      />
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  helper,
  destructive,
  disabled,
  loading,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  helper?: string;
  destructive?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
        destructive
          ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
          : "text-foreground hover:bg-muted",
        (disabled || loading) &&
          "cursor-not-allowed opacity-50 hover:bg-transparent",
      )}
    >
      <Icon size={17} className="shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block truncate">
          {loading ? "Đang xử lý..." : label}
        </span>
        {helper && (
          <span className="block text-[10px] text-muted-foreground">
            {helper}
          </span>
        )}
      </span>
    </button>
  );
}
