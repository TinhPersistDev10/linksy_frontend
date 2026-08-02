"use client";

import { BarChart3, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { PollResponse } from "@/lib/types/message";

interface PollMessageBubbleProps {
  poll: PollResponse;
  isOwn?: boolean;
  centered?: boolean;
  disabled?: boolean;
  onVote: (optionId: string) => void;
  onClose?: () => void;
}

export default function PollMessageBubble({
  poll,
  isOwn = false,
  centered = false,
  disabled = false,
  onVote,
  onClose,
}: PollMessageBubbleProps) {
  const hasVoted = Boolean(poll.myVotedOptionId);
  const showResults = hasVoted || poll.isClosed;
  const total = Math.max(poll.totalVotes, 0);
  const neutral = centered || !isOwn;

  return (
    <div
      className={cn(
        "space-y-2.5",
        centered ? "w-full text-foreground" : "min-w-[220px] max-w-[280px]",
        !neutral && "text-white",
      )}
    >
      <div className="flex items-start gap-2">
        <BarChart3
          size={16}
          className={cn(
            "mt-0.5 shrink-0",
            neutral ? "text-blue-500" : "text-white/80",
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-snug">{poll.question}</p>
          <p
            className={cn(
              "mt-0.5 text-[11px]",
              neutral ? "text-muted-foreground" : "text-white/70",
            )}
          >
            {poll.isClosed
              ? "Đã hủy"
              : hasVoted
                ? "Bạn đã bình chọn"
                : "Chọn một đáp án"}
            {" · "}
            {total} phiếu
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        {poll.options.map((option) => {
          const percent =
            showResults && total > 0
              ? Math.round((option.voteCount / total) * 100)
              : 0;

          return (
            <button
              key={option.optionId}
              type="button"
              disabled={disabled || poll.isClosed}
              onClick={() => onVote(option.optionId)}
              className={cn(
                "relative w-full overflow-hidden rounded-xl border px-3 py-2 text-left text-sm transition-colors",
                neutral
                  ? "border-border hover:bg-muted/60 disabled:hover:bg-transparent"
                  : "border-white/30 hover:bg-white/10 disabled:hover:bg-transparent",
                option.votedByMe &&
                  (neutral ? "ring-1 ring-blue-500" : "ring-1 ring-white/70"),
                poll.isClosed && "cursor-default opacity-90",
              )}
            >
              {showResults && (
                <span
                  className={cn(
                    "absolute inset-y-0 left-0 transition-[width]",
                    neutral ? "bg-blue-500/15" : "bg-white/20",
                  )}
                  style={{ width: `${percent}%` }}
                />
              )}
              <span className="relative z-[1] flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  {option.votedByMe && <Check size={14} className="shrink-0" />}
                  <span className="truncate">{option.text}</span>
                </span>
                {showResults && (
                  <span
                    className={cn(
                      "shrink-0 tabular-nums text-xs",
                      neutral ? "text-muted-foreground" : "text-white/80",
                    )}
                  >
                    {percent}%
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {poll.canClose && onClose && (
        <button
          type="button"
          onClick={onClose}
          disabled={disabled}
          className={cn(
            "text-xs font-medium underline-offset-2 hover:underline",
            neutral ? "text-red-600 dark:text-red-400" : "text-white/85",
          )}
        >
          Hủy bình chọn
        </button>
      )}
    </div>
  );
}
