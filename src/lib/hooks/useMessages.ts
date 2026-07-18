// src/components/chat/hooks/useMessages.ts
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { messagesApi } from "@/lib/api/messages";
import type {
  AllMessagesReadEvent,
  MessageDeliveredEvent,
  MessageDeletedEvent,
  MessageEditedEvent,
  MessageReadEvent,
  MessageResponse,
  ReactionSummary,
  ReactionUpdatedEvent,
} from "../types/message";

export const PAGE_SIZE = 30;

function normalizeReactionSummary(raw: unknown): ReactionSummary {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    emojiCode: String(r.emojiCode ?? r.EmojiCode ?? ""),
    count: Number(r.count ?? r.Count ?? 0),
    reactedByMe: Boolean(r.reactedByMe ?? r.ReactedByMe ?? false),
    users: Array.isArray(r.users)
      ? (r.users as ReactionSummary["users"])
      : Array.isArray(r.Users)
        ? (r.Users as ReactionSummary["users"])
        : [],
  };
}

function scrollToMessageElement(messageId: string): boolean {
  const el = document.querySelector<HTMLElement>(
    `[data-msg-id="${messageId}"]`,
  );
  if (!el) return false;

  // Chỉ scroll trong message list — tránh scrollIntoView kéo cả trang
  // khiến ô input bị đẩy lên và để lại khoảng trống phía dưới.
  const container = el.closest<HTMLElement>("[data-message-list]");
  if (container) {
    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const delta =
      elRect.top -
      containerRect.top -
      container.clientHeight / 2 +
      elRect.height / 2;
    container.scrollTop += delta;

    // Reset mọi scroll ancestor ngoài list (nếu bị lệch từ lần scroll trước).
    let parent = container.parentElement;
    while (parent) {
      if (parent.scrollTop !== 0) parent.scrollTop = 0;
      parent = parent.parentElement;
    }
    if (window.scrollY !== 0) window.scrollTo(0, 0);
  }

  el.classList.add("ring-2", "ring-sky-400");
  window.setTimeout(() => {
    el.classList.remove("ring-2", "ring-sky-400");
  }, 1200);
  return true;
}

