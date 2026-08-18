"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  AtSign,
  BadgeCheck,
  Bell,
  CalendarDays,
  Clock3,
  Flag,
  HeartHandshake,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Shield,
  UserPlus,
  UserRound,
  UserX,
  Video,
  X,
} from "lucide-react";
import { friendsApi, type RelationshipStatus } from "@/lib/api/friends";
import { usersApi } from "@/lib/api/users";
import { toast } from "@/lib/stores/toastStore";
import type { ChatroomMemberResponse } from "@/lib/types/chatroom";
import type { User } from "@/lib/types/user";
import { cn } from "@/lib/utils/cn";
import { extractErrorMessage } from "@/lib/utils/extractErrorMessage";
import ReportUserDialog from "@/components/social/ReportUserDialog";
import ChatAvatar from "./ChatAvatar";
import AvatarViewer from "@/components/ui/AvatarViewer";

type MemberProfileDialogProps = {
  open: boolean;
  member: ChatroomMemberResponse | null;
  chatroomName?: string;
  /** Ẩn khối thông tin trong nhóm (vd. xem hồ sơ từ danh sách bạn bè). */
  showGroupInfo?: boolean;
  friendsSince?: string | null;
  isSelf?: boolean;
  onClose: () => void;
  onMessage?: () => void;
  onAudioCall?: () => void;
  onVideoCall?: () => void;
};

