"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Camera,
  Check,
  Clock3,
  Info,
  Loader2,
  LogOut,
  MoreHorizontal,
  Pencil,
  Shield,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { chatroomsApi } from "@/lib/api/chatrooms";
import { useAuth } from "@/lib/hooks/useAuth";
import { chatroomQueryKeys } from "@/lib/queries/queryKeys";
import type { ChatroomMemberResponse, ChatroomResponse } from "@/lib/types/chatroom";
import { cn } from "@/lib/utils/cn";
import AddGroupMembersDialog from "./AddGroupMembersDialog";
import ChatAvatar from "./ChatAvatar";

interface ConversationInfoPanelProps {
  chatroom: ChatroomResponse;
  otherMember?: ChatroomMemberResponse;
  onChatroomChange?: (chatroom: ChatroomResponse) => void;
  onLeaveChatroom?: () => void;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Chưa có dữ liệu";
  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Chưa có dữ liệu";
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function requestMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "response" in error) {
    return (error as { response?: { data?: { message?: string } } })
      .response?.data?.message ?? fallback;
  }
  return fallback;
}

export default function ConversationInfoPanel({
  chatroom,
  otherMember,
  onChatroomChange,
  onLeaveChatroom,
}: ConversationInfoPanelProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<ChatroomMemberResponse | null>(null);
  const [menuMemberId, setMenuMemberId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(chatroom.roomName || "");
  const [draftDescription, setDraftDescription] = useState(chatroom.description || "");

  const isDirect = chatroom.roomType === "direct";
  const isAdmin = chatroom.myMemberInfo?.memberRole === "admin";
  const canInvite = isAdmin || Boolean(chatroom.myMemberInfo?.permissions?.canInviteMembers);
  const canEditGroup = isAdmin || Boolean(chatroom.myMemberInfo?.permissions?.canEditGroupInfo);
  const displayName = isDirect
    ? otherMember?.fullname || chatroom.roomName
    : chatroom.roomName || "Nhóm chưa đặt tên";
  const avatar = isDirect ? otherMember?.avatar : chatroom.avatar;

  const updateCachedChatroom = (updated: ChatroomResponse) => {
    onChatroomChange?.(updated);
    if (!user?.userId) return;
    queryClient.setQueryData<ChatroomResponse[]>(
      chatroomQueryKeys.list(user.userId),
      (current = []) => current.map((item) =>
        item.chatroomId === updated.chatroomId ? updated : item,
      ),
    );
  };

  const refreshChatroom = async () => {
    const updated = await chatroomsApi.getChatroom(chatroom.chatroomId);
    updateCachedChatroom(updated);
  };

  const handleGroupAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleDeleteGroupAvatar = async () => {
    setAvatarLoading(true);
    setError("");
    try {
      await chatroomsApi.deleteGroupAvatar(chatroom.chatroomId);
      await refreshChatroom();
    } catch (requestError) {
      setError(requestMessage(requestError, "Xóa ảnh nhóm thất bại."));
    } finally {
      setAvatarLoading(false);
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
      setError(requestMessage(requestError, "Cập nhật thông tin nhóm thất bại."));
    } finally {
      setActionLoading(false);
    }
  };

  const removeMember = async (member: ChatroomMemberResponse) => {
    if (!window.confirm(`Xóa ${member.fullname || member.username} khỏi nhóm?`)) return;
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

  const leaveGroup = async () => {
    if (!window.confirm("Bạn có chắc muốn rời khỏi nhóm này?")) return;
    setActionLoading(true);
    setError("");
    try {
      await chatroomsApi.leaveChatroom(chatroom.chatroomId);
      if (user?.userId) {
        queryClient.setQueryData<ChatroomResponse[]>(
          chatroomQueryKeys.list(user.userId),
          (current = []) => current.filter(
            (item) => item.chatroomId !== chatroom.chatroomId,
          ),
        );
      }
      onLeaveChatroom?.();
    } catch (requestError) {
      setError(requestMessage(requestError, "Rời nhóm thất bại."));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <aside className="hidden w-80 shrink-0 border-l bg-background xl:flex xl:flex-col">
        <div className="flex items-center gap-2 border-b px-4 py-3 text-sm font-semibold">
          <Info size={16} />
          <span>Thông tin hội thoại</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <section className="flex flex-col items-center border-b px-5 py-6 text-center">
            <div className="relative">
              <ChatAvatar src={avatar ?? undefined} name={displayName} size={20} />
              {!isDirect && canEditGroup && (
                <button
                  type="button"
                  disabled={avatarLoading}
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-white shadow-md hover:bg-sky-600"
                  title="Đổi ảnh nhóm"
                >
                  {avatarLoading ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
                </button>
              )}
            </div>
            {!isDirect && <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleGroupAvatarChange} />}

            <div className="mt-3 flex max-w-full items-center gap-2">
              <h2 className="truncate text-base font-semibold">{displayName}</h2>
              {!isDirect && canEditGroup && (
                <button
                  type="button"
                  onClick={() => {
                    setDraftName(chatroom.roomName || "");
                    setDraftDescription(chatroom.description || "");
                    setEditing(true);
                  }}
                  className="rounded-full p-1 text-muted-foreground hover:bg-muted"
                  title="Chỉnh sửa thông tin nhóm"
                >
                  <Pencil size={14} />
                </button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {isDirect ? `@${otherMember?.username ?? ""}` : `${chatroom.members?.length ?? 0} thành viên`}
            </p>
            {!isDirect && chatroom.description && (
              <p className="mt-2 line-clamp-3 text-xs text-muted-foreground">{chatroom.description}</p>
            )}
            {!isDirect && canEditGroup && chatroom.avatar && (
              <button type="button" onClick={() => void handleDeleteGroupAvatar()} className="mt-3 text-xs text-muted-foreground hover:text-red-600">
                Xóa ảnh nhóm
              </button>
            )}
          </section>

          {error && <p className="mx-4 mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}

          {!isDirect && (
            <section className="border-b px-3 py-4">
              <div className="mb-2 flex items-center gap-2 px-2 text-sm font-semibold">
                <Users size={16} />
                <span>Thành viên ({chatroom.members?.length ?? 0})</span>
              </div>

              {canInvite && (
                <button
                  type="button"
                  onClick={() => setAddMembersOpen(true)}
                  className="mb-2 flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left text-sky-600 hover:bg-sky-50"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100"><UserPlus size={17} /></span>
                  <span className="text-sm font-semibold">Thêm thành viên</span>
                </button>
              )}

              <div className="space-y-1">
                {(chatroom.members ?? []).map((member) => {
                  const showOptions = isAdmin && member.userId !== user?.userId;
                  return (
                    <div key={member.userId} className="group relative flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-muted/70">
                      <button type="button" onClick={() => setSelectedMember(member)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <ChatAvatar src={member.avatar ?? undefined} name={member.fullname} size={9} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{member.fullname || member.username}</span>
                          <span className="block truncate text-xs text-muted-foreground">@{member.username}</span>
                        </span>
                      </button>

                      {member.memberRole === "admin" && (
                        <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-600">Admin</span>
                      )}

                      {showOptions && (
                        <button
                          type="button"
                          onClick={() => setMenuMemberId((current) => current === member.userId ? null : member.userId)}
                          className="rounded-full p-1.5 text-muted-foreground opacity-0 hover:bg-background group-hover:opacity-100"
                          title="Tùy chọn"
                        >
                          <MoreHorizontal size={17} />
                        </button>
                      )}

                      {menuMemberId === member.userId && showOptions && (
                        <div className="absolute right-2 top-11 z-20 w-44 rounded-xl border bg-background p-1.5 shadow-xl">
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => void removeMember(member)}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <UserMinus size={15} /> Xóa khỏi nhóm
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className="border-b px-5 py-4 text-sm">
            <p className="mb-3 font-semibold">Thông tin chung</p>
            <div className="space-y-3 text-muted-foreground">
              <div className="flex gap-3"><CalendarDays size={16} /><span>Ngày tạo: {formatDate(chatroom.createdAt)}</span></div>
              <div className="flex gap-3"><Clock3 size={16} /><span>Hoạt động: {formatDateTime(chatroom.lastActivityAt)}</span></div>
              <div className="flex gap-3"><Shield size={16} /><span>{chatroom.isArchived ? "Đã lưu trữ" : "Đang hoạt động"}</span></div>
            </div>
          </section>

          {!isDirect && (
            <section className="p-3">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => void leaveGroup()}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
                <span className="text-sm font-semibold">Rời nhóm</span>
              </button>
            </section>
          )}
        </div>
      </aside>

      <AddGroupMembersDialog
        open={addMembersOpen}
        chatroomId={chatroom.chatroomId}
        currentMembers={chatroom.members ?? []}
        onClose={() => setAddMembersOpen(false)}
        onAdded={refreshChatroom}
      />

      {selectedMember && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4" onClick={() => setSelectedMember(null)}>
          <section className="w-full max-w-sm rounded-2xl bg-background p-6 text-center shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setSelectedMember(null)} className="ml-auto block rounded-full p-1 hover:bg-muted"><X size={18} /></button>
            <ChatAvatar src={selectedMember.avatar ?? undefined} name={selectedMember.fullname} size={20} />
            <h3 className="mt-4 text-lg font-semibold">{selectedMember.fullname || selectedMember.username}</h3>
            <p className="text-sm text-muted-foreground">@{selectedMember.username}</p>
            <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-muted/40 p-4 text-left text-xs">
              <div><p className="text-muted-foreground">Vai trò</p><p className="mt-1 font-medium">{selectedMember.memberRole === "admin" ? "Quản trị viên" : "Thành viên"}</p></div>
              <div><p className="text-muted-foreground">Tham gia</p><p className="mt-1 font-medium">{formatDate(selectedMember.joinedAt)}</p></div>
              <div className="col-span-2"><p className="text-muted-foreground">Trạng thái</p><p className={cn("mt-1 font-medium", selectedMember.isOnline && "text-emerald-600")}>{selectedMember.isOnline ? "Đang hoạt động" : "Ngoại tuyến"}</p></div>
            </div>
          </section>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4" onClick={() => setEditing(false)}>
          <section className="w-full max-w-md rounded-2xl bg-background p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between"><h3 className="font-semibold">Chỉnh sửa thông tin nhóm</h3><button type="button" onClick={() => setEditing(false)}><X size={18} /></button></div>
            <label className="text-xs font-medium text-muted-foreground">Tên nhóm</label>
            <input value={draftName} onChange={(event) => setDraftName(event.target.value)} maxLength={100} className="mt-1 h-10 w-full rounded-lg border px-3 text-sm outline-none focus:border-sky-400" />
            <label className="mt-4 block text-xs font-medium text-muted-foreground">Mô tả</label>
            <textarea value={draftDescription} onChange={(event) => setDraftDescription(event.target.value)} rows={4} maxLength={500} className="mt-1 w-full resize-none rounded-lg border p-3 text-sm outline-none focus:border-sky-400" />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(false)} className="h-10 rounded-lg px-4 text-sm hover:bg-muted">Hủy</button>
              <button type="button" disabled={!draftName.trim() || actionLoading} onClick={() => void saveGroupInfo()} className="inline-flex h-10 items-center gap-2 rounded-lg bg-sky-500 px-4 text-sm font-semibold text-white disabled:opacity-50">
                {actionLoading ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Lưu
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
