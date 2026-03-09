// src/lib/hooks/useChatSignalR.ts
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Message } from "@/lib/types/chatroom";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") || "http://localhost:5253";

// Retry delays: 0s, 2s, 5s, 10s, 30s
const RETRY_DELAYS = [0, 2000, 5000, 10000, 30000];
const MAX_MANUAL_RETRIES = 5;

interface UseChatSignalROptions {
  chatroomId: string | null;
  onReceiveMessage:    (msg: Message) => void;
  onMessageDeleted:    (data: { messageId: string }) => void;
  onMessageEdited:     (msg: Message) => void;
  onUserTyping:        (data: { userId: string; username: string; chatroomId: string }) => void;
  onUserStoppedTyping: (data: { userId: string }) => void;
}

export function useChatSignalR({
  chatroomId,
  onReceiveMessage,
  onMessageDeleted,
  onMessageEdited,
  onUserTyping,
  onUserStoppedTyping,
}: UseChatSignalROptions) {
  const [isConnected, setIsConnected]   = useState(false);
  const [isMounted,   setIsMounted]     = useState(false);

  const connectionRef    = useRef<any>(null);
  const currentRoomRef   = useRef<string | null>(null);
  const retryCountRef    = useRef(0);
  const retryTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destroyedRef     = useRef(false);

  // Keep latest callbacks in a ref — avoids stale closures without re-registering handlers
  const cbRef = useRef({ onReceiveMessage, onMessageDeleted, onMessageEdited, onUserTyping, onUserStoppedTyping });
  cbRef.current = { onReceiveMessage, onMessageDeleted, onMessageEdited, onUserTyping, onUserStoppedTyping };

  // ── Mount guard (prevents SSR import of signalR) ──────────────────────────
  useEffect(() => {
    setIsMounted(true);
    return () => { destroyedRef.current = true; };
  }, []);

  // ── Build & start connection ───────────────────────────────────────────────
  useEffect(() => {
    if (!isMounted) return;

    destroyedRef.current = false;
    let connection: any;

    const startConnection = async () => {
      const signalR = await import("@microsoft/signalr");

      connection = new signalR.HubConnectionBuilder()
        .withUrl(`${BASE_URL}/hubs/chat`, {
          withCredentials: true,
        })
        // Let SignalR handle reconnect automatically after successful first connect
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (ctx) =>
            RETRY_DELAYS[ctx.previousRetryCount] ?? 30000,
        })
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      // ── Register event handlers (use cbRef to always call latest version) ──
      connection.on("ReceiveMessage",    (msg: Message)  => cbRef.current.onReceiveMessage(msg));
      connection.on("MessageDeleted",    (data: any)     => cbRef.current.onMessageDeleted(data));
      connection.on("MessageEdited",     (msg: Message)  => cbRef.current.onMessageEdited(msg));
      connection.on("UserTyping",        (data: any)     => cbRef.current.onUserTyping(data));
      connection.on("UserStoppedTyping", (data: any)     => cbRef.current.onUserStoppedTyping(data));
      connection.on("Error",             (err: any)      => console.error("[SignalR] Server error:", err?.message));

      connection.onreconnecting(() => {
        if (!destroyedRef.current) setIsConnected(false);
      });

      connection.onreconnected(async () => {
        if (destroyedRef.current) return;
        setIsConnected(true);
        retryCountRef.current = 0;
        // Re-join current room after reconnect
        if (currentRoomRef.current) {
          try { await connection.invoke("JoinChatroom", currentRoomRef.current); } catch {}
        }
      });

      connection.onclose(() => {
        if (destroyedRef.current) return;
        setIsConnected(false);
        // withAutomaticReconnect gave up — do a manual retry
        scheduleManualRetry();
      });

      connectionRef.current = connection;

      // ── Attempt to start ──────────────────────────────────────────────────
      try {
        await connection.start();
        if (destroyedRef.current) { connection.stop(); return; }
        setIsConnected(true);
        retryCountRef.current = 0;
      } catch (err: any) {
        if (destroyedRef.current) return;
        console.warn(`[SignalR] Connect failed (attempt ${retryCountRef.current + 1}):`, err?.message);
        scheduleManualRetry();
      }
    };

    const scheduleManualRetry = () => {
      if (destroyedRef.current) return;
      if (retryCountRef.current >= MAX_MANUAL_RETRIES) {
        console.error("[SignalR] Max retries reached. Giving up.");
        return;
      }
      const delay = RETRY_DELAYS[retryCountRef.current] ?? 30000;
      retryCountRef.current += 1;
      console.info(`[SignalR] Retrying in ${delay}ms (attempt ${retryCountRef.current})...`);
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

  // ── Join / leave chatroom when chatroomId changes ─────────────────────────
  useEffect(() => {
    if (!isMounted || !isConnected) return;
    const conn = connectionRef.current;
    if (!conn) return;

    const manage = async () => {
      // Leave previous room
      if (currentRoomRef.current && currentRoomRef.current !== chatroomId) {
        try { await conn.invoke("LeaveChatroom", currentRoomRef.current); } catch {}
      }
      // Join new room
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

  // ── Actions ───────────────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (chatroomId: string, text: string, type = "text") => {
      const conn = connectionRef.current;
      if (!conn) throw new Error("SignalR not connected");
      await conn.invoke("SendMessage", {
        ChatroomId:  chatroomId,
        MessageText: text,
        MessageType: type,
      });
    },
    [],
  );

  const sendTyping = useCallback(async (chatroomId: string) => {
    try { await connectionRef.current?.invoke("StartTyping", chatroomId); } catch {}
  }, []);

  const stopTyping = useCallback(async (chatroomId: string) => {
    try { await connectionRef.current?.invoke("StopTyping", chatroomId); } catch {}
  }, []);

  const deleteMessage = useCallback(async (chatroomId: string, messageId: string) => {
    try { await connectionRef.current?.invoke("DeleteMessage", chatroomId, messageId); } catch {}
  }, []);

  return {
    isConnected: isMounted && isConnected,
    sendMessage,
    sendTyping,
    stopTyping,
    deleteMessage,
  };
}