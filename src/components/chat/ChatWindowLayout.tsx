"use client";

/**
 * ChatWindowLayout.tsx
 *
 * THAY ĐỔI so với bản trước:
 *  - Thêm `handleCallEnded` callback truyền vào useCallSignalR
 *  - Khi cuộc gọi kết thúc, inject một system message vào danh sách tin nhắn
 *    (giống Zalo / Messenger) mà không cần server gửi ReceiveMessage.
 *  - Không thay đổi bất kỳ logic chat nào khác.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Send } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import type { ChatroomResponse } from "@/lib/types/chatroom";
import { useAuth } from "@/lib/hooks/useAuth";
import { useChatSignalR } from "@/lib/hooks/useChatSignalR";
import { useCallSignalR, type CallEndedInfo } from "@/lib/hooks/useCallSignalR";

import { useMessages, PAGE_SIZE } from "@/lib/hooks/useMessages";
import { useSendMessage } from "@/lib/hooks/useSendMessage";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import ConversationInfoPanel from "./ConversationInfoPanel";
import IncomingCallModal from "./IncomingCallModal";
import ActiveCallScreen from "./ActiveCallScreen";
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCallDuration(sec: number): string {
  if (sec < 60) return `${sec} giây`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m} phút ${s} giây` : `${m} phút`;
}

/** Tạo system message giả cho cuộc gọi — chỉ hiển thị local, không gửi server */
function makeCallSystemMessage(
  info: CallEndedInfo,
  currentUserId: string,
): MessageResponse {
  const isVideo = info.callType === "video";
  const callLabel = isVideo ? "Cuộc gọi video" : "Cuộc gọi thoại";
  const durationLabel =
    info.durationSec > 0
      ? ` · ${formatCallDuration(info.durationSec)}`
      : " · Không có ai trả lời";

  // Icon prefix dạng emoji để không cần thêm component phức tạp
  const icon = isVideo ? "📹" : "📞";
  const directionLabel = info.wasInitiator ? "Bạn đã gọi" : "Cuộc gọi đến";

  return {
    messageId: `call-log-${info.callLogId}`,
    chatroomId: info.chatroomId,
    senderId: currentUserId,
    senderFullname: "",
    senderUsername: "",
    senderNickname: null,
    senderAvatar: null,
    messageText: `${icon} ${directionLabel} — ${callLabel}${durationLabel}`,
    messageType: "call",
    parentMessageId: null,
    sentAt: new Date().toISOString(),
    isOwn: false,
    isDeleted: false,
    isEdited: false,
    editedAt: null,
    deletedAt: null,
    parentMessage: null,
    attachments: [],
    deliveryStatus: "sent",
    deliveredCount: 0,
    readCount: 0,
    recipientCount: 0,
  } satisfies MessageResponse;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChatWindowLayout({
  chatroom,
  onBack,
  onReadChatroom,
  onChatroomUpdated,
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
    connectionRef,
    sendMessage: signalRSend,
    sendTyping: signalRTyping,
    stopTyping: signalRStopTyping,
    deleteMessage: signalRDelete,
    editMessage: signalREdit,
    replyToMessage: signalRReply,
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

  // ── Video refs ─────────────────────────────────────────────────────────────
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // ── Callback: cuộc gọi kết thúc → inject system message ───────────────────
  const handleCallEnded = useCallback(
    (info: CallEndedInfo) => {
      // Chỉ inject nếu user đang xem đúng chatroom của cuộc gọi đó
      if (!user?.userId) return;

      const systemMsg = makeCallSystemMessage(info, user.userId);

      // appendOptimistic đủ thông minh để tránh duplicate messageId
      appendOptimistic(systemMsg);

      // Scroll xuống để thấy tin nhắn cuộc gọi
      shouldScrollToBottomRef.current = true;
    },
    [user?.userId, appendOptimistic, shouldScrollToBottomRef],
  );

  // ── SignalR (call) ─────────────────────────────────────────────────────────
  const {
    callState,
    initiateCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMic,
    toggleCam,
  } = useCallSignalR({
    connectionRef,
    isConnected,
    currentUserId: user?.userId ?? "",
    localVideoRef,
    remoteVideoRef,
    onCallEnded: handleCallEnded,
  });

  // Resolve thông tin người dùng phía bên kia cuộc gọi từ callState.remoteUserId.
  // Đặt SAU useCallSignalR vì cần callState đã được khởi tạo.
  // KHÔNG dùng otherMember vì cuộc gọi có thể đến từ chatroom khác đang không hiển thị.
  const remoteCallMember = currentChatroom?.members?.find(
    (m) => m.userId === callState.remoteUserId,
  );

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
      if (!currentChatroom || currentChatroom.roomType !== "direct") return;
      void initiateCall(currentChatroom.chatroomId, callType);
    },
    [currentChatroom, initiateCall],
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
        return;
      }
      if (replyTo) {
        await signalRReply(chatroomId, replyTo.messageId, content);
        setReplyTo(null);
        setInput("");
        return;
      }
      await handleSend();
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
              currentChatroom.roomType === "direct"
                ? () => void initiateCall(currentChatroom.chatroomId, "audio")
                : undefined
            }
            onVideoCall={
              currentChatroom.roomType === "direct"
                ? () => void initiateCall(currentChatroom.chatroomId, "video")
                : undefined
            }
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
            }}
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

      {/* ── Call UI ────────────────────────────────────────────────────────── */}
      <IncomingCallModal
        callState={callState}
        callerName={remoteCallMember?.fullname ?? "Người dùng"}
        callerAvatar={remoteCallMember?.avatar ?? null}
        onAnswer={() => void answerCall()}
        onReject={() => void rejectCall()}
      />

      <ActiveCallScreen
        callState={callState}
        remoteName={
          remoteCallMember?.fullname ?? otherMember?.fullname ?? "Người dùng"
        }
        remoteAvatar={remoteCallMember?.avatar ?? otherMember?.avatar ?? null}
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
        onToggleMic={toggleMic}
        onToggleCam={toggleCam}
        onEndCall={() => void endCall()}
      />
    </>
  );
}
