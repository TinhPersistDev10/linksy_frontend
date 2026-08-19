// src/components/chat/hooks/useSendMessage.ts
"use client";

import { useState, useRef, useCallback } from "react";
import { messagesApi } from "@/lib/api/messages";
import type { MessageResponse, PendingMention } from "@/lib/types/message";
import type { User } from "@/lib/types/user";
import { extractErrorMessage } from "@/lib/utils/extractErrorMessage";
import { EVERYONE_MENTION_ID } from "@/lib/utils/mentions";
import getAttachmentType from "../utils/getAttachmentType";

const TYPING_DEBOUNCE_MS = 2000;

interface Options {
  chatroomId: string | undefined;
  user: User | null;
  appendOptimistic: (msg: MessageResponse) => void;
  replaceOptimistic: (tempId: string, confirmed: MessageResponse) => void;
  removeOptimistic: (tempId: string) => void;
  setOptimisticStatus: (
    tempId: string,
    status: "sending" | "failed",
  ) => void;
  signalRSend: (
    chatroomId: string,
    text: string,
    type?: string,
    mentions?: string[],
    parentMessageId?: string | null,
  ) => Promise<void>;
  signalRTyping: (chatroomId: string) => Promise<void>;
  signalRStopTyping: (chatroomId: string) => Promise<void>;
  /** Show inline error above the message composer (block / privacy, etc.). */
  onSendError?: (message: string) => void;
}

interface AttachmentRetryPayload {
  files: File[];
  localUrls: string[];
  content: string;
  parentMessageId?: string | null;
  mentionIds: string[];
}

