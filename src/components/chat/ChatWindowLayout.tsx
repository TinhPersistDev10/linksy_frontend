// src/components/chat/ChatWindowLayout.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Send } from "lucide-react";
import type { Chatroom } from "@/lib/types/chatroom";
import { useAuth } from "@/lib/hooks/useAuth";
import { useChatSignalR } from "@/lib/hooks/useChatSignalR";

import { useMessages, PAGE_SIZE } from "@/lib/hooks/useMessages";
import { useSendMessage }         from "@/lib/hooks/useSendMessage";
import ChatHeader   from "./ChatHeader";
import MessageList  from "./MessageList";
import MessageInput from "./MessageInput";

interface ChatWindowLayoutProps {
  chatroom: Chatroom | null;
  onBack?: () => void;
}

export default function ChatWindowLayout({ chatroom, onBack }: ChatWindowLayoutProps) {
  const { user } = useAuth();

  const chatroomId  = chatroom?.chatroomId;
  const otherMember = chatroom?.members?.find((m) => m.userId !== user?.userId);

  // Scroll control (ref-based to avoid re-renders)
  const scrollToBottomRef = useRef<(() => void) | null>(null);
  const nearBottomRef     = useRef(true);

  // ── Typing users (shown in UI) ────────────────────────────────────────────
  const [typingUsers, setTypingUsers] = useState<{ userId: string; username: string }[]>([]);

  const onUserTyping = useCallback(
    ({ userId, username, chatroomId: roomId }: { userId: string; username: string; chatroomId: string }) => {
      if (roomId !== chatroomId) return;
      setTypingUsers((prev) =>
        prev.some((u) => u.userId === userId) ? prev : [...prev, { userId, username }],
      );
    },
    [chatroomId],
  );

  const onUserStoppedTyping = useCallback(({ userId }: { userId: string }) => {
    setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
  }, []);

  // ── Message state ─────────────────────────────────────────────────────────
  const {
    messages, hasMore, loadingInitial, loadingMore,
    shouldScrollToBottomRef,
    loadInitial, loadMore,
    receiveMessage, onMessageDeleted, onMessageEdited,
    appendOptimistic, replaceOptimistic, removeOptimistic,
  } = useMessages(chatroomId);

  // ── SignalR ───────────────────────────────────────────────────────────────
  const {
    isConnected,
    sendMessage:   signalRSend,
    sendTyping:    signalRTyping,
    stopTyping:    signalRStopTyping,
    deleteMessage: signalRDelete,
  } = useChatSignalR({
    chatroomId: chatroomId ?? null,
    onReceiveMessage: receiveMessage,
    onMessageDeleted,
    onMessageEdited,
    onUserTyping,
    onUserStoppedTyping,
  });

  // ── Send + typing ─────────────────────────────────────────────────────────
  const { input, setInput, sending, handleSend, notifyTyping } = useSendMessage({
    chatroomId,
    user,
    appendOptimistic,
    replaceOptimistic,
    removeOptimistic,
    signalRSend,
    signalRTyping,
    signalRStopTyping,
  });

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (messageId: string) => {
    if (!chatroomId) return;
    try { await signalRDelete(chatroomId, messageId); }
    catch (e) { console.error("Delete error:", e); }
  };

  // ── Input handlers ────────────────────────────────────────────────────────
  const handleInputChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    await notifyTyping(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!chatroom) return;
    setTypingUsers([]);
    loadInitial();
  }, [chatroomId]);

  // Scroll to bottom after initial load or own sent message
  useEffect(() => {
    if (shouldScrollToBottomRef.current && !loadingInitial && messages.length > 0) {
      scrollToBottomRef.current?.();
      shouldScrollToBottomRef.current = false;
    }
  }, [messages, loadingInitial]);

  // Scroll to bottom when typing indicator appears (if user is near bottom)
  useEffect(() => {
    if (typingUsers.length > 0 && nearBottomRef.current) scrollToBottomRef.current?.();
  }, [typingUsers]);

  // ── Empty / welcome state ─────────────────────────────────────────────────
  if (!chatroom) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8 bg-muted/10">
        <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center">
          <Send size={28} className="text-blue-500" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Chào mừng đến Linksy</h3>
          <p className="text-sm text-muted-foreground mt-1">Chọn một cuộc trò chuyện để bắt đầu nhắn tin</p>
        </div>
      </div>
    );
  }

  // ── Main layout ───────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <ChatHeader
        chatroom={chatroom}
        otherMember={otherMember}
        isConnected={isConnected}
        onBack={onBack}
      />
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
        onNearBottom={(near) => { nearBottomRef.current = near; }}
      />
      <MessageInput
        value={input}
        sending={sending}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onSend={handleSend}
      />
    </div>
  );
}