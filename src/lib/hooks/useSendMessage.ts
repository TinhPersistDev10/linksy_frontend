// src/components/chat/hooks/useSendMessage.ts
"use client";

import { useState, useRef, useCallback } from "react";
import { messagesApi } from "@/lib/api/messages";
import type { MessageResponse } from "@/lib/types/message";
import type { User } from "@/lib/types/user";

const TYPING_DEBOUNCE_MS = 2000;

interface Options {
  chatroomId: string | undefined;
  user: User | null;
  appendOptimistic: (msg: MessageResponse) => void;
  replaceOptimistic: (tempId: string, confirmed: MessageResponse) => void;
  removeOptimistic: (tempId: string) => void;
  signalRSend: (
    chatroomId: string,
    text: string,
    type: string,
  ) => Promise<void>;
  signalRTyping: (chatroomId: string) => Promise<void>;
  signalRStopTyping: (chatroomId: string) => Promise<void>;
}

export function useSendMessage({
  chatroomId,
  user,
  appendOptimistic,
  replaceOptimistic,
  removeOptimistic,
  signalRSend,
  signalRTyping,
  signalRStopTyping,
}: Options) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const isTypingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Notify server that user is typing (debounced auto-stop)
  const notifyTyping = useCallback(
    async (value: string) => {
      if (!chatroomId) return;
      if (!isTypingRef.current && value.trim()) {
        isTypingRef.current = true;
        await signalRTyping(chatroomId);
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        if (isTypingRef.current) {
          isTypingRef.current = false;
          await signalRStopTyping(chatroomId);
        }
      }, TYPING_DEBOUNCE_MS);
    },
    [chatroomId, signalRTyping, signalRStopTyping],
  );

  // Immediately stop typing (called before sending)
  const stopTypingNow = useCallback(async () => {
    if (!chatroomId || !isTypingRef.current) return;
    isTypingRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    await signalRStopTyping(chatroomId);
  }, [chatroomId, signalRStopTyping]);

  const handleSend = useCallback(async () => {
    const content = input.trim();
    if (!content || !chatroomId || sending || !user) return;

    await stopTypingNow();
    setSending(true);
    setInput("");

    const tempId = `temp-${Math.random().toString(36).slice(2)}`;
    appendOptimistic({
      messageId: tempId,
      chatroomId,
      senderId: user.userId,
      senderUsername: user.username,
      senderFullname: user.fullname,
      senderAvatar: user.avatar || null,
      senderNickname: null,
      messageType: "text",
      messageText: content,
      parentMessageId: null,
      parentMessage: null,
      isEdited: false,
      isDeleted: false,
      isOwn: true,
      sentAt: new Date().toISOString(),
      editedAt: null,
      deletedAt: null,
      attachments: null,
      deliveryStatus: "sent",
      recipientCount: 0,
      deliveredCount: 0,
      readCount: 0,
    });

    try {
      await signalRSend(chatroomId, content, "text");
      // ReceiveMessage event from SignalR will remove the temp bubble
    } catch {
      try {
        const sent = await messagesApi.sendMessage({
          chatroomId,
          messageText: content,
          messageType: "text",
        });
        replaceOptimistic(tempId, sent);
      } catch {
        removeOptimistic(tempId);
        setInput(content); // let user retry
      }
    } finally {
      setSending(false);
    }
  }, [
    input,
    chatroomId,
    sending,
    user,
    stopTypingNow,
    appendOptimistic,
    signalRSend,
    replaceOptimistic,
    removeOptimistic,
  ]);

  return { input, setInput, sending, handleSend, notifyTyping };
}

