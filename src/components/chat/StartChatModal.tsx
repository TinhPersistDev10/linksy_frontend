"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Users, X } from "lucide-react";
import { friendsApi } from "@/lib/api/friends";
import { chatroomsApi } from "@/lib/api/chatrooms";
import type { ChatroomResponse, Friend } from "@/lib/types/chatroom";
import { cn } from "@/lib/utils/cn";

interface StartChatModalProps {
  open: boolean;
  onClose: () => void;
  onSelectChat: (chatroom: ChatroomResponse) => void;
}

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

function FriendAvatar({ friend }: { friend: Friend }) {
  const name = friend.fullname || friend.username;

  if (friend.avatar) {
    return (
      <img
        src={friend.avatar}
        alt={name}
        className="h-10 w-10 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-600 text-sm font-semibold text-white">
      {getInitials(name)}
    </div>
  );
}

export default function StartChatModal({
  open,
  onClose,
  onSelectChat,
}: StartChatModalProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    const load = async () => {
      setLoading(true);
      setError("");
      setQuery("");
      try {
        setFriends(await friendsApi.getFriends());
      } catch (err) {
        setError("Không thể tải danh sách bạn bè");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return friends;

    return friends.filter((friend) =>
      `${friend.fullname} ${friend.username}`.toLowerCase().includes(q),
    );
  }, [friends, query]);

  const handleStartChat = async (friend: Friend) => {
    setStartingId(friend.userId);
    setError("");
    try {
      const chatroom = await chatroomsApi.createDirect(friend.userId);
      onSelectChat(chatroom);
      onClose();
    } catch (err) {
      setError("Không thể mở cuộc trò chuyện");
    } finally {
      setStartingId(null);
    }
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="fixed left-1/2 top-1/2 z-50 flex h-[520px] w-full max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
        <div className="flex h-16 shrink-0 items-center justify-between border-b px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10">
              <Users size={18} className="text-sky-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Tin nhắn mới</h2>
              <p className="text-xs text-muted-foreground">
                Chọn một người bạn để bắt đầu trò chuyện
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X size={17} />
          </button>
        </div>

        <div className="border-b px-5 py-3">
          <div className="flex h-10 items-center gap-2 rounded-lg border bg-muted/40 px-3">
            <Search size={16} className="text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm kiếm bạn bè"
              className="h-full w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
            />
          </div>
        </div>

        {error && (
          <div className="mx-5 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Đang tải...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Không tìm thấy bạn bè phù hợp
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((friend) => (
                <button
                  key={friend.userId}
                  type="button"
                  onClick={() => handleStartChat(friend)}
                  disabled={startingId === friend.userId}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-accent",
                    startingId === friend.userId && "opacity-70",
                  )}
                >
                  <FriendAvatar friend={friend} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {friend.fullname || friend.username}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      @{friend.username}
                    </p>
                  </div>
                  {startingId === friend.userId && (
                    <span className="text-xs text-muted-foreground">Đang mở...</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
