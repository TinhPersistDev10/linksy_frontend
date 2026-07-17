// src/lib/hooks/useChatSignalR.ts  ← THAY THẾ file cũ bằng file này
//
// THAY ĐỔI DUY NHẤT so với bản gốc:
//   - Return thêm `connectionRef` để useCallSignalR có thể dùng chung connection
//   - Không thay đổi bất kỳ logic nào khác
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Message } from "@/lib/types/chatroom";
import { getApiOrigin } from "@/lib/utils/apiUrl";
import type {
  AllMessagesReadEvent,
  MessageDeliveredEvent,
  MessageDeletedEvent,
  MessageEditedEvent,
  MessageReadEvent,
} from "../types/message";

const BASE_URL = getApiOrigin();

const RETRY_DELAYS = [0, 2000, 5000, 10000, 30000];
const MAX_MANUAL_RETRIES = 5;

interface UseChatSignalROptions {
  chatroomId: string | null;
  onReceiveMessage: (msg: Message) => void;
  onMessageDeleted: (event: MessageDeletedEvent) => void;
  onMessageEdited: (event: MessageEditedEvent) => void;
  onMessageRead: (event: MessageReadEvent) => void;
  onMessageDelivered: (event: MessageDeliveredEvent) => void;
  onAllMessagesRead: (event: AllMessagesReadEvent) => void;
  onUserTyping: (data: {
    userId: string;
    username: string;
    chatroomId: string;
  }) => void;
  onUserStoppedTyping: (data: { userId: string }) => void;
  onMembershipChanged: (data: { chatroomId: string }) => void;
}

