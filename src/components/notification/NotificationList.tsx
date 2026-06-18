"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, CalendarClock, CheckCheck, Loader2, Trash2, UserPlus, UsersRound } from "lucide-react";
import { notificationsApi } from "@/lib/api/notifications";
import type { NotificationResponse } from "@/lib/types/notification";

type NotificationFilter = "all" | "unread" | "read";

interface NotificationListProps {
  onUnreadCountChange?: (count: number) => void;
  onOpenFriendRequests?: () => void;
}

function notificationBody(item: NotificationResponse) {
  return item.body || item.content || "Không có nội dung chi tiết.";
}

function formatTime(value: string) {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (Number.isNaN(date.getTime())) return "";
  if (diffMinutes < 1) return "Vừa xong";
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function NotificationIcon({ item }: { item: NotificationResponse }) {
  if (item.imageUrl) {
    return <img src={item.imageUrl} alt="" className="h-9 w-9 rounded-full object-cover" />;
  }

  const iconClass = "h-9 w-9 shrink-0 rounded-full flex items-center justify-center";

  if (item.notificationType === "friend_request") {
    return (
      <span className={`${iconClass} bg-sky-100 text-sky-600`}>
        <UserPlus size={17} />
      </span>
    );
  }

  if (item.notificationType.includes("group")) {
    return (
      <span className={`${iconClass} bg-emerald-100 text-emerald-600`}>
        <UsersRound size={17} />
      </span>
    );
  }

  return (
    <span className={`${iconClass} bg-slate-100 text-slate-600`}>
      <Bell size={17} />
    </span>
  );
}

export default function NotificationList({
  onUnreadCountChange,
  onOpenFriendRequests,
}: NotificationListProps) {
  const [items, setItems] = useState<NotificationResponse[]>([]);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await notificationsApi.getNotifications(1, 20);
        const notifications = Array.isArray(data) ? data : data.notifications;
        const visibleNotifications = (notifications ?? []).filter(
          (item) => item.notificationType !== "new_message",
        );

        setItems(visibleNotifications);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const unreadCount = useMemo(
    () => items.filter((item) => !item.isRead).length,
    [items],
  );

  const readCount = items.length - unreadCount;

  const filteredItems = useMemo(() => {
    if (filter === "unread") return items.filter((item) => !item.isRead);
    if (filter === "read") return items.filter((item) => item.isRead);
    return items;
  }, [filter, items]);

  useEffect(() => {
    onUnreadCountChange?.(unreadCount);
  }, [onUnreadCountChange, unreadCount]);

  const markRead = async (notificationId: string) => {
    const now = new Date().toISOString();
    setItems((current) =>
      current.map((item) =>
        item.notificationId === notificationId
          ? { ...item, isRead: true, readAt: item.readAt ?? now }
          : item,
      ),
    );

    try {
      await notificationsApi.markAsRead(notificationId);
    } catch {
      // Keep optimistic state; next reload will sync with backend if request failed.
    }
  };

  const markAllRead = async () => {
    const now = new Date().toISOString();
    setItems((current) =>
      current.map((item) => ({ ...item, isRead: true, readAt: item.readAt ?? now })),
    );

    try {
      await notificationsApi.markAllAsRead();
    } catch {
      // Keep optimistic state; next reload will sync with backend if request failed.
    }
  };

  const deleteNotification = async (notificationId: string) => {
    const previous = items;
    setItems((current) => current.filter((item) => item.notificationId !== notificationId));

    try {
      await notificationsApi.deleteNotification(notificationId);
    } catch {
      setItems(previous);
    }
  };

  const handleOpenNotification = (item: NotificationResponse) => {
    if (!item.isRead) void markRead(item.notificationId);

    if (item.notificationType === "friend_request") {
      onOpenFriendRequests?.();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
        <Loader2 size={16} className="animate-spin" /> Đang tải thông báo...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-center px-2">
        <Bell size={20} className="text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground">Không có thông báo</p>
      </div>
    );
  }

  const filterItems: { id: NotificationFilter; label: string; count: number }[] = [
    { id: "all", label: "Tất cả", count: items.length },
    { id: "unread", label: "Chưa đọc", count: unreadCount },
    { id: "read", label: "Đã đọc", count: readCount },
  ];

  return (
    <div className="space-y-2 px-1">
      <div className="flex items-center justify-between px-2 pb-1">
        <p className="text-xs font-semibold text-sidebar-foreground/80">
          {items.length} thông báo
        </p>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-700 hover:bg-sky-200"
          >
            <CheckCheck size={12} /> Đọc tất cả
          </button>
        )}
      </div>

      <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
        {filterItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition ${
              filter === item.id
                ? "bg-white text-sky-700 shadow-sm"
                : "text-muted-foreground hover:text-sidebar-foreground"
            }`}
          >
            {item.label} {item.count > 0 ? item.count : ""}
          </button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 px-3 py-8 text-center text-xs text-muted-foreground">
          {filter === "unread"
            ? "Không có thông báo chưa đọc"
            : filter === "read"
              ? "Ch?a c? thông báo Đã đọc"
              : "Không có thông báo"}
        </div>
      ) : (
        filteredItems.map((item) => {
          const body = notificationBody(item);
          const clickable = item.notificationType === "friend_request";

          return (
            <button
              key={item.notificationId}
              type="button"
              onClick={() => handleOpenNotification(item)}
              className={`group w-full rounded-xl border px-3 py-3 text-left transition hover:border-sky-100 hover:bg-sky-50/70 ${
                item.isRead ? "border-transparent bg-white opacity-80" : "border-sky-100 bg-sky-50/40"
              }`}
            >
              <div className="flex gap-3">
                <div className="relative shrink-0">
                  <NotificationIcon item={item} />
                  {!item.isRead && (
                    <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-sky-500" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-sm font-semibold leading-snug text-sidebar-foreground">
                      {item.title}
                    </p>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {formatTime(item.createdAt)}
                    </span>
                  </div>

                  <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                    {body}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <CalendarClock size={12} />
                    <span>{item.isRead ? "Đã đọc" : "Chưa đọc"}</span>
                    {clickable && <span className="text-sky-600">Mở lời mời</span>}
                    {!item.isRead && (
                      <span className="text-sky-600">Click để đánh dấu đã đọc</span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  title="X?a thông báo"
                  onClick={(event) => {
                    event.stopPropagation();
                    void deleteNotification(item.notificationId);
                  }}
                  className="shrink-0 rounded-full p-1.5 text-muted-foreground opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </button>
          );
        })
      )}
    </div>
  );
}
