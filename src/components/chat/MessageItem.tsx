// src/components/chat/window/MessageItem.tsx
import {
  Check,
  CheckCheck,
  Copy,
  Eye,
  MoreHorizontal,
  Pencil,
  Reply,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import ChatAvatar from "./ChatAvatar";
import {
  formatMessageTime,
  formatDateDivider,
  isSameDay,
} from "@/lib/utils/chatFormatters";
import type { MessageResponse } from "@/lib/types/message";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface MessageItemProps {
  msg: MessageResponse;
  prevMsg?: MessageResponse;
  nextMsg?: MessageResponse;
  currentUserId: string;
  onDelete: (messageId: string) => void;
  onReply: (message: MessageResponse) => void;
  onEdit: (message: MessageResponse) => void;
  onShowDelivery?: (messageId: string) => void;
}

function getDeliveryLabel(msg: MessageResponse, isTemp: boolean) {
  if (isTemp) return "Đang gửi";

  if (msg.recipientCount > 1) {
    if (msg.readCount > 0) {
      return "Đã xem " + msg.readCount + "/" + msg.recipientCount;
    }
    if (msg.deliveredCount > 0) {
      return "Đã nhận " + msg.deliveredCount + "/" + msg.recipientCount;
    }
  }

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
  onReply,
  onEdit,
  onShowDelivery,
}: MessageItemProps) {
  const isOwn = msg.isOwn || msg.senderId === currentUserId;
  const isTemp = msg.messageId.startsWith("temp-");

  const showDateDivider = !prevMsg || !isSameDay(prevMsg.sentAt, msg.sentAt);
  if (msg.messageType === "system") {
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
        <div className="my-3 flex justify-center px-4">
          <span className="rounded-full bg-muted px-3 py-1 text-center text-xs text-muted-foreground">
            {msg.messageText}
          </span>
        </div>
      </div>
    );
  }

  const isGrouped = !showDateDivider && prevMsg?.senderId === msg.senderId;
  const showAvatar = !isOwn && (!nextMsg || nextMsg.senderId !== msg.senderId);
  const deliveryLabel = getDeliveryLabel(msg, isTemp);
  const deliveryIconStatus =
    msg.readCount > 0
      ? "read"
      : msg.deliveredCount > 0
        ? "delivered"
        : msg.deliveryStatus;

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
              {msg.parentMessage && (
                <div
                  className={cn(
                    "mb-1.5 rounded-md border-l-2 px-2 py-1 text-xs",
                    isOwn
                      ? "border-white/70 bg-white/10"
                      : "border-sky-500 bg-background/70",
                  )}
                >
                  <p className="truncate font-medium">
                    {msg.parentMessage.senderFullname}
                  </p>

                  <p className="line-clamp-1 opacity-80">
                    {msg.parentMessage.messageText}
                  </p>
                </div>
              )}

              <span>{msg.messageText}</span>
              {!isTemp && !msg.isDeleted && (
                <div
                  className={cn(
                    "absolute top-1/2 z-10 -translate-y-1/2",
                    isOwn ? "right-full mr-1" : "left-full ml-1",
                  )}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        title="Tùy chọn tin nhắn"
                        aria-label="Tùy chọn tin nhắn"
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full",
                          "bg-background text-muted-foreground shadow-sm",
                          "opacity-0 transition-opacity",
                          "hover:bg-muted hover:text-foreground",
                          "focus-visible:opacity-100 focus-visible:outline-none",
                          "group-hover/message:opacity-100",
                          "data-[state=open]:opacity-100",
                        )}
                      >
                        <MoreHorizontal size={15} />
                      </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                      side={isOwn ? "left" : "right"}
                      align="center"
                      className="w-44"
                    >
                      <DropdownMenuItem onSelect={() => onReply(msg)}>
                        <Reply />
                        Trả lời
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        onSelect={() => {
                          void navigator.clipboard.writeText(msg.messageText);
                        }}
                      >
                        <Copy />
                        Sao chép
                      </DropdownMenuItem>

                      {isOwn && (
                        <>
                          <DropdownMenuItem onSelect={() => onEdit(msg)}>
                            <Pencil />
                            Chỉnh sửa
                          </DropdownMenuItem>

                          {onShowDelivery && (
                            <DropdownMenuItem
                              onSelect={() => onShowDelivery(msg.messageId)}
                            >
                              <Eye />
                              Xem trạng thái
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => onDelete(msg.messageId)}
                          >
                            <Trash2 />
                            Xóa tin nhắn
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
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
                  <DeliveryIcon status={deliveryIconStatus} />
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
