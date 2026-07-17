import { cn } from "@/lib/utils/cn";
import type { MentionDto } from "@/lib/types/message";
import { splitMessageTextWithMentions } from "@/lib/utils/mentions";

interface MentionedTextProps {
  text: string;
  mentions?: MentionDto[] | null;
  currentUserId?: string;
  isOwn?: boolean;
  className?: string;
}

export default function MentionedText({
  text,
  mentions,
  currentUserId,
  isOwn = false,
  className,
}: MentionedTextProps) {
  const segments = splitMessageTextWithMentions(text, mentions, currentUserId);

  return (
    <span className={className}>
      {segments.map((segment, index) => {
        if (segment.type === "text") {
          return <span key={`t-${index}`}>{segment.value}</span>;
        }

        return (
          <span
            key={`m-${segment.userId}-${index}`}
            className={cn(
              "rounded px-0.5 font-semibold",
              segment.isSelf
                ? isOwn
                  ? "bg-white/25 text-white"
                  : "bg-amber-200/80 text-amber-950"
                : isOwn
                  ? "bg-white/15 text-white"
                  : "bg-sky-100 text-sky-800",
            )}
          >
            {segment.value}
          </span>
        );
      })}
    </span>
  );
}
