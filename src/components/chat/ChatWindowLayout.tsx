"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { AlertCircle, Loader2, Send, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ChatroomResponse } from "@/lib/types/chatroom";
import { useAuth } from "@/lib/hooks/useAuth";
import { useChatSignalR } from "@/lib/hooks/useChatSignalR";
import type { UseCallSignalRReturn } from "@/lib/hooks/useCallSignalR";

import { useMessages, PAGE_SIZE } from "@/lib/hooks/useMessages";
import { useSendMessage } from "@/lib/hooks/useSendMessage";
import { useContentModerationConfigQuery } from "@/lib/hooks/useServerStateQueries";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import ConversationInfoPanel from "./ConversationInfoPanel";
import MessageThreadPanel from "./MessageThreadPanel";
import PinnedMessagesBanner from "./PinnedMessagesBanner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { blockedUsersApi } from "@/lib/api/blocked-users";
import { messagesApi } from "@/lib/api/messages";
import { chatroomsApi } from "@/lib/api/chatrooms";
import { scheduledMessagesApi } from "@/lib/api/scheduled-messages";
import {
  blockedUserQueryKeys,
  chatroomQueryKeys,
  scheduledMessageQueryKeys,
} from "@/lib/queries/queryKeys";
import type {
  AllMessagesReadEvent,
  CreatePollRequest,
  MessageDeliveryStatusResponse,
  MessagePinnedEvent,
  MessageReadEvent,
  MessageResponse,
  MessageUnpinnedEvent,
  PinnedMessageResponse,
} from "@/lib/types/message";
import CreatePollDialog from "./CreatePollDialog";
import { toast } from "@/lib/stores/toastStore";
import { extractErrorMessage } from "@/lib/utils/extractErrorMessage";
import {
  COMMUNITY_VIOLATION_MESSAGE,
  containsBannedContent,
} from "@/lib/utils/contentModeration";

export type PrivateReplyQuote = {
  authorName: string;
  text: string;
};

interface ChatWindowLayoutProps {
  chatroom: ChatroomResponse | null;
  onBack?: () => void;
  chatListOpen?: boolean;
  onToggleChatList?: () => void;
  onReadChatroom?: () => void;
  onChatroomUpdated?: (chatroom: ChatroomResponse) => void;
  onOpenChatroom?: (
    chatroom: ChatroomResponse,
    quote?: PrivateReplyQuote | null,
  ) => void;
  initialQuote?: PrivateReplyQuote | null;
  onQuoteConsumed?: () => void;
  callController?: Pick<UseCallSignalRReturn, "initiateCall">;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ChatWindowLayout({
  chatroom,
  onBack,
  chatListOpen,
  onToggleChatList,
  onReadChatroom,
  onChatroomUpdated,
  onOpenChatroom,
  initialQuote = null,
  onQuoteConsumed,
  callController,
}: ChatWindowLayoutProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: contentModerationConfig } = useContentModerationConfigQuery(
    user?.userId,
  );
  const [activeChatroom, setActiveChatroom] = useState<ChatroomResponse | null>(
    chatroom,
  );
  const [infoOpen, setInfoOpen] = useState(false);
  const [threadRoot, setThreadRoot] = useState<MessageResponse | null>(null);
  const [notice, setNotice] = useState<{
    title: string;
    description: string;
  } | null>(null);
  const [confirmDeleteMessageId, setConfirmDeleteMessageId] = useState<
    string | null
  >(null);
  const [deletingMessage, setDeletingMessage] = useState(false);
  const [composerError, setComposerError] = useState<string | null>(null);
  const [unblocking, setUnblocking] = useState(false);
  const [blockedByOtherLocal, setBlockedByOtherLocal] = useState(false);

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

  const refreshChatroomMembers = useCallback(() => {
    if (!chatroomId) return;
    void chatroomsApi
      .getChatroom(chatroomId)
      .then((updated) => {
        handleChatroomChange(updated);
      })
      .catch(() => undefined);
  }, [chatroomId, handleChatroomChange]);

