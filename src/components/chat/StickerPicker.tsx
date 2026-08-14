"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { STICKERS } from "@/lib/stickers";

type StickerPickerProps = {
  children: React.ReactNode;
  onSelect: (src: string) => void;
  disabled?: boolean;
};

export default function StickerPicker({
  children,
  onSelect,
  disabled,
}: StickerPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        {children}
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={8}
        className="w-72 p-2 shadow-lg"
      >
        <p className="mb-2 px-1 text-xs font-medium text-muted-foreground">
          Sticker
        </p>
        <div className="grid max-h-64 grid-cols-4 gap-1 overflow-y-auto">
          {STICKERS.map((sticker) => (
            <button
              key={sticker.id}
              type="button"
              title={sticker.label}
              aria-label={sticker.label}
              onClick={() => {
                onSelect(sticker.src);
                setOpen(false);
              }}
              className="flex h-16 w-full items-center justify-center rounded-xl p-1 hover:bg-muted"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sticker.src}
                alt={sticker.label}
                className="h-12 w-12 object-contain"
              />
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
