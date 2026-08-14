"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  useAdminRegistrationStatsQuery,
  useAdminReportsQuery,
  useUpdateAdminReportMutation,
} from "@/lib/hooks/useAdminQueries";
import {
  MODERATION_DURATION_DEFAULTS,
  MODERATION_LEVEL_LABELS,
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
} from "@/lib/types/report";
import type { ModerationLevel, UserReport } from "@/lib/types/report";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/lib/stores/toastStore";
import { extractErrorMessage } from "@/lib/utils/extractErrorMessage";
import { cn } from "@/lib/utils/cn";
import ChatAvatar from "@/components/chat/ChatAvatar";

const STATUS_FILTERS = [
  { value: "", label: "Tất cả" },
  { value: "pending", label: "Chờ xử lý" },
  { value: "reviewing", label: "Đang xem xét" },
  { value: "resolved", label: "Đã xử lý" },
  { value: "dismissed", label: "Từ chối" },
] as const;

const MODERATION_ACTIONS: { value: ModerationLevel; label: string }[] = [
  { value: "none", label: MODERATION_LEVEL_LABELS.none },
  { value: "warning", label: MODERATION_LEVEL_LABELS.warning },
  { value: "restricted", label: MODERATION_LEVEL_LABELS.restricted },
  { value: "temporary_lock", label: MODERATION_LEVEL_LABELS.temporary_lock },
  { value: "permanent_lock", label: MODERATION_LEVEL_LABELS.permanent_lock },
];

