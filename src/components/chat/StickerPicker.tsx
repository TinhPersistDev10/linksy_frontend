"use client";

import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/lib/hooks/useAuth";
import { useMyStickersQuery } from "@/lib/hooks/useServerStateQueries";
import { useDeleteStickerMutation } from "@/lib/hooks/useStickerQueries";
import { STICKERS } from "@/lib/stickers";
import { cn } from "@/lib/utils/cn";
import CreateStickerDialog from "./CreateStickerDialog";

type StickerPickerProps = {
  children: React.ReactNode;
  onSelect: (src: string) => void;
  disabled?: boolean;
};

type StickerTab = "available" | "mine";

export default function StickerPicker({
  children,
  onSelect,
  disabled,
}: StickerPickerProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<StickerTab>("available");
  const [createOpen, setCreateOpen] = useState(false);

  const { user } = useAuth();
  const myStickersQuery = useMyStickersQuery(user?.userId);
  const deleteSticker = useDeleteStickerMutation(user?.userId);

  const handleSelect = (src: string) => {
    onSelect(src);
    setOpen(false);
  };

  return (
    <>
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
          <div className="mb-2 flex items-center border-b">
            {(
              [
                { id: "available", label: "Có sẵn" },
                { id: "mine", label: "Của tôi" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "border-b-2 px-3 py-1.5 text-xs font-medium transition-colors",
                  tab === t.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "available" && (
            <div className="grid max-h-64 grid-cols-4 gap-1 overflow-y-auto">
              {STICKERS.map((sticker) => (
                <button
                  key={sticker.id}
                  type="button"
                  title={sticker.label}
                  aria-label={sticker.label}
                  onClick={() => handleSelect(sticker.src)}
                  className="flex h-16 w-full items-center justify-center rounded-xl p-1 transition-transform hover:scale-110 hover:bg-muted"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sticker.src}
                    alt={sticker.label}
                    className="h-14 w-14 object-contain"
                  />
                </button>
              ))}
            </div>
          )}

          {tab === "mine" && (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setCreateOpen(true);
                }}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed py-2 text-xs font-medium text-muted-foreground hover:border-blue-400 hover:text-blue-600"
              >
                <Plus size={14} />
                Tạo sticker
              </button>

              {myStickersQuery.isLoading && (
                <div className="flex h-24 items-center justify-center text-muted-foreground">
                  <Loader2 size={18} className="animate-spin" />
                </div>
              )}

              {!myStickersQuery.isLoading &&
                (myStickersQuery.data?.length ?? 0) === 0 && (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    Chưa có sticker nào. Hãy tạo sticker đầu tiên của bạn!
                  </p>
                )}

              {!myStickersQuery.isLoading &&
                (myStickersQuery.data?.length ?? 0) > 0 && (
                  <div className="grid max-h-56 grid-cols-4 gap-1 overflow-y-auto">
                    {myStickersQuery.data!.map((sticker) => (
                      <div key={sticker.id} className="group relative">
                        <button
                          type="button"
                          onClick={() => handleSelect(sticker.imageUrl)}
                          className="flex h-16 w-full items-center justify-center rounded-xl p-1 transition-transform hover:scale-110 hover:bg-muted"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={sticker.imageUrl}
                            alt="Sticker của tôi"
                            className="h-14 w-14 object-contain"
                          />
                        </button>
                        <button
                          type="button"
                          title="Xoá sticker"
                          aria-label="Xoá sticker"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSticker.mutate(sticker.id);
                          }}
                          className="absolute -right-0.5 -top-0.5 hidden h-4 w-4 items-center justify-center rounded-full bg-muted-foreground/80 text-white group-hover:flex hover:bg-red-500"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          )}
        </PopoverContent>
      </Popover>

      <CreateStickerDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSend={handleSelect}
      />
    </>
  );
}
