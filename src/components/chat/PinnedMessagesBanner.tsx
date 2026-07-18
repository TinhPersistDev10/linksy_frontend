"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Pin, PinOff } from "lucide-react";
import type { PinnedMessageResponse } from "@/lib/types/message";
import { cn } from "@/lib/utils/cn";

interface PinnedMessagesBannerProps {
  pinnedMessages: PinnedMessageResponse[];
  canUnpin: boolean;
  onJump: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
}

function getPreview(pin: PinnedMessageResponse) {
  if (pin.messageType === "image") return "Ảnh";
  if (pin.messageType === "file") return "File";
  if (pin.messageType === "video") return "Video";
  if (pin.messageType === "audio" || pin.messageType === "voice")
    return "Tin nhắn thoại";
  return pin.messageText || "Tin nhắn";
}

export default function PinnedMessagesBanner({
  pinnedMessages,
  canUnpin,
  onJump,
  onUnpin,
}: PinnedMessagesBannerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (pinnedMessages.length === 0) setOpen(false);
  }, [pinnedMessages.length]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (pinnedMessages.length === 0) return null;

  const latest = pinnedMessages[0]!;
  const countLabel =
    pinnedMessages.length === 1
      ? "1 tin đã ghim"
      : `${pinnedMessages.length} tin đã ghim`;

  return (
    <div ref={containerRef} className="relative shrink-0 border-b bg-muted/40">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-muted/60"
      >
        <Pin size={14} className="mt-0.5 shrink-0 text-sky-600" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground">{countLabel}</p>
          <p className="truncate text-xs text-muted-foreground">
            <span className="font-medium">{latest.senderFullname}: </span>
            {getPreview(latest)}
          </p>
        </div>
        <ChevronDown
          size={14}
          className={cn(
            "mt-0.5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Danh sách tin nhắn đã ghim"
          className="absolute inset-x-0 top-full z-30 max-h-64 overflow-y-auto border-b bg-background shadow-md"
        >
          {pinnedMessages.map((pin) => (
            <div
              key={pin.pinnedMessageId}
              className="flex items-stretch border-b last:border-b-0"
            >
              <button
                type="button"
                role="option"
                onClick={() => {
                  onJump(pin.messageId);
                  setOpen(false);
                }}
                className="min-w-0 flex-1 px-3 py-2.5 text-left hover:bg-muted"
              >
                <p className="truncate text-xs font-medium text-foreground">
                  {pin.senderFullname}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {getPreview(pin)}
                </p>
              </button>
              {canUnpin && (
                <button
                  type="button"
                  title="Bỏ ghim"
                  aria-label={`Bỏ ghim tin của ${pin.senderFullname}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnpin(pin.messageId);
                  }}
                  className="flex w-10 shrink-0 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <PinOff size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
