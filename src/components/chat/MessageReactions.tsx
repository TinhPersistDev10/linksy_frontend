"use client";

import { cn } from "@/lib/utils/cn";
import type { ReactionSummary } from "@/lib/types/message";

type MessageReactionsProps = {
  reactions?: ReactionSummary[] | null;
  disabled?: boolean;
  alignEnd?: boolean;
  onToggle: (emojiCode: string) => void;
};

export default function MessageReactions({
  reactions,
  disabled = false,
  alignEnd = false,
  onToggle,
}: MessageReactionsProps) {
  const list = reactions ?? [];
  if (list.length === 0) return null;

  return (
    <div
      className={cn(
        "mt-1 flex flex-wrap items-center gap-1",
        alignEnd ? "justify-end" : "justify-start",
      )}
    >
      {list.map((reaction) => (
        <button
          key={reaction.emojiCode}
          type="button"
          disabled={disabled}
          title={
            reaction.users?.map((u) => u.username).filter(Boolean).join(", ") ||
            reaction.emojiCode
          }
          onClick={() => onToggle(reaction.emojiCode)}
          className={cn(
            "inline-flex h-6 items-center gap-1 rounded-full border px-1.5 text-xs transition-colors",
            reaction.reactedByMe
              ? "border-sky-400/70 bg-sky-50 text-sky-800"
              : "border-border bg-background text-foreground hover:bg-muted",
            disabled && "pointer-events-none opacity-50",
          )}
        >
          <span className="leading-none">{reaction.emojiCode}</span>
          <span className="tabular-nums text-[11px] text-muted-foreground">
            {reaction.count}
          </span>
        </button>
      ))}
    </div>
  );
}
