"use client";

/**
 * ChatWindowLayout.tsx
 *
 * Cuộc gọi kết thúc được ghi lại thành một Message thật ở backend
 * (messageType "call_log") và phát tới chatroom qua sự kiện "ReceiveMessage"
 * hiện có, nên nó tự động xuất hiện trong `messages` và vẫn còn sau khi
 * reload/chuyển tab — không cần inject message giả ở client nữa.
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Send } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { ChatroomResponse } from "@/lib/types/chatroom";
import { useAuth } from "@/lib/hooks/useAuth";
import { useChatSignalR } from "@/lib/hooks/useChatSignalR";
import type { UseCallSignalRReturn } from "@/lib/hooks/useCallSignalR";

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
  callController?: Pick<UseCallSignalRReturn, "initiateCall">;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChatWindowLayout({
  chatroom,
  onBack,
  onReadChatroom,
  onChatroomUpdated,
  callController,
}: ChatWindowLayoutProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeChatroom, setActiveChatroom] = useState<ChatroomResponse | null>(
    chatroom,
  );

  useEffect(() => {
    setActiveChatroom(chatroom);
  }, [chatroom]);

  const handleChatroomChange = useCallback(
    (updatedChatroom: ChatroomResponse) => {
      setActiveChatroom(updatedChatroom);
      onChatroomUpdated?.(updatedChatroom);
    },
    [onChatroomUpdated],
  );

  const currentChatroom = activeChatroom ?? chatroom;
  const chatroomId = currentChatroom?.chatroomId;
  const otherMember = currentChatroom?.members?.find(
    (m) => m.userId !== user?.userId,
  );
  const remoteCallUserIds = useMemo(
    () =>
      currentChatroom?.members
        ?.filter((member) => member.userId !== user?.userId)
        .map((member) => member.userId) ?? [],
    [currentChatroom?.members, user?.userId],
  );

  const scrollToBottomRef = useRef<(() => void) | null>(null);
  const nearBottomRef = useRef(true);
  const markReadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onReadChatroomRef = useRef(onReadChatroom);
  const [replyTo, setReplyTo] = useState<MessageResponse | null>(null);
  const [editingMessage, setEditingMessage] = useState<MessageResponse | null>(
    null,
  );
  const [messageSearch, setMessageSearch] = useState("");
  const [searchResults, setSearchResults] = useState<MessageResponse[]>([]);
  const [searching, setSearching] = useState(false);
  const [typingUsers, setTypingUsers] = useState<
    { userId: string; username: string }[]
  >([]);
  const [deliveryStatus, setDeliveryStatus] =
    useState<MessageDeliveryStatusResponse | null>(null);
  const [deliveryOpen, setDeliveryOpen] = useState(false);

  useEffect(() => {
    onReadChatroomRef.current = onReadChatroom;
  }, [onReadChatroom]);

  const [composerSubmitting, setComposerSubmitting] = useState(false);

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
    onMessageRead,
    onMessageDelivered,
    onAllMessagesRead,
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
          room.chatroomId === chatroomId ? { ...room, unreadCount: 0 } : room,
        ),
    );
  }, [chatroomId, queryClient, user?.userId]);

  const scheduleMarkCurrentChatAsRead = useCallback(() => {
    if (!chatroomId) return;
    if (markReadTimerRef.current) clearTimeout(markReadTimerRef.current);
    markReadTimerRef.current = setTimeout(() => {
      messagesApi
        .markAllRead(chatroomId)
        .then(() => {
          markChatroomReadInCache();
          onReadChatroomRef.current?.();
        })
        .catch((error) => console.error("Mark all read failed:", error));
    }, 300);
  }, [chatroomId, markChatroomReadInCache]);

  const handleReceiveMessage = useCallback(
    (msg: MessageResponse) => {
      if (!user?.userId) {
        receiveMessage(msg);
        return;
      }
      const normalizedMessage = { ...msg, isOwn: msg.senderId === user.userId };
      receiveMessage(normalizedMessage);
      if (normalizedMessage.senderId !== user.userId) {
        void messagesApi
          .markDelivered(normalizedMessage.messageId)
          .catch((error) => console.error("Mark delivered failed:", error));
        if (normalizedMessage.chatroomId === chatroomId) {
          scheduleMarkCurrentChatAsRead();
        }
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
            (current = []) =>
              current.map((item) =>
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

  // ── SignalR (chat) ─────────────────────────────────────────────────────────
  const {
    isConnected,
    sendMessage: signalRSend,
    sendTyping: signalRTyping,
    stopTyping: signalRStopTyping,
    deleteMessage: signalRDelete,
    editMessage: signalREdit,
  } = useChatSignalR({
    chatroomId: chatroomId ?? null,
    onReceiveMessage: handleReceiveMessage,
    onMessageDeleted,
    onMessageEdited,
    onMessageRead,
    onMessageDelivered,
    onAllMessagesRead,
    onUserTyping,
    onUserStoppedTyping,
    onMembershipChanged: handleMembershipChanged,
  });

  // ── Send + typing ──────────────────────────────────────────────────────────
  const {
    input,
    setInput,
    sending,
    handleSend,
    notifyTyping,
    selectedFiles,
    addSelectedFiles,
    removeSelectedFile,
    clearSelectedFiles,
    pendingMentions,
    setPendingMentions,
    clearPendingMentions,
  } = useSendMessage({
    chatroomId,
    user,
    appendOptimistic,
    replaceOptimistic,
    removeOptimistic,
    signalRSend,
    signalRTyping,
    signalRStopTyping,
  });

  const isGroupChat =
    currentChatroom?.roomType?.toLowerCase() === "group";

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
      setSearchResults(result?.results ?? []);
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

  const handleCallAgain = useCallback(
    (callType: "audio" | "video") => {
      if (!currentChatroom || remoteCallUserIds.length === 0) return;
      void callController?.initiateCall(
        currentChatroom.chatroomId,
        callType,
        remoteCallUserIds,
      );
    },
    [callController, currentChatroom, remoteCallUserIds],
  );

  const startCurrentCall = useCallback(
    (callType: "audio" | "video") => {
      if (!currentChatroom || remoteCallUserIds.length === 0) return;
      void callController?.initiateCall(
        currentChatroom.chatroomId,
        callType,
        remoteCallUserIds,
      );
    },
    [callController, currentChatroom, remoteCallUserIds],
  );

  const handleDelete = async (messageId: string) => {
    try {
      await signalRDelete(messageId);
    } catch (error) {
      console.error("Delete message failed:", error);
    }
  };

  const handleInputChange = async (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setInput(e.target.value);
    await notifyTyping(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const handleSubmit = async () => {
    const content = input.trim();
    if (
      (!content && selectedFiles.length === 0) ||
      !chatroomId ||
      composerSubmitting
    )
      return;

    setComposerSubmitting(true);
    try {
      if (editingMessage) {
        await signalREdit(editingMessage.messageId, content);
        setEditingMessage(null);
        setInput("");
        clearPendingMentions();
        return;
      }
      if (replyTo) {
        await handleSend({
          parentMessageId: replyTo.messageId,
          mentions: pendingMentions,
        });
        setReplyTo(null);
        return;
      }
      await handleSend({ mentions: pendingMentions });
    } catch (error) {
      console.error("Submit message failed:", error);
    } finally {
      setComposerSubmitting(false);
    }
  };

  useEffect(() => {
    if (!chatroomId) return;
    setTypingUsers([]);
    setMessageSearch("");
    setSearchResults([]);
    setDeliveryOpen(false);
    setDeliveryStatus(null);
    setReplyTo(null);
    setEditingMessage(null);
    setInput("");
    clearSelectedFiles();
    clearPendingMentions();

    messagesApi
      .markAllRead(chatroomId)
      .then(() => {
        markChatroomReadInCache();
        onReadChatroomRef.current?.();
      })
      .catch((error) => console.error("Mark all read failed:", error));

    loadInitial();
  }, [
    chatroomId,
    loadInitial,
    markChatroomReadInCache,
    clearSelectedFiles,
    clearPendingMentions,
    setInput,
  ]);

  useEffect(() => {
    return () => {
      if (markReadTimerRef.current) clearTimeout(markReadTimerRef.current);
    };
  }, []);

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

  useEffect(() => {
    if (typingUsers.length > 0 && nearBottomRef.current)
      scrollToBottomRef.current?.();
  }, [typingUsers]);

  // ── Empty state ───────────────────────────────────────────────────────────
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
    <>
      <div className="flex h-full max-h-full min-h-0 w-full flex-1 overflow-hidden bg-background">
        <div className="relative flex h-full max-h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <ChatHeader
            chatroom={currentChatroom}
            otherMember={otherMember}
            isConnected={isConnected}
            onBack={onBack}
            onAudioCall={
              remoteCallUserIds.length > 0
                ? () => startCurrentCall("audio")
                : undefined
            }
            onVideoCall={
              remoteCallUserIds.length > 0
                ? () => startCurrentCall("video")
                : undefined
            }
          />

          <div className="shrink-0 border-b bg-background px-3 py-2 sm:px-4">
            <div className="flex gap-2">
              <input
                value={messageSearch}
                onChange={(e) => setMessageSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearchMessages();
                }}
                placeholder="Tìm tin nhắn..."
                className="h-8 min-w-0 flex-1 rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-sky-400/30"
              />
              <button
                type="button"
                onClick={handleSearchMessages}
                className="h-8 shrink-0 rounded-md bg-sky-500 px-3 text-sm text-white disabled:opacity-60"
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
              onReply={(message) => {
                setReplyTo(message);
                setEditingMessage(null);
                clearSelectedFiles();
              }}
              onEdit={(message) => {
                setEditingMessage(message);
                setReplyTo(null);
                setInput(message.messageText);
                clearSelectedFiles();
              }}
              onCallAgain={handleCallAgain}
            />
          </div>

          <MessageInput
            value={input}
            sending={sending || composerSubmitting}
            replyTo={replyTo}
            editingMessage={editingMessage}
            selectedFiles={selectedFiles}
            onFilesSelected={addSelectedFiles}
            onRemoveFile={removeSelectedFile}
            attachmentsDisabled={Boolean(replyTo || editingMessage)}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onSend={() => void handleSubmit()}
            onCancelMode={() => {
              setReplyTo(null);
              setEditingMessage(null);
              setInput("");
              clearSelectedFiles();
              clearPendingMentions();
            }}
            enableMentions={isGroupChat && !editingMessage}
            mentionMembers={currentChatroom?.members ?? []}
            currentUserId={user?.userId}
            pendingMentions={pendingMentions}
            onPendingMentionsChange={setPendingMentions}
          />

          {deliveryOpen && deliveryStatus && (
            <div className="absolute inset-x-3 bottom-16 z-30 rounded-md border bg-background p-3 shadow-lg sm:left-auto sm:right-4 sm:w-72">
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

    </>
  );
}
