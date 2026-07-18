"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MessageCircle,
  MoreHorizontal,
  Phone,
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
import ChatAvatar from "./ChatAvatar";
import MemberProfileDialog from "./MemberProfileDialog";

type MembersTab = "all" | "admins";

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

function memberSubtitle(member: ChatroomMemberResponse) {
  const parts: string[] = [];
  if (member.memberRole === "admin") parts.push("Admin");
  const addedBy =
    member.addedByFullname?.trim() ||
    member.addedByUsername?.trim() ||
    "";
  if (addedBy) parts.push(`Added by ${addedBy}`);
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
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [tab, setTab] = useState<MembersTab>("all");
  const [menuMemberId, setMenuMemberId] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] =
    useState<ChatroomMemberResponse | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const isAdmin = chatroom.myMemberInfo?.memberRole === "admin";
  const canRemoveMembers =
    isAdmin || Boolean(chatroom.myMemberInfo?.permissions?.canRemoveMembers);

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

  useEffect(() => {
    if (!menuMemberId) return;
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuMemberId(null);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuMemberId]);

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

  const removeMember = async (member: ChatroomMemberResponse) => {
    if (!window.confirm(`Xóa ${member.fullname || member.username} khỏi nhóm?`))
      return;
    setActionLoading(true);
    setMenuMemberId(null);
    setError("");
    try {
      await chatroomsApi.removeMember(chatroom.chatroomId, member.userId);
      onMembersChanged?.();
    } catch (requestError) {
      setError(requestMessage(requestError, "Xóa thành viên thất bại."));
    } finally {
      setActionLoading(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[1px]"
        onClick={onClose}
      >
        <section
          className="flex max-h-[min(86vh,640px)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-900/20"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="relative flex shrink-0 items-center justify-center border-b px-4 py-3.5">
            <h3 className="text-base font-bold text-slate-900">Members</h3>
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-slate-100 p-1.5 text-slate-700 hover:bg-slate-200"
              aria-label="Đóng"
            >
              <X size={16} />
            </button>
          </header>

          <div className="flex shrink-0 border-b px-2">
            {(
              [
                { id: "all", label: "All" },
                { id: "admins", label: "Admins" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "flex-1 py-2.5 text-sm font-semibold transition-colors",
                  tab === item.id
                    ? "border-b-2 border-sky-500 text-sky-600"
                    : "text-slate-400 hover:text-slate-600",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {error && (
            <p className="mx-4 mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </p>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto py-1">
            {visibleMembers.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-400">
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
                    className="relative flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50"
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
                        <span className="block truncate text-sm font-semibold text-slate-900">
                          {displayName}
                          {isSelf ? " (Bạn)" : ""}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {memberSubtitle(member)}
                        </span>
                      </span>
                    </button>

                    {!isSelf && (
                      <button
                        type="button"
                        onClick={() =>
                          setMenuMemberId((current) =>
                            current === member.userId ? null : member.userId,
                          )
                        }
                        className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"
                        title="Tùy chọn"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    )}

                    {menuMemberId === member.userId && !isSelf && (
                      <div
                        ref={menuRef}
                        className="absolute right-4 top-12 z-20 w-52 overflow-hidden rounded-xl border bg-white py-1 shadow-xl"
                      >
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => void messageMember(member)}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-sm hover:bg-slate-50 disabled:opacity-50"
                        >
                          <MessageCircle size={17} /> Message
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMenuMemberId(null);
                            setSelectedMember(member);
                          }}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-sm hover:bg-slate-50"
                        >
                          <UserRound size={17} /> View profile
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => void blockMember(member)}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-sm hover:bg-slate-50 disabled:opacity-50"
                        >
                          <UserX size={17} /> Block
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMenuMemberId(null);
                            onCallMember?.(member.userId, "audio");
                          }}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-sm hover:bg-slate-50"
                        >
                          <Phone size={17} /> Audio call
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMenuMemberId(null);
                            onCallMember?.(member.userId, "video");
                          }}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-sm hover:bg-slate-50"
                        >
                          <Video size={17} /> Video chat
                        </button>
                        {canRemoveMembers && (
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
              })
            )}
          </div>
        </section>
      </div>

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
    </>
  );
}
