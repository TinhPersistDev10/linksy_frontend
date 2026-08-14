"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Send, X } from "lucide-react";
import { messagesApi } from "@/lib/api/messages";
import type { MessageResponse } from "@/lib/types/message";
import { cn } from "@/lib/utils/cn";
import ChatAvatar from "./ChatAvatar";
import { formatMessageTime } from "@/lib/utils/chatFormatters";

interface MessageThreadPanelProps {
  open: boolean;
  rootMessage: MessageResponse | null;
  currentUserId: string;
  liveMessages: MessageResponse[];
  sending?: boolean;
  onClose: () => void;
  onSendReply: (text: string, parentMessageId: string) => Promise<void>;
  onOpenThread: (message: MessageResponse) => void;
}

function previewText(message: MessageResponse) {
  if (message.messageType === "audio" || message.messageType === "voice")
    return "Tin nhắn thoại";
  if (message.messageType === "poll")
    return message.poll?.question || message.messageText || "Bình chọn";
  if (message.messageType === "image") return "Ảnh";
  if (message.messageType === "video") return "Video";
  if (message.messageType === "file") return "Tệp đính kèm";
  if (message.messageType === "sticker") return "Sticker";
  return message.messageText || "Tin nhắn";
}

export default function MessageThreadPanel({
  open,
  rootMessage,
  currentUserId,
  liveMessages,
  sending = false,
  onClose,
  onSendReply,
  onOpenThread,
}: MessageThreadPanelProps) {
  const [replies, setReplies] = useState<MessageResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [replyTarget, setReplyTarget] = useState<MessageResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadReplies = useCallback(async (messageId: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await messagesApi.getReplies(messageId);
      setReplies(data);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Không thể tải chuỗi trả lời.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !rootMessage) {
      setReplies([]);
      setDraft("");
      setReplyTarget(null);
      return;
    }
    setReplyTarget(rootMessage);
    setDraft("");
    void loadReplies(rootMessage.messageId);
  }, [open, rootMessage, loadReplies]);

  useEffect(() => {
    if (!open || !rootMessage) return;
    const extras = liveMessages.filter(
      (message) =>
        message.parentMessageId === rootMessage.messageId &&
        !message.messageId.startsWith("temp-"),
    );
    if (extras.length === 0) return;
    setReplies((prev) => {
      const byId = new Map(prev.map((item) => [item.messageId, item]));
      for (const extra of extras) {
        byId.set(extra.messageId, extra);
      }
      return [...byId.values()].sort(
        (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
      );
    });
  }, [liveMessages, open, rootMessage]);

  if (!open || !rootMessage) return null;

  const parentId = replyTarget?.messageId ?? rootMessage.messageId;
  const canSend = draft.trim().length > 0 && !sending;

  const handleSubmit = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    await onSendReply(text, parentId);
    setDraft("");
    setReplyTarget(rootMessage);
  };

  return (
    <aside className="flex w-[22rem] shrink-0 flex-col border-l bg-background">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Chuỗi trả lời</p>
          <p className="text-xs text-muted-foreground">
            {replies.length} phản hồi
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng chuỗi trả lời"
          className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X size={16} />
        </button>
      </div>

      <div className="border-b px-4 py-3">
        <div className="flex items-start gap-2">
          <ChatAvatar
            src={rootMessage.senderAvatar ?? undefined}
            name={rootMessage.senderFullname}
            size={8}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {rootMessage.senderFullname || rootMessage.senderUsername}
            </p>
            <p className="mt-0.5 line-clamp-3 text-sm text-muted-foreground">
              {previewText(rootMessage)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {formatMessageTime(rootMessage.sentAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : loadError ? (
          <p className="text-sm text-red-600">{loadError}</p>
        ) : replies.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Chưa có trả lời. Hãy là người đầu tiên.
          </p>
        ) : (
          replies.map((reply) => {
            const isOwn = reply.isOwn || reply.senderId === currentUserId;
            return (
              <div key={reply.messageId} className="flex items-start gap-2">
                <ChatAvatar
                  src={reply.senderAvatar ?? undefined}
                  name={reply.senderFullname}
                  size={7}
                />
                <div className="min-w-0 flex-1">
                  <div
                    className={cn(
                      "rounded-2xl px-3 py-2",
                      isOwn ? "bg-sky-500 text-white" : "bg-muted",
                    )}
                  >
                    <p className="text-xs font-medium opacity-80">
                      {reply.senderFullname || reply.senderUsername}
                    </p>
                    <p className="mt-0.5 whitespace-pre-wrap break-words text-sm">
                      {previewText(reply)}
                    </p>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{formatMessageTime(reply.sentAt)}</span>
                    <button
                      type="button"
                      onClick={() => setReplyTarget(reply)}
                      className="font-medium hover:underline"
                    >
                      Trả lời
                    </button>
                    {(reply.replyCount ?? 0) > 0 && (
                      <button
                        type="button"
                        onClick={() => onOpenThread(reply)}
                        className="font-medium text-sky-600 hover:underline dark:text-sky-400"
                      >
                        {reply.replyCount} trả lời
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t px-3 py-3">
        {replyTarget && replyTarget.messageId !== rootMessage.messageId && (
          <div className="mb-2 flex items-center justify-between rounded-md bg-muted px-2 py-1 text-xs">
            <span className="truncate">
              Trả lời {replyTarget.senderFullname || replyTarget.senderUsername}
            </span>
            <button
              type="button"
              onClick={() => setReplyTarget(rootMessage)}
              className="ml-2 text-muted-foreground hover:text-foreground"
            >
              <X size={12} />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSubmit();
              }
            }}
            rows={1}
            placeholder="Viết trả lời..."
            className="max-h-24 min-h-9 flex-1 resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-400/30"
          />
          <button
            type="button"
            disabled={!canSend}
            onClick={() => void handleSubmit()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500 text-white disabled:opacity-50"
            aria-label="Gửi trả lời"
          >
            {sending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