function formatDate(value: string) {
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClass(status: string) {
  switch (status) {
    case "pending":
      return "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300";
    case "reviewing":
      return "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300";
    case "resolved":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300";
    case "dismissed":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function AdminReportsList() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<UserReport | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [moderationAction, setModerationAction] =
    useState<ModerationLevel>("none");
  const [durationDays, setDurationDays] = useState(7);

  const query = useAdminReportsQuery(page, 15, status);
  const updateMutation = useUpdateAdminReportMutation();

  const reports = query.data?.reports ?? [];
  const totalPages = query.data?.totalPages ?? 1;
  const totalCount = query.data?.totalCount ?? 0;

  const openReview = (report: UserReport) => {
    setSelected(report);
    setAdminNote(report.adminNote ?? "");
    setModerationAction("none");
    setDurationDays(7);
  };

  const applyStatus = async (
    nextStatus: "reviewing" | "resolved" | "dismissed",
  ) => {
    if (!selected) return;
    try {
      const needsDuration =
        moderationAction === "restricted" ||
        moderationAction === "temporary_lock";
      const updated = await updateMutation.mutateAsync({
        reportId: selected.reportId,
        payload: {
          status: nextStatus,
          adminNote: adminNote.trim() || undefined,
          moderationAction:
            nextStatus === "resolved" ? moderationAction : undefined,
          durationDays:
            nextStatus === "resolved" && needsDuration
              ? durationDays
              : undefined,
          incrementStrike: nextStatus === "resolved" && moderationAction !== "none",
        },
      });
      toast.success("Đã cập nhật báo cáo");
      setSelected(updated);
      await query.refetch();
    } catch (err) {
      toast.error(extractErrorMessage(err, "Cập nhật thất bại"));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value || "all"}
            type="button"
            onClick={() => {
              setStatus(f.value);
              setPage(1);
            }}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              status === f.value
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          {totalCount} báo cáo
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        {query.isLoading ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : reports.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Không có báo cáo nào.
          </p>
        ) : (
          <ul className="divide-y">
            {reports.map((report) => (
              <li key={report.reportId}>
                <button
                  type="button"
                  onClick={() => openReview(report)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                >
                  <ChatAvatar
                    name={
                      report.reportedFullname || report.reportedUsername
                    }
                    src={report.reportedAvatar ?? undefined}
                    size={10}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">
                        {report.reportedFullname || report.reportedUsername}
                      </p>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                          statusClass(report.status),
                        )}
                      >
                        {REPORT_STATUS_LABELS[report.status] ?? report.status}
                      </span>
                      {report.reportedUserIsFlagged && (
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-800 dark:bg-orange-500/20 dark:text-orange-300">
                          Ưu tiên
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Lý do:{" "}
                      {REPORT_REASON_LABELS[report.reason] ?? report.reason}
                      {" · "}
                      Báo cáo bởi {report.reporterUsername}
                      {" · "}
                      {formatDate(report.createdAt)}
                    </p>
                    {report.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {report.description}
                      </p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Trước
          </button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
          onClick={() => setSelected(null)}
        >
          <section
            className="w-full max-w-lg rounded-2xl bg-background p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">Chi tiết báo cáo</h3>
            <div className="mt-4 space-y-3 text-sm">
              <p>
                <span className="text-muted-foreground">Tài khoản bị báo cáo: </span>
                <Link
                  href={`/admin/users/${selected.reportedUserId}`}
                  className="font-medium text-sky-600 hover:underline"
                >
                  {selected.reportedFullname || selected.reportedUsername}
                </Link>
              </p>
              <p>
                <span className="text-muted-foreground">Người báo cáo: </span>
                {selected.reporterFullname || selected.reporterUsername}
              </p>
              <p>
                <span className="text-muted-foreground">Lý do: </span>
                {REPORT_REASON_LABELS[selected.reason] ?? selected.reason}
              </p>
              {selected.description && (
                <p>
                  <span className="text-muted-foreground">Mô tả: </span>
                  {selected.description}
                </p>
              )}
              <p>
                <span className="text-muted-foreground">Trạng thái: </span>
                {REPORT_STATUS_LABELS[selected.status] ?? selected.status}
              </p>
              {(selected.reportedUserIsFlagged ||
                (selected.reportedUserViolationPoints ?? 0) > 0) && (
                <p className="rounded-lg bg-orange-50 px-3 py-2 text-xs text-orange-800 dark:bg-orange-500/15 dark:text-orange-200">
                  {selected.reportedUserIsFlagged
                    ? "Tài khoản đang được gắn cờ ưu tiên (nhiều báo cáo gần đây). "
                    : ""}
                  Điểm vi phạm: {selected.reportedUserViolationPoints ?? 0}
                  {selected.reportedUserModerationLevel &&
                  selected.reportedUserModerationLevel !== "none"
                    ? ` · Hiện tại: ${MODERATION_LEVEL_LABELS[selected.reportedUserModerationLevel] ?? selected.reportedUserModerationLevel}`
                    : ""}
                </p>
              )}
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Ghi chú admin
                </label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:border-sky-400"
                  placeholder="Ghi chú nội bộ / lý do xử lý..."
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Hành động khi &quot;Đã xử lý&quot;
                </label>
                <select
                  value={moderationAction}
                  onChange={(e) => {
                    const next = e.target.value as ModerationLevel;
                    setModerationAction(next);
                    const def = MODERATION_DURATION_DEFAULTS[next];
                    if (def) setDurationDays(def);
                  }}
                  className="mt-1 h-10 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus:border-sky-400"
                >
                  {MODERATION_ACTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              {(moderationAction === "restricted" ||
                moderationAction === "temporary_lock") && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Số ngày áp dụng
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={durationDays}
                    onChange={(e) =>
                      setDurationDays(
                        Math.min(365, Math.max(1, Number(e.target.value) || 1)),
                      )
                    }
                    className="mt-1 h-10 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus:border-sky-400"
                  />
                </div>
              )}
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={updateMutation.isPending}
                onClick={() => void applyStatus("reviewing")}
                className="rounded-lg border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
              >
                Đang xem xét
              </button>
              <button
                type="button"
                disabled={updateMutation.isPending}
                onClick={() => void applyStatus("dismissed")}
                className="rounded-lg border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
              >
                Từ chối
              </button>
              <button
                type="button"
                disabled={updateMutation.isPending}
                onClick={() => void applyStatus("resolved")}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Đã xử lý
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

const CHART_HEIGHT = 180;

function formatBucketLabel(
  label: string,
  period: "day" | "month" | "year",
): string {
  if (period === "day") return label.slice(5);
  if (period === "month") return label.slice(2);
  return label;
}

function yAxisTicks(maxCount: number): number[] {
  if (maxCount <= 1) return [0, 1];
  if (maxCount <= 4) return [0, 1, 2, 3, 4].filter((n) => n <= maxCount);
  const step = Math.ceil(maxCount / 4);
  const ticks = [0];
  for (let v = step; v < maxCount; v += step) ticks.push(v);
  ticks.push(maxCount);
  return ticks;
}

export function AdminRegistrationStatsPanel() {
  const [period, setPeriod] = useState<"day" | "month" | "year">("day");
  const [hovered, setHovered] = useState<string | null>(null);
  const query = useAdminRegistrationStatsQuery(period);
  const stats = query.data;

  const maxCount = useMemo(
    () => Math.max(1, ...(stats?.buckets.map((b) => b.count) ?? [1])),
    [stats],
  );

  const ticks = useMemo(() => yAxisTicks(maxCount), [maxCount]);

  const labelStep = useMemo(() => {
    const n = stats?.buckets.length ?? 0;
    if (period === "day" && n > 14) return 3;
    if (period === "day" && n > 7) return 2;
    return 1;
  }, [period, stats?.buckets.length]);

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-medium">Đăng ký người dùng</h3>
          <p className="text-xs text-muted-foreground">
            Lọc theo ngày / tháng / năm
          </p>
        </div>
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {(
            [
              { value: "day", label: "Ngày" },
              { value: "month", label: "Tháng" },
              { value: "year", label: "Năm" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setPeriod(opt.value);
                setHovered(null);
              }}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                period === opt.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        Tổng:{" "}
        <span className="font-semibold text-foreground">
          {stats?.totalRegistrations ?? 0}
        </span>{" "}
        người dùng
      </p>

      {query.isLoading ? (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-[220px] w-full" />
        </div>
      ) : !stats?.buckets.length ? (
        <p className="mt-4 text-sm text-muted-foreground">Không có dữ liệu.</p>
      ) : (
        <div className="mt-4">
          <div className="flex gap-3">
            {/* Y-axis */}
            <div className="flex w-7 shrink-0 flex-col">
              <div className="h-5 shrink-0" />
              <div
                className="relative flex flex-col justify-between text-right"
                style={{ height: CHART_HEIGHT }}
              >
                {[...ticks].reverse().map((tick) => (
                  <span
                    key={tick}
                    className="text-[10px] tabular-nums leading-none text-muted-foreground"
                  >
                    {tick}
                  </span>
                ))}
              </div>
            </div>

            {/* Plot */}
            <div className="min-w-0 flex-1">
              <div className="h-5 shrink-0" />
              <div
                className="relative flex items-end gap-px sm:gap-1"
                style={{ height: CHART_HEIGHT }}
                onMouseLeave={() => setHovered(null)}
              >
                {/* Grid lines */}
                {ticks.map((tick) => {
                  const bottom = (tick / maxCount) * CHART_HEIGHT;
                  return (
                    <div
                      key={`grid-${tick}`}
                      className="pointer-events-none absolute right-0 left-0 border-t border-border/50"
                      style={{ bottom }}
                    />
                  );
                })}

                {stats.buckets.map((bucket) => {
                  const barPx =
                    bucket.count > 0
                      ? Math.max(8, (bucket.count / maxCount) * CHART_HEIGHT)
                      : 0;
                  const isActive = hovered === bucket.label;
                  const shortLabel = formatBucketLabel(bucket.label, period);

                  return (
                    <div
                      key={bucket.label}
                      className="relative z-[1] flex h-full min-w-[10px] flex-1 items-end justify-center"
                      onMouseEnter={() => setHovered(bucket.label)}
                    >
                      {isActive && (
                        <div className="pointer-events-none absolute bottom-[calc(100%+4px)] z-20 whitespace-nowrap rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-md">
                          <div className="font-semibold text-foreground">
                            {bucket.count} đăng ký
                          </div>
                          <div className="text-muted-foreground">
                            {bucket.label}
                          </div>
                        </div>
                      )}

                      <div className="relative w-full max-w-[40px]">
                        {bucket.count > 0 && (
                          <span
                            className={cn(
                              "absolute bottom-full left-1/2 mb-1 -translate-x-1/2 text-[10px] tabular-nums",
                              isActive
                                ? "font-semibold text-foreground"
                                : "text-muted-foreground",
                            )}
                          >
                            {bucket.count}
                          </span>
                        )}
                        <div
                          className={cn(
                            "w-full rounded-t-md transition-all duration-200",
                            bucket.count > 0
                              ? isActive
                                ? "bg-sky-500"
                                : "bg-sky-500/80 hover:bg-sky-500"
                              : "bg-border/40",
                          )}
                          style={{
                            height: bucket.count > 0 ? barPx : 3,
                          }}
                          title={`${shortLabel}: ${bucket.count}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* X-axis labels */}
              <div className="mt-2 flex gap-px border-t border-border/60 pt-2 sm:gap-1">
                {stats.buckets.map((bucket, index) => {
                  const show =
                    index === 0 ||
                    index === stats.buckets.length - 1 ||
                    index % labelStep === 0;
                  return (
                    <div
                      key={`label-${bucket.label}`}
                      className="min-w-[10px] flex-1 text-center"
                    >
                      {show ? (
                        <span className="block truncate text-[9px] text-muted-foreground sm:text-[10px]">
                          {formatBucketLabel(bucket.label, period)}
                        </span>
                      ) : (
                        <span className="block h-3" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
