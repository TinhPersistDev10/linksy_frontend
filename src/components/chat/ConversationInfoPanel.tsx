"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BellOff,
  Check,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Loader2,
  LogOut,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Phone,
  Pin,
  Search,
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
import { chatroomQueryKeys } from "@/lib/queries/queryKeys";
import type {
  ChatroomMemberResponse,
  ChatroomResponse,
} from "@/lib/types/chatroom";
import { cn } from "@/lib/utils/cn";
import AddGroupMembersDialog from "./AddGroupMembersDialog";
import ChatAvatar from "./ChatAvatar";
import ConversationSharedContent from "./ConversationSharedContent";
import MemberProfileDialog from "./MemberProfileDialog";

type AccordionKey = "chatInfo" | "customize" | "members";

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
  pinnedCount?: number;
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
          "flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold transition-colors",
          open ? "bg-[#F0F2F5]" : "bg-background hover:bg-muted/50",
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
  pinnedCount = 0,
}: ConversationInfoPanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const memberMenuRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    if (!menuMemberId) return;
    const onPointerDown = (event: MouseEvent) => {
      if (
        memberMenuRef.current &&
        !memberMenuRef.current.contains(event.target as Node)
      ) {
        setMenuMemberId(null);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuMemberId]);

  const isDirect = chatroom.roomType === "direct";
  const isAdmin = chatroom.myMemberInfo?.memberRole === "admin";
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
    queryClient.setQueryData<ChatroomResponse[]>(
      chatroomQueryKeys.list(user.userId),
      (current = []) =>
        current.map((item) =>
          item.chatroomId === updated.chatroomId ? updated : item,
        ),
    );
  };

  const refreshChatroom = async () => {
    const updated = await chatroomsApi.getChatroom(chatroom.chatroomId);
    updateCachedChatroom(updated);
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

  const removeMember = async (member: ChatroomMemberResponse) => {
    if (!window.confirm(`Xóa ${member.fullname || member.username} khỏi nhóm?`))
      return;
    setActionLoading(true);
    setMenuMemberId(null);
    setError("");
    try {
      await chatroomsApi.removeMember(chatroom.chatroomId, member.userId);
      await refreshChatroom();
      if (selectedMember?.userId === member.userId) setSelectedMember(null);
    } catch (requestError) {
      setError(requestMessage(requestError, "Xóa thành viên thất bại."));
    } finally {
      setActionLoading(false);
    }
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

  const blockMember = async (member: ChatroomMemberResponse) => {
    const name = member.fullname || member.username;
    if (!window.confirm(`Chặn ${name}?`)) return;
    setActionLoading(true);
    setMenuMemberId(null);
    setError("");
    try {
      await blockedUsersApi.blockUser(member.userId);
    } catch (requestError) {
      setError(requestMessage(requestError, "Chặn người dùng thất bại."));
    } finally {
      setActionLoading(false);
    }
  };

  const callMember = (
    member: ChatroomMemberResponse,
    callType: "audio" | "video",
  ) => {
    setMenuMemberId(null);
    onCallMember?.(member.userId, callType);
  };

  const leaveGroup = async () => {
    if (!window.confirm("Bạn có chắc muốn rời khỏi nhóm này?")) return;
    setActionLoading(true);
    setError("");
    try {
      await chatroomsApi.leaveChatroom(chatroom.chatroomId);
      if (user?.userId) {
        queryClient.setQueryData<ChatroomResponse[]>(
          chatroomQueryKeys.list(user.userId),
          (current = []) =>
            current.filter((item) => item.chatroomId !== chatroom.chatroomId),
        );
      }
      onLeaveChatroom?.();
    } catch (requestError) {
      setError(requestMessage(requestError, "Rời nhóm thất bại."));
    } finally {
      setActionLoading(false);
    }
  };

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
                    onClick={() => setMutedLocal((v) => !v)}
                    className="flex w-14 flex-col items-center gap-1.5 text-xs font-medium text-foreground"
                    title={
                      mutedLocal
                        ? "Bật lại thông báo (chỉ trên thiết bị này)"
                        : "Tắt thông báo (chỉ trên thiết bị này)"
                    }
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E4E6EB]">
                      {mutedLocal ? <BellOff size={18} /> : <Bell size={18} />}
                    </span>
                    {mutedLocal ? "Unmute" : "Mute"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onSearchInChat?.()}
                    className="flex w-14 flex-col items-center gap-1.5 text-xs font-medium text-foreground"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E4E6EB]">
                      <Search size={18} />
                    </span>
                    Search
                  </button>
                </div>
              </section>

              {error && (
                <p className="mx-4 mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                  {error}
                </p>
              )}

              <AccordionSection
                title="Chat info"
                open={Boolean(openSections.chatInfo)}
                onToggle={() => toggleSection("chatInfo")}
              >
                <ActionRow
                  icon={<Pin size={18} />}
                  label={
                    pinnedCount > 0
                      ? `View pinned messages (${pinnedCount})`
                      : "View pinned messages"
                  }
                  onClick={() => onViewPinnedMessages?.()}
                />
              </AccordionSection>

              {!isDirect && (
                <AccordionSection
                  title="Customize chat"
                  open={Boolean(openSections.customize)}
                  onToggle={() => toggleSection("customize")}
                >
                  {canEditGroup && (
                    <>
                      <ActionRow
                        icon={<Pencil size={18} />}
                        label="Change chat name"
                        onClick={() => {
                          setDraftName(chatroom.roomName || "");
                          setDraftDescription(chatroom.description || "");
                          setEditing(true);
                        }}
                      />
                      <ActionRow
                        icon={<ImageIcon size={18} />}
                        label="Change photo"
                        disabled={avatarLoading}
                        onClick={() => fileInputRef.current?.click()}
                      />
                    </>
                  )}
                  <ActionRow
                    icon={<span className="text-lg leading-none">👍</span>}
                    label="Change emoji"
                    onClick={() =>
                      window.alert("Tính năng Change emoji đang phát triển.")
                    }
                  />
                  <ActionRow
                    icon={<Type size={18} />}
                    label="Edit nicknames"
                    onClick={() =>
                      window.alert("Tính năng Edit nicknames đang phát triển.")
                    }
                  />
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
                  title="Chat members"
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
                                {member.memberRole === "admin"
                                  ? `Admin · @${member.username}`
                                  : `@${member.username}`}
                              </span>
                            </span>
                          </button>

                          {showOptions && (
                            <button
                              type="button"
                              onClick={() =>
                                setMenuMemberId((current) =>
                                  current === member.userId
                                    ? null
                                    : member.userId,
                                )
                              }
                              className="rounded-full p-1.5 text-muted-foreground hover:bg-background"
                              title="Tùy chọn"
                            >
                              <MoreHorizontal size={17} />
                            </button>
                          )}

                          {menuMemberId === member.userId && showOptions && (
                            <div
                              ref={memberMenuRef}
                              className="absolute right-2 top-10 z-30 w-52 overflow-hidden rounded-xl border bg-background py-1 shadow-xl"
                            >
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => void messageMember(member)}
                                className="flex w-full items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/70 disabled:opacity-50"
                              >
                                <MessageCircle size={17} /> Message
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setMenuMemberId(null);
                                  setSelectedMember(member);
                                }}
                                className="flex w-full items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/70"
                              >
                                <UserRound size={17} /> View profile
                              </button>
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => void blockMember(member)}
                                className="flex w-full items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/70 disabled:opacity-50"
                              >
                                <UserX size={17} /> Block
                              </button>
                              <button
                                type="button"
                                onClick={() => callMember(member, "audio")}
                                className="flex w-full items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/70"
                              >
                                <Phone size={17} /> Audio call
                              </button>
                              <button
                                type="button"
                                onClick={() => callMember(member, "video")}
                                className="flex w-full items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/70"
                              >
                                <Video size={17} /> Video chat
                              </button>
                              {canRemoveThisMember && (
                                <button
                                  type="button"
                                  disabled={actionLoading}
                                  onClick={() => void removeMember(member)}
                                  className="flex w-full items-center gap-3 border-t px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                                >
                                  <UserMinus size={17} /> Xóa khỏi nhóm
                                </button>
                              )}
                            </div>
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
                  <span>Media, files and links</span>
                  <ChevronDown size={16} />
                </button>
              </section>

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
                    <span>Leave group</span>
                  </button>
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

      {editing && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
          onClick={() => setEditing(false)}
        >
          <section
            className="w-full max-w-md rounded-2xl bg-background p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">Change chat name</h3>
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
    </>
  );
}
