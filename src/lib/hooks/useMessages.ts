// src/components/chat/hooks/useMessages.ts
"use client";

import { useState, useCallback, useRef } from "react";
import { messagesApi } from "@/lib/api/messages";
import type { MessageResponse } from "../types/message";

export const PAGE_SIZE = 30;

export function useMessages(chatroomId: string | undefined) {
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

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
      // Remove optimistic duplicates when server confirms our own message
      const base = msg.isOwn
        ? prev.filter((m) => !m.messageId.startsWith("temp-"))
        : prev;
      if (base.some((m) => m.messageId === msg.messageId)) return base;
      return [...base, msg];
    });
    shouldScrollToBottomRef.current = true;
  }, []);

  const onMessageDeleted = useCallback(
    ({ messageId }: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.messageId === messageId
            ? { ...m, isDeleted: true, messageText: "Tin nhắn đã bị xóa" }
            : m,
        ),
      );
    },
    [],
  );

  const onMessageEdited = useCallback((updated: MessageResponse) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.messageId === updated.messageId ? { ...m, ...updated } : m,
      ),
    );
  }, []);

  // -- Optimistic helpers -----------------------------------------------------
  const appendOptimistic = useCallback((msg: MessageResponse) => {
    setMessages((prev) => [...prev, msg]);
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
    appendOptimistic,
    replaceOptimistic,
    removeOptimistic,
  };
}

