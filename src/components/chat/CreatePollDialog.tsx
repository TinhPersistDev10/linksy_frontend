"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import Button from "../ui/Button";
import { cn } from "@/lib/utils/cn";
import type { CreatePollRequest } from "@/lib/types/message";
import {
  COMMUNITY_VIOLATION_MESSAGE,
  containsBannedContent,
} from "@/lib/utils/contentModeration";

interface CreatePollDialogProps {
  open: boolean;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (poll: CreatePollRequest) => void | Promise<void>;
}

export default function CreatePollDialog({
  open,
  submitting = false,
  onClose,
  onSubmit,
}: CreatePollDialogProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const reset = () => {
    setQuestion("");
    setOptions(["", ""]);
    setError(null);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    const q = question.trim();
    const opts = options.map((o) => o.trim()).filter(Boolean);
    const unique = Array.from(new Set(opts.map((o) => o.toLowerCase())));

    if (q.length < 1 || q.length > 200) {
      setError("Câu hỏi phải từ 1 đến 200 ký tự.");
      return;
    }
    if (opts.length < 2) {
      setError("Cần ít nhất 2 lựa chọn.");
      return;
    }
    if (opts.length > 10) {
      setError("Tối đa 10 lựa chọn.");
      return;
    }
    if (unique.length !== opts.length) {
      setError("Các lựa chọn không được trùng nhau.");
      return;
    }
    if (opts.some((o) => o.length > 100)) {
      setError("Mỗi lựa chọn tối đa 100 ký tự.");
      return;
    }

    if (
      containsBannedContent(q) ||
      opts.some((option) => containsBannedContent(option))
    ) {
      setError(COMMUNITY_VIOLATION_MESSAGE);
      return;
    }

    setError(null);
    try {
      await onSubmit({ question: q, options: opts });
      reset();
    } catch (err) {
      const apiMessage =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;
      setError(
        typeof apiMessage === "string" && apiMessage.length > 0
          ? apiMessage
          : "Không thể tạo bình chọn. Thử lại sau.",
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tạo bình chọn"
        className="w-full max-w-md rounded-2xl border bg-background p-4 shadow-xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">Tạo bình chọn</h3>
          <button
            type="button"
            onClick={handleClose}
            disabled={submitting}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Câu hỏi
        </label>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          maxLength={200}
          placeholder="Bạn muốn hỏi gì?"
          className="mb-3 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/40"
        />

        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Lựa chọn
        </label>
        <div className="mb-2 space-y-2">
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                value={option}
                onChange={(e) => {
                  const next = [...options];
                  next[index] = e.target.value;
                  setOptions(next);
                }}
                maxLength={100}
                placeholder={`Lựa chọn ${index + 1}`}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/40"
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() =>
                    setOptions((prev) => prev.filter((_, i) => i !== index))
                  }
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                  aria-label="Xóa lựa chọn"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        {options.length < 10 && (
          <button
            type="button"
            onClick={() => setOptions((prev) => [...prev, ""])}
            className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
          >
            <Plus size={14} />
            Thêm lựa chọn
          </button>
        )}

        {error && <p className="mb-2 text-xs text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={submitting}
          >
            Hủy
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className={cn("bg-blue-500 text-white hover:bg-blue-600")}
          >
            {submitting ? "Đang tạo..." : "Tạo bình chọn"}
          </Button>
        </div>
      </div>
    </div>
  );
}
