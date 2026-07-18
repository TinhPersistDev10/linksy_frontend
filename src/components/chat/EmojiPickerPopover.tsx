"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import data from "@emoji-mart/data";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Picker = dynamic<any>(
  () =>
    import("@emoji-mart-awesome/react").then((mod) => mod.EmojiPicker),
  { ssr: false },
);

type EmojiPickerPopoverProps = {
  children: React.ReactNode;
  onSelect: (emoji: string) => void;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
};

export default function EmojiPickerPopover({
  children,
  onSelect,
  side = "top",
  align = "end",
}: EmojiPickerPopoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={8}
        className="w-auto overflow-hidden border-0 p-0 shadow-lg"
      >
        <Picker
          data={data}
          theme="light"
          previewPosition="none"
          skinTonePosition="search"
          onEmojiSelect={(emoji: { native?: string }) => {
            if (!emoji?.native) return;
            onSelect(emoji.native);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export const QUICK_REACTION_EMOJIS = [
  "❤️",
  "😂",
  "😮",
  "😢",
  "😡",
  "👍",
] as const;
