"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArchiveRestore,
  Ban,
  Bell,
  BellOff,
  Eye,
  LogOut,
  MailCheck,
  MessageCircle,
  MoreHorizontal,
  Pin,
  PinOff,
  Trash2,
  UsersRound,
} from "lucide-react";
import { blockedUsersApi } from "@/lib/api/blocked-users";
import { chatroomsApi } from "@/lib/api/chatrooms";
import { messagesApi } from "@/lib/api/messages";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  useChatroomsQuery,
  useFriendsQuery,
} from "@/lib/hooks/useServerStateQueries";
import {
  blockedUserQueryKeys,
  chatroomQueryKeys,
} from "@/lib/queries/queryKeys";
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
  onConversationRemoved?: (chatroomId: string) => void;
}

type PendingConfirm =
  | { type: "leave"; chatroom: ChatroomResponse }
  | { type: "block"; chatroom: ChatroomResponse }
  | { type: "delete"; chatroom: ChatroomResponse };

type InboxView = "active" | "archived";
type ConversationFilter = "all" | "group" | "friends" | "strangers";

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

function isConversationMuted(chatroom: ChatroomResponse) {
  const info = chatroom.myMemberInfo;
  if (!info) return false;
  return (
    Boolean(info.isMuted) ||
    info.notificationPreference === "mute"
  );
}

function isConversationPinned(chatroom: ChatroomResponse) {
  return Boolean(chatroom.myMemberInfo?.isPinned);
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
  } else if (
    lastMsg.messageType === "audio" ||
    lastMsg.messageType === "voice"
  ) {
    text = "Tin nhắn thoại";
  } else if (lastMsg.messageType === "poll") {
    text = lastMsg.poll?.question
      ? `Bình chọn: ${lastMsg.poll.question}`
      : lastMsg.messageText
        ? `Bình chọn: ${lastMsg.messageText}`
        : "Bình chọn";
  } else if (lastMsg.messageType === "image") {
    text = "Ảnh";
  } else if (lastMsg.messageType === "video") {
    text = "Video";
  } else if (lastMsg.messageType === "file") {
    text = "Tệp đính kèm";
  }

  if (isOwn) return `Bạn: ${text}`;
  if (isGroupChat(chatroom))
    return `${lastMsg.senderFullname || lastMsg.senderUsername}: ${text}`;
  return text;
}

function patchMemberInfo(
  chatroom: ChatroomResponse,
  patch: Partial<NonNullable<ChatroomResponse["myMemberInfo"]>>,
): ChatroomResponse {
  if (!chatroom.myMemberInfo) return { ...chatroom, myMemberInfo: null };
  return {
    ...chatroom,
    myMemberInfo: { ...chatroom.myMemberInfo, ...patch },
  };
}

