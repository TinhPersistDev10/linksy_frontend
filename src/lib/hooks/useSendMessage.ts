// src/components/chat/hooks/useSendMessage.ts
"use client";

import { useState, useRef, useCallback } from "react";
import { messagesApi } from "@/lib/api/messages";
import type { MessageResponse } from "@/lib/types/message";
import type { User } from "@/lib/types/user";
import getAttachmentType from "../utils/useSendMessage";

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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const addSelectedFiles = useCallback((files: File[]) => {
    setSelectedFiles((prev) => [...prev, ...files]);
  }, []);

  const removeSelectedFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearSelectedFiles = useCallback(() => {
    setSelectedFiles([]);
  }, []);

  const isTypingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
    const files = selectedFiles;

    if ((!content && files.length === 0) || !chatroomId || sending || !user)
      return;

    await stopTypingNow();
    setSending(true);

    if (files.length > 0) {
      try {
        const uploadedAttachments = await Promise.all(
          files.map((file) =>
            messagesApi.uploadAttachment(
              file,
              chatroomId,
              getAttachmentType(file),
            ),
          ),
        );

        const sent = await messagesApi.sendMessage({
          chatroomId,
          messageText: content,
          messageType: uploadedAttachments[0]?.attachmentType ?? "file",
          attachments: uploadedAttachments,
        });

        appendOptimistic(sent);
        setInput("");
        clearSelectedFiles();
      } catch {
        setInput(content);
      } finally {
        setSending(false);
      }

      return;
    }

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
    selectedFiles,
    chatroomId,
    sending,
    user,
    stopTypingNow,
    appendOptimistic,
    replaceOptimistic,
    removeOptimistic,
    clearSelectedFiles,
    signalRSend,
  ]);

  return {
    input,
    setInput,
    sending,
    handleSend,
    notifyTyping,
    selectedFiles,
    addSelectedFiles,
    removeSelectedFile,
    clearSelectedFiles,
  };
}
