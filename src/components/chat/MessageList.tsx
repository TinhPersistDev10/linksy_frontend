"use client";

import { useRef, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import type { ChatroomMemberResponse } from "@/lib/types/chatroom-member";
import MessageItem from "./MessageItem";
import TypingIndicator from "./TypingIndicator";
import ChatAvatar from "./ChatAvatar";
import type { MessageResponse } from "@/lib/types/message";
import { messagesApi } from "@/lib/api/messages";

const SCROLL_LOAD_THRESHOLD = 80; // px from top  -> fetch older msgs
const SCROLL_BOTTOM_THRESHOLD = 120; // px from bottom -> auto-scroll eligible

interface MessageListProps {
  messages: MessageResponse[];
  currentUserId: string;
  otherMember: ChatroomMemberResponse | undefined;
  typingUsers: { userId: string; username: string }[];
  loadingInitial: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  pageSize: number;
  onLoadMore: () => void;
  onDelete: (messageId: string) => void;
  /** Parent sets this ref so it can imperatively scroll to bottom */
  scrollToBottomRef: React.MutableRefObject<(() => void) | null>;
  /** Parent tracks whether auto-scroll should fire on new messages */
  onNearBottom: (near: boolean) => void;
  onShowDelivery?: (messageId: string) => void;
  onReply: (message: MessageResponse) => void;
  onEdit: (message: MessageResponse) => void;
  onCallAgain?: (callType: "audio" | "video") => void;
  canPin?: boolean;
  pinnedMessageIds?: Set<string>;
  onPin?: (messageId: string) => void;
  onUnpin?: (messageId: string) => void;
}

export default function MessageList({
  messages,
  currentUserId,
  otherMember,
  typingUsers,
  loadingInitial,
  loadingMore,
  hasMore,
  pageSize,
  onLoadMore,
  onDelete,
  onReply,
  onEdit,
  onCallAgain,
  scrollToBottomRef,
  onNearBottom,
  onShowDelivery,
  canPin = false,
  pinnedMessageIds,
  onPin,
  onUnpin,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll-anchor refs - keep position when prepending old messages
  const anchorIdRef = useRef<string | null>(null);
  const anchorOffsetRef = useRef(0);
  const prevLoadingMoreRef = useRef(false);

  // Expose scrollToBottom to parent
  useEffect(() => {
    scrollToBottomRef.current = () => {
      const container = containerRef.current;
      if (!container) return;
      container.scrollTop = container.scrollHeight;
    };
  });

  // Snapshot anchor the moment loadingMore flips true
  useEffect(() => {
    if (loadingMore && !prevLoadingMoreRef.current) {
      const container = containerRef.current;
      const firstMsg = container?.querySelector<HTMLElement>("[data-msg-id]");
      if (container && firstMsg) {
        anchorIdRef.current = firstMsg.dataset.msgId ?? null;
        anchorOffsetRef.current =
          firstMsg.getBoundingClientRect().top -
          container.getBoundingClientRect().top;
      }
    }
    prevLoadingMoreRef.current = loadingMore;
  }, [loadingMore]);

  // Restore scroll after prepend
  useEffect(() => {
    if (loadingMore || !anchorIdRef.current) return;
    const container = containerRef.current;
    const anchor = container?.querySelector<HTMLElement>(
      `[data-msg-id="${anchorIdRef.current}"]`,
    );
    if (container && anchor) {
      const newOffset =
        anchor.getBoundingClientRect().top -
        container.getBoundingClientRect().top;
      container.scrollTop += newOffset - anchorOffsetRef.current;
    }
    anchorIdRef.current = null;
  }, [loadingMore, messages]);

  // Scroll listener
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (el.scrollTop < SCROLL_LOAD_THRESHOLD && hasMore && !loadingMore)
      onLoadMore();
    onNearBottom(
      el.scrollHeight - el.scrollTop - el.clientHeight <
        SCROLL_BOTTOM_THRESHOLD,
    );
  }, [hasMore, loadingMore, onLoadMore, onNearBottom]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);
  const deliveredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    messages.forEach((msg) => {
      if (
        msg.messageType === "system" ||
        msg.senderId === currentUserId ||
        msg.messageId.startsWith("temp-") ||
        deliveredRef.current.has(msg.messageId)
      ) {
        return;
      }

      deliveredRef.current.add(msg.messageId);

      messagesApi.markDelivered(msg.messageId).catch(() => {
        deliveredRef.current.delete(msg.messageId);
      });
    });
  }, [messages, currentUserId]);
  return (
    <div
      ref={containerRef}
      data-message-list
      className="h-full min-h-0 space-y-1 overflow-y-auto overscroll-contain px-2 py-3 sm:px-4 sm:py-4"
    >
      {loadingInitial ? (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
          <ChatAvatar
            src={otherMember?.avatar ?? undefined}
            name={otherMember?.fullname || ""}
            size={14}
          />
          <p className="font-medium">{otherMember?.fullname}</p>
          <p className="text-sm text-muted-foreground">
            Hãy bắt đầu cuộc trò chuyện!‹
          </p>
        </div>
      ) : (
        <>
          {/* Top status bar */}
          <div className="flex items-center justify-center py-2 min-h-[32px]">
            {loadingMore ? (
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 size={14} className="animate-spin" />
                Đang tải tin nhắn cũ...
              </span>
            ) : !hasMore && messages.length >= pageSize ? (
              <p className="text-xs text-muted-foreground/60">
                Đây là tin nhắn đầu tiên trong cuộc trò chuyện
              </p>
            ) : null}
          </div>

          {/* Message bubbles */}
          {messages.map((msg, i) => (
            <MessageItem
              key={msg.messageId}
              msg={msg}
              prevMsg={messages[i - 1]}
              nextMsg={messages[i + 1]}
              currentUserId={currentUserId}
              onDelete={onDelete}
              onReply={onReply}
              onEdit={onEdit}
              onShowDelivery={onShowDelivery}
              onCallAgain={onCallAgain}
              canPin={canPin}
              isPinned={pinnedMessageIds?.has(msg.messageId) ?? false}
              onPin={onPin}
              onUnpin={onUnpin}
            />
          ))}

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <TypingIndicator
              avatarSrc={otherMember?.avatar ?? undefined}
              username={typingUsers[0].username}
            />
          )}

          <div ref={bottomRef} />
        </>
      )}
    </div>
  );
}
