"use client";

import { useEffect, useMemo, useState } from "react";
import { Camera, Check, Loader2, Search, X } from "lucide-react";
import { chatroomsApi } from "@/lib/api/chatrooms";
import type { ChatroomResponse, Friend } from "@/lib/types/chatroom";

interface CreateGroupDialogProps {
  open: boolean;
  friends: Friend[];
  onClose: () => void;
  onCreated: (chatroom: ChatroomResponse) => void;
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
    return <img src={friend.avatar} alt={name} className="h-11 w-11 rounded-full object-cover" />;
  }

  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-600 text-sm font-semibold text-white">
      {getInitials(name)}
    </div>
  );
}

export default function CreateGroupDialog({
  open,
  friends,
  onClose,
  onCreated,
}: CreateGroupDialogProps) {
  const [roomName, setRoomName] = useState("");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setRoomName("");
    setQuery("");
    setSelectedIds([]);
    setError("");
  }, [open]);

  const filteredFriends = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return friends.filter((friend) =>
      `${friend.fullname} ${friend.username}`.toLowerCase().includes(keyword),
    );
  }, [friends, query]);

  const grouped = filteredFriends.reduce<Record<string, Friend[]>>((acc, friend) => {
    const label = friend.fullname || friend.username || "#";
    const key = label[0].toUpperCase();
    acc[key] ??= [];
    acc[key].push(friend);
    return acc;
  }, {});

  const toggleFriend = (friendId: string) => {
    setSelectedIds((current) =>
      current.includes(friendId)
        ? current.filter((id) => id !== friendId)
        : [...current, friendId],
    );
  };

  const createGroup = async () => {
    const name = roomName.trim();
    if (!name) {
      setError("Vui l?ng nh?p t?n nh?m");
      return;
    }
    if (selectedIds.length === 0) {
      setError("Vui lòng chọn ít nhất một thành viên");
      return;
    }

    setCreating(true);
    setError("");
    try {
      const chatroom = await chatroomsApi.createGroup({
        roomName: name,
        memberIds: selectedIds,
      });
      onCreated(chatroom);
      onClose();
    } catch (err: unknown) {
      const fallback = "Tạo nhóm thất bại";
      const message = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? fallback
        : fallback;
      setError(message);
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  const canCreate = roomName.trim().length > 0 && selectedIds.length > 0 && !creating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4" onClick={onClose}>
      <section className="flex max-h-[90svh] w-full max-w-[540px] flex-col overflow-hidden rounded-md bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-4 sm:px-5">
          <h2 className="text-base font-semibold text-slate-900">Tạo nhóm</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-slate-500 hover:bg-slate-100">
            <X size={22} />
          </button>
        </header>

        <div className="shrink-0 border-b border-slate-200 px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-center gap-3">
            <button type="button" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-300 text-slate-600 hover:bg-slate-50">
              <Camera size={20} />
            </button>
            <input
              value={roomName}
              onChange={(event) => setRoomName(event.target.value)}
              placeholder="Nhập tên nhóm..."
              className="h-11 min-w-0 flex-1 border-b border-blue-500 bg-transparent text-sm outline-none"
            />
          </div>

          <div className="relative mt-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Nhập tên hoặc username"
              className="h-10 w-full rounded-full border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {["Tất cả", "Bạn bè", "Gia đình", "Công việc", "Trả lời sau"].map((item, index) => (
              <button
                key={item}
                type="button"
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
                  index === 0 ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">
          <p className="mb-3 text-sm font-semibold text-slate-700">Danh sách bạn bè</p>
          {Object.keys(grouped).length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">Không tìm thấy bạn bè phù hợp</p>
          ) : (
            Object.entries(grouped).map(([letter, items]) => (
              <div key={letter} className="mb-5 last:mb-0">
                <p className="mb-2 text-sm font-semibold text-slate-600">{letter}</p>
                <div className="space-y-1">
                  {items.map((friend) => {
                    const checked = selectedIds.includes(friend.userId);
                    return (
                      <button
                        key={friend.userId}
                        type="button"
                        onClick={() => toggleFriend(friend.userId)}
                        className="flex h-14 w-full items-center gap-3 rounded-md px-2 text-left hover:bg-slate-50"
                      >
                        <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${checked ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300"}`}>
                          {checked && <Check size={13} />}
                        </span>
                        <FriendAvatar friend={friend} />
                        <span className="font-medium text-slate-800">{friend.fullname || friend.username}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        <footer className="flex shrink-0 flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
          <p className="text-sm text-slate-500">Đã chọn {selectedIds.length} thành viên</p>
          <div className="flex w-full gap-2 sm:w-auto">
            <button type="button" onClick={onClose} className="h-10 flex-1 rounded-md bg-slate-100 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-200 sm:flex-none">
              Hủy
            </button>
            <button
              type="button"
              disabled={!canCreate}
              onClick={createGroup}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-500 disabled:bg-blue-200 sm:flex-none"
            >
              {creating && <Loader2 size={16} className="animate-spin" />}
              Tạo nhóm
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
