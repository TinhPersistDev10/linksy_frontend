"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react";
import { chatroomsApi } from "@/lib/api/chatrooms";
import { friendsApi } from "@/lib/api/friends";
import type { ChatroomResponse, Friend } from "@/lib/types/chatroom";
import CreateGroupDialog from "./CreateGroupDialog";

interface GroupsDirectoryViewProps {
  onSelectChat?: (chatroom: ChatroomResponse) => void;
}

function initials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "#"
  );
}

function GroupAvatar({ group }: { group: ChatroomResponse }) {
  const name = group.roomName || "Nhóm";

  if (group.avatar) {
    return <img src={group.avatar} alt={name} className="h-12 w-12 rounded-full object-cover" />;
  }

  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-700 text-sm font-semibold text-white">
      {initials(name)}
    </div>
  );
}

export default function GroupsDirectoryView({ onSelectChat }: GroupsDirectoryViewProps) {
  const [groups, setGroups] = useState<ChatroomResponse[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [chatrooms, friendList] = await Promise.all([
        chatroomsApi.getChatrooms(),
        friendsApi.getFriends(),
      ]);
      setGroups(chatrooms.filter((room) => room.roomType === "group"));
      setFriends(friendList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return groups.filter((group) =>
      `${group.roomName} ${group.description ?? ""}`.toLowerCase().includes(q),
    );
  }, [groups, query]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        <Loader2 size={22} className="animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold">Nhóm ({filtered.length})</p>
          <button
            type="button"
            onClick={() => setCreateGroupOpen(true)}
            className="flex h-9 items-center gap-2 rounded-md bg-sky-500 px-3 text-sm font-semibold text-white hover:bg-sky-600"
          >
            <Plus size={16} /> Tạo nhóm chat
          </button>
        </div>

        <div className="mb-5 grid gap-2 lg:grid-cols-[1fr_320px_260px]">
          <div className="flex h-10 items-center gap-2 rounded-md bg-slate-50 px-3">
            <Search size={16} className="text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm kiếm..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>

          <button className="flex h-10 items-center justify-between rounded-md bg-slate-50 px-3 text-sm text-slate-700">
            Hoạt động (mới → cũ)
          </button>

          <button className="flex h-10 items-center justify-between rounded-md bg-slate-50 px-3 text-sm text-slate-700">
            <span className="flex items-center gap-2">
              <SlidersHorizontal size={16} /> Tất cả
            </span>
          </button>
        </div>

        <div className="rounded-md border border-slate-200 bg-white p-4">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">
              Không có nhóm nào
            </p>
          ) : (
            filtered.map((group) => (
              <button
                key={group.chatroomId}
                type="button"
                onClick={() => onSelectChat?.(group)}
                className="flex h-20 w-full items-center justify-between rounded-md px-3 text-left hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <GroupAvatar group={group} />
                  <div>
                    <p className="flex items-center gap-2 font-semibold">
                      <UsersRound size={15} className="text-slate-400" />
                      {group.roomName || "Nhóm chưa đặt tên"}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {group.members?.length ?? 0} thành viên
                    </p>
                  </div>
                </div>

                <MoreHorizontal size={18} className="text-slate-400" />
              </button>
            ))
          )}
        </div>
      </div>

      <CreateGroupDialog
        open={createGroupOpen}
        friends={friends}
        onClose={() => setCreateGroupOpen(false)}
        onCreated={(chatroom) => {
          setGroups((current) => [chatroom, ...current.filter((item) => item.chatroomId !== chatroom.chatroomId)]);
          onSelectChat?.(chatroom);
        }}
      />
    </>
  );
}
