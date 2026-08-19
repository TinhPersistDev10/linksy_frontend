"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MessageCircle,
  MoreHorizontal,
  Phone,
  ShieldMinus,
  ShieldPlus,
  Type,
  UserMinus,
  UserRound,
  UserX,
  Video,
  X,
} from "lucide-react";
import { blockedUsersApi } from "@/lib/api/blocked-users";
import { chatroomsApi } from "@/lib/api/chatrooms";
import { useAuth } from "@/lib/hooks/useAuth";
import type {
  ChatroomMemberResponse,
  ChatroomResponse,
} from "@/lib/types/chatroom";
import { cn } from "@/lib/utils/cn";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EditNicknameDialog from "./EditNicknameDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ChatAvatar from "./ChatAvatar";
import MemberProfileDialog from "./MemberProfileDialog";

type MembersTab = "all" | "admins";

type PendingConfirm =
  | { type: "block"; member: ChatroomMemberResponse }
  | { type: "remove"; member: ChatroomMemberResponse }
  | { type: "promote"; member: ChatroomMemberResponse }
  | { type: "demote"; member: ChatroomMemberResponse };

type GroupMembersDialogProps = {
  open: boolean;
  chatroom: ChatroomResponse;
  onClose: () => void;
  onOpenDirectChat?: (chatroom: ChatroomResponse) => void;
  onCallMember?: (userId: string, callType: "audio" | "video") => void;
  onMembersChanged?: () => void;
};

function requestMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "response" in error) {
    return (
      (error as { response?: { data?: { message?: string } } }).response?.data
        ?.message ?? fallback
    );
  }
  return fallback;
}

function memberSubtitle(member: ChatroomMemberResponse, ownerId?: string) {
  const parts: string[] = [];
  if (member.userId === ownerId) parts.push("Trưởng nhóm");
  else if (member.memberRole === "admin") parts.push("Phó nhóm");
  const addedBy =
    member.addedByFullname?.trim() ||
    member.addedByUsername?.trim() ||
    "";
  if (addedBy) parts.push(`Thêm bởi ${addedBy}`);
  parts.push(`@${member.username}`);
  return parts.join(" · ");
}

