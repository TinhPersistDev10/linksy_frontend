// src/components/chat/hooks/useMessages.ts
"use client";

import { useState, useCallback, useRef } from "react";
import { messagesApi } from "@/lib/api/messages";
import type {
  AllMessagesReadEvent,
  MessageDeliveredEvent,
  MessageDeletedEvent,
  MessageEditedEvent,
  MessageReadEvent,
  MessageResponse,
} from "../types/message";

export const PAGE_SIZE = 30;

export function useMessages(chatroomId: string | undefined) {
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  //attachments
  

  const shouldScrollToBottomRef = useRef(true);

  const loadInitial = useCallback(async () => {
    if (!chatroomId) return;
    setLoadingInitial(true);
    setMessages([]);
    setPage(1);
    setHasMore(true);
    shouldScrollToBottomRef.current = true;
    try {
      const data = await messagesApi.getMessages(chatroomId, 1, PAGE_SIZE);
      setMessages(data.messages);
      setHasMore(data.hasMore);
    } catch (e) {
      console.error("[useMessages] loadInitial:", e);
    } finally {
      setLoadingInitial(false);
    }
  }, [chatroomId]);

  const loadMore = useCallback(async () => {
    if (!chatroomId || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const older = await messagesApi.getMessages(
        chatroomId,
        nextPage,
        PAGE_SIZE,
      );
      setHasMore(older.hasMore);

      if (older.messages.length > 0) {
        setMessages((prev) => [...older.messages, ...prev]);
        setPage(nextPage);
      }
    } catch (e) {
      console.error("[useMessages] loadMore:", e);
    } finally {
      setLoadingMore(false);
    }
  }, [chatroomId, loadingMore, hasMore, page]);

  const receiveMessage = useCallback((msg: MessageResponse) => {
    setMessages((prev) => {
      // Xóa optimistic message khi server xác nhận message của chính user.
      const base = msg.isOwn
        ? prev.filter((message) => !message.messageId.startsWith("temp-"))
        : prev;

      // SignalR có thể gửi lại cùng event khi reconnect.
      // Kiểm tra trước để không tăng replyCount nhiều lần.
      if (base.some((message) => message.messageId === msg.messageId)) {
        return base;
      }
      return [...base, msg];
    });

    shouldScrollToBottomRef.current = true;
  }, []);

  const onMessageDeleted = useCallback((event: MessageDeletedEvent) => {
    setMessages((previous) => {
      return previous.map((message) => {
        if (message.messageId === event.messageId) {
          return {
            ...message,
            isDeleted: true,
            deletedAt: event.deletedAt,
            messageText: "Tin nhắn đã bị xóa",
          };
        }

        if (message.parentMessage?.messageId === event.messageId) {
          return {
            ...message,
            parentMessage: {
              ...message.parentMessage,
              isDeleted: true,
              deletedAt: event.deletedAt,
              messageText: "Tin nhắn đã bị xóa",
            },
          };
        }
        return message;
      });
    });
  }, []);

  const onMessageEdited = useCallback((event: MessageEditedEvent) => {
    setMessages((previous) =>
      previous.map((message) => {
        if (message.messageId === event.messageId) {
          return {
            ...message,
            messageText: event.messageText,
            isEdited: event.isEdited,
            editedAt: event.editedAt,
          };
        }

        if (message.parentMessage?.messageId === event.messageId) {
          return {
            ...message,
            parentMessage: {
              ...message.parentMessage,
              messageText: event.messageText,
              isEdited: event.isEdited,
              editedAt: event.editedAt,
            },
          };
        }

        return message;
      }),
    );
  }, []);

  const applyDeliverySummary = useCallback(
    (summary: MessageReadEvent["message"]) => {
      setMessages((previous) =>
        previous.map((message) =>
          message.messageId === summary.messageId
            ? { ...message, ...summary }
            : message,
        ),
      );
    },
    [],
  );

  const onMessageRead = useCallback(
    (event: MessageReadEvent) => {
      applyDeliverySummary(event.message);
    },
    [applyDeliverySummary],
  );

  const onMessageDelivered = useCallback(
    (event: MessageDeliveredEvent) => {
      applyDeliverySummary(event.message);
    },
    [applyDeliverySummary],
  );

  const onAllMessagesRead = useCallback((event: AllMessagesReadEvent) => {
    const summaries = new Map(
      event.messages.map((summary) => [summary.messageId, summary]),
    );
    setMessages((previous) =>
      previous.map((message) => {
        const summary = summaries.get(message.messageId);
        return summary ? { ...message, ...summary } : message;
      }),
    );
  }, []);

  // -- Optimistic helpers -----------------------------------------------------
  const appendOptimistic = useCallback((msg: MessageResponse) => {
    setMessages((prev) => {
      const existingIndex = prev.findIndex(
        (message) => message.messageId === msg.messageId,
      );

      // REST trả về và SignalR ReceiveMessage có thể đến theo thứ tự khác nhau.
      // Giữ một bản ghi duy nhất theo messageId; nếu SignalR đã thêm trước thì
      // dùng dữ liệu REST mới nhất thay vì thêm một bubble thứ hai.
      if (existingIndex >= 0) {
        return prev.map((message, index) =>
          index === existingIndex ? { ...message, ...msg } : message,
        );
      }

      return [...prev, msg];
    });
    shouldScrollToBottomRef.current = true;
  }, []);

  const replaceOptimistic = useCallback(
    (tempId: string, confirmed: MessageResponse) => {
      setMessages((prev) =>
        prev.map((m) => (m.messageId === tempId ? confirmed : m)),
      );
    },
    [],
  );

  const removeOptimistic = useCallback((tempId: string) => {
    setMessages((prev) => prev.filter((m) => m.messageId !== tempId));
  }, []);

  return {
    messages,
    hasMore,
    loadingInitial,
    loadingMore,
    shouldScrollToBottomRef,
    loadInitial,
    loadMore,
    receiveMessage,
    onMessageDeleted,
    onMessageEdited,
    onMessageRead,
    onMessageDelivered,
    onAllMessagesRead,
    appendOptimistic,
    replaceOptimistic,
    removeOptimistic,
  };
}