export function useSendMessage({
  chatroomId,
  user,
  appendOptimistic,
  replaceOptimistic,
  removeOptimistic,
  setOptimisticStatus,
  signalRSend,
  signalRTyping,
  signalRStopTyping,
  onSendError,
}: Options) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [pendingMentions, setPendingMentions] = useState<PendingMention[]>([]);
  const attachmentRetriesRef = useRef<Record<string, AttachmentRetryPayload>>(
    {},
  );

  const reportSendError = useCallback(
    (message: string) => {
      onSendError?.(message);
    },
    [onSendError],
  );

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

  const handleSendVoice = useCallback(
    async (
      file: File,
      options?: { parentMessageId?: string | null },
    ) => {
      if (!chatroomId || sending || !user) return;

      await stopTypingNow();
      setSending(true);

      const recordedMs =
        "recordedDurationMs" in file &&
        typeof (file as File & { recordedDurationMs?: number })
          .recordedDurationMs === "number"
          ? (file as File & { recordedDurationMs?: number }).recordedDurationMs
          : undefined;

      const tempId = `temp-${Math.random().toString(36).slice(2)}`;
      const localUrl = URL.createObjectURL(file);

      appendOptimistic({
        messageId: tempId,
        chatroomId,
        senderId: user.userId,
        senderUsername: user.username,
        senderFullname: user.fullname,
        senderAvatar: user.avatar || null,
        senderNickname: null,
        messageType: "audio",
        messageText: "",
        parentMessageId: options?.parentMessageId ?? null,
        parentMessage: null,
        isEdited: false,
        isDeleted: false,
        isOwn: true,
        sentAt: new Date().toISOString(),
        editedAt: null,
        deletedAt: null,
        attachments: [
          {
            fileName: file.name,
            fileUrl: localUrl,
            cdnUrl: localUrl,
            attachmentType: "audio",
            fileType: "audio",
            fileSize: file.size,
            mimeType: file.type || "audio/webm",
            durationMs: recordedMs ?? null,
          },
        ],
        deliveryStatus: "sent",
        recipientCount: 0,
        deliveredCount: 0,
        readCount: 0,
        mentions: null,
      });

      try {
        const uploaded = await messagesApi.uploadAttachment(
          file,
          chatroomId,
          "audio",
        );
        if (
          uploaded.durationMs == null &&
          recordedMs != null &&
          recordedMs > 0
        ) {
          uploaded.durationMs = recordedMs;
        }

        const sent = await messagesApi.sendMessage({
          chatroomId,
          messageText: "",
          messageType: "audio",
          attachments: [uploaded],
          parentMessageId: options?.parentMessageId,
        });
        replaceOptimistic(tempId, sent);
      } catch (err) {
        removeOptimistic(tempId);
        reportSendError(extractErrorMessage(err, "Không thể gửi tin nhắn"));
      } finally {
        URL.revokeObjectURL(localUrl);
        setSending(false);
      }
    },
    [
      chatroomId,
      sending,
      user,
      stopTypingNow,
      reportSendError,
      appendOptimistic,
      replaceOptimistic,
      removeOptimistic,
    ],
  );

  const sendAttachmentBatch = useCallback(
    async (
      tempId: string,
      files: File[],
      content: string,
      parentMessageId: string | null | undefined,
      mentionIds: string[],
      localUrls: string[],
    ) => {
      if (!chatroomId) return;
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
          parentMessageId,
          mentions: mentionIds.length > 0 ? mentionIds : undefined,
        });

        replaceOptimistic(tempId, sent);
        delete attachmentRetriesRef.current[tempId];
        localUrls.forEach((url) => URL.revokeObjectURL(url));
      } catch (err) {
        setOptimisticStatus(tempId, "failed");
        reportSendError(extractErrorMessage(err, "Không thể gửi tin nhắn"));
      }
    },
    [chatroomId, replaceOptimistic, setOptimisticStatus, reportSendError],
  );

  const retryAttachmentMessage = useCallback(
    async (tempId: string) => {
      const payload = attachmentRetriesRef.current[tempId];
      if (!payload) return;
      setOptimisticStatus(tempId, "sending");
      await sendAttachmentBatch(
        tempId,
        payload.files,
        payload.content,
        payload.parentMessageId,
        payload.mentionIds,
        payload.localUrls,
      );
    },
    [setOptimisticStatus, sendAttachmentBatch],
  );

  const handleSend = useCallback(
    async (options?: {
      parentMessageId?: string | null;
      mentions?: PendingMention[];
    }) => {
      const content = input.trim();
      const files = selectedFiles;
      const mentionsToSend = options?.mentions ?? pendingMentions;
      // "@all"/"@everyone" is detected server-side from the message text, so the
      // sentinel id is only kept for local rendering/backspace UX, never sent as a Guid.
      const mentionIds = mentionsToSend
        .map((m) => m.userId)
        .filter((id) => id !== EVERYONE_MENTION_ID);

      if ((!content && files.length === 0) || !chatroomId || sending || !user)
        return;

      await stopTypingNow();
      setSending(true);

      if (files.length > 0) {
        const tempId = `temp-${Math.random().toString(36).slice(2)}`;
        const localUrls = files.map((file) => URL.createObjectURL(file));

        appendOptimistic({
          messageId: tempId,
          chatroomId,
          senderId: user.userId,
          senderUsername: user.username,
          senderFullname: user.fullname,
          senderAvatar: user.avatar || null,
          senderNickname: null,
          messageType: getAttachmentType(files[0]),
          messageText: content,
          parentMessageId: options?.parentMessageId ?? null,
          parentMessage: null,
          isEdited: false,
          isDeleted: false,
          isOwn: true,
          sentAt: new Date().toISOString(),
          editedAt: null,
          deletedAt: null,
          attachments: files.map((file, index) => ({
            fileName: file.name,
            fileUrl: localUrls[index],
            cdnUrl: localUrls[index],
            attachmentType: getAttachmentType(file),
            fileType: getAttachmentType(file),
            fileSize: file.size,
            mimeType: file.type,
          })),
          localStatus: "sending",
          deliveryStatus: "sent",
          recipientCount: 0,
          deliveredCount: 0,
          readCount: 0,
          mentions: null,
        });

        attachmentRetriesRef.current[tempId] = {
          files,
          localUrls,
          content,
          parentMessageId: options?.parentMessageId,
          mentionIds,
        };

        setInput("");
        clearSelectedFiles();
        clearPendingMentions();

        await sendAttachmentBatch(
          tempId,
          files,
          content,
          options?.parentMessageId,
          mentionIds,
          localUrls,
        );
        setSending(false);
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
      } catch (signalRErr) {
        const signalRMessage = extractErrorMessage(signalRErr, "");
        if (
          signalRMessage.includes("không nhận tin nhắn") ||
          signalRMessage.includes("đã chặn") ||
          signalRMessage.includes("Không thể gửi tin nhắn") ||
          signalRMessage.includes("CONTACT_RESTRICTED")
        ) {
          removeOptimistic(tempId);
          setInput(content);
          setPendingMentions(mentionsToSend);
          reportSendError(signalRMessage);
          setSending(false);
          return;
        }
        try {
          const sent = await messagesApi.sendMessage({
            chatroomId,
            messageText: content,
            messageType: "text",
            parentMessageId: options?.parentMessageId,
            mentions: mentionIds.length > 0 ? mentionIds : undefined,
          });
          replaceOptimistic(tempId, sent);
        } catch (apiErr) {
          removeOptimistic(tempId);
          setInput(content); // let user retry
          setPendingMentions(mentionsToSend);
          reportSendError(
            extractErrorMessage(
              apiErr ?? signalRErr,
              "Không thể gửi tin nhắn",
            ),
          );
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
      reportSendError,
      sendAttachmentBatch,
    ],
  );

  const handleSendSticker = useCallback(
    async (src: string, options?: { parentMessageId?: string | null }) => {
      if (!chatroomId || sending || !user || !src.trim()) return;

      await stopTypingNow();
      setSending(true);

      const tempId = `temp-${Math.random().toString(36).slice(2)}`;
      appendOptimistic({
        messageId: tempId,
        chatroomId,
        senderId: user.userId,
        senderUsername: user.username,
        senderFullname: user.fullname,
        senderAvatar: user.avatar || null,
        senderNickname: null,
        messageType: "sticker",
        messageText: src,
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
        mentions: null,
      });

      try {
        await signalRSend(
          chatroomId,
          src,
          "sticker",
          undefined,
          options?.parentMessageId,
        );
      } catch (signalRErr) {
        try {
          const sent = await messagesApi.sendMessage({
            chatroomId,
            messageText: src,
            messageType: "sticker",
            parentMessageId: options?.parentMessageId,
          });
          replaceOptimistic(tempId, sent);
        } catch (apiErr) {
          removeOptimistic(tempId);
          reportSendError(extractErrorMessage(apiErr, "Không thể gửi sticker"));
        }
      } finally {
        setSending(false);
      }
    },
    [
      chatroomId,
      sending,
      user,
      stopTypingNow,
      appendOptimistic,
      replaceOptimistic,
      removeOptimistic,
      signalRSend,
      reportSendError,
    ],
  );

  const handleSendQuickEmoji = useCallback(
    async (emoji: string, options?: { parentMessageId?: string | null }) => {
      if (!chatroomId || sending || !user || !emoji.trim()) return;

      await stopTypingNow();
      setSending(true);

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
        messageText: emoji,
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
        mentions: null,
      });

      try {
        await signalRSend(
          chatroomId,
          emoji,
          "text",
          undefined,
          options?.parentMessageId,
        );
      } catch (signalRErr) {
        try {
          const sent = await messagesApi.sendMessage({
            chatroomId,
            messageText: emoji,
            messageType: "text",
            parentMessageId: options?.parentMessageId,
          });
          replaceOptimistic(tempId, sent);
        } catch (apiErr) {
          removeOptimistic(tempId);
          reportSendError(
            extractErrorMessage(apiErr ?? signalRErr, "Không thể gửi tin nhắn"),
          );
        }
      } finally {
        setSending(false);
      }
    },
    [
      chatroomId,
      sending,
      user,
      stopTypingNow,
      appendOptimistic,
      replaceOptimistic,
      removeOptimistic,
      signalRSend,
      reportSendError,
    ],
  );

  return {
    input,
    setInput,
    sending,
    handleSend,
    handleSendVoice,
    handleSendSticker,
    handleSendQuickEmoji,
    retryAttachmentMessage,
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
