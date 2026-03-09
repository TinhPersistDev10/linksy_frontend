// src/components/chat/ChatHeader.tsx
import { Phone, Video, MoreVertical, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import ChatAvatar from "./ChatAvatar";
import type { Chatroom, ChatroomMember } from "@/lib/types/chatroom";

interface ChatHeaderProps {
  chatroom:    Chatroom;
  otherMember: ChatroomMember | undefined;
  isConnected: boolean;
  onBack?:     () => void;
}

export default function ChatHeader({ chatroom, otherMember, isConnected, onBack }: ChatHeaderProps) {
  const displayName = otherMember?.fullname || chatroom.roomName;

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b bg-background/80 backdrop-blur-sm shrink-0">
      {onBack && (
        <button onClick={onBack} className="md:hidden p-1 rounded-lg hover:bg-accent">
          <ArrowLeft size={18} />
        </button>
      )}

      <ChatAvatar src={otherMember?.avatar} name={displayName} />

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{displayName}</p>
        <p className="text-xs text-muted-foreground">
          {otherMember?.isOnline
            ? <span className="text-green-500">● Đang hoạt động</span>
            : `@${otherMember?.username}`}
        </p>
      </div>

      <div className="flex items-center gap-1">
        <span
          className={cn("w-2 h-2 rounded-full mr-1 transition-colors", isConnected ? "bg-green-500" : "bg-muted")}
          title={isConnected ? "Realtime: Kết nối" : "Đang kết nối..."}
        />
        {([Phone, Video, MoreVertical] as const).map((Icon, i) => (
          <button key={i} className="w-8 h-8 rounded-full hover:bg-accent flex items-center justify-center text-muted-foreground transition-colors">
            <Icon size={16} />
          </button>
        ))}
      </div>
    </div>
  );
}