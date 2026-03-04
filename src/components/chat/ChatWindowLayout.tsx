"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send,
  MoreVertical,
  Phone,
  Video,
  Smile,
  Paperclip,
  ArrowLeft,
  Trash2,
} from "lucide-react";
import { chatroomsApi } from "@/lib/api/chatrooms";
import type { Chatroom, Message } from "@/lib/types/chatroom";
import { useAuth } from "@/lib/hooks/useAuth";
import { cn } from "@/lib/utils/cn";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace("/api", "") ||
  "http://localhost:5253";

interface ChatWindowLayoutProps {
  chatroom: Chatroom | null;
  onBack?: () => void;
}

function Avatar({
  src,
  name,
  size = 9,
}: {
  src?: string;
  name: string;
  size?: number;
}) {
  const initials =
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";
  const avatarSrc = src
    ? src.startsWith("http")
      ? src
      : `${BASE_URL}${src}`
    : undefined;
  return (
    <div
      className={cn(
        "rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center overflow-hidden shrink-0",
        `w-${size} h-${size}`,
      )}
    >
      {avatarSrc ? (
        <img
          src={avatarSrc}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <span className="text-xs font-semibold text-white">{initials}</span>
      )}
    </div>
  );
}

function formatMessageTime(dateStr: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function formatDateDivider(dateStr: string) {
  const date = new Date(dateStr);
  const diff = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (diff === 0) return "Hôm nay";
  if (diff === 1) return "Hôm qua";
  return date.toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function useChatSignalRClient(options: {
  chatroomId: string | null;
  onReceiveMessage: (msg: Message) => void;
  onMessageDeleted: (data: { messageId: string }) => void;
  onMessageEdited: (msg: Message) => void;
  onUserTyping: (data: {
    userId: string;
    username: string;
    chatroomId: string;
  }) => void;
  onUserStoppedTyping: (data: { userId: string }) => void;
}) {
  // ✅ Khởi tạo tất cả state với giá trị cố định, không dùng window/Date
  const [isConnected, setIsConnected] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const connectionRef = useRef<any>(null);
  const currentRoomRef = useRef<string | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // ✅ Step 1: đánh dấu đã mount ở client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ✅ Step 2: chỉ khởi tạo SignalR sau khi mount (client-only)
  useEffect(() => {
    if (!isMounted) return;

    let connection: any;

    const init = async () => {
      // Dynamic import để tránh SSR
      const signalR = await import("@microsoft/signalr");

      connection = new signalR.HubConnectionBuilder()
        .withUrl(`${BASE_URL}/hubs/chat`, { withCredentials: true })
        .withAutomaticReconnect([0, 1000, 3000, 5000, 10000])
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      connection.on("ReceiveMessage", (message: Message) => {
        optionsRef.current.onReceiveMessage(message);
      });
      connection.on("MessageDeleted", (data: any) => {
        optionsRef.current.onMessageDeleted(data);
      });
      connection.on("MessageEdited", (msg: Message) => {
        optionsRef.current.onMessageEdited(msg);
      });
      connection.on("UserTyping", (data: any) => {
        optionsRef.current.onUserTyping(data);
      });
      connection.on("UserStoppedTyping", (data: any) => {
        optionsRef.current.onUserStoppedTyping(data);
      });
      connection.on("Error", (err: any) => {
        console.error("[SignalR]", err.message);
      });

      connection.onreconnected(async () => {
        setIsConnected(true);
        if (currentRoomRef.current) {
          try {
            await connection.invoke("JoinChatroom", currentRoomRef.current);
          } catch {}
        }
      });
      connection.onclose(() => setIsConnected(false));
      connection.onreconnecting(() => setIsConnected(false));

      try {
        await connection.start();
        setIsConnected(true);
        connectionRef.current = connection;
      } catch (e) {
        console.error("[SignalR] Failed to connect:", e);
      }
    };

    init();

    return () => {
      connection?.stop();
      connectionRef.current = null;
    };
  }, [isMounted]);

  // Join/Leave room
  useEffect(() => {
    if (!isMounted) return;
    const conn = connectionRef.current;
    if (!conn || !isConnected) return;

    const manage = async () => {
      if (
        currentRoomRef.current &&
        currentRoomRef.current !== options.chatroomId
      ) {
        try {
          await conn.invoke("LeaveChatroom", currentRoomRef.current);
        } catch {}
      }
      if (options.chatroomId) {
        try {
          await conn.invoke("JoinChatroom", options.chatroomId);
          currentRoomRef.current = options.chatroomId;
        } catch (e) {
          console.error("[SignalR] JoinChatroom error:", e);
        }
      } else {
        currentRoomRef.current = null;
      }
    };

    manage();
  }, [options.chatroomId, isConnected, isMounted]);

  const sendMessage = useCallback(
    async (chatroomId: string, text: string, type = "text") => {
      const conn = connectionRef.current;
      if (!conn) throw new Error("Not connected");
      await conn.invoke("SendMessage", {
        ChatroomId: chatroomId,
        MessageText: text,
        MessageType: type,
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

  const deleteMessage = useCallback(
    async (chatroomId: string, messageId: string) => {
      await connectionRef.current?.invoke(
        "DeleteMessage",
        chatroomId,
        messageId,
      );
    },
    [],
  );

  return {
    isConnected: isMounted && isConnected,
    sendMessage,
    sendTyping,
    stopTyping,
    deleteMessage,
  };
}

export default function ChatWindowLayout({
  chatroom,
  onBack,
}: ChatWindowLayoutProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<
    { userId: string; username: string }[]
  >([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const otherMember = chatroom?.members?.find((m) => m.userId !== user?.userId);

  const handleReceiveMessage = useCallback((message: Message) => {
    setMessages((prev) => {
      // Xóa tất cả optimistic temp messages của mình khi nhận confirm từ server
      const withoutTemps = message.isOwn
        ? prev.filter((m) => !m.messageId.startsWith("temp-"))
        : prev;
      if (withoutTemps.some((m) => m.messageId === message.messageId))
        return withoutTemps;
      return [...withoutTemps, message];
    });
  }, []);

  const handleMessageDeleted = useCallback(
    ({ messageId }: { messageId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.messageId === messageId
            ? { ...m, isDeleted: true, messageText: "Tin nhắn đã bị xóa" }
            : m,
        ),
      );
    },
    [],
  );

  const handleMessageEdited = useCallback((updated: Message) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.messageId === updated.messageId ? { ...m, ...updated } : m,
      ),
    );
  }, []);

  const handleUserTyping = useCallback(
    ({ userId, username, chatroomId: roomId }: any) => {
      if (roomId !== chatroom?.chatroomId) return;
      setTypingUsers((prev) =>
        prev.some((u) => u.userId === userId)
          ? prev
          : [...prev, { userId, username }],
      );
    },
    [chatroom?.chatroomId],
  );

  const handleUserStoppedTyping = useCallback(({ userId }: any) => {
    setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
  }, []);

  const { isConnected, sendMessage, sendTyping, stopTyping, deleteMessage } =
    useChatSignalRClient({
      chatroomId: chatroom?.chatroomId ?? null,
      onReceiveMessage: handleReceiveMessage,
      onMessageDeleted: handleMessageDeleted,
      onMessageEdited: handleMessageEdited,
      onUserTyping: handleUserTyping,
      onUserStoppedTyping: handleUserStoppedTyping,
    });

  useEffect(() => {
    if (!chatroom) return;
    setMessages([]);
    setTypingUsers([]);
    loadMessages();
  }, [chatroom?.chatroomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingUsers]);

  const loadMessages = async () => {
    if (!chatroom) return;
    setLoading(true);
    try {
      const data = await chatroomsApi.getMessages(chatroom.chatroomId);
      setMessages(data);
    } catch (e) {
      console.error("Load messages error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    const content = input.trim();
    if (!content || !chatroom || sending) return;

    if (isTypingRef.current) {
      isTypingRef.current = false;
      await stopTyping(chatroom.chatroomId);
    }

    setSending(true);
    setInput("");

    // ✅ Optimistic message - KHÔNG dùng Date.now() trong render
    const tempId = `temp-${Math.random().toString(36).slice(2)}`;
    const tempMsg: Message = {
      messageId: tempId,
      chatroomId: chatroom.chatroomId,
      senderId: user!.userId,
      senderUsername: user!.username,
      senderFullname: user!.fullname,
      senderAvatar: user!.avatar || "",
      senderNickname: null,
      messageType: "text",
      messageText: content,
      parentMessageId: null,
      replyCount: 0,
      isEdited: false,
      isDeleted: false,
      isOwn: true,
      sentAt: new Date().toISOString(),
      editedAt: null,
      deletedAt: null,
      attachments: null,
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      await sendMessage(chatroom.chatroomId, content, "text");
      // Server sẽ broadcast ReceiveMessage → handler tự xóa temp và thêm real message
    } catch {
      // Fallback REST
      try {
        const sent = await chatroomsApi.sendMessage(chatroom.chatroomId, {
          messageText: content,
          messageType: "text",
        });
        setMessages((prev) =>
          prev.map((m) => (m.messageId === tempId ? sent : m)),
        );
      } catch {
        setMessages((prev) => prev.filter((m) => m.messageId !== tempId));
        setInput(content);
      }
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleInputChange = async (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setInput(e.target.value);
    if (!chatroom) return;

    if (!isTypingRef.current && e.target.value.trim()) {
      isTypingRef.current = true;
      await sendTyping(chatroom.chatroomId);
    }

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(async () => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        await stopTyping(chatroom.chatroomId);
      }
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!chatroom) return;
    try {
      await deleteMessage(chatroom.chatroomId, messageId);
    } catch (e) {
      console.error("Delete error:", e);
    }
  };

  if (!chatroom) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8 bg-muted/10">
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

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-background/80 backdrop-blur-sm shrink-0">
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden p-1 rounded-lg hover:bg-accent"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <Avatar
          src={otherMember?.avatar}
          name={otherMember?.fullname || chatroom.roomName}
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">
            {otherMember?.fullname || chatroom.roomName}
          </p>
          <p className="text-xs text-muted-foreground">
            {/* ✅ Không render trạng thái isOnline ngay từ server vì nó thay đổi client-side */}
            {otherMember?.isOnline ? (
              <span className="text-green-500">● Đang hoạt động</span>
            ) : (
              `@${otherMember?.username}`
            )}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {/* ✅ Chỉ hiện dot sau khi mount để tránh hydration mismatch */}
          <span
            className={cn(
              "w-2 h-2 rounded-full mr-1 transition-colors",
              isConnected ? "bg-green-500" : "bg-muted",
            )}
            title={isConnected ? "Realtime: Kết nối" : "Đang kết nối..."}
          />
          <button className="w-8 h-8 rounded-full hover:bg-accent flex items-center justify-center text-muted-foreground transition-colors">
            <Phone size={16} />
          </button>
          <button className="w-8 h-8 rounded-full hover:bg-accent flex items-center justify-center text-muted-foreground transition-colors">
            <Video size={16} />
          </button>
          <button className="w-8 h-8 rounded-full hover:bg-accent flex items-center justify-center text-muted-foreground transition-colors">
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <Avatar
              src={otherMember?.avatar}
              name={otherMember?.fullname || ""}
              size={14}
            />
            <p className="font-medium">{otherMember?.fullname}</p>
            <p className="text-sm text-muted-foreground">
              Hãy bắt đầu cuộc trò chuyện! 👋
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => {
              const isOwn = msg.isOwn || msg.senderId === user?.userId;
              const prevMsg = messages[index - 1];
              const nextMsg = messages[index + 1];
              const showAvatar =
                !isOwn && (!nextMsg || nextMsg.senderId !== msg.senderId);
              const showDateDivider =
                !prevMsg || !isSameDay(prevMsg.sentAt, msg.sentAt);
              const isGrouped =
                !showDateDivider && prevMsg?.senderId === msg.senderId;
              const isTemp = msg.messageId.startsWith("temp-");

              return (
                <div key={msg.messageId}>
                  {showDateDivider && (
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground px-2">
                        {formatDateDivider(msg.sentAt)}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}

                  <div
                    className={cn(
                      "flex items-end gap-2 group",
                      isOwn ? "flex-row-reverse" : "flex-row",
                      isGrouped ? "mt-0.5" : "mt-3",
                    )}
                  >
                    <div className="w-7 h-7 shrink-0">
                      {showAvatar && (
                        <Avatar
                          src={msg.senderAvatar}
                          name={msg.senderFullname}
                          size={7}
                        />
                      )}
                    </div>

                    <div
                      className={cn(
                        "flex flex-col max-w-[70%]",
                        isOwn ? "items-end" : "items-start",
                      )}
                    >
                      <div
                        className={cn(
                          "relative px-3.5 py-2 rounded-2xl text-sm leading-relaxed transition-opacity",
                          isOwn
                            ? "bg-blue-500 text-white rounded-br-sm"
                            : "bg-muted rounded-bl-sm",
                          msg.isDeleted && "opacity-50 italic",
                          isTemp && "opacity-60",
                        )}
                      >
                        {msg.messageText}

                        {isOwn && !msg.isDeleted && !isTemp && (
                          <button
                            onClick={() => handleDelete(msg.messageId)}
                            className="absolute -left-7 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-muted text-muted-foreground opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity hover:text-red-500 hover:bg-red-50"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>

                      <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                        {isTemp ? (
                          <span className="animate-pulse">Đang gửi...</span>
                        ) : (
                          <>
                            {formatMessageTime(msg.sentAt)}
                            {msg.isEdited && " · Đã chỉnh sửa"}
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <div className="flex items-end gap-2 mt-3">
                <div className="w-7 h-7 shrink-0">
                  <Avatar
                    src={otherMember?.avatar}
                    name={typingUsers[0].username}
                    size={7}
                  />
                </div>
                <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1 items-center h-4">
                    <span
                      className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t bg-background shrink-0">
        <div className="flex items-end gap-2 bg-muted/50 rounded-2xl border px-3 py-2">
          <button className="p-1 text-muted-foreground hover:text-foreground transition-colors mb-0.5">
            <Paperclip size={18} />
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Nhắn tin..."
            rows={1}
            className="flex-1 bg-transparent text-sm resize-none outline-none max-h-32 py-0.5 placeholder:text-muted-foreground"
            style={{ scrollbarWidth: "none" }}
          />
          <button className="p-1 text-muted-foreground hover:text-foreground transition-colors mb-0.5">
            <Smile size={18} />
          </button>
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className={cn(
              "p-1.5 rounded-xl transition-all mb-0.5",
              input.trim()
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "text-muted-foreground",
            )}
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-1.5">
          Enter để gửi · Shift+Enter xuống dòng
        </p>
      </div>
    </div>
  );
}