function relationshipLabel(status: RelationshipStatus | null): string {
  switch (status) {
    case "friends":
      return "Bạn bè";
    case "request_sent":
      return "Đã gửi lời mời";
    case "request_received":
      return "Chờ bạn xác nhận";
    case "blocked":
      return "Đã chặn";
    case "blocked_by":
      return "Đã bị chặn";
    case "self":
      return "Bạn";
    case "none":
    default:
      return "Người lạ";
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function InfoRow({
  icon,
  label,
  value,
  valueClassName,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl px-1 py-2.5">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "mt-0.5 break-words text-sm font-medium text-foreground",
            valueClassName,
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

export default function MemberProfileDialog({
  open,
  member,
  chatroomName,
  showGroupInfo = false,
  friendsSince,
  isSelf = false,
  onClose,
  onMessage,
  onAudioCall,
  onVideoCall,
}: MemberProfileDialogProps) {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [avatarViewerOpen, setAvatarViewerOpen] = useState(false);
  const [relationship, setRelationship] = useState<RelationshipStatus | null>(
    null,
  );
  const [relationshipRequestId, setRelationshipRequestId] = useState<
    string | null
  >(null);
  const [relationshipLoading, setRelationshipLoading] = useState(false);
  const [relationshipActionLoading, setRelationshipActionLoading] =
    useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    if (!open || !member?.userId) {
      setProfile(null);
      setError("");
      setAvatarViewerOpen(false);
      setRelationship(null);
      setReportOpen(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    void usersApi
      .getById(member.userId)
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Không thể tải đầy đủ hồ sơ. Đang hiển thị thông tin cơ bản.");
          setProfile(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, member?.userId]);

  useEffect(() => {
    if (!open || !member?.userId || isSelf) {
      setRelationship(isSelf ? "self" : null);
      setRelationshipRequestId(null);
      return;
    }

    let cancelled = false;
    setRelationshipLoading(true);

    void friendsApi
      .getRelationship(member.userId)
      .then((data) => {
        if (cancelled) return;
        setRelationship(data.status);
        setRelationshipRequestId(data.requestId ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setRelationship(friendsSince ? "friends" : "none");
          setRelationshipRequestId(null);
        }
      })
      .finally(() => {
        if (!cancelled) setRelationshipLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, member?.userId, isSelf, friendsSince]);

  if (!open || !member) return null;

  const displayName =
    member.nickname ||
    profile?.fullname ||
    member.fullname ||
    member.username;
  const username = profile?.username || member.username;
  const avatar = profile?.avatar || member.avatar;
  const bio = profile?.bio?.trim();
  const roleLabel =
    member.memberRole === "admin" ? "Quản trị viên" : "Thành viên";
  const relationshipStatus = relationship ?? (friendsSince ? "friends" : null);

  const handleSendFriendRequest = async () => {
    if (!member.userId || relationshipActionLoading) return;
    setRelationshipActionLoading(true);
    try {
      await friendsApi.sendRequest(member.userId);
      setRelationship("request_sent");
      toast.success("Đã gửi lời mời kết bạn");
    } catch (err) {
      toast.error(
        extractErrorMessage(err, "Không thể gửi lời mời kết bạn."),
      );
    } finally {
      setRelationshipActionLoading(false);
    }
  };

  const handleAcceptFriendRequest = async () => {
    if (!relationshipRequestId || relationshipActionLoading) return;
    setRelationshipActionLoading(true);
    try {
      await friendsApi.acceptRequest(relationshipRequestId);
      setRelationship("friends");
      toast.success("Đã chấp nhận lời mời kết bạn");
    } catch (err) {
      toast.error(
        extractErrorMessage(err, "Không thể chấp nhận lời mời kết bạn."),
      );
    } finally {
      setRelationshipActionLoading(false);
    }
  };

  const handleRejectFriendRequest = async () => {
    if (!relationshipRequestId || relationshipActionLoading) return;
    setRelationshipActionLoading(true);
    try {
      await friendsApi.rejectRequest(relationshipRequestId);
      setRelationship("none");
      setRelationshipRequestId(null);
      toast.success("Đã từ chối lời mời kết bạn");
    } catch (err) {
      toast.error(
        extractErrorMessage(err, "Không thể từ chối lời mời kết bạn."),
      );
    } finally {
      setRelationshipActionLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <article
        className="relative max-h-[min(92vh,760px)] w-full max-w-[440px] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center justify-end bg-card/95 px-3 py-2 backdrop-blur-sm">
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </header>

        <div className="px-6 pb-6 pt-1">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <button
                type="button"
                onClick={() => setAvatarViewerOpen(true)}
                className="rounded-full bg-card p-1 shadow-md ring-1 ring-border transition hover:ring-sky-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                title="Xem ảnh đại diện"
                aria-label="Xem ảnh đại diện"
              >
                <ChatAvatar
                  src={avatar ?? undefined}
                  name={displayName}
                  size={24}
                />
              </button>
              {showGroupInfo && (
                <span
                  className={cn(
                    "pointer-events-none absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-card",
                    member.isOnline ? "bg-emerald-500" : "bg-muted-foreground/40",
                  )}
                  title={member.isOnline ? "Đang hoạt động" : "Ngoại tuyến"}
                />
              )}
            </div>

            <h3 className="mt-3 text-xl font-semibold tracking-tight text-foreground">
              {displayName}
            </h3>
            <p className="mt-0.5 text-sm text-muted-foreground">@{username}</p>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              {showGroupInfo ? (
                <>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                      member.isOnline
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        member.isOnline ? "bg-emerald-500" : "bg-muted-foreground",
                      )}
                    />
                    {member.isOnline ? "Đang hoạt động" : "Ngoại tuyến"}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                    <Shield size={12} />
                    {roleLabel}
                  </span>
                </>
              ) : null}

              {!isSelf && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
                    relationshipStatus === "friends"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                      : relationshipStatus === "request_sent"
                        ? "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                        : relationshipStatus === "request_received"
                          ? "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
                          : relationshipStatus === "blocked" ||
                              relationshipStatus === "blocked_by"
                            ? "bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300"
                            : "bg-muted text-muted-foreground",
                  )}
                  title="Trạng thái quan hệ"
                >
                  {relationshipLoading ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : relationshipStatus === "friends" ? (
                    <HeartHandshake size={12} />
                  ) : relationshipStatus === "request_sent" ? (
                    <Clock3 size={12} />
                  ) : relationshipStatus === "request_received" ? (
                    <Bell size={12} />
                  ) : relationshipStatus === "blocked" ||
                    relationshipStatus === "blocked_by" ? (
                    <UserX size={12} />
                  ) : (
                    <UserRound size={12} />
                  )}
                  {relationshipLoading
                    ? "Đang tải..."
                    : relationshipLabel(relationshipStatus)}
                </span>
              )}
            </div>

            {loading ? (
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 size={14} className="animate-spin" />
                Đang tải hồ sơ...
              </div>
            ) : bio ? (
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {bio}
              </p>
            ) : null}

            {error && (
              <p className="mt-2 text-xs text-amber-600">{error}</p>
            )}
          </div>

          {!isSelf && (
            <div className="mt-5 space-y-2">
              {(onMessage || onAudioCall || onVideoCall) && (
                <div
                  className={cn(
                    "grid gap-2",
                    [onMessage, onAudioCall, onVideoCall].filter(Boolean)
                      .length >= 3
                      ? "grid-cols-3"
                      : [onMessage, onAudioCall, onVideoCall].filter(Boolean)
                            .length === 2
                        ? "grid-cols-2"
                        : "grid-cols-1",
                  )}
                >
                  {onMessage && (
                    <button
                      type="button"
                      onClick={onMessage}
                      className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-muted/70 px-2 py-3 text-xs font-semibold text-foreground transition hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-700 dark:hover:text-sky-300"
                    >
                      <MessageCircle size={18} />
                      Nhắn tin
                    </button>
                  )}
                  {onAudioCall && (
                    <button
                      type="button"
                      onClick={onAudioCall}
                      className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-muted/70 px-2 py-3 text-xs font-semibold text-foreground transition hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-700 dark:hover:text-sky-300"
                    >
                      <Phone size={18} />
                      Gọi thoại
                    </button>
                  )}
                  {onVideoCall && (
                    <button
                      type="button"
                      onClick={onVideoCall}
                      className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-muted/70 px-2 py-3 text-xs font-semibold text-foreground transition hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-700 dark:hover:text-sky-300"
                    >
                      <Video size={18} />
                      Gọi video
                    </button>
                  )}
                </div>
              )}

              <div
                className={cn(
                  "grid gap-2",
                  relationshipStatus === "request_received"
                    ? "grid-cols-3"
                    : "grid-cols-2",
                )}
              >
                {relationshipStatus === "none" ? (
                  <button
                    type="button"
                    disabled={relationshipActionLoading || relationshipLoading}
                    onClick={() => void handleSendFriendRequest()}
                    className="flex items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-2.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-500/15 disabled:opacity-50 dark:text-sky-300"
                  >
                    {relationshipActionLoading ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <UserPlus size={15} />
                    )}
                    Kết bạn
                  </button>
                ) : relationshipStatus === "request_received" ? (
                  <>
                    <button
                      type="button"
                      disabled={relationshipActionLoading || !relationshipRequestId}
                      onClick={() => void handleAcceptFriendRequest()}
                      className="flex items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-sky-600 disabled:opacity-50"
                    >
                      {relationshipActionLoading ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <UserPlus size={15} />
                      )}
                      Chấp nhận
                    </button>
                    <button
                      type="button"
                      disabled={relationshipActionLoading || !relationshipRequestId}
                      onClick={() => void handleRejectFriendRequest()}
                      className="flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/70 px-3 py-2.5 text-xs font-semibold text-foreground transition hover:bg-muted disabled:opacity-50"
                    >
                      <UserX size={15} />
                      Từ chối
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold",
                      relationshipStatus === "friends"
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : relationshipStatus === "request_sent"
                          ? "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                          : relationshipStatus === "blocked" ||
                              relationshipStatus === "blocked_by"
                            ? "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-300"
                            : "border-border bg-muted/70 text-muted-foreground",
                    )}
                  >
                    {relationshipLoading ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : relationshipStatus === "friends" ? (
                      <HeartHandshake size={15} />
                    ) : relationshipStatus === "request_sent" ? (
                      <Clock3 size={15} />
                    ) : relationshipStatus === "blocked" ||
                      relationshipStatus === "blocked_by" ? (
                      <UserX size={15} />
                    ) : (
                      <UserRound size={15} />
                    )}
                    {relationshipLoading
                      ? "Đang tải..."
                      : relationshipLabel(relationshipStatus)}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setReportOpen(true)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-red-500/25 bg-red-500/5 px-3 py-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-500/10 dark:text-red-400"
                >
                  <Flag size={15} />
                  Báo cáo
                </button>
              </div>
            </div>
          )}

          <div className="mt-5 space-y-4">
            <section className="rounded-2xl border border-border bg-muted/50 p-3">
              <h4 className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Thông tin cá nhân
              </h4>
              <InfoRow
                icon={<UserRound size={15} />}
                label="Họ và tên"
                value={profile?.fullname || member.fullname || "—"}
              />
              <InfoRow
                icon={<AtSign size={15} />}
                label="Username"
                value={`@${username}`}
              />
              <InfoRow
                icon={<Mail size={15} />}
                label="Email"
                value={profile?.email || "—"}
              />
              <InfoRow
                icon={<CalendarDays size={15} />}
                label="Ngày sinh"
                value={formatDate(profile?.dateOfBirth)}
              />
              {!isSelf && (
                <InfoRow
                  icon={<HeartHandshake size={15} />}
                  label="Trạng thái quan hệ"
                  value={
                    relationshipLoading
                      ? "Đang tải..."
                      : relationshipLabel(relationshipStatus)
                  }
                  valueClassName={
                    relationshipStatus === "friends"
                      ? "text-emerald-600"
                      : relationshipStatus === "blocked" ||
                          relationshipStatus === "blocked_by"
                        ? "text-red-600"
                        : undefined
                  }
                />
              )}
            </section>

            {showGroupInfo ? (
              <section className="rounded-2xl border border-border bg-muted/50 p-3">
                <h4 className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Trong nhóm{chatroomName ? `: ${chatroomName}` : ""}
                </h4>
                <InfoRow
                  icon={<UserRound size={15} />}
                  label="Biệt danh trong nhóm"
                  value={member.nickname?.trim() || "Chưa đặt biệt danh"}
                />
                <InfoRow
                  icon={<Shield size={15} />}
                  label="Vai trò"
                  value={roleLabel}
                />
                <InfoRow
                  icon={<CalendarDays size={15} />}
                  label="Tham gia nhóm"
                  value={formatDate(member.joinedAt)}
                />
                <InfoRow
                  icon={<Clock3 size={15} />}
                  label="Hoạt động gần đây"
                  value={
                    member.isOnline
                      ? "Đang hoạt động"
                      : formatDateTime(member.lastActiveAt)
                  }
                  valueClassName={
                    member.isOnline ? "text-emerald-600" : undefined
                  }
                />
              </section>
            ) : friendsSince ? (
              <section className="rounded-2xl border border-border bg-muted/50 p-3">
                <h4 className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Quan hệ
                </h4>
                <InfoRow
                  icon={<CalendarDays size={15} />}
                  label="Bạn bè từ"
                  value={formatDate(friendsSince)}
                />
              </section>
            ) : null}

            <section className="rounded-2xl border border-border bg-muted/50 p-3">
              <h4 className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tài khoản
              </h4>
              <InfoRow
                icon={<CalendarDays size={15} />}
                label="Ngày tạo tài khoản"
                value={formatDate(profile?.createdAt)}
              />
              <InfoRow
                icon={<Clock3 size={15} />}
                label="Đăng nhập gần nhất"
                value={formatDateTime(profile?.lastLoginAt)}
              />
              <InfoRow
                icon={<BadgeCheck size={15} />}
                label="Xác thực email"
                value={
                  profile
                    ? profile.isEmailVerified
                      ? "Đã xác thực"
                      : "Chưa xác thực"
                    : "—"
                }
                valueClassName={
                  profile?.isEmailVerified ? "text-emerald-600" : undefined
                }
              />
              <InfoRow
                icon={<Shield size={15} />}
                label="Trạng thái tài khoản"
                value={
                  profile
                    ? profile.isActive
                      ? "Đang hoạt động"
                      : "Đã vô hiệu hóa"
                    : "—"
                }
                valueClassName={
                  profile?.isActive === false ? "text-red-600" : undefined
                }
              />
            </section>
          </div>
        </div>
      </article>

      <AvatarViewer
        open={avatarViewerOpen}
        src={avatar}
        name={displayName}
        onClose={() => setAvatarViewerOpen(false)}
      />

      {!isSelf && (
        <ReportUserDialog
          open={reportOpen}
          userId={member.userId}
          displayName={displayName}
          onClose={() => setReportOpen(false)}
          onReported={(alsoBlocked) => {
            if (alsoBlocked) setRelationship("blocked");
          }}
        />
      )}
    </div>
  );
}
