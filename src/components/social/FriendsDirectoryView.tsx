"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownAZ,
  Ban,
  Flag,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
  UserPlus,
  UserRound,
  UserX,
  X,
} from "lucide-react";
import MemberProfileDialog from "@/components/chat/MemberProfileDialog";
import ReportUserDialog from "@/components/social/ReportUserDialog";
import { blockedUsersApi } from "@/lib/api/blocked-users";
import { chatroomsApi } from "@/lib/api/chatrooms";
import { friendsApi } from "@/lib/api/friends";
import type { ChatroomMemberResponse } from "@/lib/types/chatroom-member";
import type { ChatroomResponse, Friend, SearchUserResult } from "@/lib/types/chatroom";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { toast } from "@/lib/stores/toastStore";
import { extractErrorMessage } from "@/lib/utils/extractErrorMessage";
import FriendInviteQrCard from "@/components/friend/FriendInviteQrCard";

interface FriendsDirectoryViewProps {
  onSelectChat?: (chatroom: ChatroomResponse) => void;
}

type PendingConfirm =
  | { type: "remove"; friend: Friend }
  | { type: "block"; friend: Friend };

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

function Avatar({ src, name, className = "h-11 w-11" }: { src?: string | null; name: string; className?: string }) {
  if (src) return <img src={src} alt={name} className={`${className} rounded-full object-cover`} />;
  return <div className={`flex ${className} items-center justify-center rounded-full bg-sky-600 text-sm font-semibold text-white`}>{getInitials(name)}</div>;
}

function FriendAvatar({ friend }: { friend: Friend }) {
  return <Avatar src={friend.avatar} name={friend.fullname || friend.username} />;
}

function friendToProfileMember(friend: Friend): ChatroomMemberResponse {
  return {
    userId: friend.userId,
    username: friend.username,
    fullname: friend.fullname,
    avatar: friend.avatar,
    memberRole: "member",
    joinedAt: friend.friendsSince,
    isOnline: false,
    lastActiveAt: null,
    lastReadAt: null,
    nickname: null,
  };
}

function searchUserToProfileMember(user: SearchUserResult): ChatroomMemberResponse {
  return {
    userId: user.userId,
    username: user.username,
    fullname: user.fullname,
    avatar: user.avatar,
    memberRole: "member",
    joinedAt: "",
    isOnline: false,
    lastActiveAt: null,
    lastReadAt: null,
    nickname: null,
  };
}

