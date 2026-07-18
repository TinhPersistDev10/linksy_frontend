import { useState } from "react";
import {
  Check,
  CheckCheck,
  Copy,
  Eye,
  MoreVertical,
  Pencil,
  Phone,
  PhoneCall,
  Pin,
  PinOff,
  Reply,
  Smile,
  SmilePlus,
  Trash2,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import ChatAvatar from "./ChatAvatar";
import {
  formatMessageTime,
  formatDateDivider,
  formatCallDuration,
  formatCallOccurredAt,
  isSameDay,
} from "@/lib/utils/chatFormatters";
import type { MessageResponse } from "@/lib/types/message";
import { parseCallLogPayload } from "@/lib/types/call";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import MentionedText from "./MentionedText";
import MessageReactions from "./MessageReactions";
import EmojiPickerPopover, {
  QUICK_REACTION_EMOJIS,
} from "./EmojiPickerPopover";

interface MessageItemProps {
  msg: MessageResponse;
  prevMsg?: MessageResponse;
  nextMsg?: MessageResponse;
  currentUserId: string;
  onDelete: (messageId: string) => void;
  onReply: (message: MessageResponse) => void;
  onEdit: (message: MessageResponse) => void;
  onShowDelivery?: (messageId: string) => void;
  onCallAgain?: (callType: "audio" | "video") => void;
  canPin?: boolean;
  isPinned?: boolean;
  onPin?: (messageId: string) => void;
  onUnpin?: (messageId: string) => void;
  onToggleReaction?: (messageId: string, emojiCode: string) => void;
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

function getAttachmentUrl(attachment: NonNullable<MessageResponse["attachments"]>[number]) {
  return attachment.cdnUrl ?? attachment.fileUrl ?? "";
}

function getCallInfo(msg: MessageResponse, isOwn: boolean) {
  if (msg.messageType !== "call_log") return null;

  const payload = parseCallLogPayload(msg.messageText ?? "");
  if (!payload) return null;

  const { callType, status, durationSec } = payload;
  const direction: "incoming" | "outgoing" = isOwn ? "outgoing" : "incoming";
  const typeLabel = callType === "video" ? "Cuộc gọi video" : "Cuộc gọi thoại";
  const isGroup = Boolean(payload.isGroup);

  let label: string;
  let statusText: string;
  let durationText = "";

  if (isGroup) {
    const callerName = payload.callerName?.trim() || msg.senderFullname || "Ai đó";
    const roomName = payload.chatroomName?.trim() || "nhóm";
    label = `${callerName} đã bắt đầu cuộc gọi nhóm ${roomName}`;
  } else if (status === "missed") {
    label = isOwn ? `${typeLabel} không trả lời` : `${typeLabel} nhỡ`;
  } else if (status === "rejected") {
    label = isOwn ? `${typeLabel} bị từ chối` : `Bạn đã từ chối ${typeLabel.toLowerCase()}`;
  } else {
    label = `${typeLabel} ${direction === "incoming" ? "đến" : "đi"}`;
  }

  if (status === "missed") {
    statusText = isOwn ? "Không có ai trả lời" : "Cuộc gọi nhỡ";
  } else if (status === "rejected") {
    statusText = isOwn ? "Bị từ chối" : "Bạn đã từ chối";
  } else {
    statusText = "Đã kết thúc";
    durationText = formatCallDuration(durationSec);
  }

  const occurredAt = formatCallOccurredAt(payload.startedAt ?? msg.sentAt);

  return { callType, direction, label, statusText, durationText, occurredAt };
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
  onCallAgain,
  canPin = false,
  isPinned = false,
  onPin,
  onUnpin,
  onToggleReaction,
}: MessageItemProps) {
  const [reactionOpen, setReactionOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isOwn = msg.isOwn || msg.senderId === currentUserId;
  const isTemp = msg.messageId.startsWith("temp-");
  const canReact = Boolean(onToggleReaction) && !isTemp && !msg.isDeleted;
  const showActions = !isTemp && !msg.isDeleted;
  const actionsVisible = reactionOpen || menuOpen;

  const showDateDivider = !prevMsg || !isSameDay(prevMsg.sentAt, msg.sentAt);
  const callInfo = getCallInfo(msg, isOwn);
  if (callInfo) {
    const Icon = callInfo.callType === "video" ? Video : Phone;
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
            "mt-3",
          )}
        >
          <div className="h-7 w-7 shrink-0">
            {!isOwn && (
              <ChatAvatar
                src={msg.senderAvatar ?? undefined}
                name={msg.senderFullname}
                size={7}
              />
            )}
          </div>

          <div
            className={cn(
              "w-64 max-w-[calc(100vw-5rem)] overflow-hidden rounded-lg border text-sm shadow-sm sm:w-72",
              isOwn
                ? "border-blue-200 bg-blue-50 text-slate-800"
                : "border-border bg-background",
            )}
          >
            <div className="px-3.5 pb-2.5 pt-3">
              <p className="font-semibold text-slate-800">{callInfo.label}</p>
              <div className="mt-2 flex items-center gap-2 text-muted-foreground">
                <Icon size={17} className="shrink-0" />
                <span className="min-w-0 truncate">
                  {callInfo.statusText}
                </span>
              </div>
              {callInfo.durationText && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Thời lượng: {callInfo.durationText}
                </p>
              )}
              {callInfo.occurredAt && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Thời gian: {callInfo.occurredAt}
                </p>
              )}
            </div>
            <div className="border-t border-border/80">
              <button
                type="button"
                onClick={() => onCallAgain?.(callInfo.callType)}
                className="flex h-10 w-full items-center justify-center gap-2 font-medium text-blue-600 transition-colors hover:bg-blue-50"
              >
                <PhoneCall size={16} />
                Gọi lại
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            "flex max-w-[82%] flex-col sm:max-w-[70%]",
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
                isPinned && "ring-1 ring-sky-400/60",
              )}
            >
              {isPinned && (
                <div
                  className={cn(
                    "mb-1 flex items-center gap-1 text-[10px] font-medium",
                    isOwn ? "text-white/80" : "text-sky-700",
                  )}
                >
                  <Pin size={10} />
                  Đã ghim
                </div>
              )}
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

              {msg.attachments && msg.attachments.length > 0 && (
                <div className="mb-1.5 space-y-1.5">
                  {msg.attachments.map((attachment) => {
                    const url = getAttachmentUrl(attachment);
                    if (!url) return null;

                    const key = attachment.attachmentId ?? url;
                    const attachmentType =
                      attachment.attachmentType ??
                      attachment.fileType ??
                      (attachment.mimeType?.startsWith("image/")
                        ? "image"
                        : attachment.mimeType?.startsWith("video/")
                          ? "video"
                          : attachment.mimeType?.startsWith("audio/")
                            ? "audio"
                            : "file");

                    if (attachmentType === "image") {
                      return (
                        <a
                          key={key}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          title={`Mở ${attachment.fileName}`}
                          aria-label={`Mở ảnh ${attachment.fileName}`}
                          className="block cursor-zoom-in"
                        >
                          <img
                            src={url}
                            alt={attachment.fileName}
                            className="max-h-72 max-w-full rounded-lg object-cover"
                          />
                        </a>
                      );
                    }

                    if (attachmentType === "video") {
                      return (
                        <video
                          key={key}
                          src={url}
                          controls
                          className="max-h-72 max-w-full rounded-lg"
                        />
                      );
                    }

                    if (attachmentType === "audio") {
                      return (
                        <audio
                          key={key}
                          src={url}
                          controls
                          className="max-w-full"
                        />
                      );
                    }

                    return (
                      <a
                        key={key}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        download={attachment.fileName}
                        className={cn(
                          "block max-w-72 truncate rounded-md border px-2 py-1 underline",
                          isOwn ? "border-white/30" : "border-border",
                        )}
                      >
                        {attachment.fileName}
                      </a>
                    );
                  })}
                </div>
              )}

              {msg.messageText && (
                <MentionedText
                  text={msg.messageText}
                  mentions={msg.mentions}
                  currentUserId={currentUserId}
                  isOwn={isOwn}
                />
              )}
              {showActions && (
                <div
                  className={cn(
                    "absolute top-1/2 z-20 flex -translate-y-1/2 items-center gap-0.5",
                    "opacity-0 transition-opacity",
                    "group-hover/message:opacity-100 focus-within:opacity-100",
                    actionsVisible && "opacity-100",
                    isOwn
                      ? "right-full mr-1 flex-row-reverse"
                      : "left-full ml-1",
                  )}
                >
                  {canReact && (
                    <Popover open={reactionOpen} onOpenChange={setReactionOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          title="Cảm xúc"
                          aria-label="Cảm xúc"
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full border bg-background",
                            "text-muted-foreground shadow-sm",
                            "hover:bg-muted hover:text-foreground",
                          )}
                        >
                          <Smile size={15} />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        side="top"
                        align={isOwn ? "end" : "start"}
                        sideOffset={8}
                        className="w-auto rounded-full border bg-background p-1 shadow-md"
                      >
                        <div className="flex items-center gap-0.5">
                          {QUICK_REACTION_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              title={`React ${emoji}`}
                              onClick={() => {
                                onToggleReaction?.(msg.messageId, emoji);
                                setReactionOpen(false);
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-full text-base hover:bg-muted"
                            >
                              {emoji}
                            </button>
                          ))}
                          <EmojiPickerPopover
                            side="top"
                            align={isOwn ? "end" : "start"}
                            onSelect={(emoji) => {
                              onToggleReaction?.(msg.messageId, emoji);
                              setReactionOpen(false);
                            }}
                          >
                            <button
                              type="button"
                              title="Thêm emoji"
                              aria-label="Thêm emoji"
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:text-foreground"
                            >
                              <SmilePlus size={16} />
                            </button>
                          </EmojiPickerPopover>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}

                  <button
                    type="button"
                    title="Trả lời"
                    aria-label="Trả lời"
                    onClick={() => onReply(msg)}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full border bg-background",
                      "text-muted-foreground shadow-sm",
                      "hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Reply size={15} />
                  </button>

                  <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        title="Tùy chọn tin nhắn"
                        aria-label="Tùy chọn tin nhắn"
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-full border bg-background",
                          "text-muted-foreground shadow-sm",
                          "hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <MoreVertical size={15} />
                      </button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                      side={isOwn ? "left" : "right"}
                      align="center"
                      className="w-44"
                    >
                      <DropdownMenuItem
                        onSelect={() => {
                          void navigator.clipboard.writeText(msg.messageText);
                        }}
                      >
                        <Copy />
                        Sao chép
                      </DropdownMenuItem>

                      {canPin && (
                        <DropdownMenuItem
                          onSelect={() =>
                            isPinned
                              ? onUnpin?.(msg.messageId)
                              : onPin?.(msg.messageId)
                          }
                        >
                          {isPinned ? <PinOff /> : <Pin />}
                          {isPinned ? "Bỏ ghim" : "Ghim tin nhắn"}
                        </DropdownMenuItem>
                      )}

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

          {msg.reactions && msg.reactions.length > 0 && (
            <div className={cn("mt-1", isOwn ? "self-end" : "self-start")}>
              <MessageReactions
                reactions={msg.reactions}
                disabled={!canReact}
                alignEnd={isOwn}
                onToggle={(emoji) =>
                  onToggleReaction?.(msg.messageId, emoji)
                }
              />
            </div>
          )}

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