export default function DirectMessageList({
  onSelectChat,
  selectedChatroomId,
  refreshTrigger,
  searchQuery = "",
  onConversationRemoved,
}: DirectMessageListProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [inboxView, setInboxView] = useState<InboxView>("active");
  const [conversationFilter, setConversationFilter] =
    useState<ConversationFilter>("all");
  const includeArchived = inboxView === "archived";
  const { data: chatrooms = [], isLoading: loading } = useChatroomsQuery(
    user?.userId,
    { includeArchived },
  );
  const { data: friends = [] } = useFriendsQuery(user?.userId);
  const friendIds = useMemo(
    () => new Set(friends.map((friend) => friend.userId)),
    [friends],
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
  const [menuPosition, setMenuPosition] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<PendingConfirm | null>(
    null,
  );
  const previousRefreshTrigger = useRef(refreshTrigger);
  const MENU_HEIGHT = 360;

  const closeMenu = () => {
    setOpenMenuId(null);
    setMenuPosition(null);
  };

  useEffect(() => {
    if (previousRefreshTrigger.current === refreshTrigger) return;
    previousRefreshTrigger.current = refreshTrigger;
    if (!user?.userId) return;
    void queryClient.invalidateQueries({
      queryKey: chatroomQueryKeys.all,
    });
  }, [queryClient, refreshTrigger, user?.userId]);

  useEffect(() => {
    if (!openMenuId) return;

    const handleRepositionClose = () => closeMenu();
    window.addEventListener("resize", handleRepositionClose);
    window.addEventListener("scroll", handleRepositionClose, true);
    return () => {
      window.removeEventListener("resize", handleRepositionClose);
      window.removeEventListener("scroll", handleRepositionClose, true);
    };
  }, [openMenuId]);

  const filtered = useMemo(() => {
    let list = chatrooms;

    if (conversationFilter === "group") {
      list = list.filter((chatroom) => isGroupChat(chatroom));
    } else if (conversationFilter === "friends") {
      list = list.filter((chatroom) => {
        if (isGroupChat(chatroom)) return false;
        const other = getOtherMember(chatroom, user?.userId);
        return Boolean(other && friendIds.has(other.userId));
      });
    } else if (conversationFilter === "strangers") {
      list = list.filter((chatroom) => {
        if (isGroupChat(chatroom)) return false;
        const other = getOtherMember(chatroom, user?.userId);
        return Boolean(other && !friendIds.has(other.userId));
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((chatroom) => {
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
    }

    return [...list].sort((a, b) => {
      const aPinned = isConversationPinned(a);
      const bPinned = isConversationPinned(b);
      if (aPinned !== bPinned) return aPinned ? -1 : 1;
      if (aPinned && bPinned) {
        const aPin = a.myMemberInfo?.pinnedAt
          ? Date.parse(a.myMemberInfo.pinnedAt)
          : 0;
        const bPin = b.myMemberInfo?.pinnedAt
          ? Date.parse(b.myMemberInfo.pinnedAt)
          : 0;
        if (aPin !== bPin) return bPin - aPin;
      }
      const aTime = a.lastActivityAt ? Date.parse(a.lastActivityAt) : 0;
      const bTime = b.lastActivityAt ? Date.parse(b.lastActivityAt) : 0;
      return bTime - aTime;
    });
  }, [chatrooms, conversationFilter, friendIds, searchQuery, user?.userId]);

  const openMenuAt = (
    chatroomId: string,
    anchor: HTMLElement,
    currentlyOpen: boolean,
  ) => {
    if (currentlyOpen) {
      closeMenu();
      return;
    }

    const rect = anchor.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < MENU_HEIGHT;
    const right = Math.max(8, window.innerWidth - rect.right);

    setMenuPosition(
      openUpward
        ? { bottom: window.innerHeight - rect.top + 6, right }
        : { top: rect.bottom + 6, right },
    );
    setOpenMenuId(chatroomId);
  };

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

  const updateLists = (
    chatroomId: string,
    updater: (room: ChatroomResponse) => ChatroomResponse | null,
  ) => {
    const apply = (key: readonly unknown[]) => {
      queryClient.setQueryData<ChatroomResponse[]>(key, (current = []) => {
        const next: ChatroomResponse[] = [];
        for (const item of current) {
          if (item.chatroomId !== chatroomId) {
            next.push(item);
            continue;
          }
          const updated = updater(item);
          if (updated) next.push(updated);
        }
        return next;
      });
    };
    apply(activeListKey);
    apply(archivedListKey);
    apply(chatroomListKey);
  };

  const removeFromLists = (chatroomId: string) => {
    updateLists(chatroomId, () => null);
    onConversationRemoved?.(chatroomId);
  };

  const handleMarkRead = async (chatroomId: string) => {
    await runAction(`read-${chatroomId}`, async () => {
      await messagesApi.markAllRead(chatroomId);
      updateLists(chatroomId, (item) => ({ ...item, unreadCount: 0 }));
    });
  };

  const handlePin = async (chatroom: ChatroomResponse, isPinned: boolean) => {
    await runAction(`pin-${chatroom.chatroomId}`, async () => {
      await chatroomsApi.pinChatroom(chatroom.chatroomId, isPinned);
      updateLists(chatroom.chatroomId, (item) =>
        patchMemberInfo(item, {
          isPinned,
          pinnedAt: isPinned ? new Date().toISOString() : null,
        }),
      );
    });
  };

  const handleMute = async (chatroom: ChatroomResponse, isMuted: boolean) => {
    await runAction(`mute-${chatroom.chatroomId}`, async () => {
      await chatroomsApi.muteChatroom(chatroom.chatroomId, isMuted);
      updateLists(chatroom.chatroomId, (item) =>
        patchMemberInfo(item, {
          isMuted,
          mutedUntil: null,
          notificationPreference: isMuted ? "mute" : "all",
        }),
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

  const handleDelete = async (chatroom: ChatroomResponse) => {
    closeMenu();
    setConfirmAction({ type: "delete", chatroom });
  };

  const executeConfirmedAction = async () => {
    if (!confirmAction) return;
    const { chatroom } = confirmAction;
    const key = `${confirmAction.type}-${chatroom.chatroomId}`;

    try {
      setPendingAction(key);

      if (confirmAction.type === "leave") {
        await chatroomsApi.leaveChatroom(chatroom.chatroomId);
        removeFromLists(chatroom.chatroomId);
      } else if (confirmAction.type === "delete") {
        await chatroomsApi.clearConversation(chatroom.chatroomId);
        removeFromLists(chatroom.chatroomId);
      } else {
        const other = getOtherMember(chatroom, user?.userId);
        if (!other) return;
        await blockedUsersApi.blockUser(other.userId);
        if (user?.userId) {
          void queryClient.invalidateQueries({
            queryKey: blockedUserQueryKeys.list(user.userId),
          });
          void queryClient.invalidateQueries({
            queryKey: blockedUserQueryKeys.status(user.userId, other.userId),
          });
        }
        removeFromLists(chatroom.chatroomId);
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
        : confirmAction?.type === "delete"
          ? "Xóa hội thoại"
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

    if (confirmAction.type === "delete") {
      return (
        <>
          Xóa hội thoại với{" "}
          <span className="font-semibold text-foreground">{name}</span>? Lịch
          sử tin nhắn sẽ bị ẩn với bạn; người kia vẫn nhìn thấy hội thoại của
          họ. Hội thoại sẽ xuất hiện lại khi có tin nhắn mới.
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
      : confirmAction?.type === "delete"
        ? "Xóa hội thoại"
        : "Chặn";

  const filterChips: { id: ConversationFilter; label: string }[] = [
    { id: "all", label: "Tất cả" },
    { id: "group", label: "Nhóm" },
    { id: "friends", label: "Bạn bè" },
    { id: "strangers", label: "Người lạ" },
  ];

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

      {inboxView === "active" && (
        <div className="mx-1 flex flex-wrap gap-1">
          {filterChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => {
                setConversationFilter(chip.id);
                closeMenu();
              }}
              className={cn(
                "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                conversationFilter === chip.id
                  ? "bg-sky-500/15 text-sky-700 dark:text-sky-300"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground",
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

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
            const pinned = isConversationPinned(chatroom);
            const muted = isConversationMuted(chatroom);

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
                    <Avatar
                      src={avatar ?? undefined}
                      name={displayName}
                      size={9}
                    />
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
                          "flex min-w-0 items-center gap-1 truncate text-sm",
                          unreadCount > 0 ? "font-semibold" : "font-medium",
                        )}
                      >
                        {pinned && (
                          <Pin
                            size={12}
                            className="shrink-0 fill-sky-500 text-sky-500"
                          />
                        )}
                        <span className="truncate">{displayName}</span>
                        {muted && (
                          <BellOff
                            size={12}
                            className="shrink-0 text-muted-foreground"
                          />
                        )}
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

                <div
                  className={cn(
                    "absolute right-2 top-1/2 z-10 -translate-y-1/2 items-center gap-1",
                    isMenuOpen ? "flex" : "hidden group-hover:flex",
                  )}
                >
                  <button
                    type="button"
                    title="Tùy chọn"
                    onClick={(event) => {
                      event.stopPropagation();
                      openMenuAt(
                        chatroom.chatroomId,
                        event.currentTarget,
                        isMenuOpen,
                      );
                    }}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-background text-muted-foreground shadow-sm ring-1 ring-border hover:bg-muted hover:text-foreground"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                </div>

                {isMenuOpen && menuPosition && (
                  <>
                    <button
                      type="button"
                      aria-label="Đóng menu tùy chọn"
                      className="fixed inset-0 z-40 cursor-default bg-transparent"
                      onClick={closeMenu}
                    />
                    <div
                      className="fixed z-50 max-h-[min(360px,calc(100vh-16px))] w-60 overflow-y-auto rounded-xl border bg-background p-2 shadow-xl"
                      style={{
                        top: menuPosition.top,
                        bottom: menuPosition.bottom,
                        right: menuPosition.right,
                      }}
                    >
                      <MenuItem
                        icon={MailCheck}
                        label="Đánh dấu đã đọc"
                        loading={pendingAction === `read-${chatroom.chatroomId}`}
                        onClick={() => void handleMarkRead(chatroom.chatroomId)}
                      />
                      <MenuItem
                        icon={Eye}
                        label={
                          group
                            ? "Xem thông tin nhóm"
                            : "Xem thông tin hội thoại"
                        }
                        onClick={() => {
                          closeMenu();
                          onSelectChat(chatroom);
                        }}
                      />
                      <div className="my-1 border-t" />
                      <MenuItem
                        icon={pinned ? PinOff : Pin}
                        label={pinned ? "Bỏ ghim" : "Ghim hội thoại"}
                        loading={pendingAction === `pin-${chatroom.chatroomId}`}
                        onClick={() => void handlePin(chatroom, !pinned)}
                      />
                      <MenuItem
                        icon={muted ? Bell : BellOff}
                        label={muted ? "Bật thông báo" : "Tắt thông báo"}
                        loading={pendingAction === `mute-${chatroom.chatroomId}`}
                        onClick={() => void handleMute(chatroom, !muted)}
                      />
                      {includeArchived ? (
                        <MenuItem
                          icon={ArchiveRestore}
                          label="Bỏ lưu trữ"
                          loading={
                            pendingAction === `unarchive-${chatroom.chatroomId}`
                          }
                          onClick={() =>
                            void handleUnarchive(chatroom.chatroomId)
                          }
                        />
                      ) : (
                        <MenuItem
                          icon={Archive}
                          label="Lưu trữ cuộc trò chuyện"
                          loading={
                            pendingAction === `archive-${chatroom.chatroomId}`
                          }
                          onClick={() =>
                            void handleArchive(chatroom.chatroomId)
                          }
                        />
                      )}
                      <div className="my-1 border-t" />
                      <MenuItem
                        icon={Trash2}
                        label="Xóa hội thoại"
                        destructive
                        loading={
                          pendingAction === `delete-${chatroom.chatroomId}`
                        }
                        onClick={() => void handleDelete(chatroom)}
                      />
                      {group ? (
                        <MenuItem
                          icon={LogOut}
                          label="Rời nhóm"
                          destructive
                          loading={
                            pendingAction === `leave-${chatroom.chatroomId}`
                          }
                          onClick={() => void handleLeave(chatroom)}
                        />
                      ) : (
                        <MenuItem
                          icon={Ban}
                          label="Chặn người dùng"
                          destructive
                          loading={
                            pendingAction === `block-${chatroom.chatroomId}`
                          }
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