export default function GroupMembersDialog({
  open,
  chatroom,
  onClose,
  onOpenDirectChat,
  onCallMember,
  onMembersChanged,
}: GroupMembersDialogProps) {
  const { user } = useAuth();
  const [tab, setTab] = useState<MembersTab>("all");
  const [menuMemberId, setMenuMemberId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] =
    useState<ChatroomMemberResponse | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmAction, setConfirmAction] = useState<PendingConfirm | null>(
    null,
  );
  const [nicknameTarget, setNicknameTarget] =
    useState<ChatroomMemberResponse | null>(null);

  const isAdmin = chatroom.myMemberInfo?.memberRole === "admin";
  const canRemoveMembers =
    isAdmin || Boolean(chatroom.myMemberInfo?.permissions?.canRemoveMembers);
  const isOwner = Boolean(user?.userId) && chatroom.createdBy === user?.userId;

  const members = useMemo(
    () => chatroom.members ?? [],
    [chatroom.members],
  );

  const visibleMembers = useMemo(() => {
    if (tab === "admins") {
      return members.filter((m) => m.memberRole === "admin");
    }
    return members;
  }, [members, tab]);

  useEffect(() => {
    if (!open) {
      setTab("all");
      setMenuMemberId(null);
      setSelectedMember(null);
      setError("");
      return;
    }
    // Làm mới danh sách để có Added by / nickname mới nhất
    onMembersChanged?.();
    // Chỉ refresh khi mở modal / đổi phòng — không phụ thuộc identity của callback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, chatroom.chatroomId]);

  const messageMember = async (member: ChatroomMemberResponse) => {
    setActionLoading(true);
    setMenuMemberId(null);
    setError("");
    try {
      const direct = await chatroomsApi.createDirect(member.userId);
      onOpenDirectChat?.(direct);
      onClose();
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

  const editNickname = (member: ChatroomMemberResponse) => {
    setMenuMemberId(null);
    setNicknameTarget(member);
  };

  const saveNickname = async (nickname: string) => {
    if (!nicknameTarget) return;
    await chatroomsApi.updateMemberNickname(
      chatroom.chatroomId,
      nicknameTarget.userId,
      nickname,
    );
    onMembersChanged?.();
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

  const executeConfirmedAction = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    setError("");
    try {
      if (confirmAction.type === "remove") {
        await chatroomsApi.removeMember(
          chatroom.chatroomId,
          confirmAction.member.userId,
        );
        onMembersChanged?.();
      } else if (confirmAction.type === "promote") {
        await chatroomsApi.promoteMember(
          chatroom.chatroomId,
          confirmAction.member.userId,
        );
        onMembersChanged?.();
      } else if (confirmAction.type === "demote") {
        await chatroomsApi.demoteMember(
          chatroom.chatroomId,
          confirmAction.member.userId,
        );
        onMembersChanged?.();
      } else {
        await blockedUsersApi.blockUser(confirmAction.member.userId);
      }
      setConfirmAction(null);
    } catch (requestError) {
      const fallback =
        confirmAction.type === "remove"
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

  const groupName = chatroom.roomName || "Nhóm chưa đặt tên";
  const confirmMemberName = confirmAction
    ? confirmAction.member.fullname || confirmAction.member.username
    : "";

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <section
          className="flex max-h-[min(86vh,640px)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-card shadow-2xl shadow-slate-900/20"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="relative flex shrink-0 items-center justify-center border-b px-4 py-3.5">
            <h3 className="text-base font-bold text-foreground">Thành viên</h3>
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-muted p-1.5 text-foreground hover:bg-muted/80"
              aria-label="Đóng"
            >
              <X size={16} />
            </button>
          </header>

          <div className="flex shrink-0 border-b px-2">
            {(
              [
                { id: "all", label: "Tất cả" },
                { id: "admins", label: "Quản trị viên" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "flex-1 py-2.5 text-sm font-semibold transition-colors",
                  tab === item.id
                    ? "border-b-2 border-sky-500 text-sky-600 dark:text-sky-400"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {error && (
            <p className="mx-4 mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/15 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto py-1">
            {visibleMembers.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                {tab === "admins"
                  ? "Chưa có quản trị viên"
                  : "Chưa có thành viên"}
              </p>
            ) : (
              visibleMembers.map((member) => {
                const isSelf = member.userId === user?.userId;
                const displayName =
                  member.nickname || member.fullname || member.username;
                return (
                  <div
                    key={member.userId}
                    className="relative flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedMember(member)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <ChatAvatar
                        src={member.avatar ?? undefined}
                        name={displayName}
                        size={10}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {displayName}
                          {isSelf ? " (Bạn)" : ""}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {memberSubtitle(member, chatroom.createdBy)}
                        </span>
                      </span>
                    </button>

                    {!isSelf && (
                      <DropdownMenu
                        open={menuMemberId === member.userId}
                        onOpenChange={(nextOpen) =>
                          setMenuMemberId(nextOpen ? member.userId : null)
                        }
                      >
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
                            title="Tùy chọn"
                          >
                            <MoreHorizontal size={18} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="z-[95] w-52">
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
                            onSelect={() => onCallMember?.(member.userId, "audio")}
                          >
                            <Phone size={17} /> Gọi thoại
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => onCallMember?.(member.userId, "video")}
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
                              <ShieldMinus size={17} /> Thu hồi quyền phó nhóm
                            </DropdownMenuItem>
                          )}
                          {canRemoveMembers && (
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
              })
            )}
          </div>
        </section>
      </div>

      <MemberProfileDialog
        open={Boolean(selectedMember)}
        member={selectedMember}
        chatroomName={chatroom.roomName}
        showGroupInfo
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
                setSelectedMember(null);
                onCallMember?.(selectedMember.userId, "audio");
              }
            : undefined
        }
        onVideoCall={
          selectedMember && selectedMember.userId !== user?.userId
            ? () => {
                setSelectedMember(null);
                onCallMember?.(selectedMember.userId, "video");
              }
            : undefined
        }
      />

      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open && !actionLoading) setConfirmAction(null);
        }}
        title={
          confirmAction?.type === "remove"
            ? "Xóa thành viên"
            : confirmAction?.type === "promote"
              ? "Bổ nhiệm phó nhóm"
              : confirmAction?.type === "demote"
                ? "Thu hồi quyền phó nhóm"
                : "Chặn người dùng"
        }
        description={
          confirmAction?.type === "remove" ? (
            <>
              Bạn có chắc chắn muốn xóa{" "}
              <span className="font-semibold text-foreground">
                {confirmMemberName}
              </span>{" "}
              khỏi nhóm{" "}
              <span className="font-semibold text-foreground">{groupName}</span>?
            </>
          ) : confirmAction?.type === "promote" ? (
            <>
              Bổ nhiệm{" "}
              <span className="font-semibold text-foreground">
                {confirmMemberName}
              </span>{" "}
              làm phó nhóm? Họ sẽ có quyền quản trị nhóm.
            </>
          ) : confirmAction?.type === "demote" ? (
            <>
              Thu hồi quyền phó nhóm của{" "}
              <span className="font-semibold text-foreground">
                {confirmMemberName}
              </span>
              ?
            </>
          ) : (
            <>
              Bạn có chắc chắn muốn chặn{" "}
              <span className="font-semibold text-foreground">
                {confirmMemberName}
              </span>
              ? Người này sẽ không thể nhắn tin cho bạn.
            </>
          )
        }
        confirmLabel={
          confirmAction?.type === "remove"
            ? "Xóa"
            : confirmAction?.type === "promote"
              ? "Bổ nhiệm"
              : confirmAction?.type === "demote"
                ? "Thu hồi"
                : "Chặn"
        }
        cancelLabel="Hủy"
        variant="destructive"
        loading={actionLoading}
        onConfirm={() => void executeConfirmedAction()}
      />

      {nicknameTarget && (
        <EditNicknameDialog
          open={nicknameTarget !== null}
          targetName={nicknameTarget.fullname || nicknameTarget.username}
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
