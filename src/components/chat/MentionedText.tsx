"use client";

import { useState } from "react";
import { ExternalLink, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { MentionDto } from "@/lib/types/message";
import { splitMessageTextWithMentions } from "@/lib/utils/mentions";
import { splitTextWithLinks } from "@/lib/utils/linkify";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MentionedTextProps {
  text: string;
  mentions?: MentionDto[] | null;
  currentUserId?: string;
  isOwn?: boolean;
  className?: string;
}

type PendingLink = {
  href: string;
  label: string;
};

export default function MentionedText({
  text,
  mentions,
  currentUserId,
  isOwn = false,
  className,
}: MentionedTextProps) {
  const [pendingLink, setPendingLink] = useState<PendingLink | null>(null);
  const segments = splitMessageTextWithMentions(text, mentions, currentUserId);

  const openLink = () => {
    if (!pendingLink) return;
    window.open(pendingLink.href, "_blank", "noopener,noreferrer");
    setPendingLink(null);
  };

  return (
    <>
      <span className={className}>
        {segments.map((segment, index) => {
          if (segment.type === "mention") {
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
          }

          return splitTextWithLinks(segment.value).map((part, partIndex) => {
            if (part.type === "text") {
              return (
                <span key={`t-${index}-${partIndex}`}>{part.value}</span>
              );
            }

            return (
              <a
                key={`l-${index}-${partIndex}`}
                href={part.href}
                rel="noopener noreferrer"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setPendingLink({ href: part.href, label: part.value });
                }}
                className={cn(
                  "break-all underline underline-offset-2",
                  isOwn
                    ? "text-white/95 decoration-white/70 hover:text-white"
                    : "text-sky-700 decoration-sky-400/70 hover:text-sky-800",
                )}
              >
                {part.value}
              </a>
            );
          });
        })}
      </span>

      <Dialog
        open={Boolean(pendingLink)}
        onOpenChange={(open) => {
          if (!open) setPendingLink(null);
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-amber-600" />
              Cảnh báo mở liên kết
            </DialogTitle>
            <DialogDescription>
              Bạn sắp mở một đường dẫn bên ngoài. Chỉ tiếp tục nếu bạn tin
              tưởng nguồn gửi liên kết này.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border bg-muted/40 px-3 py-2">
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Đường dẫn
            </p>
            <p className="break-all text-sm text-foreground">
              {pendingLink?.href}
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPendingLink(null)}
            >
              Hủy
            </Button>
            <Button type="button" onClick={openLink} className="gap-1.5">
              <ExternalLink className="size-4" />
              Mở liên kết
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
