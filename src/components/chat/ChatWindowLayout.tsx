// src/components/chat/ChatWindowLayout.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Send } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { ChatroomResponse } from "@/lib/types/chatroom";
import { useAuth } from "@/lib/hooks/useAuth";
import { useChatSignalR } from "@/lib/hooks/useChatSignalR";

import { useMessages, PAGE_SIZE } from "@/lib/hooks/useMessages";
import { useSendMessage } from "@/lib/hooks/useSendMessage";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import ConversationInfoPanel from "./ConversationInfoPanel";
import { messagesApi } from "@/lib/api/messages";
import { chatroomsApi } from "@/lib/api/chatrooms";
import { chatroomQueryKeys } from "@/lib/queries/queryKeys";
import type {
  MessageDeliveryStatusResponse,
  MessageResponse,
} from "@/lib/types/message";

interface ChatWindowLayoutProps {
  chatroom: ChatroomResponse | null;
  onBack?: () => void;
  onReadChatroom?: () => void;
  onChatroomUpdated?: (chatroom: ChatroomResponse) => void;
}

export default function ChatWindowLayout({
  chatroom,
  onBack,
  onReadChatroom,
  onChatroomUpdated,
}: ChatWindowLayoutProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeChatroom, setActiveChatroom] = useState<ChatroomResponse | null>(chatroom);

  useEffect(() => {
    setActiveChatroom(chatroom);
  }, [chatroom]);

  const handleChatroomChange = useCallback((updatedChatroom: ChatroomResponse) => {
    setActiveChatroom(updatedChatroom);
    onChatroomUpdated?.(updatedChatroom);
  }, [onChatroomUpdated]);

  const currentChatroom = activeChatroom ?? chatroom;
  const chatroomId = currentChatroom?.chatroomId;
  const otherMember = currentChatroom?.members?.find((m) => m.userId !== user?.userId);

  // Scroll control (ref-based to avoid re-renders)
  const scrollToBottomRef = useRef<(() => void) | null>(null);
  const nearBottomRef = useRef(true);
  const markReadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onReadChatroomRef = useRef(onReadChatroom);
  const [messageSearch, setMessageSearch] = useState("");
  const [searchResults, setSearchResults] = useState<MessageResponse[]>([]);
  const [searching, setSearching] = useState(false);
  // ── Typing users (shown in UI) ────────────────────────────────────────────
  const [typingUsers, setTypingUsers] = useState<
    { userId: string; username: string }[]
  >([]);
  const [deliveryStatus, setDeliveryStatus] =
    useState<MessageDeliveryStatusResponse | null>(null);
  const [deliveryOpen, setDeliveryOpen] = useState(false);

  useEffect(() => {
    onReadChatroomRef.current = onReadChatroom;
  }, [onReadChatroom]);

  const onUserTyping = useCallback(
    ({
      userId,
      username,
      chatroomId: roomId,
    }: {
      userId: string;
      username: string;
      chatroomId: string;
    }) => {
      if (roomId !== chatroomId) return;
      setTypingUsers((prev) =>
        prev.some((u) => u.userId === userId)
          ? prev
          : [...prev, { userId, username }],
      );
    },
    [chatroomId],
  );

  const onUserStoppedTyping = useCallback(({ userId }: { userId: string }) => {
    setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
  }, []);

  // ── Message state ─────────────────────────────────────────────────────────
  const {
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
  } = useMessages(chatroomId);
  const markChatroomReadInCache = useCallback(() => {
    if (!chatroomId || !user?.userId) return;

    queryClient.setQueryData<ChatroomResponse[]>(
      chatroomQueryKeys.list(user.userId),
      (current = []) =>
        current.map((room) =>
          room.chatroomId === chatroomId
            ? { ...room, unreadCount: 0 }
            : room,
        ),
    );
  }, [chatroomId, queryClient, user?.userId]);

  const scheduleMarkCurrentChatAsRead = useCallback(() => {
    if (!chatroomId) return;

    if (markReadTimerRef.current) {
      clearTimeout(markReadTimerRef.current);
    }

    markReadTimerRef.current = setTimeout(() => {
      messagesApi
        .markAllRead(chatroomId)
        .then(() => {
          markChatroomReadInCache();
          onReadChatroomRef.current?.();
        })
        .catch((error) => {
          console.error("Mark all read failed:", error);
        });
    }, 300);
  }, [chatroomId, markChatroomReadInCache]);
  const handleReceiveMessage = useCallback(
    (msg: MessageResponse) => {
      if (!user?.userId) {
        receiveMessage(msg);
        return;
      }

      const normalizedMessage = {
        ...msg,
        isOwn: msg.senderId === user.userId,
      };

      receiveMessage(normalizedMessage);

      if (
        normalizedMessage.chatroomId === chatroomId &&
        normalizedMessage.senderId !== user.userId
      ) {
        scheduleMarkCurrentChatAsRead();
      }
    },
    [receiveMessage, user?.userId, chatroomId, scheduleMarkCurrentChatAsRead],
  );

  const handleMembershipChanged = useCallback(
    async ({ chatroomId: changedChatroomId }: { chatroomId: string }) => {
      if (!chatroomId || changedChatroomId !== chatroomId) return;

      try {
        const updatedChatroom = await chatroomsApi.getChatroom(chatroomId);
        handleChatroomChange(updatedChatroom);

        if (user?.userId) {
          queryClient.setQueryData<ChatroomResponse[]>(
            chatroomQueryKeys.list(user.userId),
            (current = []) => current.map((item) =>
              item.chatroomId === updatedChatroom.chatroomId
                ? updatedChatroom
                : item,
            ),
          );
        }
      } catch (error) {
        console.error("Failed to refresh group membership:", error);
      }
    },
    [chatroomId, handleChatroomChange, queryClient, user?.userId],
  );

  // ── SignalR ───────────────────────────────────────────────────────────────
  const {
    isConnected,
    sendMessage: signalRSend,
    sendTyping: signalRTyping,
    stopTyping: signalRStopTyping,
    deleteMessage: signalRDelete,
  } = useChatSignalR({
    chatroomId: chatroomId ?? null,
    onReceiveMessage: handleReceiveMessage,
    onMessageDeleted,
    onMessageEdited,
    onUserTyping,
    onUserStoppedTyping,
    onMembershipChanged: handleMembershipChanged,
  });

  // ── Send + typing ─────────────────────────────────────────────────────────
  const { input, setInput, sending, handleSend, notifyTyping } = useSendMessage(
    {
      chatroomId,
      user,
      appendOptimistic,
      replaceOptimistic,
      removeOptimistic,
      signalRSend,
      signalRTyping,
      signalRStopTyping,
    },
  );

  const handleSearchMessages = async () => {
    if (!chatroomId || !messageSearch.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const result = await messagesApi.searchMessages(
        chatroomId,
        messageSearch.trim(),
      );
      setSearchResults(result.results);
    } catch (error) {
      console.error("Search messages failed:", error);
    } finally {
      setSearching(false);
    }
  };

  const handleJumpToMessage = (messageId: string) => {
    const el = document.querySelector<HTMLElement>(
      `[data-msg-id="${messageId}"]`,
    );

    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ring-2", "ring-sky-400");

      window.setTimeout(() => {
        el.classList.remove("ring-2", "ring-sky-400");
      }, 1200);
    } else {
      console.warn("Message is not loaded in the current list:", messageId);
    }
  };
  const handleShowDelivery = async (messageId: string) => {
    try {
      const status = await messagesApi.getDeliveryStatus(messageId);
      setDeliveryStatus(status);
      setDeliveryOpen(true);
    } catch (error) {
      console.error("Get delivery status failed:", error);
    }
  };
  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (messageId: string) => {
    if (!chatroomId) return;
    try {
      await signalRDelete(chatroomId, messageId);
    } catch (e) {
      console.error("Delete error:", e);
    }
  };

  // ── Input handlers ────────────────────────────────────────────────────────
  const handleInputChange = async (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setInput(e.target.value);
    await notifyTyping(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!chatroomId) return;

    setTypingUsers([]);
    setMessageSearch("");
    setSearchResults([]);
    setDeliveryOpen(false);
    setDeliveryStatus(null);

    messagesApi
      .markAllRead(chatroomId)
      .then(() => {
        markChatroomReadInCache();
        onReadChatroomRef.current?.();
      })
      .catch((error) => {
        console.error("Mark all read failed:", error);
      });

    loadInitial();
  }, [
    chatroomId,
    loadInitial,
    markChatroomReadInCache,
  ]);
  useEffect(() => {
    return () => {
      if (markReadTimerRef.current) {
        clearTimeout(markReadTimerRef.current);
      }
    };
  }, []);
  // Scroll to bottom after initial load or own sent message
  useEffect(() => {
    if (
      shouldScrollToBottomRef.current &&
      !loadingInitial &&
      messages.length > 0
    ) {
      scrollToBottomRef.current?.();
      shouldScrollToBottomRef.current = false;
    }
  }, [messages, loadingInitial]);

  // Scroll to bottom when typing indicator appears (if user is near bottom)
  useEffect(() => {
    if (typingUsers.length > 0 && nearBottomRef.current)
      scrollToBottomRef.current?.();
  }, [typingUsers]);

  // ── Empty / welcome state ─────────────────────────────────────────────────
  if (!currentChatroom) {
    return (
      <div className="flex-1 flex min-h-0 flex-col items-center justify-center gap-3 text-center p-8 bg-muted/10">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center">
          <Send size={28} className="text-blue-500" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Chào mừng đến Linksy</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Chọn một cuộc trò chuyện để bắt đầu nhắn tin
          </p>
        </div>
      </div>
    );
  }

  // ── Main layout ───────────────────────────────────────────────────────────
  return (
    <div className="flex h-full max-h-full min-h-0 w-full flex-1 overflow-hidden bg-background">
      <div className="relative flex h-full max-h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <ChatHeader
        chatroom={currentChatroom}
        otherMember={otherMember}
        isConnected={isConnected}
        onBack={onBack}
      />
      <div className="shrink-0 border-b bg-background px-4 py-2">
        <div className="flex gap-2">
          <input
            value={messageSearch}
            onChange={(e) => setMessageSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearchMessages();
            }}
            placeholder="Tìm tin nhắn..."
            className="h-8 flex-1 rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-sky-400/30"
          />
          <button
            type="button"
            onClick={handleSearchMessages}
            className="h-8 rounded-md bg-sky-500 px-3 text-sm text-white disabled:opacity-60"
            disabled={searching}
          >
            Tìm
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="mt-2 max-h-36 overflow-y-auto rounded-md border bg-background">
            {searchResults.map((msg) => (
              <button
                key={msg.messageId}
                type="button"
                onClick={() => handleJumpToMessage(msg.messageId)}
                className="block w-full border-b px-3 py-2 text-left text-xs hover:bg-muted"
              >
                <span className="font-medium">{msg.senderFullname}: </span>
                <span>{msg.messageText}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <MessageList
          messages={messages}
          currentUserId={user?.userId ?? ""}
          otherMember={otherMember}
          typingUsers={typingUsers}
          loadingInitial={loadingInitial}
          loadingMore={loadingMore}
          hasMore={hasMore}
          pageSize={PAGE_SIZE}
          onLoadMore={loadMore}
          onDelete={handleDelete}
          scrollToBottomRef={scrollToBottomRef}
          onNearBottom={(near) => {
            nearBottomRef.current = near;
          }}
          onShowDelivery={handleShowDelivery}
        />
      </div>
      <MessageInput
        value={input}
        sending={sending}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onSend={handleSend}
      />
      {deliveryOpen && deliveryStatus && (
        <div className="absolute bottom-16 right-4 z-30 w-72 rounded-md border bg-background p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">Trạng thái tin nhắn</p>
            <button
              type="button"
              onClick={() => setDeliveryOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Đóng
            </button>
          </div>

          <div className="mb-2 text-xs text-muted-foreground">
            Đã nhận: {deliveryStatus.deliveredCount} · Đã đọc:{" "}
            {deliveryStatus.readCount}
          </div>

          <div className="space-y-2">
            {deliveryStatus.deliveries.map((item) => (
              <div
                key={item.deliveryId}
                className="flex items-center justify-between gap-2"
              >
                <span className="truncate text-sm">{item.username}</span>
                <span className="text-xs text-muted-foreground">
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
      <ConversationInfoPanel
        chatroom={currentChatroom}
        otherMember={otherMember}
        onChatroomChange={handleChatroomChange}
        onLeaveChatroom={onBack}
      />
    </div>
  );
}