  const initialQuoteRef = useRef(initialQuote);
  const onQuoteConsumedRef = useRef(onQuoteConsumed);
  initialQuoteRef.current = initialQuote;
  onQuoteConsumedRef.current = onQuoteConsumed;

  useEffect(() => {
    setInfoOpen(false);
    setThreadRoot(null);
    setComposerError(null);
    setBlockedByOtherLocal(false);
    setReplyTo(null);
    nearBottomRef.current = true;
  }, [chatroomId]);
  const otherMember = currentChatroom?.members?.find(
    (m) => m.userId !== user?.userId,
  );
  const isDirectChat =
    currentChatroom?.roomType?.toLowerCase() === "direct";

  const { data: blockedUsers = [] } = useQuery({
    queryKey: blockedUserQueryKeys.list(user?.userId ?? "anonymous"),
    queryFn: blockedUsersApi.getBlockedUsers,
    enabled: Boolean(user?.userId) && isDirectChat,
    staleTime: 30_000,
  });

  const { data: blockStatus } = useQuery({
    queryKey: blockedUserQueryKeys.status(
      user?.userId ?? "anonymous",
      otherMember?.userId ?? "none",
    ),
    queryFn: () => blockedUsersApi.getBlockStatus(otherMember!.userId),
    enabled: Boolean(user?.userId && otherMember?.userId && isDirectChat),
    staleTime: 15_000,
    retry: 1,
  });

  const { data: scheduledPending = [] } = useQuery({
    queryKey: scheduledMessageQueryKeys.pending(chatroomId ?? "none"),
    queryFn: () => scheduledMessagesApi.listPending(chatroomId!),
    enabled: Boolean(chatroomId && user?.userId),
    staleTime: 10_000,
  });

  const iBlockedOther =
    Boolean(blockStatus?.iBlocked) ||
    Boolean(
      otherMember?.userId &&
        blockedUsers.some((item) => item.userId === otherMember.userId),
    );
  const blockedByOther =
    Boolean(blockStatus?.blockedBy) || blockedByOtherLocal;
  const composerLocked = iBlockedOther || blockedByOther;

  useEffect(() => {
    if (blockedByOther) setComposerError(null);
  }, [blockedByOther]);

