// src/components/chat/hooks/useSendMessage.ts
"use client";

import { useState, useRef, useCallback } from "react";
import { messagesApi } from "@/lib/api/messages";
import type { MessageResponse, PendingMention } from "@/lib/types/message";
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
    type?: string,
    mentions?: string[],
    parentMessageId?: string | null,
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
  const [pendingMentions, setPendingMentions] = useState<PendingMention[]>([]);

  const addSelectedFiles = useCallback((files: File[]) => {
    setSelectedFiles((prev) => [...prev, ...files]);
  }, []);

  const removeSelectedFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearSelectedFiles = useCallback(() => {
    setSelectedFiles([]);
  }, []);

  const clearPendingMentions = useCallback(() => {
    setPendingMentions([]);
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

  const handleSend = useCallback(
    async (options?: {
      parentMessageId?: string | null;
      mentions?: PendingMention[];
    }) => {
      const content = input.trim();
      const files = selectedFiles;
      const mentionsToSend = options?.mentions ?? pendingMentions;
      const mentionIds = mentionsToSend.map((m) => m.userId);

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
            parentMessageId: options?.parentMessageId,
            mentions: mentionIds.length > 0 ? mentionIds : undefined,
          });

          appendOptimistic(sent);
          setInput("");
          clearSelectedFiles();
          clearPendingMentions();
        } catch {
          setInput(content);
        } finally {
          setSending(false);
        }

        return;
      }

      setInput("");
      clearPendingMentions();
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
        parentMessageId: options?.parentMessageId ?? null,
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
        mentions:
          mentionsToSend.length > 0
            ? mentionsToSend.map((m) => ({
                userId: m.userId,
                displayName: m.displayName,
              }))
            : null,
      });

      try {
        await signalRSend(
          chatroomId,
          content,
          "text",
          mentionIds,
          options?.parentMessageId,
        );
        // ReceiveMessage event from SignalR will remove the temp bubble
      } catch {
        try {
          const sent = await messagesApi.sendMessage({
            chatroomId,
            messageText: content,
            messageType: "text",
            parentMessageId: options?.parentMessageId,
            mentions: mentionIds.length > 0 ? mentionIds : undefined,
          });
          replaceOptimistic(tempId, sent);
        } catch {
          removeOptimistic(tempId);
          setInput(content); // let user retry
          setPendingMentions(mentionsToSend);
        }
      } finally {
        setSending(false);
      }
    },
    [
      input,
      selectedFiles,
      pendingMentions,
      chatroomId,
      sending,
      user,
      stopTypingNow,
      appendOptimistic,
      replaceOptimistic,
      removeOptimistic,
      clearSelectedFiles,
      clearPendingMentions,
      signalRSend,
    ],
  );

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
    pendingMentions,
    setPendingMentions,
    clearPendingMentions,
  };
}