function AddFriendDialog({
  open,
  onClose,
  onFriendAdded,
  onSelectChat,
}: {
  open: boolean;
  onClose: () => void;
  onFriendAdded: () => void;
  onSelectChat?: (chatroom: ChatroomResponse) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchUserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [openingChatId, setOpeningChatId] = useState<string | null>(null);
  const [profileUser, setProfileUser] = useState<SearchUserResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults([]);
    setError("");
    setProfileUser(null);
    setOpeningChatId(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const keyword = query.trim();
    if (!keyword) {
      setResults([]);
      setError("");
      return;
    }

    const timer = window.setTimeout(async () => {
      setSearching(true);
      setError("");
      try {
        setResults(await friendsApi.searchUsers(keyword));
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Tìm kiếm thất bại";
        setError(message);
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [open, query]);

  const sendRequest = async (user: SearchUserResult) => {
    setLoadingId(user.userId);
    setError("");
    try {
      await friendsApi.sendRequest(user.userId);
      setResults((current) => current.map((item) => item.userId === user.userId ? { ...item, relationshipStatus: "request_sent", canSendRequest: false } : item));
      onFriendAdded();
    } catch (err: unknown) {
      const fallback = "Gửi lời mời thất bại";
      const message = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? fallback
        : fallback;
      setError(message);
    } finally {
      setLoadingId(null);
    }
  };

  const acceptRequest = async (user: SearchUserResult) => {
    setLoadingId(user.userId);
    setError("");
    try {
      const relationship = await friendsApi.getRelationship(user.userId);
      if (!relationship.requestId) {
        throw new Error("Không tìm thấy lời mời kết bạn.");
      }
      await friendsApi.acceptRequest(relationship.requestId);
      setResults((current) => current.map((item) => item.userId === user.userId ? { ...item, relationshipStatus: "friends" } : item));
      onFriendAdded();
    } catch (err: unknown) {
      const message = extractErrorMessage(err, "Chấp nhận lời mời thất bại");
      setError(message);
    } finally {
      setLoadingId(null);
    }
  };

  const openDirectChat = async (user: SearchUserResult) => {
    setOpeningChatId(user.userId);
    setError("");
    try {
      const chatroom = await chatroomsApi.createDirect(user.userId);
      setProfileUser(null);
      onClose();
      onSelectChat?.(chatroom);
    } catch (err: unknown) {
      const message = extractErrorMessage(err, "Không thể mở cuộc trò chuyện");
      setError(message);
      toast.error(message);
    } finally {
      setOpeningChatId(null);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
        <section className="w-full max-w-lg rounded-lg bg-card shadow-2xl" onClick={(event) => event.stopPropagation()}>
          <header className="flex h-14 items-center justify-between border-b border-border px-5">
            <h2 className="text-base font-semibold text-foreground">Thêm bạn</h2>
            <button type="button" onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:bg-muted"><X size={22} /></button>
          </header>
          <div className="p-5">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nhập username hoặc tên" className="h-11 w-full rounded-full border border-border bg-card pl-9 pr-4 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20" autoFocus />
            </div>
            {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">{error}</p>}
            <div className="mt-4 min-h-[260px] max-h-[360px] overflow-y-auto">
              {searching ? (
                <div className="flex h-40 items-center justify-center text-muted-foreground"><Loader2 size={22} className="animate-spin" /></div>
              ) : !query.trim() ? (
                <FriendInviteQrCard />
              ) : results.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">Không tìm thấy người dùng phù hợp</p>
              ) : (
                <div className="space-y-2">
                  {results.map((user) => (
                    <div key={user.userId} className="flex items-center gap-3 rounded-lg border border-border px-3 py-3">
                      <button
                        type="button"
                        title="Xem thông tin"
                        onClick={() => setProfileUser(user)}
                        className="shrink-0 rounded-full ring-offset-background transition hover:ring-2 hover:ring-sky-400/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                      >
                        <Avatar src={user.avatar} name={user.fullname || user.username} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{user.fullname || user.username}</p>
                        <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          title="Nhắn tin"
                          disabled={openingChatId === user.userId}
                          onClick={() => void openDirectChat(user)}
                          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-sky-500/15 hover:text-sky-600 dark:hover:text-sky-400 disabled:opacity-60"
                        >
                          {openingChatId === user.userId ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <MessageCircle size={16} />
                          )}
                        </button>
                        {user.relationshipStatus === "friends" ? (
                          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-500/15 dark:text-green-400">Bạn bè</span>
                        ) : user.relationshipStatus === "request_sent" ? (
                          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">Đã gửi</span>
                        ) : user.relationshipStatus === "request_received" ? (
                          <button type="button" disabled={loadingId === user.userId} onClick={() => void acceptRequest(user)} className="flex h-9 items-center gap-2 rounded-md bg-sky-500 px-3 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-60">
                            {loadingId === user.userId ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />} Chấp nhận
                          </button>
                        ) : user.relationshipStatus === "blocked" || user.relationshipStatus === "blocked_by" ? (
                          <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-400">Đã chặn</span>
                        ) : user.canSendRequest ? (
                          <button type="button" disabled={loadingId === user.userId} onClick={() => void sendRequest(user)} className="flex h-9 items-center gap-2 rounded-md bg-sky-500 px-3 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-60">
                            {loadingId === user.userId ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />} Kết bạn
                          </button>
                        ) : <span className="text-xs text-muted-foreground">Không khả dụng</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <MemberProfileDialog
        open={Boolean(profileUser)}
        member={profileUser ? searchUserToProfileMember(profileUser) : null}
        showGroupInfo={false}
        onClose={() => setProfileUser(null)}
        onMessage={
          profileUser
            ? () => {
                const user = profileUser;
                void openDirectChat(user);
              }
            : undefined
        }
      />
    </>
  );
}

export default function FriendsDirectoryView({ onSelectChat }: FriendsDirectoryViewProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [addFriendOpen, setAddFriendOpen] = useState(false);
  const [profileFriend, setProfileFriend] = useState<Friend | null>(null);
  const [reportFriend, setReportFriend] = useState<Friend | null>(null);
  const [confirmAction, setConfirmAction] = useState<PendingConfirm | null>(
    null,
  );

  const loadFriends = async () => {
    setLoading(true);
    try {
      setFriends(await friendsApi.getFriends());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFriends();
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return friends.filter((friend) => `${friend.fullname} ${friend.username}`.toLowerCase().includes(q)).sort((a, b) => (a.fullname || a.username).localeCompare(b.fullname || b.username, "vi"));
  }, [friends, query]);

  const grouped = filtered.reduce<Record<string, Friend[]>>((acc, friend) => {
    const label = friend.fullname || friend.username || "#";
    const key = label[0].toUpperCase();
    acc[key] ??= [];
    acc[key].push(friend);
    return acc;
  }, {});

  const openDirectChat = async (friend: Friend) => {
    setOpeningId(friend.userId);
    try {
      const chatroom = await chatroomsApi.createDirect(friend.userId);
      onSelectChat?.(chatroom);
    } finally {
      setOpeningId(null);
      setOpenMenuId(null);
    }
  };

  const removeFriend = (friend: Friend) => {
    setOpenMenuId(null);
    setConfirmAction({ type: "remove", friend });
  };

  const blockFriend = (friend: Friend) => {
    setOpenMenuId(null);
    setConfirmAction({ type: "block", friend });
  };

  const reportFriendAction = (friend: Friend) => {
    setOpenMenuId(null);
    setReportFriend(friend);
  };

  const executeConfirmedAction = async () => {
    if (!confirmAction) return;
    const { friend } = confirmAction;
    const key = `${confirmAction.type}-${friend.userId}`;
    setPendingAction(key);
    try {
      if (confirmAction.type === "remove") {
        await friendsApi.removeFriend(friend.userId);
      } else {
        await blockedUsersApi.blockUser(friend.userId);
      }
      setFriends((current) =>
        current.filter((item) => item.userId !== friend.userId),
      );
      setConfirmAction(null);
    } finally {
      setPendingAction(null);
    }
  };

  const confirmFriendName = confirmAction
    ? confirmAction.friend.fullname || confirmAction.friend.username
    : "";

  if (loading) return <div className="flex h-full items-center justify-center text-muted-foreground"><Loader2 size={22} className="animate-spin" /></div>;

  return (
    <>
      <div>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold">Bạn bè ({filtered.length})</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setAddFriendOpen(true)} className="flex h-9 items-center gap-2 rounded-md border border-border bg-card px-3 text-sm font-semibold text-foreground hover:bg-muted/60"><UserPlus size={16} /> Thêm bạn</button>
          </div>
        </div>
        <div className="mb-5 grid gap-2 lg:grid-cols-[1fr_260px_260px]">
          <div className="flex h-10 items-center gap-2 rounded-md bg-muted/60 px-3"><Search size={16} className="text-muted-foreground" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm bạn" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" /></div>
          <button className="flex h-10 items-center justify-between rounded-md bg-muted/60 px-3 text-sm text-foreground"><span className="flex items-center gap-2"><ArrowDownAZ size={16} /> Thứ tự (A-Z)</span></button>
          <button className="flex h-10 items-center justify-between rounded-md bg-muted/60 px-3 text-sm text-foreground"><span className="flex items-center gap-2"><SlidersHorizontal size={16} /> Tất cả</span></button>
        </div>
        <div className="rounded-md border border-border bg-card p-4">
          {Object.keys(grouped).length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">Không tìm thấy bạn bè phù hợp</p> : Object.entries(grouped).map(([letter, items]) => (
            <div key={letter} className="mb-6 last:mb-0">
              <p className="mb-3 text-sm font-semibold text-foreground">{letter}</p>
              {items.map((friend) => (
                <div
                  key={friend.userId}
                  className="group relative flex h-16 w-full items-center justify-between rounded-md px-3 hover:bg-muted/60"
                >
                  <button
                    type="button"
                    disabled={openingId === friend.userId}
                    onClick={() => openDirectChat(friend)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:opacity-60"
                  >
                    <FriendAvatar friend={friend} />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{friend.fullname || friend.username}</p>
                      <p className="truncate text-xs text-muted-foreground">@{friend.username}</p>
                    </div>
                  </button>

                  <div className="flex shrink-0 items-center gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                    <button
                      type="button"
                      title="Nhắn tin"
                      disabled={openingId === friend.userId}
                      onClick={() => openDirectChat(friend)}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-sky-500/15 hover:text-sky-600 dark:hover:text-sky-400 disabled:opacity-60"
                    >
                      {openingId === friend.userId ? (
                        <Loader2 size={17} className="animate-spin" />
                      ) : (
                        <MessageCircle size={17} />
                      )}
                    </button>
                    <button
                      type="button"
                      title="Tùy chọn"
                      onClick={() => setOpenMenuId(openMenuId === friend.userId ? null : friend.userId)}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </div>

                  {openMenuId === friend.userId && (
                    <>
                      <button
                        type="button"
                        aria-label="Đóng menu tùy chọn"
                        className="fixed inset-0 z-20 cursor-default bg-transparent"
                        onClick={() => setOpenMenuId(null)}
                      />
                      <div className="absolute right-2 top-12 z-30 w-52 rounded-xl border border-border bg-card p-2 text-sm shadow-xl">
                        <FriendMenuItem
                          icon={MessageCircle}
                          label="Nhắn tin"
                          loading={openingId === friend.userId}
                          onClick={() => void openDirectChat(friend)}
                        />
                        <FriendMenuItem
                          icon={UserRound}
                          label="Xem hồ sơ"
                          onClick={() => {
                            setOpenMenuId(null);
                            setProfileFriend(friend);
                          }}
                        />
                        <div className="my-1 border-t border-border" />
                        <FriendMenuItem
                          icon={UserX}
                          label="Xóa bạn"
                          destructive
                          loading={pendingAction === `remove-${friend.userId}`}
                          onClick={() => removeFriend(friend)}
                        />
                        <FriendMenuItem
                          icon={Ban}
                          label="Chặn"
                          destructive
                          loading={pendingAction === `block-${friend.userId}`}
                          onClick={() => blockFriend(friend)}
                        />
                        <FriendMenuItem
                          icon={Flag}
                          label="Báo cáo"
                          destructive
                          onClick={() => reportFriendAction(friend)}
                        />
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <AddFriendDialog
        open={addFriendOpen}
        onClose={() => setAddFriendOpen(false)}
        onFriendAdded={loadFriends}
        onSelectChat={onSelectChat}
      />

      <MemberProfileDialog
        open={Boolean(profileFriend)}
        member={profileFriend ? friendToProfileMember(profileFriend) : null}
        showGroupInfo={false}
        friendsSince={profileFriend?.friendsSince}
        onClose={() => setProfileFriend(null)}
        onMessage={
          profileFriend
            ? () => {
                const friend = profileFriend;
                setProfileFriend(null);
                void openDirectChat(friend);
              }
            : undefined
        }
      />

      <ReportUserDialog
        open={Boolean(reportFriend)}
        userId={reportFriend?.userId ?? ""}
        displayName={
          reportFriend?.fullname || reportFriend?.username || "Người dùng"
        }
        onClose={() => setReportFriend(null)}
        onReported={(alsoBlocked) => {
          if (alsoBlocked && reportFriend) {
            setFriends((current) =>
              current.filter((item) => item.userId !== reportFriend.userId),
            );
          }
        }}
      />

      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open && !pendingAction) setConfirmAction(null);
        }}
        title={
          confirmAction?.type === "remove" ? "Xóa bạn bè" : "Chặn người dùng"
        }
        description={
          confirmAction?.type === "remove" ? (
            <>
              Bạn có chắc chắn muốn xóa{" "}
              <span className="font-semibold text-foreground">
                {confirmFriendName}
              </span>{" "}
              khỏi danh sách bạn bè?
            </>
          ) : (
            <>
              Bạn có chắc chắn muốn chặn{" "}
              <span className="font-semibold text-foreground">
                {confirmFriendName}
              </span>
              ? Người này sẽ không thể nhắn tin cho bạn.
            </>
          )
        }
        confirmLabel={confirmAction?.type === "remove" ? "Xóa bạn" : "Chặn"}
        cancelLabel="Hủy"
        variant="destructive"
        loading={Boolean(pendingAction)}
        onConfirm={() => void executeConfirmedAction()}
      />
    </>
  );
}


function FriendMenuItem({
  icon: Icon,
  label,
  destructive,
  loading,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  destructive?: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
        destructive
          ? "text-red-600 hover:bg-red-50"
          : "text-foreground hover:bg-muted/60"
      } ${loading ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <Icon size={17} className="shrink-0" />
      <span>{loading ? "Đang xử lý..." : label}</span>
    </button>
  );
}
