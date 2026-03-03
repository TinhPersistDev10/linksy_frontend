// src/lib/hooks/useChatSignalR.ts
'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import * as signalR from '@microsoft/signalr';
import type { Message } from '@/lib/types/chatroom';

const HUB_URL = `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5253'}/hubs/chat`;

interface UseChatSignalROptions {
  chatroomId: string | null;
  onReceiveMessage: (message: Message) => void;
  onMessageDeleted: (data: { messageId: string; chatroomId: string }) => void;
  onMessageEdited: (message: Message) => void;
  onUserTyping: (data: { userId: string; username: string; chatroomId: string }) => void;
  onUserStoppedTyping: (data: { userId: string; chatroomId: string }) => void;
  onUserOnline?: (userId: string) => void;
  onUserOffline?: (userId: string) => void;
}

export function useChatSignalR({
  chatroomId,
  onReceiveMessage,
  onMessageDeleted,
  onMessageEdited,
  onUserTyping,
  onUserStoppedTyping,
  onUserOnline,
  onUserOffline,
}: UseChatSignalROptions) {
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const currentRoomRef = useRef<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Build connection một lần duy nhất
  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        // Cookie httpOnly được gửi tự động - không cần truyền token thủ công
        withCredentials: true,
      })
      .withAutomaticReconnect([0, 1000, 3000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    // ── Event listeners ──
    connection.on('ReceiveMessage', (message: Message) => {
      onReceiveMessage(message);
    });

    connection.on('MessageDeleted', (data: { messageId: string; chatroomId: string }) => {
      onMessageDeleted(data);
    });

    connection.on('MessageEdited', (message: Message) => {
      onMessageEdited(message);
    });

    connection.on('UserTyping', (data: { userId: string; username: string; chatroomId: string }) => {
      onUserTyping(data);
    });

    connection.on('UserStoppedTyping', (data: { userId: string; chatroomId: string }) => {
      onUserStoppedTyping(data);
    });

    connection.on('UserOnline', (userId: string) => {
      onUserOnline?.(userId);
    });

    connection.on('UserOffline', (userId: string) => {
      onUserOffline?.(userId);
    });

    connection.on('Error', (err: { message: string }) => {
      console.error('[SignalR] Server error:', err.message);
    });

    // ── Reconnect: rejoin room ──
    connection.onreconnected(async () => {
      setIsConnected(true);
      if (currentRoomRef.current) {
        try {
          await connection.invoke('JoinChatroom', currentRoomRef.current);
        } catch (e) {
          console.error('[SignalR] Rejoin after reconnect failed:', e);
        }
      }
    });

    connection.onclose(() => setIsConnected(false));
    connection.onreconnecting(() => setIsConnected(false));

    // Start connection
    connection.start()
      .then(() => {
        setIsConnected(true);
        connectionRef.current = connection;
      })
      .catch(e => console.error('[SignalR] Connection failed:', e));

    return () => {
      connection.stop();
    };
  }, []); // chỉ chạy 1 lần

  // Join/Leave room khi chatroomId thay đổi
  useEffect(() => {
    const conn = connectionRef.current;
    if (!conn || conn.state !== signalR.HubConnectionState.Connected) return;

    const joinRoom = async () => {
      // Leave room cũ nếu có
      if (currentRoomRef.current && currentRoomRef.current !== chatroomId) {
        try {
          await conn.invoke('LeaveChatroom', currentRoomRef.current);
        } catch (e) {
          console.error('[SignalR] Leave room error:', e);
        }
      }

      // Join room mới
      if (chatroomId) {
        try {
          await conn.invoke('JoinChatroom', chatroomId);
          currentRoomRef.current = chatroomId;
        } catch (e) {
          console.error('[SignalR] Join room error:', e);
        }
      } else {
        currentRoomRef.current = null;
      }
    };

    joinRoom();
  }, [chatroomId, isConnected]);

  // ── Actions ──
  const sendMessage = useCallback(async (chatroomId: string, messageText: string, messageType = 'text') => {
    const conn = connectionRef.current;
    if (!conn || conn.state !== signalR.HubConnectionState.Connected) {
      throw new Error('SignalR not connected');
    }
    await conn.invoke('SendMessage', {
      ChatroomId: chatroomId,
      MessageText: messageText,
      MessageType: messageType,
    });
  }, []);

  const sendTyping = useCallback(async (chatroomId: string) => {
    const conn = connectionRef.current;
    if (!conn || conn.state !== signalR.HubConnectionState.Connected) return;
    try {
      await conn.invoke('StartTyping', chatroomId);
    } catch {}
  }, []);

  const stopTyping = useCallback(async (chatroomId: string) => {
    const conn = connectionRef.current;
    if (!conn || conn.state !== signalR.HubConnectionState.Connected) return;
    try {
      await conn.invoke('StopTyping', chatroomId);
    } catch {}
  }, []);

  const deleteMessage = useCallback(async (chatroomId: string, messageId: string) => {
    const conn = connectionRef.current;
    if (!conn || conn.state !== signalR.HubConnectionState.Connected) return;
    await conn.invoke('DeleteMessage', chatroomId, messageId);
  }, []);

  const editMessage = useCallback(async (chatroomId: string, messageId: string, newText: string) => {
    const conn = connectionRef.current;
    if (!conn || conn.state !== signalR.HubConnectionState.Connected) return;
    await conn.invoke('EditMessage', chatroomId, messageId, newText);
  }, []);

  return {
    isConnected,
    sendMessage,
    sendTyping,
    stopTyping,
    deleteMessage,
    editMessage,
  };
}