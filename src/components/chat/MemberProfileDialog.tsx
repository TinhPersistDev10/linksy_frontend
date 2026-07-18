"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  AtSign,
  BadgeCheck,
  CalendarDays,
  Clock3,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Shield,
  UserRound,
  Video,
  X,
} from "lucide-react";
import { usersApi } from "@/lib/api/users";
import type { ChatroomMemberResponse } from "@/lib/types/chatroom";
import type { User } from "@/lib/types/user";
import { cn } from "@/lib/utils/cn";
import ChatAvatar from "./ChatAvatar";

type MemberProfileDialogProps = {
  open: boolean;
  member: ChatroomMemberResponse | null;
  chatroomName?: string;
  isSelf?: boolean;
  onClose: () => void;
  onMessage?: () => void;
  onAudioCall?: () => void;
  onVideoCall?: () => void;
};

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
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p
          className={cn(
            "mt-0.5 break-words text-sm font-medium text-slate-800",
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
  isSelf = false,
  onClose,
  onMessage,
  onAudioCall,
  onVideoCall,
}: MemberProfileDialogProps) {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !member?.userId) {
      setProfile(null);
      setError("");
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

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <article
        className="relative max-h-[min(92vh,760px)] w-full max-w-[440px] overflow-y-auto rounded-2xl bg-white shadow-2xl shadow-slate-900/20"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative h-28 bg-gradient-to-br from-sky-500 via-sky-600 to-indigo-600">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.28),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.18),transparent_40%)]" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full bg-black/20 p-1.5 text-white backdrop-blur-sm transition hover:bg-black/35"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pb-6">
          <div className="-mt-12 flex flex-col items-center text-center">
            <div className="relative">
              <div className="rounded-full bg-white p-1 shadow-md">
                <ChatAvatar
                  src={avatar ?? undefined}
                  name={displayName}
                  size={24}
                />
              </div>
              <span
                className={cn(
                  "absolute bottom-1 right-1 h-3.5 w-3.5 rounded-full border-2 border-white",
                  member.isOnline ? "bg-emerald-500" : "bg-slate-300",
                )}
                title={member.isOnline ? "Đang hoạt động" : "Ngoại tuyến"}
              />
            </div>

            <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-900">
              {displayName}
            </h3>
            <p className="mt-0.5 text-sm text-slate-500">@{username}</p>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                  member.isOnline
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-600",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    member.isOnline ? "bg-emerald-500" : "bg-slate-400",
                  )}
                />
                {member.isOnline ? "Đang hoạt động" : "Ngoại tuyến"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
                <Shield size={12} />
                {roleLabel}
              </span>
            </div>

            {loading ? (
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                <Loader2 size={14} className="animate-spin" />
                Đang tải hồ sơ...
              </div>
            ) : bio ? (
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-600">
                {bio}
              </p>
            ) : null}

            {error && (
              <p className="mt-2 text-xs text-amber-600">{error}</p>
            )}
          </div>

          {!isSelf && (onMessage || onAudioCall || onVideoCall) && (
            <div className="mt-5 grid grid-cols-3 gap-2">
              {onMessage && (
                <button
                  type="button"
                  onClick={onMessage}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 px-2 py-3 text-xs font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                >
                  <MessageCircle size={18} />
                  Nhắn tin
                </button>
              )}
              {onAudioCall && (
                <button
                  type="button"
                  onClick={onAudioCall}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 px-2 py-3 text-xs font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                >
                  <Phone size={18} />
                  Gọi thoại
                </button>
              )}
              {onVideoCall && (
                <button
                  type="button"
                  onClick={onVideoCall}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 px-2 py-3 text-xs font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                >
                  <Video size={18} />
                  Gọi video
                </button>
              )}
            </div>
          )}

          <div className="mt-5 space-y-4">
            <section className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
              <h4 className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
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
            </section>

            <section className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
              <h4 className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
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

            <section className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
              <h4 className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
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
    </div>
  );
}
