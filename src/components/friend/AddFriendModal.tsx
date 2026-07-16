"use client";

import { useState, useEffect } from "react";
import { Search, UserPlus, Check, X, Clock, Users, Bell } from "lucide-react";
import { friendsApi } from "@/lib/api/friends";
import type { SearchUserResult, FriendRequest } from "@/lib/types/chatroom";
import { getApiOrigin } from "@/lib/utils/apiUrl";
import { cn } from "@/lib/utils/cn";

type Tab = "search" | "received" | "sent";

const BASE_URL = getApiOrigin();

interface AddFriendModalProps {
  open: boolean;
  onClose: () => void;
  onFriendAdded?: () => void;
}

function Avatar({
  src,
  name,
  size = 10,
}: {
  src?: string;
  name?: string;
  size?: number;
}) {
  const safeName = name?.trim() || "?";
  const initials =
    safeName !== "?"
      ? safeName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "?";
  const avatarSrc = src?.trim()
    ? src.startsWith("http")
      ? src
      : `${BASE_URL}${src}`
    : undefined;

  return (
    <div
      className={cn(
        "rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shrink-0 overflow-hidden",
        `w-${size} h-${size}`,
      )}
    >
      {avatarSrc ? (
        <img
          src={avatarSrc}
          alt={safeName}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <span
          className={cn(
            "font-semibold text-white",
            size <= 8 ? "text-xs" : "text-sm",
          )}
        >
          {initials}
        </span>
      )}
    </div>
  );
}

function ActionButton({
  user,
  loadingId,
  onSend,
}: {
  user: SearchUserResult;
  loadingId: string | null;
  onSend: (userId: string) => void;
}) {
  const isLoading = loadingId === user.userId;

  if (user.relationshipStatus === "friends") {
    return (
      <span className="text-xs text-green-600 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full font-medium">
        Bạn bè
      </span>
    );
  }
  if (user.relationshipStatus === "request_sent") {
    return (
      <span className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full font-medium">
        <Clock size={10} /> Đã gửi
      </span>
    );
  }
  if (user.relationshipStatus === "request_received") {
    return (
      <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full font-medium">
        <Bell size={10} /> Chờ xác nhận
      </span>
    );
  }
  if (user.canSendRequest) {
    return (
      <button
        onClick={() => onSend(user.userId)}
        disabled={isLoading}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {isLoading ? (
          <div className="w-3 h-3 border border-white/50 border-t-white rounded-full animate-spin" />
        ) : (
          <UserPlus size={12} />
        )}
        Kết bạn
      </button>
    );
  }
  return null;
}

