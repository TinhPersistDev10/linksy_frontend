"use client";

import { useEffect, useRef } from "react";
import { getApiOrigin } from "@/lib/utils/apiUrl";
import type { NotificationResponse } from "../types/notification";
import type { ChatroomResponse } from "../types/chatroom";

const BASE_URL = getApiOrigin();

interface UseSidebarRealtimeOptions {
  onNewMessage?: () => void;
  onNewNotification?: (notification: NotificationResponse) => void;
  onReconnect?: () => void;
  onAddedToGroup?: (chatroom: ChatroomResponse) => void;
  onRemovedFromGroup?: (chatroomId: string) => void;
  enabled?: boolean;
}

export function useSidebarRealtime({
  onNewMessage,
  enabled = true,
  onNewNotification,
  onReconnect,
  onAddedToGroup,
  onRemovedFromGroup,
}: UseSidebarRealtimeOptions) {
  const onNewMessageRef = useRef(onNewMessage);
  onNewMessageRef.current = onNewMessage;

  const onNewNotificationRef = useRef(onNewNotification);
  onNewNotificationRef.current = onNewNotification;

  const onReconnectRef = useRef(onReconnect);
  onReconnectRef.current = onReconnect;
  const onAddedToGroupRef = useRef(onAddedToGroup);
  onAddedToGroupRef.current = onAddedToGroup;
  const onRemovedFromGroupRef = useRef(onRemovedFromGroup);
  onRemovedFromGroupRef.current = onRemovedFromGroup;
  useEffect(() => {
    if (!enabled) return;

    let connection: import("@microsoft/signalr").HubConnection | undefined;

    const start = async () => {
      const signalR = await import("@microsoft/signalr");

      connection = new signalR.HubConnectionBuilder()
        .withUrl(`${BASE_URL}/hubs/chat`, {
          withCredentials: true,
        })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      connection.on(
        "ReceiveNotification",
        (notification: NotificationResponse) => {
          if (notification.notificationType === "new_message") {
            onNewMessageRef.current?.();
            return;
          }
          onNewNotificationRef.current?.(notification);
        },
      );
      connection.on("ReceiveMessageNotification", () => {
        onNewMessageRef.current?.();
      });
      connection.on("AddedToGroup", (chatroom: ChatroomResponse) => {
        onAddedToGroupRef.current?.(chatroom);
      });
      connection.on("RemovedFromGroup", (chatroomId: string) => {
        onRemovedFromGroupRef.current?.(chatroomId);
      });
      connection.onreconnected(() => {
        onReconnectRef.current?.();
      });
      try {
        await connection.start();
      } catch (error) {
        console.error("[SidebarRealtime] connect failed:", error);
      }
    };

    start();

    return () => {
      if (connection) {
        connection.stop();
      }
    };
  }, [enabled]);
}