export function useChatSignalR({
  chatroomId,
  onReceiveMessage,
  onMessageDeleted,
  onMessageEdited,
  onMessageRead,
  onMessageDelivered,
  onAllMessagesRead,
  onUserTyping,
  onUserStoppedTyping,
  onMembershipChanged,
}: UseChatSignalROptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const connectionRef = useRef<any>(null);
  const currentRoomRef = useRef<string | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destroyedRef = useRef(false);

  const cbRef = useRef({
    onReceiveMessage,
    onMessageDeleted,
    onMessageEdited,
    onMessageRead,
    onMessageDelivered,
    onAllMessagesRead,
    onUserTyping,
    onUserStoppedTyping,
    onMembershipChanged,
  });
  cbRef.current = {
    onReceiveMessage,
    onMessageDeleted,
    onMessageEdited,
    onMessageRead,
    onMessageDelivered,
    onAllMessagesRead,
    onUserTyping,
    onUserStoppedTyping,
    onMembershipChanged,
  };

  useEffect(() => {
    setIsMounted(true);
    return () => {
      destroyedRef.current = true;
    };
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    destroyedRef.current = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let connection: any;

    const startConnection = async () => {
      const signalR = await import("@microsoft/signalr");

      connection = new signalR.HubConnectionBuilder()
        .withUrl(`${BASE_URL}/hubs/chat`, { withCredentials: true })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (ctx) =>
            RETRY_DELAYS[ctx.previousRetryCount] ?? 30000,
        })
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      connection.on("ReceiveMessage", (msg: Message) =>
        cbRef.current.onReceiveMessage(msg),
      );
      connection.on("MessageDeleted", (event: MessageDeletedEvent) =>
        cbRef.current.onMessageDeleted(event),
      );
      connection.on("MessageEdited", (event: MessageEditedEvent) =>
        cbRef.current.onMessageEdited(event),
      );
      connection.on("MessageRead", (event: MessageReadEvent) =>
        cbRef.current.onMessageRead(event),
      );
      connection.on("MessageDelivered", (event: MessageDeliveredEvent) =>
        cbRef.current.onMessageDelivered(event),
      );
      connection.on("AllMessagesRead", (event: AllMessagesReadEvent) =>
        cbRef.current.onAllMessagesRead(event),
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      connection.on("UserTyping", (data: any) =>
        cbRef.current.onUserTyping(data),
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      connection.on("UserStoppedTyping", (data: any) =>
        cbRef.current.onUserStoppedTyping(data),
      );
      connection.on("MembersAdded", (data: { chatroomId: string }) =>
        cbRef.current.onMembershipChanged(data),
      );
      connection.on("MemberRemoved", (data: { chatroomId: string }) =>
        cbRef.current.onMembershipChanged(data),
      );
      connection.on("MemberLeft", (data: { chatroomId: string }) =>
        cbRef.current.onMembershipChanged(data),
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      connection.on("Error", (err: any) =>
        console.error("[SignalR] Server error:", err?.message),
      );

      connection.onreconnecting(() => {
        if (!destroyedRef.current) setIsConnected(false);
      });

      connection.onreconnected(async () => {
        if (destroyedRef.current) return;
        setIsConnected(true);
        retryCountRef.current = 0;
        if (currentRoomRef.current) {
          try {
            await connection.invoke("JoinChatroom", currentRoomRef.current);
          } catch {}
        }
      });

      connection.onclose(() => {
        if (destroyedRef.current) return;
        setIsConnected(false);
        scheduleManualRetry();
      });

      connectionRef.current = connection;

      try {
        await connection.start();
        if (destroyedRef.current) {
          connection.stop();
          return;
        }
        setIsConnected(true);
        retryCountRef.current = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        if (destroyedRef.current) return;
        console.warn(
          `[SignalR] Connect failed (attempt ${retryCountRef.current + 1}):`,
          err?.message,
        );
        scheduleManualRetry();
      }
    };

    const scheduleManualRetry = () => {
      if (destroyedRef.current) return;
      if (retryCountRef.current >= MAX_MANUAL_RETRIES) {
        console.error("[SignalR] Max retries reached.");
        return;
      }
      const delay = RETRY_DELAYS[retryCountRef.current] ?? 30000;
      retryCountRef.current += 1;
      retryTimerRef.current = setTimeout(() => {
        if (!destroyedRef.current) startConnection();
      }, delay);
    };

    startConnection();

    return () => {
      destroyedRef.current = true;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      connection?.stop();
      connectionRef.current = null;
      setIsConnected(false);
    };
  }, [isMounted]);

  useEffect(() => {
    if (!isMounted || !isConnected) return;
    const conn = connectionRef.current;
    if (!conn) return;

    const manage = async () => {
      if (currentRoomRef.current && currentRoomRef.current !== chatroomId) {
        try {
          await conn.invoke("LeaveChatroom", currentRoomRef.current);
        } catch {}
      }
      if (chatroomId) {
        try {
          await conn.invoke("JoinChatroom", chatroomId);
          currentRoomRef.current = chatroomId;
        } catch (e) {
          console.error("[SignalR] JoinChatroom error:", e);
        }
      } else {
        currentRoomRef.current = null;
      }
    };

    manage();
  }, [chatroomId, isConnected, isMounted]);

  const sendMessage = useCallback(
    async (
      chatroomId: string,
      text: string,
      type = "text",
      mentions?: string[],
      parentMessageId?: string | null,
    ) => {
      const conn = connectionRef.current;
      if (!conn) throw new Error("SignalR not connected");
      await conn.invoke("SendMessage", {
        ChatroomId: chatroomId,
        MessageText: text,
        MessageType: type,
        Mentions: mentions && mentions.length > 0 ? mentions : undefined,
        ParentMessageId: parentMessageId || undefined,
      });
    },
    [],
  );

  const sendTyping = useCallback(async (chatroomId: string) => {
    try {
      await connectionRef.current?.invoke("StartTyping", chatroomId);
    } catch {}
  }, []);

  const stopTyping = useCallback(async (chatroomId: string) => {
    try {
      await connectionRef.current?.invoke("StopTyping", chatroomId);
    } catch {}
  }, []);

  const deleteMessage = useCallback(async (messageId: string) => {
    const connection = connectionRef.current;
    if (!connection) throw new Error("SignalR not connected");
    await connection.invoke("DeleteMessage", messageId);
  }, []);

  const editMessage = useCallback(
    async (messageId: string, newText: string) => {
      const connection = connectionRef.current;
      if (!connection) throw new Error("SignalR not connected");
      await connection.invoke("EditMessage", messageId, newText);
    },
    [],
  );

  const replyToMessage = useCallback(
    async (chatroomId: string, parentMessageId: string, replyText: string) => {
      const connection = connectionRef.current;
      if (!connection) throw new Error("SignalR not connected");
      await connection.invoke(
        "ReplyToMessage",
        chatroomId,
        parentMessageId,
        replyText,
      );
    },
    [],
  );

  return {
    isConnected: isMounted && isConnected,
    connectionRef,
    sendMessage,
    sendTyping,
    stopTyping,
    deleteMessage,
    editMessage,
    replyToMessage,
  };
}
