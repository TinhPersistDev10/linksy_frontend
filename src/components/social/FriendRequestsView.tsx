"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  IdCard,
  Loader2,
  MessageCircleMore,
  ShieldBan,
  Users,
  X,
} from "lucide-react";
import { blockedUsersApi } from "@/lib/api/blocked-users";
import { chatroomsApi } from "@/lib/api/chatrooms";
import { friendsApi } from "@/lib/api/friends";
import type { ChatroomResponse, FriendRequest } from "@/lib/types/chatroom";

interface FriendRequestsViewProps {
  onSelectChat?: (chatroom: ChatroomResponse) => void;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function initials(name: string) {
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

function RequestAvatar({
  src,
  name,
  size = "md",
}: {
  src?: string | null;
  name: string;
  size?: "md" | "lg";
}) {
  const sizeClass = size === "lg" ? "h-20 w-20 text-xl" : "h-12 w-12 text-sm";

  if (src) {
    return <img src={src} alt={name} className={`${sizeClass} rounded-full object-cover`} />;
  }

  return (
    <div className={`flex ${sizeClass} items-center justify-center rounded-full bg-sky-600 font-semibold text-white`}>
      {initials(name)}
    </div>
  );
}

function requestName(request: FriendRequest, side: "sender" | "receiver") {
  if (side === "sender") {
    return request.senderFullname || request.senderUsername || "Người dùng";
  }

  return request.receiverFullname || request.receiverUsername || "Người dùng";
}

export default function FriendRequestsView({ onSelectChat }: FriendRequestsViewProps) {
  const [received, setReceived] = useState<FriendRequest[]>([]);
  const [sent, setSent] = useState<FriendRequest[]>([]);
  const [profileRequest, setProfileRequest] = useState<FriendRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [receivedRequests, sentRequests] = await Promise.all([
        friendsApi.getReceivedRequests(),
        friendsApi.getSentRequests(),
      ]);
      setReceived(receivedRequests);
      setSent(sentRequests);
      setProfileRequest((current) => {
        if (!current) return null;
        return receivedRequests.find((request) => request.requestId === current.requestId) ?? null;
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const accept = async (requestId: string) => {
    setBusyId(requestId);
    try {
      await friendsApi.acceptRequest(requestId);
      setProfileRequest(null);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (requestId: string) => {
    setBusyId(requestId);
    try {
      await friendsApi.rejectRequest(requestId);
      setProfileRequest(null);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const block = async (request: FriendRequest) => {
    if (!request.senderId) return;

    setBusyId(request.requestId);
    try {
      await blockedUsersApi.blockUser(request.senderId, "Blocked from friend request");
      await friendsApi.rejectRequest(request.requestId).catch(() => undefined);
      setProfileRequest(null);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const cancel = async (requestId: string) => {
    setBusyId(requestId);
    try {
      await friendsApi.cancelRequest(requestId);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const openDirectChat = async (request: FriendRequest) => {
    if (!request.senderId) return;

    setBusyId(request.requestId);
    try {
      const chatroom = await chatroomsApi.createDirect(request.senderId);
      setProfileRequest(null);
      onSelectChat?.(chatroom);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        <Loader2 size={22} className="animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        <section>
          <h2 className="mb-4 text-sm font-semibold">Lời mời đã nhận ({received.length})</h2>
          {received.length === 0 ? (
            <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-400">
              Không có lời mời kết bạn nào
            </p>
          ) : (
            <div className="grid gap-3 xl:grid-cols-3 lg:grid-cols-2">
              {received.map((request) => {
                const name = requestName(request, "sender");

                return (
                  <article
                    key={request.requestId}
                    onClick={() => setProfileRequest(request)}
                    className="cursor-pointer rounded-md border border-slate-200 bg-white p-4 text-left transition hover:border-sky-200 hover:bg-sky-50/50"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <RequestAvatar src={request.senderAvatar} name={name} />
                        <div>
                          <p className="font-semibold text-slate-900">{name}</p>
                          <p className="text-xs text-slate-500">
                            {formatDate(request.sentAt)} - Từ Linksy
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        title="Nhắn tin"
                        disabled={busyId === request.requestId || !request.senderId}
                        onClick={(event) => {
                          event.stopPropagation();
                          openDirectChat(request);
                        }}
                        className="rounded-full p-2 text-slate-400 hover:bg-sky-100 hover:text-sky-600 disabled:opacity-60"
                      >
                        {busyId === request.requestId ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <MessageCircleMore size={18} />
                        )}
                      </button>
                    </div>

                    <p className="line-clamp-2 rounded border border-slate-200 px-3 py-3 text-sm text-slate-700">
                      {request.message || `Xin chào, mình là ${name}. Kết bạn với mình nhé!`}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={busyId === request.requestId}
                        onClick={(event) => {
                          event.stopPropagation();
                          reject(request.requestId);
                        }}
                        className="h-10 rounded-md bg-slate-100 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                      >
                        Từ chối
                      </button>
                      <button
                        type="button"
                        disabled={busyId === request.requestId}
                        onClick={(event) => {
                          event.stopPropagation();
                          accept(request.requestId);
                        }}
                        className="h-10 rounded-md bg-blue-600 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
                      >
                        Đồng ý
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-sm font-semibold">Lời mời đã gửi ({sent.length})</h2>
          {sent.length === 0 ? (
            <p className="rounded-md border border-slate-200 bg-white p-5 text-sm text-slate-400">
              Bạn chưa gửi lời mời kết bạn nào
            </p>
          ) : (
            <div className="grid gap-3 xl:grid-cols-3 lg:grid-cols-2">
              {sent.map((request) => {
                const name = requestName(request, "receiver");
                return (
                  <article key={request.requestId} className="rounded-md border border-slate-200 bg-white p-4">
                    <div className="mb-4 flex items-center gap-3">
                      <RequestAvatar src={request.receiverAvatar} name={name} />
                      <div>
                        <p className="font-semibold text-slate-900">{name}</p>
                        <p className="text-xs text-slate-500">Bạn đã gửi lời mời</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={busyId === request.requestId}
                      onClick={() => cancel(request.requestId)}
                      className="h-10 w-full rounded-md bg-slate-100 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                    >
                      Thu hồi lời mời
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {profileRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={() => setProfileRequest(null)}
        >
          <article
            className="w-full max-w-[430px] overflow-hidden rounded-md bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex h-12 items-center justify-between px-4">
              <h3 className="font-semibold text-slate-900">Thông tin tài khoản</h3>
              <button
                type="button"
                onClick={() => setProfileRequest(null)}
                className="rounded-full p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                <X size={22} />
              </button>
            </header>

            <div className="px-4 pb-4 pt-5">
              <div className="flex flex-col items-center text-center">
                <RequestAvatar
                  src={profileRequest.senderAvatar}
                  name={requestName(profileRequest, "sender")}
                  size="lg"
                />
                <p className="mt-3 text-lg font-semibold text-slate-900">
                  {requestName(profileRequest, "sender")}
                </p>
                <p className="text-sm text-slate-500">@{profileRequest.senderUsername}</p>
              </div>

              <p className="mt-5 rounded border border-slate-200 px-3 py-3 text-sm text-slate-700">
                {profileRequest.message ||
                  `Xin chào, mình là ${requestName(profileRequest, "sender")}. Kết bạn với mình nhé`}
              </p>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busyId === profileRequest.requestId}
                  onClick={() => accept(profileRequest.requestId)}
                  className="h-10 rounded-md bg-slate-100 text-sm font-semibold text-slate-800 hover:bg-slate-200 disabled:opacity-60"
                >
                  Đồng ý
                </button>
                <button
                  type="button"
                  disabled={busyId === profileRequest.requestId || !profileRequest.senderId}
                  onClick={() => openDirectChat(profileRequest)}
                  className="h-10 rounded-md bg-sky-100 text-sm font-semibold text-sky-700 hover:bg-sky-200 disabled:opacity-60"
                >
                  Nhắn tin
                </button>
              </div>
            </div>

            <div className="border-t border-slate-100 px-4 py-4">
              <h4 className="mb-3 font-semibold text-slate-900">Thông tin cá nhân</h4>
              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex items-center gap-3">
                  <CalendarDays size={16} className="text-slate-400" />
                  <span>Ngày gửi lời mời: {formatDate(profileRequest.sentAt)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users size={16} className="text-slate-400" />
                  <span>Nhóm chung (0)</span>
                </div>
                <div className="flex items-center gap-3">
                  <IdCard size={16} className="text-slate-400" />
                  <span>Chia sẻ danh thiếp</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 border-t border-slate-100 px-4 py-4">
              <button
                type="button"
                disabled={busyId === profileRequest.requestId || !profileRequest.senderId}
                onClick={() => block(profileRequest)}
                className="flex h-10 items-center justify-center gap-2 rounded-md bg-red-50 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
              >
                <ShieldBan size={16} /> Chặn
              </button>
              <button
                type="button"
                disabled={busyId === profileRequest.requestId}
                onClick={() => reject(profileRequest.requestId)}
                className="h-10 rounded-md bg-slate-100 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
              >
                Từ chối
              </button>
            </div>
          </article>
        </div>
      )}
    </>
  );
}
