"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Bell,
  BellOff,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Flag,
  Image as ImageIcon,
  Loader2,
  LogOut,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Phone,
  Pin,
  Search,
  ShieldMinus,
  ShieldPlus,
  Trash2,
  Type,
  UserMinus,
  UserPlus,
  UserRound,
  UserX,
  Video,
  X,
} from "lucide-react";
import { blockedUsersApi } from "@/lib/api/blocked-users";
import { chatroomsApi } from "@/lib/api/chatrooms";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  blockedUserQueryKeys,
  chatroomQueryKeys,
} from "@/lib/queries/queryKeys";
import type {
  ChatroomMemberResponse,
  ChatroomResponse,
} from "@/lib/types/chatroom";
import type { ScheduledMessageResponse } from "@/lib/types/scheduled-message";
import { cn } from "@/lib/utils/cn";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ReportUserDialog from "@/components/social/ReportUserDialog";
import AddGroupMembersDialog from "./AddGroupMembersDialog";
import ChatAvatar from "./ChatAvatar";
import ConversationSharedContent from "./ConversationSharedContent";
import MemberProfileDialog from "./MemberProfileDialog";
import EditNicknameDialog from "./EditNicknameDialog";
import EmojiPickerPopover from "./EmojiPickerPopover";

type AccordionKey = "chatInfo" | "customize" | "members";

type PendingConfirm =
  | { type: "leave" }
  | { type: "disband" }
  | { type: "remove"; member: ChatroomMemberResponse }
  | { type: "block"; member: ChatroomMemberResponse }
  | { type: "promote"; member: ChatroomMemberResponse }
  | { type: "demote"; member: ChatroomMemberResponse }
  | { type: "cancel-scheduled"; scheduledId: string };

type InfoNotice = {
  title: string;
  description: string;
};

interface ConversationInfoPanelProps {
  chatroom: ChatroomResponse;
  otherMember?: ChatroomMemberResponse;
  open?: boolean;
  onClose?: () => void;
  onChatroomChange?: (chatroom: ChatroomResponse) => void;
  onLeaveChatroom?: () => void;
  onViewPinnedMessages?: () => void;
  onSearchInChat?: () => void;
  onOpenDirectChat?: (chatroom: ChatroomResponse) => void;
  onCallMember?: (userId: string, callType: "audio" | "video") => void;
  onCreatePoll?: () => void;
  pinnedCount?: number;
  scheduledPending?: ScheduledMessageResponse[];
  onCancelScheduled?: (id: string) => void;
}

function requestMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "response" in error) {
    return (
      (error as { response?: { data?: { message?: string } } }).response?.data
        ?.message ?? fallback
    );
  }
  return fallback;
}

function AccordionSection({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children?: ReactNode;
}) {
  return (
    <section className="border-b border-border/70">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-foreground transition-colors",
          open ? "bg-muted" : "bg-background hover:bg-muted/50",
        )}
      >
        <span>{title}</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && <div className="bg-background pb-2">{children}</div>}
    </section>
  );
}

function ActionRow({
  icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted/60 disabled:opacity-50",
        danger ? "text-red-600" : "text-foreground",
      )}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center text-foreground">
        {icon}
      </span>
      <span className="font-medium">{label}</span>
    </button>
  );
}

