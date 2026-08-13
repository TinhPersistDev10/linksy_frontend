"use client";

import { useEffect, useState } from "react";
import { Flag, Loader2, X } from "lucide-react";
import { reportsApi } from "@/lib/api/reports";
import { toast } from "@/lib/stores/toastStore";
import type { ReportReason, ReportReasonCode } from "@/lib/types/report";
import { REPORT_REASON_LABELS } from "@/lib/types/report";
import { extractErrorMessage } from "@/lib/utils/extractErrorMessage";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/cn";

const FALLBACK_REASONS: ReportReason[] = (
  Object.keys(REPORT_REASON_LABELS) as ReportReasonCode[]
).map((code) => ({ code, label: REPORT_REASON_LABELS[code] }));

type ReportUserDialogProps = {
  open: boolean;
  userId: string;
  displayName: string;
  onClose: () => void;
  onReported?: (alsoBlocked: boolean) => void;
};

export default function ReportUserDialog({
  open,
  userId,
  displayName,
  onClose,
  onReported,
}: ReportUserDialogProps) {
  const [reasons, setReasons] = useState<ReportReason[]>(FALLBACK_REASONS);
  const [reason, setReason] = useState<string>("");
  const [description, setDescription] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setReason("");
    setDescription("");
    setAlsoBlock(false);
    setError(null);
    void reportsApi
      .getReasons()
      .then((list) => {
        if (list.length) setReasons(list);
      })
      .catch(() => {
        /* keep fallback */
      });
  }, [open, userId]);

  if (!open) return null;

  const handleSubmit = async () => {
    if (!reason) {
      setError("Vui lòng chọn lý do báo cáo.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await reportsApi.create({
        reportedUserId: userId,
        reason,
        description: description.trim() || undefined,
        alsoBlock,
      });
      toast.success("Đã gửi báo cáo. Cảm ơn bạn.");
      onReported?.(alsoBlock);
      onClose();
    } catch (err) {
      setError(
        extractErrorMessage(err, "Không thể gửi báo cáo. Vui lòng thử lại."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/45 p-4"
      onClick={() => !submitting && onClose()}
    >
      <section
        className="w-full max-w-md overflow-hidden rounded-2xl bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-400">
              <Flag size={18} />
            </span>
            <div>
              <h3 className="font-semibold">Báo cáo tài khoản</h3>
              <p className="text-xs text-muted-foreground">{displayName}</p>
            </div>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted"
          >
            <X size={18} />
          </button>
        </header>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
          <p className="text-sm text-muted-foreground">
            Chọn lý do phù hợp nhất. Báo cáo của bạn sẽ được đội ngũ kiểm duyệt
            xem xét.
          </p>

          <div className="space-y-2">
            {reasons.map((item) => (
              <label
                key={item.code}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-colors",
                  reason === item.code
                    ? "border-sky-400 bg-sky-50 dark:border-sky-500 dark:bg-sky-500/10"
                    : "border-border hover:bg-muted/50",
                )}
              >
                <input
                  type="radio"
                  name="report-reason"
                  value={item.code}
                  checked={reason === item.code}
                  onChange={() => setReason(item.code)}
                  className="accent-sky-600"
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Chi tiết bổ sung (tuỳ chọn)
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Mô tả thêm về vấn đề..."
              className="mt-1.5"
            />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border px-3 py-2.5 text-sm">
            <input
              type="checkbox"
              checked={alsoBlock}
              onChange={(e) => setAlsoBlock(e.target.checked)}
              className="mt-0.5 accent-sky-600"
            />
            <span>
              <span className="font-medium">Chặn người này</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Họ sẽ không thể nhắn tin hoặc gọi cho bạn.
              </span>
            </span>
          </label>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-500/15 dark:text-red-300">
              {error}
            </p>
          )}
        </div>

        <footer className="flex justify-end gap-2 border-t px-5 py-3">
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            Huỷ
          </button>
          <button
            type="button"
            disabled={submitting || !reason}
            onClick={() => void handleSubmit()}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Flag size={16} />
            )}
            Gửi báo cáo
          </button>
        </footer>
      </section>
    </div>
  );
}
