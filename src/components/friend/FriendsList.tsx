"use client";

import { useState, useEffect, useMemo } from "react";
import { friendsApi } from "@/lib/api/friends";
import { chatroomsApi } from "@/lib/api/chatrooms";
import type { Friend, Chatroom } from "@/lib/types/chatroom";
import FriendRow from "./FriendRow";
import FriendRemoveDialog from "./FriendRemoveDialog";
import FriendSectionHeader from "./FriendSectionHeader";
import FriendsEmptyState from "./FriendsEmptyState";
import FriendsSkeleton from "./FriendsSkeleton";

interface FriendsListProps {
  onStartChat?: (chatroom: Chatroom) => void;
  searchQuery?: string;
  refreshTrigger?: number;
}

export default function FriendsList({
  onStartChat,
  searchQuery = "",
  refreshTrigger,
}: FriendsListProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<Friend | null>(null);
  const [startingChatId, setStartingChatId] = useState<string | null>(null);
  const [onlineExpanded, setOnlineExpanded] = useState(true);
  const [offlineExpanded, setOfflineExpanded] = useState(true);

  useEffect(() => {
    loadFriends();
  }, [refreshTrigger]);

  const loadFriends = async () => {
    setLoading(true);
    setError("");
    try {
      setFriends(await friendsApi.getFriends());
    } catch (e: any) {
      setError(e?.response?.data?.message || "Không thể tải danh sách bạn bè");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return friends;
    return friends.filter(
      f =>
        f.fullname.toLowerCase().includes(q) ||
        f.username.toLowerCase().includes(q),
    );
  }, [friends, searchQuery]);

  const onlineFriends = filtered.filter((f: any) => f.isOnline === true);
  const offlineFriends = filtered.filter((f: any) => f.isOnline !== true);

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
      setFriends(prev => prev.filter(f => f.userId !== confirmRemove.userId));
      setConfirmRemove(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Hủy kết bạn thất bại");
    } finally {
      setRemovingId(null);
    }
  };

  // ── Early returns ──
  if (loading) return <FriendsSkeleton />;
  if (error && friends.length === 0)
    return <FriendsEmptyState type="error" errorMessage={error} onRetry={loadFriends} />;
  if (friends.length === 0) return <FriendsEmptyState type="empty" />;
  if (filtered.length === 0)
    return <FriendsEmptyState type="no-result" searchQuery={searchQuery} />;

  return (
    <>
      <div className="space-y-0.5 px-1">
        {/* Inline error (khi đang có data nhưng action lỗi) */}
        {error && (
          <div className="mb-2 px-2 py-2 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError("")}
              className="text-red-400 hover:text-red-600 ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tổng số */}
        <p className="px-1 pb-1 text-xs text-muted-foreground">
          {filtered.length} bạn bè
          {searchQuery ? ` · kết quả cho "${searchQuery}"` : ""}
        </p>

        {/* Online section */}
        {onlineFriends.length > 0 && (
          <div>
            <FriendSectionHeader
              label="Đang hoạt động"
              count={onlineFriends.length}
              expanded={onlineExpanded}
              onToggle={() => setOnlineExpanded(v => !v)}
            />
            {onlineExpanded && (
              <div className="space-y-0.5">
                {onlineFriends.map(f => (
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

        {/* Offline section */}
        {offlineFriends.length > 0 && (
          <div className={onlineFriends.length > 0 ? "mt-2" : ""}>
            {onlineFriends.length > 0 && (
              <FriendSectionHeader
                label="Ngoại tuyến"
                count={offlineFriends.length}
                expanded={offlineExpanded}
                onToggle={() => setOfflineExpanded(v => !v)}
              />
            )}
            {offlineExpanded && (
              <div className="space-y-0.5">
                {offlineFriends.map(f => (
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

      {/* Confirm remove dialog */}
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