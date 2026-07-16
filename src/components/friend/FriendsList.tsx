"use client";

import { useState, useEffect, useMemo } from "react";
import { friendsApi } from "@/lib/api/friends";
import { chatroomsApi } from "@/lib/api/chatrooms";
import type { Friend, FriendRequest, Chatroom } from "@/lib/types/chatroom";
import { cn } from "@/lib/utils/cn";
import FriendRow from "./FriendRow";
import FriendRemoveDialog from "./FriendRemoveDialog";
import FriendSectionHeader from "./FriendSectionHeader";
import FriendsEmptyState from "./FriendsEmptyState";
import FriendsSkeleton from "./FriendsSkeleton";

interface FriendsListProps {
  onStartChat?: (chatroom: Chatroom) => void;
  searchQuery?: string;
  refreshTrigger?: number;
  initialView?: "friends" | "requests";
  onViewChange?: (view: "friends" | "requests") => void;
}

export default function FriendsList({
  onStartChat,
  searchQuery = "",
  refreshTrigger,
  initialView = "friends",
  onViewChange,
}: FriendsListProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<Friend | null>(null);
  const [startingChatId, setStartingChatId] = useState<string | null>(null);
  const [onlineExpanded, setOnlineExpanded] = useState(true);
  const [offlineExpanded, setOfflineExpanded] = useState(true);
  const [view, setView] = useState<"friends" | "requests">(initialView);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  useEffect(() => {
    loadFriends();
  }, [refreshTrigger]);

  useEffect(() => {
    if (view === "requests") {
      loadReceivedRequests();
    }
  }, [view, refreshTrigger]);

  const changeView = (nextView: "friends" | "requests") => {
    setView(nextView);
    onViewChange?.(nextView);
  };

  const loadFriends = async () => {
    setLoading(true);
    setError("");
    try {
      setFriends(await friendsApi.getFriends());
    } catch (e: unknown) {
      const error = e as { response?: { data?: { message?: string } } };
      setError(error?.response?.data?.message || "Không thể tải danh sách bạn bè");
    } finally {
      setLoading(false);
    }
  };

  const loadReceivedRequests = async () => {
    setRequestsLoading(true);
    try {
      setReceivedRequests(await friendsApi.getReceivedRequests());
    } finally {
      setRequestsLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return friends;
    return friends.filter(
      (f) =>
        f.fullname.toLowerCase().includes(q) ||
        f.username.toLowerCase().includes(q),
    );
  }, [friends, searchQuery]);

  const onlineFriends = filtered.filter(
    (f: unknown) => (f as Record<string, unknown>).isOnline === true,
  );
  const offlineFriends = filtered.filter(
    (f: unknown) => (f as Record<string, unknown>).isOnline !== true,
  );

  const handleMessage = async (friend: Friend) => {
    if (!onStartChat) return;
    setStartingChatId(friend.userId);
    try {
      onStartChat(await chatroomsApi.createDirect(friend.userId));
    } catch {
      setError("Không thể mở cuộc trò chuyện");
    } finally {
      setStartingChatId(null);
    }
  };

  const handleRemoveFriend = async () => {
    if (!confirmRemove) return;
    setRemovingId(confirmRemove.userId);
    try {
      await friendsApi.removeFriend(confirmRemove.userId);
      setFriends((prev) => prev.filter((f) => f.userId !== confirmRemove.userId));
      setConfirmRemove(null);
    } catch (e: unknown) {
      const error = e as { response?: { data?: { message?: string } } };
      setError(error?.response?.data?.message || "Hủy kết bạn thất bại");
    } finally {
      setRemovingId(null);
    }
  };

  const tabs = (
    <div className="mb-2 flex rounded-lg bg-muted p-1">
      <button
        type="button"
        onClick={() => changeView("friends")}
        className={cn(
          "flex-1 rounded-md px-2 py-1 text-xs font-medium",
          view === "friends"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground",
        )}
      >
        Bạn bè
      </button>
      <button
        type="button"
        onClick={() => changeView("requests")}
        className={cn(
          "flex-1 rounded-md px-2 py-1 text-xs font-medium",
          view === "requests"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground",
        )}
      >
        Làm mới
      </button>
    </div>
  );

  if (view === "requests") {
    return (
      <div className="px-1">
        {tabs}

        {requestsLoading ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">Đang tải...</p>
        ) : receivedRequests.length === 0 ? (
          <p className="px-2 py-3 text-xs text-muted-foreground">
            Không có lời mời kết bạn nào
          </p>
        ) : (
          <div className="space-y-2">
            {receivedRequests.map((request) => (
              <div key={request.requestId} className="rounded-lg border bg-background p-2">
                <p className="text-sm font-medium">
                  {request.senderFullname || request.senderUsername}
                </p>
                <p className="text-xs text-muted-foreground">
                  Đã gửi lời mời kết bạn cho bạn
                </p>

                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await friendsApi.acceptRequest(request.requestId);
                      await loadReceivedRequests();
                      await loadFriends();
                    }}
                    className="h-7 rounded-md bg-sky-500 px-2 text-xs font-medium text-white"
                  >
                    Chấp nhận
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await friendsApi.rejectRequest(request.requestId);
                      await loadReceivedRequests();
                    }}
                    className="h-7 rounded-md bg-muted px-2 text-xs font-medium"
                  >
                    Từ chối
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (loading) return <FriendsSkeleton />;
  if (error && friends.length === 0) {
    return <FriendsEmptyState type="error" errorMessage={error} onRetry={loadFriends} />;
  }
  if (friends.length === 0) return <FriendsEmptyState type="empty" />;
  if (filtered.length === 0) {
    return <FriendsEmptyState type="no-result" searchQuery={searchQuery} />;
  }

  return (
    <>
      <div className="space-y-0.5 px-1">
        {tabs}

        {error && (
          <div className="mb-2 px-2 py-2 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError("")}
              className="text-red-400 hover:text-red-600 ml-2"
            >
              x
            </button>
          </div>
        )}

        <p className="px-1 pb-1 text-xs text-muted-foreground">
          {filtered.length} Bạn bè
          {searchQuery ? ` - kết quả cho "${searchQuery}"` : ""}
        </p>

        {onlineFriends.length > 0 && (
          <div>
            <FriendSectionHeader
              label="Đang hoạt động"
              count={onlineFriends.length}
              expanded={onlineExpanded}
              onToggle={() => setOnlineExpanded((v) => !v)}
            />
            {onlineExpanded && (
              <div className="space-y-0.5">
                {onlineFriends.map((f) => (
                  <FriendRow
                    key={f.userId}
                    friend={f}
                    onMessage={handleMessage}
                    onRemove={setConfirmRemove}
                    isStartingChat={startingChatId === f.userId}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {offlineFriends.length > 0 && (
          <div className={onlineFriends.length > 0 ? "mt-2" : ""}>
            {onlineFriends.length > 0 && (
              <FriendSectionHeader
                label="Ngoại tuyến"
                count={offlineFriends.length}
                expanded={offlineExpanded}
                onToggle={() => setOfflineExpanded((v) => !v)}
              />
            )}
            {offlineExpanded && (
              <div className="space-y-0.5">
                {offlineFriends.map((f) => (
                  <FriendRow
                    key={f.userId}
                    friend={f}
                    onMessage={handleMessage}
                    onRemove={setConfirmRemove}
                    isStartingChat={startingChatId === f.userId}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {confirmRemove && (
        <FriendRemoveDialog
          friend={confirmRemove}
          loading={removingId === confirmRemove.userId}
          onConfirm={handleRemoveFriend}
          onCancel={() => setConfirmRemove(null)}
        />
      )}
    </>
  );
}
