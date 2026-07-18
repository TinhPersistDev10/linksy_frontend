"use client";

import { useState } from "react";
import { ArrowLeft, Info, Phone, Video } from "lucide-react";
import type {
  ChatroomMemberResponse,
  ChatroomResponse,
} from "@/lib/types/chatroom";
import { cn } from "@/lib/utils/cn";
import ChatAvatar from "./ChatAvatar";
import GroupMembersDialog from "./GroupMembersDialog";
import MemberProfileDialog from "./MemberProfileDialog";

interface ChatHeaderProps {
  chatroom: ChatroomResponse;
  otherMember: ChatroomMemberResponse | undefined;
  isConnected: boolean;
  onBack?: () => void;
  onAudioCall?: () => void;
  onVideoCall?: () => void;
  infoOpen?: boolean;
  onToggleInfo?: () => void;
  onOpenDirectChat?: (chatroom: ChatroomResponse) => void;
  onCallMember?: (userId: string, callType: "audio" | "video") => void;
  onMembersChanged?: () => void;
}

export default function ChatHeader({
  chatroom,
  otherMember,
  isConnected,
  onBack,
  onAudioCall,
  onVideoCall,
  infoOpen = false,
  onToggleInfo,
  onOpenDirectChat,
  onCallMember,
  onMembersChanged,
}: ChatHeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);

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

  const handlePhone = onAudioCall ?? showUnderDevelopment;
  const handleVideo = onVideoCall ?? showUnderDevelopment;

  return (
    <>
      <div className="flex shrink-0 items-center gap-2 border-b bg-background/80 px-3 py-2.5 backdrop-blur-sm sm:gap-3 sm:px-4 sm:py-3">
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
          disabled={!isGroup && !otherMember}
          onClick={() => {
            if (isGroup) setMembersOpen(true);
            else if (otherMember) setProfileOpen(true);
          }}
          className={cn(
            "rounded-full outline-none transition-transform focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2",
            isGroup || otherMember
              ? "cursor-pointer hover:scale-105"
              : "cursor-default",
          )}
          title={
            isGroup
              ? "Xem thành viên nhóm"
              : otherMember
                ? "Xem thông tin người dùng"
                : undefined
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

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <span
            className={cn(
              "mr-1 h-2 w-2 rounded-full transition-colors",
              isConnected ? "bg-green-500" : "bg-muted",
            )}
            title={isConnected ? "Realtime: Kết nối" : "Đang kết nối..."}
          />

          <button
            type="button"
            onClick={handlePhone}
            title={isGroup ? "Gọi thoại nhóm" : "Gọi thoại"}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent"
          >
            <Phone size={16} />
          </button>

          <button
            type="button"
            onClick={handleVideo}
            title={isGroup ? "Gọi video nhóm" : "Gọi video"}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent"
          >
            <Video size={16} />
          </button>

          <button
            type="button"
            onClick={onToggleInfo}
            title={
              infoOpen ? "Đóng thông tin hội thoại" : "Thông tin hội thoại"
            }
            aria-label={
              infoOpen ? "Đóng thông tin hội thoại" : "Thông tin hội thoại"
            }
            aria-pressed={infoOpen}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
              infoOpen
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent",
            )}
          >
            <Info size={16} />
          </button>
        </div>
      </div>

      <MemberProfileDialog
        open={profileOpen && !isGroup}
        member={otherMember ?? null}
        onClose={() => setProfileOpen(false)}
        onAudioCall={
          onAudioCall
            ? () => {
                setProfileOpen(false);
                onAudioCall();
              }
            : undefined
        }
        onVideoCall={
          onVideoCall
            ? () => {
                setProfileOpen(false);
                onVideoCall();
              }
            : undefined
        }
      />

      {isGroup && (
        <GroupMembersDialog
          open={membersOpen}
          chatroom={chatroom}
          onClose={() => setMembersOpen(false)}
          onOpenDirectChat={onOpenDirectChat}
          onCallMember={onCallMember}
          onMembersChanged={onMembersChanged}
        />
      )}
    </>
  );
}