export function useMessages(chatroomId: string | undefined) {
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [jumping, setJumping] = useState(false);

  const shouldScrollToBottomRef = useRef(true);
  const pendingJumpIdRef = useRef<string | null>(null);
  const messagesRef = useRef<MessageResponse[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const loadInitial = useCallback(async () => {
    if (!chatroomId) return;
    setLoadingInitial(true);
    setMessages([]);
    setPage(1);
    setHasMore(true);
    pendingJumpIdRef.current = null;
    shouldScrollToBottomRef.current = true;
    try {
      const data = await messagesApi.getMessages(chatroomId, 1, PAGE_SIZE);
      setMessages(
        data.messages.map((m) => ({
          ...m,
          reactions: (m.reactions ?? []).map(normalizeReactionSummary),
        })),
      );
      setHasMore(data.hasMore);
    } catch (e) {
      console.error("[useMessages] loadInitial:", e);
    } finally {
      setLoadingInitial(false);
    }
  }, [chatroomId]);

  const loadMore = useCallback(async () => {
    if (!chatroomId || loadingMore || !hasMore) return;

    const oldestId = messagesRef.current[0]?.messageId;
    if (!oldestId) return;

    setLoadingMore(true);
    try {
      const older = await messagesApi.getMessages(
        chatroomId,
        1,
        PAGE_SIZE,
        oldestId,
      );
      setHasMore(older.hasMore);

      if (older.messages.length > 0) {
        setMessages((prev) => {
          const existing = new Set(prev.map((m) => m.messageId));
          const fresh = older.messages.filter(
            (m) => !existing.has(m.messageId),
          );
          return fresh.length > 0 ? [...fresh, ...prev] : prev;
        });
        setPage((p) => p + 1);
      }
    } catch (e) {
      console.error("[useMessages] loadMore:", e);
    } finally {
      setLoadingMore(false);
    }
  }, [chatroomId, loadingMore, hasMore]);

  const jumpToMessage = useCallback(
    async (messageId: string) => {
      if (!chatroomId || jumping) return;

      if (scrollToMessageElement(messageId)) return;

      if (messagesRef.current.some((m) => m.messageId === messageId)) {
        pendingJumpIdRef.current = messageId;
        return;
      }

      shouldScrollToBottomRef.current = false;
      setJumping(true);
      pendingJumpIdRef.current = messageId;

      try {
        const data = await messagesApi.getMessagesAround(
          chatroomId,
          messageId,
          20,
          15,
        );
        setMessages(data.messages);
        setHasMore(data.hasMoreBefore);
        setPage(1);
      } catch (e) {
        console.error("[useMessages] jumpToMessage:", e);
        pendingJumpIdRef.current = null;
      } finally {
        setJumping(false);
      }
    },
    [chatroomId, jumping],
  );

  useEffect(() => {
    const targetId = pendingJumpIdRef.current;
    if (!targetId || jumping || loadingInitial) return;
    if (!messages.some((m) => m.messageId === targetId)) return;

    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (scrollToMessageElement(targetId)) {
          pendingJumpIdRef.current = null;
        }
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [messages, jumping, loadingInitial]);

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

  const onReactionUpdated = useCallback((event: ReactionUpdatedEvent) => {
    const raw = event as unknown as Record<string, unknown>;
    const messageId = String(
      event.messageId ?? raw.MessageId ?? raw.messageId ?? "",
    );
    const payload = (event.reactions ??
      raw.Reactions ??
      raw.reactions) as unknown;
    let nextReactions: ReactionSummary[] | null = null;
    if (Array.isArray(payload)) {
      nextReactions = payload.map(normalizeReactionSummary);
    } else if (payload && typeof payload === "object") {
      const nested = payload as Record<string, unknown>;
      const list = nested.reactions ?? nested.Reactions;
      if (Array.isArray(list)) {
        nextReactions = list.map(normalizeReactionSummary);
      }
    }
    // Do not wipe chips when SignalR payload shape is unexpected.
    if (!messageId || nextReactions === null) return;
    setMessages((previous) =>
      previous.map((message) =>
        message.messageId === messageId
          ? { ...message, reactions: nextReactions }
          : message,
      ),
    );
  }, []);

  /** Patch chips immediately after REST/hub toggle (UI must not depend only on SignalR). */
  const applyReactionToggleResult = useCallback(
    (messageId: string, emojiCode: string, added: boolean) => {
      setMessages((previous) =>
        previous.map((message) => {
          if (message.messageId !== messageId) return message;
          const list = (message.reactions ?? []).map(normalizeReactionSummary);
          const index = list.findIndex((r) => r.emojiCode === emojiCode);

          if (added) {
            if (index >= 0) {
              const current = list[index];
              list[index] = {
                ...current,
                reactedByMe: true,
                count: current.reactedByMe
                  ? current.count
                  : current.count + 1,
              };
            } else {
              list.push({
                emojiCode,
                count: 1,
                reactedByMe: true,
                users: [],
              });
            }
          } else if (index >= 0) {
            const current = list[index];
            const nextCount = Math.max(0, current.count - 1);
            if (nextCount === 0) {
              list.splice(index, 1);
            } else {
              list[index] = {
                ...current,
                count: nextCount,
                reactedByMe: false,
              };
            }
          }

          return { ...message, reactions: list };
        }),
      );
    },
    [],
  );

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
    jumping,
    shouldScrollToBottomRef,
    loadInitial,
    loadMore,
    jumpToMessage,
    receiveMessage,
    onMessageDeleted,
    onMessageEdited,
    onMessageRead,
    onMessageDelivered,
    onAllMessagesRead,
    onReactionUpdated,
    applyReactionToggleResult,
    appendOptimistic,
    replaceOptimistic,
    removeOptimistic,
  };
}
