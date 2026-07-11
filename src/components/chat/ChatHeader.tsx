"use client";

/**
 * ChatHeader.tsx  ← THAY THẾ file cũ
 *
 * THAY ĐỔI so với bản gốc:
 *   - Nhận thêm props: onAudioCall, onVideoCall (optional)
 *   - Nút Phone và Video gọi props đó thay vì showUnderDevelopment
 *   - MoreVertical vẫn giữ showUnderDevelopment
 *   - Không thay đổi bất kỳ UI/logic nào khác
 */

import { useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  IdCard,
  MoreVertical,
  Phone,
  UserRound,
  Users,
  Video,
  X,
} from "lucide-react";
import type { ChatroomMemberResponse, ChatroomResponse } from "@/lib/types/chatroom";
import { cn } from "@/lib/utils/cn";
import ChatAvatar from "./ChatAvatar";

interface ChatHeaderProps {
  chatroom: ChatroomResponse;
  otherMember: ChatroomMemberResponse | undefined;
  isConnected: boolean;
  onBack?: () => void;
  // ↓↓↓ THÊM MỚI ↓↓↓
  onAudioCall?: () => void;
  onVideoCall?: () => void;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Chưa có dữ liệu";
  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ChatHeader({
  chatroom,
  otherMember,
  isConnected,
  onBack,
  onAudioCall,
  onVideoCall,
}: ChatHeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false);

  const showUnderDevelopment = () => {
    window.alert("Chức năng hiện đang phát triển");
  };

  const isGroup = chatroom.roomType === "group";
  const displayName = isGroup
    ? chatroom.roomName || "Nhóm chưa đặt tên"
    : otherMember?.fullname || chatroom.roomName;
  const avatar = isGroup ? chatroom.avatar : otherMember?.avatar;
  const subtitle = isGroup
    ? `${chatroom.members?.length ?? 0} thành viên`
    : otherMember?.isOnline
      ? "Đang hoạt động"
      : `@${otherMember?.username ?? ""}`;

  // Nút Phone và Video chỉ có handler thật khi là chat 1-1
  const handlePhone = isGroup || !onAudioCall ? showUnderDevelopment : onAudioCall;
  const handleVideo = isGroup || !onVideoCall ? showUnderDevelopment : onVideoCall;

  return (
    <>
      <div className="flex shrink-0 items-center gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur-sm">
        {onBack && (
          <button
            onClick={onBack}
            className="rounded-lg p-1 hover:bg-accent md:hidden"
          >
            <ArrowLeft size={18} />
          </button>
        )}

        <button
          type="button"
          disabled={isGroup || !otherMember}
          onClick={() => setProfileOpen(true)}
          className={cn(
            "rounded-full outline-none transition-transform focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2",
            !isGroup && otherMember
              ? "cursor-pointer hover:scale-105"
              : "cursor-default",
          )}
          title={
            !isGroup && otherMember ? "Xem thông tin người dùng" : undefined
          }
        >
          <ChatAvatar src={avatar ?? undefined} name={displayName} />
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{displayName}</p>
          <p
            className={cn(
              "text-xs text-muted-foreground",
              !isGroup && otherMember?.isOnline && "text-green-500",
            )}
          >
            {subtitle}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <span
            className={cn(
              "mr-1 h-2 w-2 rounded-full transition-colors",
              isConnected ? "bg-green-500" : "bg-muted",
            )}
            title={isConnected ? "Realtime: Kết nối" : "Đang kết nối..."}
          />

          {/* Phone */}
          <button
            type="button"
            onClick={handlePhone}
            title={isGroup ? "Chức năng đang phát triển" : "Gọi thoại"}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent"
          >
            <Phone size={16} />
          </button>

          {/* Video */}
          <button
            type="button"
            onClick={handleVideo}
            title={isGroup ? "Chức năng đang phát triển" : "Gọi video"}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent"
          >
            <Video size={16} />
          </button>

          {/* More */}
          <button
            type="button"
            onClick={showUnderDevelopment}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent"
          >
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      {profileOpen && otherMember && !isGroup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setProfileOpen(false)}
        >
          <article
            className="w-full max-w-[420px] overflow-hidden rounded-md bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex h-12 items-center justify-between border-b border-slate-100 px-4">
              <h3 className="font-semibold text-slate-900">
                Thông tin tài khoản
              </h3>
              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="rounded-full p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <X size={22} />
              </button>
            </header>

            <div className="px-5 py-6">
              <div className="flex flex-col items-center text-center">
                <ChatAvatar
                  src={otherMember.avatar ?? undefined}
                  name={displayName}
                  size={20}
                />
                <p className="mt-3 text-lg font-semibold text-slate-900">
                  {displayName}
                </p>
                <p className="text-sm text-slate-500">
                  @{otherMember.username}
                </p>
                <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      otherMember.isOnline ? "bg-green-500" : "bg-slate-300",
                    )}
                  />
                  {otherMember.isOnline ? "Đang hoạt động" : "Không hoạt động"}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 px-5 py-4">
              <h4 className="mb-3 font-semibold text-slate-900">
                Thông tin cá nhân
              </h4>
              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex items-center gap-3">
                  <UserRound size={16} className="text-slate-400" />
                  <span>Họ tên: {otherMember.fullname}</span>
                </div>
                <div className="flex items-center gap-3">
                  <IdCard size={16} className="text-slate-400" />
                  <span>Username: @{otherMember.username}</span>
                </div>
                <div className="flex items-center gap-3">
                  <CalendarDays size={16} className="text-slate-400" />
                  <span>Tham gia chat: {formatDate(otherMember.joinedAt)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users size={16} className="text-slate-400" />
                  <span>Vai trò: {otherMember.memberRole}</span>
                </div>
              </div>
            </div>
          </article>
        </div>
      )}
    </>
  );
}