export default function AddFriendModal({
  open,
  onClose,
  onFriendAdded,
}: AddFriendModalProps) {
  const [tab, setTab] = useState<Tab>("search");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUserResult[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSearchResults([]);
    setError("");
    loadRequests();
  }, [open]);

  const loadRequests = async () => {
    try {
      const [received, sent] = await Promise.all([
        friendsApi.getReceivedRequests(),
        friendsApi.getSentRequests(),
      ]);
      setReceivedRequests(received);
      setSentRequests(sent);
    } catch (e) {
      console.error("Load requests error:", e);
    }
  };

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      setError("");
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      setError("");
      try {
        const results = await friendsApi.searchUsers(query.trim());
        setSearchResults(results);
      } catch (e: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const error = (e as any);
        setError(
          error?.response?.data?.message || error?.message || "Tìm kiếm thất bại",
        );
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSendRequest = async (userId: string) => {
    setLoadingId(userId);
    setError("");
    try {
      await friendsApi.sendRequest(userId);
      setSearchResults((prev) =>
        prev.map((u) =>
          u.userId === userId
            ? {
                ...u,
                relationshipStatus: "request_sent",
                canSendRequest: false,
              }
            : u,
        ),
      );
      await loadRequests();
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const error = (e as any);
      setError(error?.response?.data?.message || "Gửi lời mời thất bại");
    } finally {
      setLoadingId(null);
    }
  };

  const handleAccept = async (requestId: string) => {
    setLoadingId(requestId);
    try {
      await friendsApi.acceptRequest(requestId);
      setReceivedRequests((prev) =>
        prev.filter((r) => r.requestId !== requestId),
      );
      onFriendAdded?.();
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const error = (e as any);
      setError(error?.response?.data?.message || "Thao tác thất bại");
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setLoadingId(requestId);
    try {
      await friendsApi.rejectRequest(requestId);
      setReceivedRequests((prev) =>
        prev.filter((r) => r.requestId !== requestId),
      );
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const error = (e as any);
      setError(error?.response?.data?.message || "Thao tác thất bại");
    } finally {
      setLoadingId(null);
    }
  };

  const handleCancel = async (requestId: string) => {
    setLoadingId(requestId);
    try {
      await friendsApi.cancelRequest(requestId);
      setSentRequests((prev) => prev.filter((r) => r.requestId !== requestId));
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const error = (e as any);
      setError(error?.response?.data?.message || "Thao tác thất bại");
    } finally {
      setLoadingId(null);
    }
  };

  if (!open) return null;

  const tabs: {
    id: Tab;
    label: string;
    icon: React.ElementType;
    count?: number;
  }[] = [
    { id: "search", label: "Tìm kiếm", icon: Search },
    {
      id: "received",
      label: "Lời mời",
      icon: Bell,
      count: receivedRequests.length,
    },
    { id: "sent", label: "Đã gửi", icon: Clock, count: sentRequests.length },
  ];

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
        w-full max-w-md bg-background border rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Users size={16} className="text-blue-500" />
            </div>
            <h2 className="font-semibold text-base">Kết bạn</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-2">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors",
                  tab === t.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon size={14} />
                {t.label}
                {!!t.count && t.count > 0 && (
                  <span className="ml-0.5 min-w-4 h-4 px-1 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mt-3 p-2.5 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-start gap-2">
            <X size={14} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Content */}
        <div className="p-4 min-h-[320px] max-h-[420px] overflow-y-auto">
          {/* Search Tab */}
          {tab === "search" && (
            <div className="space-y-3">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  placeholder="Nhập username hoặc tên..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full pl-9 pr-4 h-10 rounded-lg border bg-muted/30 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all"
                  autoFocus
                />
              </div>
              {searching && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
                </div>
              )}
              {!searching && query && searchResults.length === 0 && !error && (
                <p className="text-center py-8 text-sm text-muted-foreground">
                  Không tìm thấy người dùng nào
                </p>
              )}
              {!searching && !query && (
                <p className="text-center py-8 text-sm text-muted-foreground">
                  Nhập username hoặc tên để tìm kiếm
                </p>
              )}
              <div className="space-y-2">
                {searchResults.map((user) => (
                  <div
                    key={user.userId}
                    className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-accent/30 transition-colors"
                  >
                    <Avatar src={user.avatar} name={user.fullname} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.fullname}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        @{user.username}
                      </p>
                      {user.bio && (
                        <p className="text-xs text-muted-foreground/60 truncate mt-0.5">
                          {user.bio}
                        </p>
                      )}
                    </div>
                    <ActionButton
                      user={user}
                      loadingId={loadingId}
                      onSend={handleSendRequest}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Received Requests */}
          {tab === "received" && (
            <div className="space-y-2">
              {receivedRequests.length === 0 ? (
                <p className="text-center py-8 text-sm text-muted-foreground">
                  Không có lời mời kết bạn nào
                </p>
              ) : (
                receivedRequests.map((req) => (
                  <div
                    key={req.requestId}
                    className="flex items-center gap-3 p-3 rounded-xl border bg-card"
                  >
                    {/* ✅ senderFullname / senderAvatar / senderUsername từ FriendRequestDto */}
                    <Avatar src={req.senderAvatar} name={req.senderFullname} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {req.senderFullname || "Người dùng"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {req.senderUsername ? `@${req.senderUsername}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleAccept(req.requestId)}
                        disabled={loadingId === req.requestId}
                        className="w-8 h-8 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition-colors disabled:opacity-50"
                      >
                        {loadingId === req.requestId ? (
                          <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Check size={14} />
                        )}
                      </button>
                      <button
                        onClick={() => handleReject(req.requestId)}
                        disabled={loadingId === req.requestId}
                        className="w-8 h-8 rounded-full bg-muted hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors disabled:opacity-50"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Sent Requests */}
          {tab === "sent" && (
            <div className="space-y-2">
              {sentRequests.length === 0 ? (
                <p className="text-center py-8 text-sm text-muted-foreground">
                  Chưa gửi lời mời kết bạn nào
                </p>
              ) : (
                sentRequests.map((req) => (
                  <div
                    key={req.requestId}
                    className="flex items-center gap-3 p-3 rounded-xl border bg-card"
                  >
                    {/* ✅ receiverFullname / receiverAvatar / receiverUsername từ FriendRequestDto */}
                    <Avatar
                      src={req.receiverAvatar}
                      name={req.receiverFullname}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {req.receiverFullname || "Người dùng"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {req.receiverUsername ? `@${req.receiverUsername}` : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCancel(req.requestId)}
                      disabled={loadingId === req.requestId}
                      className="text-xs text-red-500 hover:text-red-600 border border-red-200 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                    >
                      {loadingId === req.requestId ? (
                        <div className="w-3 h-3 border border-red-300 border-t-red-500 rounded-full animate-spin" />
                      ) : null}
                      Hủy
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
