"use client";

import { AlertTriangle, Ban, Clock3, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { MODERATION_LEVEL_LABELS } from "@/lib/types/report";

function formatExpiry(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ModerationBanner() {
  const { user } = useAuth();
  const moderation = user?.moderation;
  const level = moderation?.level ?? "none";

  if (!moderation || level === "none") return null;
  if (level === "permanent_lock" || level === "temporary_lock") return null;

  const expiry = formatExpiry(moderation.expiresAt);
  const isRestricted = level === "restricted";

  return (
    <div
      className={
        isRestricted
          ? "border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-amber-950 dark:text-amber-100"
          : "border-b border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-sky-950 dark:text-sky-100"
      }
    >
      <div className="mx-auto flex max-w-5xl items-start gap-3 text-sm">
        <span className="mt-0.5 shrink-0">
          {isRestricted ? <Ban size={16} /> : <AlertTriangle size={16} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {MODERATION_LEVEL_LABELS[level] ?? moderation.levelLabel}
          </p>
          <p className="mt-0.5 text-xs opacity-90">
            {moderation.reason ||
              (isRestricted
                ? "Bạn tạm thời không thể nhắn tin hoặc gọi."
                : "Vui lòng tuân thủ tiêu chuẩn cộng đồng để tránh bị hạn chế thêm.")}
            {expiry ? (
              <span className="ml-1 inline-flex items-center gap-1">
                <Clock3 size={12} /> Hết hạn: {expiry}
              </span>
            ) : null}
          </p>
        </div>
        {(moderation.violationPoints ?? 0) > 0 && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-medium dark:bg-white/10">
            <ShieldAlert size={12} />
            {moderation.violationPoints} điểm
          </span>
        )}
      </div>
    </div>
  );
}
