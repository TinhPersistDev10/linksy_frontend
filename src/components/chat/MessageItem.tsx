// src/components/chat/window/MessageItem.tsx
import { Check, CheckCheck, Eye, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import ChatAvatar from "./ChatAvatar";
import {
  formatMessageTime,
  formatDateDivider,
  isSameDay,
} from "@/lib/utils/chatFormatters";
import type { MessageResponse } from "@/lib/types/message";

interface MessageItemProps {
  msg: MessageResponse;
  prevMsg?: MessageResponse;
  nextMsg?: MessageResponse;
  currentUserId: string;
  onDelete: (messageId: string) => void;
  onShowDelivery?: (messageId: string) => void;
}

function getDeliveryLabel(msg: MessageResponse, isTemp: boolean) {
  if (isTemp) return "Đang gửi";

  switch (msg.deliveryStatus) {
    case "read":
      return "Đã xem";
    case "delivered":
      return "Đã nhận";
    case "sent":
    default:
      return "Đã gửi";
  }
}

function DeliveryIcon({ status }: { status?: string }) {
  if (status === "read") return <Eye size={13} className="text-sky-400" />;
  if (status === "delivered") return <CheckCheck size={13} />;
  return <Check size={13} />;
}

export default function MessageItem({
  msg,
  prevMsg,
  nextMsg,
  currentUserId,
  onDelete,
  onShowDelivery,
}: MessageItemProps) {
  const isOwn = msg.isOwn || msg.senderId === currentUserId;
  const isTemp = msg.messageId.startsWith("temp-");

  const showDateDivider = !prevMsg || !isSameDay(prevMsg.sentAt, msg.sentAt);
  const isGrouped = !showDateDivider && prevMsg?.senderId === msg.senderId;
  const showAvatar = !isOwn && (!nextMsg || nextMsg.senderId !== msg.senderId);
  const deliveryLabel = getDeliveryLabel(msg, isTemp);

  return (
    <div data-msg-id={msg.messageId}>
      {showDateDivider && (
        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="px-2 text-xs text-muted-foreground">
            {formatDateDivider(msg.sentAt)}
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
      )}

      <div
        className={cn(
          "group/message flex items-end gap-2",
          isOwn ? "flex-row-reverse" : "flex-row",
          isGrouped ? "mt-0.5" : "mt-3",
        )}
      >
        <div className="h-7 w-7 shrink-0">
          {showAvatar && (
            <ChatAvatar
              src={msg.senderAvatar ?? undefined}
              name={msg.senderFullname}
              size={7}
            />
          )}
        </div>

        <div
          className={cn(
            "flex max-w-[70%] flex-col",
            isOwn ? "items-end" : "items-start",
          )}
        >
          <div className="relative">
            <div
              className={cn(
                "relative rounded-2xl px-3.5 py-2 text-sm leading-relaxed transition-opacity",
                isOwn
                  ? "rounded-br-sm bg-blue-500 text-white"
                  : "rounded-bl-sm bg-muted",
                msg.isDeleted && "opacity-50 italic",
                isTemp && "opacity-60",
              )}
            >
              {msg.messageText}

              {isOwn && !msg.isDeleted && !isTemp && (
                <button
                  type="button"
                  onClick={() => onDelete(msg.messageId)}
                  className="absolute -left-7 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-muted text-muted-foreground opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover/message:opacity-100"
                >
                  <Trash2 size={11} />
                </button>
              )}
            </div>

            <div
              className={cn(
                "pointer-events-none absolute bottom-full z-20 mb-2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] text-background opacity-0 shadow-md transition-opacity group-hover/message:opacity-100",
                isOwn ? "right-0" : "left-0",
              )}
            >
              <span>{formatMessageTime(msg.sentAt)}</span>
              {msg.isEdited && <span>· đã chỉnh sửa</span>}
              {isOwn && (
                <span className="inline-flex items-center gap-1 pl-2">
                  <DeliveryIcon status={msg.deliveryStatus} />
                  {deliveryLabel}
                </span>
              )}
            </div>
          </div>

          {isOwn && !isTemp && (
            <button
              type="button"
              onClick={() => onShowDelivery?.(msg.messageId)}
              className="sr-only"
            >
              Xem trạng thái tin nhắn
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