export default function ConversationInfoPanel({
  chatroom,
  otherMember,
  open = false,
  onClose,
  onChatroomChange,
  onLeaveChatroom,
  onViewPinnedMessages,
  onSearchInChat,
  onOpenDirectChat,
  onCallMember,
  onCreatePoll,
  pinnedCount = 0,
  scheduledPending = [],
  onCancelScheduled,
}: ConversationInfoPanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const [selectedMember, setSelectedMember] =
    useState<ChatroomMemberResponse | null>(null);
  const [menuMemberId, setMenuMemberId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(chatroom.roomName || "");
  const [draftDescription, setDraftDescription] = useState(
    chatroom.description || "",
  );
  const [mutedLocal, setMutedLocal] = useState(
    chatroom.myMemberInfo?.notificationPreference === "mute" ||
      Boolean(chatroom.myMemberInfo?.isMuted),
  );
  const [view, setView] = useState<"main" | "shared">("main");
  const [openSections, setOpenSections] = useState<
    Partial<Record<AccordionKey, boolean>>
  >({
    chatInfo: true,
  });
  const [confirmAction, setConfirmAction] = useState<PendingConfirm | null>(
    null,
  );
  const [infoNotice, setInfoNotice] = useState<InfoNotice | null>(null);
  const [reportTarget, setReportTarget] = useState<ChatroomMemberResponse | null>(
    null,
  );
  const [nicknameTarget, setNicknameTarget] =
    useState<ChatroomMemberResponse | null>(null);

  useEffect(() => {
    setView("main");
    setOpenSections({ chatInfo: true });
    setError("");
    setMenuMemberId(null);
    setMutedLocal(
      chatroom.myMemberInfo?.notificationPreference === "mute" ||
        Boolean(chatroom.myMemberInfo?.isMuted),
    );
  }, [chatroom.chatroomId]);

  const isDirect = chatroom.roomType === "direct";
  const isAdmin = chatroom.myMemberInfo?.memberRole === "admin";
  const isOwner = Boolean(user?.userId) && chatroom.createdBy === user?.userId;
  const canRemoveMembers =
    isAdmin || Boolean(chatroom.myMemberInfo?.permissions?.canRemoveMembers);
  const canInvite =
    isAdmin || Boolean(chatroom.myMemberInfo?.permissions?.canInviteMembers);
  const canEditGroup =
    isAdmin || Boolean(chatroom.myMemberInfo?.permissions?.canEditGroupInfo);
  const displayName = isDirect
    ? otherMember?.fullname || chatroom.roomName
    : chatroom.roomName || "Nhóm chưa đặt tên";
  const avatar = isDirect ? otherMember?.avatar : chatroom.avatar;

  const toggleSection = (key: AccordionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const updateCachedChatroom = (updated: ChatroomResponse) => {
    onChatroomChange?.(updated);
    if (!user?.userId) return;
    const apply = (includeArchived: boolean) => {
      queryClient.setQueryData<ChatroomResponse[]>(
        chatroomQueryKeys.list(user.userId, includeArchived),
        (current = []) =>
          current.map((item) =>
            item.chatroomId === updated.chatroomId ? updated : item,
          ),
      );
    };
    apply(false);
    apply(true);
  };

  const refreshChatroom = async () => {
    const updated = await chatroomsApi.getChatroom(chatroom.chatroomId);
    updateCachedChatroom(updated);
  };

  const toggleMute = async () => {
    const nextMuted = !mutedLocal;
    setMutedLocal(nextMuted);
    setActionLoading(true);
    setError("");
    try {
      await chatroomsApi.muteChatroom(chatroom.chatroomId, nextMuted);
      const updated: ChatroomResponse = {
        ...chatroom,
        myMemberInfo: chatroom.myMemberInfo
          ? {
              ...chatroom.myMemberInfo,
              isMuted: nextMuted,
              mutedUntil: null,
              notificationPreference: nextMuted ? "mute" : "all",
            }
          : chatroom.myMemberInfo,
      };
      updateCachedChatroom(updated);
    } catch (requestError) {
      setMutedLocal(!nextMuted);
      setError(
        requestMessage(requestError, "Không thể cập nhật thông báo hội thoại."),
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleGroupAvatarChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || isDirect || !canEditGroup) return;
    if (file.size > 5 * 1024 * 1024) {
      setError("Ảnh nhóm không được vượt quá 5MB.");
      return;
    }

    setAvatarLoading(true);
    setError("");
    try {
      await chatroomsApi.updateGroupAvatar(chatroom.chatroomId, file);
      await refreshChatroom();
    } catch (requestError) {
      setError(requestMessage(requestError, "Cập nhật ảnh nhóm thất bại."));
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const saveGroupInfo = async () => {
    if (!draftName.trim()) return;
    setActionLoading(true);
    setError("");
    try {
      const updated = await chatroomsApi.updateChatroom(chatroom.chatroomId, {
        roomName: draftName.trim(),
        description: draftDescription.trim(),
      });
      updateCachedChatroom(updated);
      setEditing(false);
    } catch (requestError) {
      setError(
        requestMessage(requestError, "Cập nhật thông tin nhóm thất bại."),
      );
    } finally {
      setActionLoading(false);
    }
  };

  const removeMember = (member: ChatroomMemberResponse) => {
    setMenuMemberId(null);
    setConfirmAction({ type: "remove", member });
  };

  const promoteMember = (member: ChatroomMemberResponse) => {
    setMenuMemberId(null);
    setConfirmAction({ type: "promote", member });
  };

  const demoteMember = (member: ChatroomMemberResponse) => {
    setMenuMemberId(null);
    setConfirmAction({ type: "demote", member });
  };

  const messageMember = async (member: ChatroomMemberResponse) => {
    setActionLoading(true);
    setMenuMemberId(null);
    setError("");
    try {
      const direct = await chatroomsApi.createDirect(member.userId);
      onOpenDirectChat?.(direct);
      onClose?.();
    } catch (requestError) {
      setError(requestMessage(requestError, "Không thể mở cuộc trò chuyện."));
    } finally {
      setActionLoading(false);
    }
  };

  const blockMember = (member: ChatroomMemberResponse) => {
    setMenuMemberId(null);
    setConfirmAction({ type: "block", member });
  };

  const reportMember = (member: ChatroomMemberResponse) => {
    setMenuMemberId(null);
    setReportTarget(member);
  };

  const editNickname = (member: ChatroomMemberResponse) => {
    setMenuMemberId(null);
    setNicknameTarget(member);
  };

  const saveQuickEmoji = async (emoji: string) => {
    try {
      await chatroomsApi.updateQuickEmoji(chatroom.chatroomId, emoji);
      await refreshChatroom();
    } catch (requestError) {
      setError(requestMessage(requestError, "Không thể đổi emoji."));
    }
  };

  const saveNickname = async (nickname: string) => {
    if (!nicknameTarget) return;
    await chatroomsApi.updateMemberNickname(
      chatroom.chatroomId,
      nicknameTarget.userId,
      nickname,
    );
    await refreshChatroom();
  };

  const callMember = (
    member: ChatroomMemberResponse,
    callType: "audio" | "video",
  ) => {
    setMenuMemberId(null);
    onCallMember?.(member.userId, callType);
  };

  const leaveGroup = () => {
    setConfirmAction({ type: "leave" });
  };

  const disbandGroup = () => {
    setConfirmAction({ type: "disband" });
  };

  const executeConfirmedAction = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    setError("");
    try {
      if (confirmAction.type === "leave") {
        await chatroomsApi.leaveChatroom(chatroom.chatroomId);
        if (user?.userId) {
          queryClient.setQueryData<ChatroomResponse[]>(
            chatroomQueryKeys.list(user.userId),
            (current = []) =>
              current.filter((item) => item.chatroomId !== chatroom.chatroomId),
          );
        }
        setConfirmAction(null);
        onLeaveChatroom?.();
        return;
      }

      if (confirmAction.type === "cancel-scheduled") {
        onCancelScheduled?.(confirmAction.scheduledId);
        setConfirmAction(null);
        return;
      }

      if (confirmAction.type === "disband") {
        await chatroomsApi.disbandChatroom(chatroom.chatroomId);
        if (user?.userId) {
          queryClient.setQueryData<ChatroomResponse[]>(
            chatroomQueryKeys.list(user.userId),
            (current = []) =>
              current.filter((item) => item.chatroomId !== chatroom.chatroomId),
          );
        }
        setConfirmAction(null);
        onLeaveChatroom?.();
        return;
      }

      if (confirmAction.type === "remove") {
        await chatroomsApi.removeMember(
          chatroom.chatroomId,
          confirmAction.member.userId,
        );
        await refreshChatroom();
        if (selectedMember?.userId === confirmAction.member.userId) {
          setSelectedMember(null);
        }
        setConfirmAction(null);
        return;
      }

      if (confirmAction.type === "promote") {
        await chatroomsApi.promoteMember(
          chatroom.chatroomId,
          confirmAction.member.userId,
        );
        await refreshChatroom();
        setConfirmAction(null);
        return;
      }

      if (confirmAction.type === "demote") {
        await chatroomsApi.demoteMember(
          chatroom.chatroomId,
          confirmAction.member.userId,
        );
        await refreshChatroom();
        setConfirmAction(null);
        return;
      }

      await blockedUsersApi.blockUser(confirmAction.member.userId);
      if (user?.userId) {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: blockedUserQueryKeys.list(user.userId),
          }),
          queryClient.invalidateQueries({
            queryKey: blockedUserQueryKeys.status(
              user.userId,
              confirmAction.member.userId,
            ),
          }),
        ]);
      }
      setConfirmAction(null);
    } catch (requestError) {
      const fallback =
        confirmAction.type === "leave"
          ? "Rời nhóm thất bại."
          : confirmAction.type === "cancel-scheduled"
            ? "Hủy tin nhắn hẹn giờ thất bại."
            : confirmAction.type === "disband"
            ? "Giải tán nhóm thất bại."
            : confirmAction.type === "remove"
              ? "Xóa thành viên thất bại."
              : confirmAction.type === "promote"
                ? "Bổ nhiệm phó nhóm thất bại."
                : confirmAction.type === "demote"
                  ? "Thu hồi quyền phó nhóm thất bại."
                  : "Chặn người dùng thất bại.";
      setError(requestMessage(requestError, fallback));
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDialogContent = (() => {
    if (!confirmAction) {
      return {
        title: "",
        description: null as ReactNode,
        confirmLabel: "OK",
      };
    }

    if (confirmAction.type === "leave") {
      return {
        title: "Rời nhóm",
        description: (
          <>
            Bạn có chắc chắn muốn rời nhóm{" "}
            <span className="font-semibold text-foreground">{displayName}</span>?
            Bạn sẽ không còn nhận được tin nhắn từ nhóm này.
          </>
        ),
        confirmLabel: "Rời nhóm",
      };
    }

    if (confirmAction.type === "cancel-scheduled") {
      return {
        title: "Hủy tin nhắn hẹn giờ",
        description: "Bạn có chắc chắn muốn hủy tin nhắn hẹn giờ này?",
        confirmLabel: "Hủy tin nhắn",
      };
    }

    if (confirmAction.type === "disband") {
      return {
        title: "Giải tán nhóm",
        description: (
          <>
            Bạn có chắc chắn muốn giải tán nhóm{" "}
            <span className="font-semibold text-foreground">{displayName}</span>?
            Toàn bộ thành viên sẽ bị xóa khỏi nhóm và hành động này không thể
            hoàn tác.
          </>
        ),
        confirmLabel: "Giải tán",
      };
    }

    const memberName =
      confirmAction.member.fullname || confirmAction.member.username;

    if (confirmAction.type === "remove") {
      return {
        title: "Xóa thành viên",
        description: (
          <>
            Bạn có chắc chắn muốn xóa{" "}
            <span className="font-semibold text-foreground">{memberName}</span>{" "}
            khỏi nhóm{" "}
            <span className="font-semibold text-foreground">{displayName}</span>?
          </>
        ),
        confirmLabel: "Xóa",
      };
    }

    if (confirmAction.type === "promote") {
      return {
        title: "Bổ nhiệm phó nhóm",
        description: (
          <>
            Bổ nhiệm{" "}
            <span className="font-semibold text-foreground">{memberName}</span>{" "}
            làm phó nhóm? Họ sẽ có quyền quản trị nhóm (mời/xóa thành viên,
            chỉnh sửa thông tin nhóm, ghim tin nhắn...).
          </>
        ),
        confirmLabel: "Bổ nhiệm",
      };
    }

    if (confirmAction.type === "demote") {
      return {
        title: "Thu hồi quyền phó nhóm",
        description: (
          <>
            Thu hồi quyền phó nhóm của{" "}
            <span className="font-semibold text-foreground">{memberName}</span>?
          </>
        ),
        confirmLabel: "Thu hồi",
      };
    }

    return {
      title: "Chặn người dùng",
      description: (
        <>
          Bạn có chắc chắn muốn chặn{" "}
          <span className="font-semibold text-foreground">{memberName}</span>?
          Người này sẽ không thể nhắn tin cho bạn.
        </>
      ),
      confirmLabel: "Chặn",
    };
  })();

  if (!open) return null;

  return (
    <>
      <aside className="flex w-[22rem] shrink-0 flex-col border-l bg-background">
        {view === "shared" ? (
          <ConversationSharedContent
            chatroomId={chatroom.chatroomId}
            onBack={() => setView("main")}
          />
        ) : (
          <>
            <div className="flex items-center justify-end border-b px-3 py-2">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  title="Đóng"
                  aria-label="Đóng thông tin hội thoại"
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <section className="flex flex-col items-center px-5 pb-5 pt-4 text-center">
                <div className="relative">
                  <ChatAvatar
                    src={avatar ?? undefined}
                    name={displayName}
                    size={20}
                  />
                  {avatarLoading && (
                    <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30">
                      <Loader2
                        size={18}
                        className="animate-spin text-white"
                      />
                    </span>
                  )}
                </div>
                <h2 className="mt-3 max-w-full truncate text-base font-bold">
                  {displayName}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {isDirect
                    ? `@${otherMember?.username ?? ""}`
                    : `${chatroom.members?.length ?? 0} thành viên`}
                </p>

                <div className="mt-4 flex items-start justify-center gap-6">
                  <button
                    type="button"
                    onClick={() => void toggleMute()}
                    disabled={actionLoading}
                    className="flex w-14 flex-col items-center gap-1.5 text-xs font-medium text-foreground disabled:opacity-50"
                    title={
                      mutedLocal
                        ? "Bật lại thông báo hội thoại"
                        : "Tắt thông báo hội thoại"
                    }
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground">
                      {mutedLocal ? <BellOff size={18} /> : <Bell size={18} />}
                    </span>
                    {mutedLocal ? "Bật lại" : "Tắt thông báo"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSearchInChat?.()}
                    className="flex w-14 flex-col items-center gap-1.5 text-xs font-medium text-foreground"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground">
                      <Search size={18} />
                    </span>
                    Tìm kiếm
                  </button>
                </div>
              </section>

              {error && (
                <p className="mx-4 mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/15 dark:text-red-300">
                  {error}
                </p>
              )}

              <AccordionSection
                title="Thông tin đoạn chat"
                open={Boolean(openSections.chatInfo)}
                onToggle={() => toggleSection("chatInfo")}
              >
                <ActionRow
                  icon={<Pin size={18} />}
                  label={
                    pinnedCount > 0
                      ? `Xem tin nhắn đã ghim (${pinnedCount})`
                      : "Xem tin nhắn đã ghim"
                  }
                  onClick={() => onViewPinnedMessages?.()}
                />
                {scheduledPending.length > 0 && (
                  <div className="px-4 pb-3">
                    <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <Clock size={16} />
                      Tin nhắn hẹn giờ ({scheduledPending.length})
                    </p>
                    <ul className="space-y-2">
                      {scheduledPending.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-start justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {item.messageType === "sticker"
                                ? "Sticker"
                                : item.messageText}
                            </p>
                            <p className="text-muted-foreground">
                              {new Date(item.sendAt).toLocaleString("vi-VN", {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          {onCancelScheduled && (
                            <button
                              type="button"
                              className="shrink-0 text-red-600 hover:underline"
                              onClick={() =>
                                setConfirmAction({
                                  type: "cancel-scheduled",
                                  scheduledId: item.id,
                                })
                              }
                            >
                              Hủy
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {!isDirect && (
                  <ActionRow
                    icon={<BarChart3 size={18} />}
                    label="Tạo bình chọn"
                    onClick={() => onCreatePoll?.()}
                  />
                )}
              </AccordionSection>

              {!isDirect && (
                <AccordionSection
                  title="Tùy chỉnh đoạn chat"
                  open={Boolean(openSections.customize)}
                  onToggle={() => toggleSection("customize")}
                >
                  {canEditGroup && (
                    <>
                      <ActionRow
                        icon={<Pencil size={18} />}
                        label="Đổi tên đoạn chat"
                        onClick={() => {
                          setDraftName(chatroom.roomName || "");
                          setDraftDescription(chatroom.description || "");
                          setEditing(true);
                        }}
                      />
                      <ActionRow
                        icon={<ImageIcon size={18} />}
                        label="Đổi ảnh nhóm"
                        disabled={avatarLoading}
                        onClick={() => fileInputRef.current?.click()}
                      />
                    </>
                  )}
                  <EmojiPickerPopover
                    side="right"
                    align="start"
                    onSelect={(emoji) => void saveQuickEmoji(emoji)}
                  >
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted/60"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center text-lg leading-none">
                        {chatroom.quickEmoji || "👍"}
                      </span>
                      <span className="font-medium">Đổi emoji</span>
                    </button>
                  </EmojiPickerPopover>
                  {chatroom.myMemberInfo && (
                    <ActionRow
                      icon={<Type size={18} />}
                      label="Đặt biệt danh của tôi"
                      onClick={() => {
                        const me = (chatroom.members ?? []).find(
                          (member) => member.userId === user?.userId,
                        );
                        if (me) editNickname(me);
                      }}
                    />
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleGroupAvatarChange}
                  />
                </AccordionSection>
              )}

              {!isDirect && (
                <AccordionSection
                  title="Thành viên nhóm"
                  open={Boolean(openSections.members)}
                  onToggle={() => toggleSection("members")}
                >
                  <div className="space-y-0.5">
                    {(chatroom.members ?? []).map((member) => {
                      const isSelf = member.userId === user?.userId;
                      const showOptions = !isSelf;
                      const canRemoveThisMember = canRemoveMembers && !isSelf;
                      const displayMemberName =
                        member.nickname || member.fullname || member.username;
                      return (
                        <div
                          key={member.userId}
                          className="group relative flex items-center gap-2 px-3 py-2 hover:bg-muted/60"
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedMember(member)}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          >
                            <ChatAvatar
                              src={member.avatar ?? undefined}
                              name={displayMemberName}
                              size={9}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold">
                                {displayMemberName}
                              </span>
                              <span className="block truncate text-xs text-muted-foreground">
                                {member.userId === chatroom.createdBy
                                  ? `Trưởng nhóm · @${member.username}`
                                  : member.memberRole === "admin"
                                    ? `Phó nhóm · @${member.username}`
                                    : `@${member.username}`}
                              </span>
                            </span>
                          </button>

                          {showOptions && (
                            <DropdownMenu
                              open={menuMemberId === member.userId}
                              onOpenChange={(open) =>
                                setMenuMemberId(open ? member.userId : null)
                              }
                            >
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="rounded-full p-1.5 text-muted-foreground hover:bg-background"
                                  title="Tùy chọn"
                                >
                                  <MoreHorizontal size={17} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="z-[95] w-52"
                              >
                                <DropdownMenuItem
                                  disabled={actionLoading}
                                  onSelect={() => void messageMember(member)}
                                >
                                  <MessageCircle size={17} /> Nhắn tin
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => setSelectedMember(member)}
                                >
                                  <UserRound size={17} /> Xem hồ sơ
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => editNickname(member)}
                                >
                                  <Type size={17} /> Đặt biệt danh
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={actionLoading}
                                  onSelect={() => void blockMember(member)}
                                >
                                  <UserX size={17} /> Chặn
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onSelect={() => reportMember(member)}
                                >
                                  <Flag size={17} /> Báo cáo
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => callMember(member, "audio")}
                                >
                                  <Phone size={17} /> Gọi thoại
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => callMember(member, "video")}
                                >
                                  <Video size={17} /> Gọi video
                                </DropdownMenuItem>
                                {isOwner && member.memberRole !== "admin" && (
                                  <DropdownMenuItem
                                    disabled={actionLoading}
                                    onSelect={() => void promoteMember(member)}
                                  >
                                    <ShieldPlus size={17} /> Bổ nhiệm phó nhóm
                                  </DropdownMenuItem>
                                )}
                                {isOwner && member.memberRole === "admin" && (
                                  <DropdownMenuItem
                                    disabled={actionLoading}
                                    onSelect={() => void demoteMember(member)}
                                  >
                                    <ShieldMinus size={17} /> Thu hồi quyền phó
                                    nhóm
                                  </DropdownMenuItem>
                                )}
                                {canRemoveThisMember && (
                                  <DropdownMenuItem
                                    variant="destructive"
                                    disabled={actionLoading}
                                    onSelect={() => void removeMember(member)}
                                  >
                                    <UserMinus size={17} /> Xóa khỏi nhóm
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      );
                    })}

                    {canInvite && (
                      <ActionRow
                        icon={<UserPlus size={18} />}
                        label="Thêm thành viên"
                        onClick={() => setAddMembersOpen(true)}
                      />
                    )}
                  </div>
                </AccordionSection>
              )}

              <section className="border-b border-border/70">
                <button
                  type="button"
                  onClick={() => setView("shared")}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold transition-colors hover:bg-muted/50"
                >
                  <span>File phương tiện & liên kết</span>
                  <ChevronDown size={16} />
                </button>
              </section>

              {isDirect && otherMember && (
                <section className="border-b border-border/70">
                  <EmojiPickerPopover
                    side="right"
                    align="start"
                    onSelect={(emoji) => void saveQuickEmoji(emoji)}
                  >
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted/60"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center text-lg leading-none">
                        {chatroom.quickEmoji || "👍"}
                      </span>
                      <span className="font-medium">Đổi emoji</span>
                    </button>
                  </EmojiPickerPopover>
                  <ActionRow
                    icon={<Type size={18} />}
                    label="Đặt biệt danh"
                    onClick={() => editNickname(otherMember)}
                  />
                  <ActionRow
                    icon={<UserX size={18} />}
                    label="Chặn"
                    onClick={() => blockMember(otherMember)}
                  />
                  <button
                    type="button"
                    onClick={() => reportMember(otherMember)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-muted/50 dark:text-red-400"
                  >
                    <Flag size={16} />
                    <span>Báo cáo tài khoản</span>
                  </button>
                </section>
              )}

              {!isDirect && (
                <section className="border-b border-border/70">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => void leaveGroup()}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-muted/50 disabled:opacity-50"
                  >
                    {actionLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <LogOut size={16} />
                    )}
                    <span>Rời nhóm</span>
                  </button>
                  {isOwner && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => void disbandGroup()}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-muted/50 disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                      <span>Giải tán nhóm</span>
                    </button>
                  )}
                </section>
              )}
            </div>
          </>
        )}
      </aside>

      <AddGroupMembersDialog
        open={addMembersOpen}
        chatroomId={chatroom.chatroomId}
        currentMembers={chatroom.members ?? []}
        onClose={() => setAddMembersOpen(false)}
        onAdded={refreshChatroom}
      />

      <MemberProfileDialog
        open={Boolean(selectedMember)}
        member={selectedMember}
        chatroomName={chatroom.roomName}
        showGroupInfo={!isDirect}
        isSelf={selectedMember?.userId === user?.userId}
        onClose={() => setSelectedMember(null)}
        onMessage={
          selectedMember && selectedMember.userId !== user?.userId
            ? () => {
                const member = selectedMember;
                setSelectedMember(null);
                void messageMember(member);
              }
            : undefined
        }
        onAudioCall={
          selectedMember && selectedMember.userId !== user?.userId
            ? () => {
                const member = selectedMember;
                setSelectedMember(null);
                callMember(member, "audio");
              }
            : undefined
        }
        onVideoCall={
          selectedMember && selectedMember.userId !== user?.userId
            ? () => {
                const member = selectedMember;
                setSelectedMember(null);
                callMember(member, "video");
              }
            : undefined
        }
      />

      <ReportUserDialog
        open={Boolean(reportTarget)}
        userId={reportTarget?.userId ?? ""}
        displayName={
          reportTarget?.fullname || reportTarget?.username || "Người dùng"
        }
        onClose={() => setReportTarget(null)}
        onReported={(alsoBlocked) => {
          if (alsoBlocked && user?.userId && reportTarget) {
            void queryClient.invalidateQueries({
              queryKey: blockedUserQueryKeys.list(user.userId),
            });
            void queryClient.invalidateQueries({
              queryKey: blockedUserQueryKeys.status(
                user.userId,
                reportTarget.userId,
              ),
            });
          }
        }}
      />

      {editing && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setEditing(false)}
        >
          <section
            className="w-full max-w-md rounded-2xl bg-background p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Đổi tên đoạn chat</h3>
              <button type="button" onClick={() => setEditing(false)}>
                <X size={18} />
              </button>
            </div>
            <label className="text-xs font-medium text-muted-foreground">
              Tên nhóm
            </label>
            <input
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              maxLength={100}
              className="mt-1 h-10 w-full rounded-lg border px-3 text-sm outline-none focus:border-sky-400"
            />
            <label className="mt-4 block text-xs font-medium text-muted-foreground">
              Mô tả
            </label>
            <textarea
              value={draftDescription}
              onChange={(event) => setDraftDescription(event.target.value)}
              rows={4}
              maxLength={500}
              className="mt-1 w-full resize-none rounded-lg border p-3 text-sm outline-none focus:border-sky-400"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="h-10 rounded-lg px-4 text-sm hover:bg-muted"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={!draftName.trim() || actionLoading}
                onClick={() => void saveGroupInfo()}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-sky-500 px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                {actionLoading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Check size={15} />
                )}{" "}
                Lưu
              </button>
            </div>
          </section>
        </div>
      )}

      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open && !actionLoading) setConfirmAction(null);
        }}
        title={confirmDialogContent.title}
        description={confirmDialogContent.description}
        confirmLabel={confirmDialogContent.confirmLabel}
        cancelLabel="Hủy"
        variant="destructive"
        loading={actionLoading}
        onConfirm={() => void executeConfirmedAction()}
      />

      <ConfirmDialog
        open={infoNotice !== null}
        onOpenChange={(open) => {
          if (!open) setInfoNotice(null);
        }}
        title={infoNotice?.title ?? ""}
        description={infoNotice?.description ?? ""}
        confirmLabel="Đã hiểu"
        variant="info"
        onConfirm={() => setInfoNotice(null)}
      />

      {nicknameTarget && (
        <EditNicknameDialog
          open={nicknameTarget !== null}
          targetName={
            nicknameTarget.fullname || nicknameTarget.username
          }
          currentNickname={nicknameTarget.nickname}
          onOpenChange={(open) => {
            if (!open) setNicknameTarget(null);
          }}
          onSave={saveNickname}
        />
      )}
    </>
  );
}