  const handleUnblock = useCallback(async () => {
    if (!user?.userId || !otherMember?.userId) return;
    setUnblocking(true);
    setComposerError(null);
    try {
      await blockedUsersApi.unblockUser(otherMember.userId);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: blockedUserQueryKeys.list(user.userId),
        }),
        queryClient.invalidateQueries({
          queryKey: blockedUserQueryKeys.status(
            user.userId,
            otherMember.userId,
          ),
        }),
      ]);
      setBlockedByOtherLocal(false);
    } catch (err) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;
      setComposerError(message || "Không thể bỏ chặn người dùng này.");
    } finally {
      setUnblocking(false);
    }
  }, [otherMember?.userId, queryClient, user?.userId]);
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
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const onReadChatroomRef = useRef(onReadChatroom);
  const [replyTo, setReplyTo] = useState<MessageResponse | null>(null);
  const [privateQuote, setPrivateQuote] = useState<PrivateReplyQuote | null>(
    null,
  );
  const [editingMessage, setEditingMessage] = useState<MessageResponse | null>(
    null,
  );
  const [messageSearch, setMessageSearch] = useState("");
  const [searchResults, setSearchResults] = useState<MessageResponse[]>([]);
  const [searching, setSearching] = useState(false);
  const [typingUsers, setTypingUsers] = useState<
    { userId: string; username: string }[]
  >([]);
  // userId -> ISO timestamp of the newest message that user has read.
  // Seeded from the chatroom's member list, then kept fresh from the
  // MessageRead/AllMessagesRead SignalR events below.
  const [readReceipts, setReadReceipts] = useState<Record<string, string>>({});
  const [deliveryStatus, setDeliveryStatus] =
    useState<MessageDeliveryStatusResponse | null>(null);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<
    PinnedMessageResponse[]
  >([]);

  useEffect(() => {
    onReadChatroomRef.current = onReadChatroom;
  }, [onReadChatroom]);

  const [composerSubmitting, setComposerSubmitting] = useState(false);
  const [pollDialogOpen, setPollDialogOpen] = useState(false);

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

  // Seed read-receipt state whenever the open chatroom changes.
  useEffect(() => {
    const initial: Record<string, string> = {};
    for (const member of currentChatroom?.members ?? []) {
      if (member.lastReadAt) initial[member.userId] = member.lastReadAt;
    }
    setReadReceipts(initial);
  }, [chatroomId, currentChatroom?.members]);

  const applyReadReceipt = useCallback((userId: string, readAt: string) => {
    setReadReceipts((prev) => {
      const existing = prev[userId];
      if (existing && new Date(existing) >= new Date(readAt)) return prev;
      return { ...prev, [userId]: readAt };
    });
  }, []);

  const {
    messages,
    hasMore,
    loadingInitial,
    loadingMore,
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
    onPollUpdated,
    applyReactionToggleResult,
    applyPollUpdate,
    appendOptimistic,
    replaceOptimistic,
    removeOptimistic,
  } = useMessages(
    chatroomId,
    user?.userId,
    currentChatroom?.myMemberInfo?.memberRole === "admin",
  );

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

  const handleMessagePinned = useCallback((event: MessagePinnedEvent) => {
    if (!event?.pinnedMessage) return;
    setPinnedMessages((prev) => {
      if (prev.some((p) => p.messageId === event.pinnedMessage.messageId)) {
        return prev;
      }
      return [event.pinnedMessage, ...prev];
    });
  }, []);

  const handleMessageUnpinned = useCallback((event: MessageUnpinnedEvent) => {
    setPinnedMessages((prev) =>
      prev.filter((p) => p.messageId !== event.messageId),
    );
  }, []);

  const handleMessageDeletedWithPins = useCallback(
    (event: Parameters<typeof onMessageDeleted>[0]) => {
      onMessageDeleted(event);
      setPinnedMessages((prev) =>
        prev.filter((p) => p.messageId !== event.messageId),
      );
    },
    [onMessageDeleted],
  );

  const handleMessageReadWithReceipt = useCallback(
    (event: MessageReadEvent) => {
      onMessageRead(event);
      if (event.readBy) applyReadReceipt(event.readBy, event.readAt);
    },
    [onMessageRead, applyReadReceipt],
  );

  const handleAllMessagesReadWithReceipt = useCallback(
    (event: AllMessagesReadEvent) => {
      onAllMessagesRead(event);
      if (event.readBy) applyReadReceipt(event.readBy, event.readAt);
    },
    [onAllMessagesRead, applyReadReceipt],
  );

  // ── SignalR (chat) ─────────────────────────────────────────────────────────
  const {
    isConnected,
    sendMessage: signalRSend,
    sendTyping: signalRTyping,
    stopTyping: signalRStopTyping,
    deleteMessage: signalRDelete,
    editMessage: signalREdit,
    pinMessage: signalRPin,
    unpinMessage: signalRUnpin,
    toggleReaction: signalRToggleReaction,
    votePoll: signalRVotePoll,
    closePoll: signalRClosePoll,
  } = useChatSignalR({
    chatroomId: chatroomId ?? null,
    onReceiveMessage: handleReceiveMessage,
    onMessageDeleted: handleMessageDeletedWithPins,
    onMessageEdited,
    onMessageRead: handleMessageReadWithReceipt,
    onMessageDelivered,
    onAllMessagesRead: handleAllMessagesReadWithReceipt,
    onUserTyping,
    onUserStoppedTyping,
    onMembershipChanged: handleMembershipChanged,
    onMessagePinned: handleMessagePinned,
    onMessageUnpinned: handleMessageUnpinned,
    onReactionUpdated,
    onPollUpdated,
  });

  // ── Send + typing ──────────────────────────────────────────────────────────
  const {
    input,
    setInput,
    sending,
    handleSend,
    handleSendVoice,
    handleSendSticker,
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
    onSendError: (message) => {
      // If the other user blocked us, lock composer immediately (no error banner).
      if (message.includes("đã chặn bạn")) {
        setComposerError(null);
        setBlockedByOtherLocal(true);
        if (user?.userId && otherMember?.userId) {
          void queryClient.invalidateQueries({
            queryKey: blockedUserQueryKeys.status(
              user.userId,
              otherMember.userId,
            ),
          });
        }
        return;
      }
      setComposerError(message);
    },
  });

  const isGroupChat =
    currentChatroom?.roomType?.toLowerCase() === "group";

  const handleReplyPrivately = useCallback(
    async (message: MessageResponse) => {
      try {
        const direct = await chatroomsApi.createDirect(message.senderId);
        const text =
          message.messageType === "sticker"
            ? "Sticker"
            : message.messageType === "image"
              ? "Ảnh"
              : message.messageType === "audio" || message.messageType === "voice"
                ? "Tin nhắn thoại"
                : message.messageText || "Tin nhắn";
        onOpenChatroom?.(direct, {
          authorName: message.senderFullname || message.senderUsername,
          text,
        });
      } catch (err) {
        const messageText = extractErrorMessage(
          err,
          "Không thể mở trò chuyện riêng.",
        );
        toast.error(messageText);
        setComposerError(messageText);
      }
    },
    [onOpenChatroom],
  );
  const canPin =
    isDirectChat ||
    currentChatroom?.myMemberInfo?.memberRole === "admin" ||
    Boolean(currentChatroom?.myMemberInfo?.permissions?.canPinMessages);
  const canSendVoice =
    currentChatroom?.myMemberInfo?.permissions?.canSendVoice !== false;
  const pinnedMessageIds = useMemo(
    () => new Set(pinnedMessages.map((p) => p.messageId)),
    [pinnedMessages],
  );

  const handlePin = useCallback(
    async (messageId: string) => {
      try {
        await signalRPin(messageId);
      } catch (error) {
        console.error("Pin message failed:", error);
      }
    },
    [signalRPin],
  );

  const handleUnpin = useCallback(
    async (messageId: string) => {
      try {
        await signalRUnpin(messageId);
      } catch (error) {
        console.error("Unpin message failed:", error);
      }
    },
    [signalRUnpin],
  );

  const handleToggleReaction = useCallback(
    async (messageId: string, emojiCode: string) => {
      try {
        const result = await messagesApi.toggleReaction(messageId, emojiCode);
        const raw = result as unknown as Record<string, unknown>;
        const added = Boolean(raw?.added ?? raw?.Added);
        applyReactionToggleResult(messageId, emojiCode, added);
      } catch (restError) {
        try {
          await signalRToggleReaction(messageId, emojiCode);
          // Hub không trả added; UI cập nhật qua event ReactionUpdated.
        } catch (hubError) {
          console.error("Toggle reaction failed:", restError || hubError);
        }
      }
    },
    [signalRToggleReaction, applyReactionToggleResult],
  );

  const handleVotePoll = useCallback(
    async (messageId: string, optionId: string) => {
      try {
        const poll = await messagesApi.votePoll(messageId, optionId);
        applyPollUpdate(messageId, poll);
      } catch {
        try {
          await signalRVotePoll(messageId, optionId);
        } catch (error) {
          console.error("Vote poll failed:", error);
        }
      }
    },
    [signalRVotePoll, applyPollUpdate],
  );

  const handleClosePoll = useCallback(
    async (messageId: string) => {
      try {
        const poll = await messagesApi.closePoll(messageId);
        applyPollUpdate(messageId, poll);
      } catch {
        try {
          await signalRClosePoll(messageId);
        } catch (error) {
          console.error("Close poll failed:", error);
        }
      }
    },
    [signalRClosePoll, applyPollUpdate],
  );

  const handleCreatePoll = useCallback(
    async (poll: CreatePollRequest) => {
      if (!chatroomId || !user) return;
      setComposerSubmitting(true);
      try {
        const sent = await messagesApi.createPoll(chatroomId, poll);
        appendOptimistic({
          ...sent,
          poll: sent.poll
            ? {
                ...sent.poll,
                canClose: true,
              }
            : sent.poll,
        });
        setPollDialogOpen(false);
      } catch (error) {
        console.error("Create poll failed:", error);
        throw error;
      } finally {
        setComposerSubmitting(false);
      }
    },
    [chatroomId, user, appendOptimistic],
  );

  const handleInsertEmoji = useCallback(
    (emoji: string) => {
      setInput((prev) => prev + emoji);
    },
    [setInput],
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
      setSearchResults(result?.results ?? []);
    } catch (error) {
      console.error("Search messages failed:", error);
    } finally {
      setSearching(false);
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

  const requestDeleteMessage = (messageId: string) => {
    setConfirmDeleteMessageId(messageId);
  };

  const confirmDeleteMessage = async () => {
    if (!confirmDeleteMessageId) return;
    setDeletingMessage(true);
    try {
      await signalRDelete(confirmDeleteMessageId);
      setConfirmDeleteMessageId(null);
    } catch (error) {
      console.error("Delete message failed:", error);
    } finally {
      setDeletingMessage(false);
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

    if (content && containsBannedContent(content, contentModerationConfig)) {
      setNotice({
        title: "Vi phạm tiêu chuẩn cộng đồng",
        description: COMMUNITY_VIOLATION_MESSAGE,
      });
      return;
    }

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
      setPrivateQuote(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "";
      if (
        message.includes("vi phạm tiêu chuẩn cộng đồng") ||
        message.includes(COMMUNITY_VIOLATION_MESSAGE)
      ) {
        setNotice({
          title: "Vi phạm tiêu chuẩn cộng đồng",
          description: COMMUNITY_VIOLATION_MESSAGE,
        });
      } else {
        console.error("Submit message failed:", error);
      }
    } finally {
      setComposerSubmitting(false);
    }
  };

  const handleSchedule = async (payload: {
    messageType: "text" | "sticker";
    messageText: string;
    sendAt: Date;
  }) => {
    if (!chatroomId || composerSubmitting) return;
    const text = payload.messageText.trim();
    if (!text) return;
    if (
      payload.messageType === "text" &&
      containsBannedContent(text, contentModerationConfig)
    ) {
      setNotice({
        title: "Vi phạm tiêu chuẩn cộng đồng",
        description: COMMUNITY_VIOLATION_MESSAGE,
      });
      return;
    }

    setComposerSubmitting(true);
    try {
      await scheduledMessagesApi.schedule({
        chatroomId,
        messageType: payload.messageType,
        messageText: text,
        parentMessageId: privateQuote ? null : replyTo?.messageId,
        sendAt: payload.sendAt.toISOString(),
      });
      if (payload.messageType === "text") {
        setInput("");
        clearPendingMentions();
      }
      setReplyTo(null);
      setPrivateQuote(null);
      toast.success("Đã hẹn giờ tin nhắn");
      await queryClient.invalidateQueries({
        queryKey: scheduledMessageQueryKeys.pending(chatroomId),
      });
    } catch (error) {
      toast.error(extractErrorMessage(error, "Không thể hẹn giờ tin nhắn"));
    } finally {
      setComposerSubmitting(false);
    }
  };

  const handleCancelScheduled = async (id: string) => {
    if (!chatroomId) return;
    try {
      await scheduledMessagesApi.cancel(id);
      toast.success("Đã hủy tin nhắn hẹn giờ");
      await queryClient.invalidateQueries({
        queryKey: scheduledMessageQueryKeys.pending(chatroomId),
      });
    } catch (error) {
      toast.error(extractErrorMessage(error, "Không thể hủy tin nhắn hẹn giờ"));
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
    const quote = initialQuoteRef.current;
    setPrivateQuote(quote ?? null);
    if (quote) onQuoteConsumedRef.current?.();
    setEditingMessage(null);
    setInput("");
    clearSelectedFiles();
    clearPendingMentions();
    setPinnedMessages([]);
    setPollDialogOpen(false);
    setComposerSubmitting(false);
    setThreadRoot(null);

    messagesApi
      .markAllRead(chatroomId)
      .then(() => {
        markChatroomReadInCache();
        onReadChatroomRef.current?.();
      })
      .catch((error) => console.error("Mark all read failed:", error));

    messagesApi
      .getPinnedMessages(chatroomId)
      .then(setPinnedMessages)
      .catch((error) => console.error("Load pinned messages failed:", error));

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
      !shouldScrollToBottomRef.current ||
      loadingInitial ||
      messages.length === 0
    ) {
      return;
    }

    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled || !shouldScrollToBottomRef.current) return;
        scrollToBottomRef.current?.();
        shouldScrollToBottomRef.current = false;
        nearBottomRef.current = true;
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [messages, loadingInitial, chatroomId, shouldScrollToBottomRef]);

  useEffect(() => {
    shouldScrollToBottomRef.current = true;
    nearBottomRef.current = true;
  }, [chatroomId, shouldScrollToBottomRef]);

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
            chatListOpen={chatListOpen}
            onToggleChatList={onToggleChatList}
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
            infoOpen={infoOpen}
            onToggleInfo={() => {
              setInfoOpen((open) => !open);
              setThreadRoot(null);
            }}
            onOpenDirectChat={(directChatroom) => {
              onOpenChatroom?.(directChatroom);
            }}
            onCallMember={(userId, callType) => {
              if (!currentChatroom) return;
              void callController
                ?.initiateCall(currentChatroom.chatroomId, callType, [userId])
                .catch((error: unknown) => {
                  const message =
                    error instanceof Error
                      ? error.message
                      : "Không thể bắt đầu cuộc gọi.";
                  setNotice({
                    title: "Không thể gọi",
                    description: message,
                  });
                });
            }}
            onMembersChanged={refreshChatroomMembers}
          />

          <div className="shrink-0 border-b bg-background px-3 py-2 sm:px-4">
            <div className="flex gap-2">
              <input
                ref={searchInputRef}
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
                    onClick={() => void jumpToMessage(msg.messageId)}
                    className="block w-full border-b px-3 py-2 text-left text-xs hover:bg-muted"
                  >
                    <span className="font-medium">{msg.senderFullname}: </span>
                    <span>{msg.messageText}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <PinnedMessagesBanner
            pinnedMessages={pinnedMessages}
            canUnpin={canPin}
            onJump={(messageId) => void jumpToMessage(messageId)}
            onUnpin={(messageId) => void handleUnpin(messageId)}
          />

          <div className="min-h-0 flex-1 overflow-hidden">
            <MessageList
              key={chatroomId}
              messages={messages}
              currentUserId={user?.userId ?? ""}
              otherMember={otherMember}
              members={currentChatroom.members}
              groupName={currentChatroom.roomName}
              groupAvatar={currentChatroom.avatar}
              readReceipts={readReceipts}
              typingUsers={typingUsers}
              loadingInitial={loadingInitial}
              loadingMore={loadingMore}
              hasMore={hasMore}
              pageSize={PAGE_SIZE}
              onLoadMore={loadMore}
              onDelete={requestDeleteMessage}
              scrollToBottomRef={scrollToBottomRef}
              onNearBottom={(near) => {
                nearBottomRef.current = near;
              }}
              onShowDelivery={handleShowDelivery}
              onReply={(message) => {
                setReplyTo(message);
                setPrivateQuote(null);
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
              canPin={canPin}
              pinnedMessageIds={pinnedMessageIds}
              onPin={(messageId) => void handlePin(messageId)}
              onUnpin={(messageId) => void handleUnpin(messageId)}
              onToggleReaction={(messageId, emoji) =>
                void handleToggleReaction(messageId, emoji)
              }
              onVotePoll={(messageId, optionId) =>
                void handleVotePoll(messageId, optionId)
              }
              onClosePoll={(messageId) => void handleClosePoll(messageId)}
              onOpenThread={(message) => {
                setThreadRoot(message);
                setInfoOpen(false);
              }}
              isGroupChat={isGroupChat}
              onReplyPrivately={(message) => void handleReplyPrivately(message)}
            />
          </div>

          {composerError && !composerLocked && (
            <div
              role="alert"
              className="mx-3 mb-2 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:bg-red-950/60 dark:text-red-100"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <p className="min-w-0 flex-1 leading-relaxed">{composerError}</p>
              <button
                type="button"
                aria-label="Đóng thông báo"
                onClick={() => setComposerError(null)}
                className="shrink-0 rounded-full p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {blockedByOther ? (
            <div className="border-t border-border bg-background px-4 py-4">
              <p className="text-center text-sm font-medium text-muted-foreground">
                Người dùng này đã chặn bạn
              </p>
            </div>
          ) : iBlockedOther ? (
            <div className="border-t border-border bg-background px-4 py-3">
              <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
                <p className="text-center text-sm text-muted-foreground sm:text-left">
                  Bạn đã chặn{" "}
                  <span className="font-medium text-foreground">
                    {otherMember?.fullname || otherMember?.username || "người này"}
                  </span>
                  . Bỏ chặn để tiếp tục nhắn tin.
                </p>
                <Button
                  type="button"
                  disabled={unblocking}
                  onClick={() => void handleUnblock()}
                  className="w-full shrink-0 sm:w-auto"
                >
                  {unblocking ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Đang bỏ chặn...
                    </>
                  ) : (
                    "Bỏ chặn"
                  )}
                </Button>
              </div>
              {composerError && (
                <p className="mt-2 text-center text-xs text-red-600 dark:text-red-400 sm:text-left">
                  {composerError}
                </p>
              )}
            </div>
          ) : (
            <MessageInput
              key={chatroomId}
              value={input}
              sending={sending || composerSubmitting}
              replyTo={replyTo}
              privateQuote={privateQuote}
              editingMessage={editingMessage}
              selectedFiles={selectedFiles}
              onFilesSelected={addSelectedFiles}
              onRemoveFile={removeSelectedFile}
              attachmentsDisabled={Boolean(editingMessage)}
              onChange={(event) => {
                if (composerError) setComposerError(null);
                void handleInputChange(event);
              }}
              onKeyDown={handleKeyDown}
              onSend={() => void handleSubmit()}
              onInsertEmoji={handleInsertEmoji}
              onSendSticker={(src) => {
                void handleSendSticker(src, {
                  parentMessageId: privateQuote ? null : replyTo?.messageId,
                }).then(() => {
                  setReplyTo(null);
                  setPrivateQuote(null);
                });
              }}
              onCancelMode={() => {
                setReplyTo(null);
                setPrivateQuote(null);
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
              canSendVoice={canSendVoice && !editingMessage}
              onSchedule={handleSchedule}
              scheduling={composerSubmitting}
              scheduledPending={scheduledPending}
              onCancelScheduled={(id) => void handleCancelScheduled(id)}
              onSendVoice={async (file) => {
                // Wait briefly if another send is in flight (e.g. voice auto-stop at 60s).
                let waits = 0;
                while (composerSubmitting && waits < 40) {
                  await new Promise((r) => setTimeout(r, 100));
                  waits += 1;
                }
                if (composerSubmitting) return;
                setComposerSubmitting(true);
                try {
                  await handleSendVoice(file, {
                    parentMessageId: privateQuote ? null : replyTo?.messageId,
                  });
                  setReplyTo(null);
                  setPrivateQuote(null);
                } finally {
                  setComposerSubmitting(false);
                }
              }}
            />
          )}

          <CreatePollDialog
            open={pollDialogOpen}
            submitting={composerSubmitting}
            onClose={() => setPollDialogOpen(false)}
            onSubmit={handleCreatePoll}
            contentModerationConfig={contentModerationConfig}
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

        <MessageThreadPanel
          open={threadRoot !== null}
          rootMessage={threadRoot}
          currentUserId={user?.userId ?? ""}
          liveMessages={messages}
          sending={sending || composerSubmitting}
          onClose={() => setThreadRoot(null)}
          onOpenThread={(message) => {
            setThreadRoot(message);
            setInfoOpen(false);
          }}
          onSendReply={async (text, parentMessageId) => {
            if (!chatroomId) return;
            if (containsBannedContent(text, contentModerationConfig)) {
              setNotice({
                title: "Vi phạm tiêu chuẩn cộng đồng",
                description: COMMUNITY_VIOLATION_MESSAGE,
              });
              return;
            }
            setComposerSubmitting(true);
            try {
              await signalRSend(
                chatroomId,
                text,
                "text",
                undefined,
                parentMessageId,
              );
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : "Không thể gửi trả lời.";
              setComposerError(message);
            } finally {
              setComposerSubmitting(false);
            }
          }}
        />

        <ConversationInfoPanel
          chatroom={currentChatroom}
          otherMember={otherMember}
          open={infoOpen}
          onClose={() => setInfoOpen(false)}
          onChatroomChange={handleChatroomChange}
          onLeaveChatroom={onBack}
          pinnedCount={pinnedMessages.length}
          scheduledPending={scheduledPending}
          onCancelScheduled={(id) => void handleCancelScheduled(id)}
          onSearchInChat={() => {
            searchInputRef.current?.focus();
            searchInputRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "nearest",
            });
          }}
          onViewPinnedMessages={() => {
            if (pinnedMessages.length === 0) {
              setNotice({
                title: "Chưa có tin nhắn đã ghim",
                description:
                  "Hãy ghim một tin nhắn trong cuộc trò chuyện để xem tại đây.",
              });
              return;
            }
            void jumpToMessage(pinnedMessages[0].messageId);
          }}
          onCreatePoll={() => {
            if (!isGroupChat) return;
            setInfoOpen(false);
            setPollDialogOpen(true);
          }}
          onOpenDirectChat={(directChatroom) => {
            onOpenChatroom?.(directChatroom);
            setInfoOpen(false);
          }}
          onCallMember={(userId, callType) => {
            if (!currentChatroom) return;
            void callController
              ?.initiateCall(currentChatroom.chatroomId, callType, [userId])
              .catch((error: unknown) => {
                const message =
                  error instanceof Error
                    ? error.message
                    : "Không thể bắt đầu cuộc gọi.";
                setNotice({
                  title: "Không thể gọi",
                  description: message,
                });
              });
          }}
        />
      </div>

      <ConfirmDialog
        open={notice !== null}
        onOpenChange={(open) => {
          if (!open) setNotice(null);
        }}
        title={notice?.title ?? ""}
        description={notice?.description ?? ""}
        confirmLabel="Đã hiểu"
        variant="info"
        onConfirm={() => setNotice(null)}
      />

      <ConfirmDialog
        open={confirmDeleteMessageId !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteMessageId(null);
        }}
        title="Xóa tin nhắn"
        description="Bạn có chắc chắn muốn xóa tin nhắn này? Hành động này không thể hoàn tác."
        confirmLabel="Xóa"
        variant="destructive"
        loading={deletingMessage}
        onConfirm={() => void confirmDeleteMessage()}
      />
    </>
  );
}
