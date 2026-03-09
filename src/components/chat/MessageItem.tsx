// src/components/chat/window/MessageItem.tsx
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import ChatAvatar from "./ChatAvatar";
import { formatMessageTime, formatDateDivider, isSameDay } from "@/lib/utils/chatFormatters";
import type { Message } from "@/lib/types/chatroom";

interface MessageItemProps {
  msg: Message;
  prevMsg?: Message;
  nextMsg?: Message;
  currentUserId: string;
  onDelete: (messageId: string) => void;
}

export default function MessageItem({ msg, prevMsg, nextMsg, currentUserId, onDelete }: MessageItemProps) {
  const isOwn  = msg.isOwn || msg.senderId === currentUserId;
  const isTemp = msg.messageId.startsWith("temp-");

  const showDateDivider = !prevMsg || !isSameDay(prevMsg.sentAt, msg.sentAt);
  const isGrouped       = !showDateDivider && prevMsg?.senderId === msg.senderId;
  // Show avatar only on last bubble of a group (other person's messages)
  const showAvatar = !isOwn && (!nextMsg || nextMsg.senderId !== msg.senderId);

  return (
    <div data-msg-id={msg.messageId}>
      {/* ── Date divider ── */}
      {showDateDivider && (
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground px-2">{formatDateDivider(msg.sentAt)}</span>
          <div className="flex-1 h-px bg-border" />
        </div>
      )}

      {/* ── Bubble row ── */}
      <div className={cn("flex items-end gap-2 group", isOwn ? "flex-row-reverse" : "flex-row", isGrouped ? "mt-0.5" : "mt-3")}>
        {/* Avatar slot — always reserves space for alignment */}
        <div className="w-7 h-7 shrink-0">
          {showAvatar && <ChatAvatar src={msg.senderAvatar} name={msg.senderFullname} size={7} />}
        </div>

        {/* Bubble + timestamp */}
        <div className={cn("flex flex-col max-w-[70%]", isOwn ? "items-end" : "items-start")}>
          <div
            className={cn(
              "relative px-3.5 py-2 rounded-2xl text-sm leading-relaxed transition-opacity",
              isOwn ? "bg-blue-500 text-white rounded-br-sm" : "bg-muted rounded-bl-sm",
              msg.isDeleted && "opacity-50 italic",
              isTemp && "opacity-60",
            )}
          >
            {msg.messageText}

            {isOwn && !msg.isDeleted && !isTemp && (
              <button
                onClick={() => onDelete(msg.messageId)}
                className="absolute -left-7 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity hover:text-red-500 hover:bg-red-50"
              >
                <Trash2 size={11} />
              </button>
            )}
          </div>

          <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
            {isTemp
              ? <span className="animate-pulse">Đang gửi...</span>
              : <>{formatMessageTime(msg.sentAt)}{msg.isEdited && " · Đã chỉnh sửa"}</>}
          </span>
        </div>
      </div>
    </div>
  );
}