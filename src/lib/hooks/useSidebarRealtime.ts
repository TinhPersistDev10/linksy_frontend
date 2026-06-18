"use client";

import { useEffect, useRef } from "react";
import { getApiOrigin } from "@/lib/utils/apiUrl";

const BASE_URL = getApiOrigin();

interface NotificationPayload {
  notificationType?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

interface UseSidebarRealtimeOptions {
  onNewMessage?: () => void;
  enabled?: boolean;
}

export function useSidebarRealtime({
  onNewMessage,
  enabled = true,
}: UseSidebarRealtimeOptions) {
  const onNewMessageRef = useRef(onNewMessage);
  onNewMessageRef.current = onNewMessage;

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let connection: any;

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
        (notification: NotificationPayload) => {
          if (
            notification.notificationType === "new_message" ||
            notification.relatedEntityType === "chatroom"
          ) {
            onNewMessageRef.current?.();
          }
        },
      );
      connection.on("ReceiveMessageNotification", () => {
        onNewMessageRef.current?.();
      });
      try {
        await connection.start();
      } catch (error) {
        console.error("[SidebarRealtime] connect failed:", error);
      }
    };

    start();

    return () => {
      mounted = false;
      if (connection) {
        connection.stop();
      }
    };
  }, [enabled]);
}
