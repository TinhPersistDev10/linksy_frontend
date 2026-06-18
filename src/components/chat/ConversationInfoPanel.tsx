"use client";

import { useRef, useState } from "react";
import { CalendarDays, Camera, Clock3, Info, Loader2, Shield, Trash2, Users } from "lucide-react";
import { chatroomsApi } from "@/lib/api/chatrooms";
import type { ChatroomMemberResponse, ChatroomResponse } from "@/lib/types/chatroom";
import { cn } from "@/lib/utils/cn";
import ChatAvatar from "./ChatAvatar";

interface ConversationInfoPanelProps {
  chatroom: ChatroomResponse;
  otherMember?: ChatroomMemberResponse;
  onChatroomChange?: (chatroom: ChatroomResponse) => void;
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

export default function ConversationInfoPanel({
  chatroom,
  otherMember,
  onChatroomChange,
}: ConversationInfoPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const isDirect = chatroom.roomType === "direct";
  const displayName = isDirect
    ? otherMember?.fullname || chatroom.roomName
    : chatroom.roomName || "Nhóm chưa đặt tên";
  const avatar = isDirect ? otherMember?.avatar : chatroom.avatar;
  const subtitle = isDirect
    ? otherMember?.username
      ? `@${otherMember.username}`
      : "Cuộc trò chuyện trực tiếp"
    : `${chatroom.members?.length ?? 0} thành viên`;

  const updateLocalAvatar = (avatarUrl: string | null) => {
    onChatroomChange?.({ ...chatroom, avatar: avatarUrl });
  };

  const handleGroupAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || isDirect) return;

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Ảnh nhóm không được vượt quá 5MB");
      return;
    }

    try {
      setAvatarLoading(true);
      setAvatarError("");
      const result = await chatroomsApi.updateGroupAvatar(chatroom.chatroomId, file);
      updateLocalAvatar(result.avatarUrl ?? chatroom.avatar);
    } catch (error: unknown) {
      const message = error && typeof error === "object" && "response" in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      setAvatarError(message || "Cập nhật avatar nhóm thất bại");
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteGroupAvatar = async () => {
    if (isDirect) return;

    try {
      setAvatarLoading(true);
      setAvatarError("");
      const result = await chatroomsApi.deleteGroupAvatar(chatroom.chatroomId);
      updateLocalAvatar(result.avatarUrl ?? null);
    } catch (error: unknown) {
      const message = error && typeof error === "object" && "response" in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      setAvatarError(message || "Xóa avatar nhóm thất bại");
    } finally {
      setAvatarLoading(false);
    }
  };

  return (
    <aside className="hidden w-80 shrink-0 border-l bg-background xl:flex xl:flex-col">
      <div className="border-b px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Info size={16} />
          <span>Thông tin hội thoại</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <ChatAvatar src={avatar ?? undefined} name={displayName} size={20} />
            {!isDirect && (
              <button
                type="button"
                disabled={avatarLoading}
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-white shadow-md transition hover:bg-sky-600 disabled:opacity-60"
                title="Đổi avatar nhóm"
              >
                {avatarLoading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
              </button>
            )}
          </div>
          {!isDirect && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleGroupAvatarChange}
            />
          )}
          <h2 className="mt-3 max-w-full truncate text-base font-semibold">{displayName}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
          {avatarError && <p className="mt-2 text-xs text-red-500">{avatarError}</p>}
          {!isDirect && chatroom.avatar && (
            <button
              type="button"
              disabled={avatarLoading}
              onClick={handleDeleteGroupAvatar}
              className="mt-3 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
            >
              <Trash2 size={13} />
              Xóa avatar nhóm
            </button>
          )}
          {isDirect && (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <span
                className={cn(
                  "h-2 w-2 rounded-full",
                  otherMember?.isOnline ? "bg-green-500" : "bg-muted-foreground/40",
                )}
              />
              {otherMember?.isOnline ? "Đang hoạt động" : "Không hoạt động"}
            </div>
          )}
        </div>

        <div className="mt-6 space-y-3 rounded-lg border bg-muted/20 p-3 text-sm">
          <div className="flex items-start gap-3">
            <CalendarDays size={16} className="mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium">Ngày tạo</p>
              <p className="text-xs text-muted-foreground">{formatDate(chatroom.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock3 size={16} className="mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium">Hoạt động gần nhất</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(chatroom.lastActivityAt)}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield size={16} className="mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium">Trạng thái</p>
              <p className="text-xs text-muted-foreground">
                {chatroom.isArchived ? "Đã lưu trữ" : "Đang hoạt động"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Users size={16} />
            <span>Thành viên ({chatroom.members?.length ?? 0})</span>
          </div>
          <div className="space-y-2">
            {(chatroom.members ?? []).map((member) => (
              <div key={member.userId} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/60">
                <ChatAvatar src={member.avatar ?? undefined} name={member.fullname} size={8} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{member.fullname}</p>
                  <p className="truncate text-xs text-muted-foreground">@{member.username}</p>
                </div>
                {member.memberRole === "admin" && (
                  <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-600">
                    Admin
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
