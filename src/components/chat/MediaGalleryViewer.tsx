"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  Play,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import {
  getFullQualityImageUrl,
  getThumbnailImageUrl,
} from "@/lib/utils/cloudinary";
import { formatDatetime } from "@/lib/utils/datetime";

export type GalleryMediaItem = {
  key: string;
  url: string;
  type?: "image" | "video";
  fileName?: string;
  senderName?: string;
  sentAt?: string;
  thumbnailUrl?: string | null;
};

/** @deprecated Prefer GalleryMediaItem */
export type GalleryImage = GalleryMediaItem;

type MediaGalleryViewerProps = {
  open: boolean;
  images: GalleryMediaItem[];
  initialIndex?: number;
  onClose: () => void;
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

export default function MediaGalleryViewer({
  open,
  images,
  initialIndex = 0,
  onClose,
}: MediaGalleryViewerProps) {
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!open) return;
    setIndex(Math.min(Math.max(initialIndex, 0), Math.max(images.length - 1, 0)));
    setZoom(1);
  }, [open, initialIndex, images.length]);

  const current = images[index];
  const hasMany = images.length > 1;
  const isVideo = (current?.type ?? "image") === "video";

  const goTo = useCallback(
    (next: number) => {
      if (images.length === 0) return;
      const wrapped = (next + images.length) % images.length;
      setIndex(wrapped);
      setZoom(1);
    },
    [images.length],
  );

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        goTo(index - 1);
      }
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        goTo(index + 1);
      }
      if (!isVideo && (event.key === "+" || event.key === "=")) {
        setZoom((value) => Math.min(MAX_ZOOM, value + ZOOM_STEP));
      }
      if (!isVideo && event.key === "-") {
        setZoom((value) => Math.max(MIN_ZOOM, value - ZOOM_STEP));
      }
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose, goTo, index, isVideo]);

  if (!open || !current) return null;

  const mediaUrl = isVideo
    ? current.url
    : getFullQualityImageUrl(
        current.url,
        zoom >= 2 ? 3840 : zoom > 1 ? 3200 : 2560,
      );
  const title =
    current.fileName ||
    current.senderName ||
    `${isVideo ? "Video" : "Ảnh"} ${index + 1}/${images.length}`;

  const handleDownload = async () => {
    try {
      const response = await fetch(mediaUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download =
        current.fileName ||
        (isVideo ? `video-${index + 1}.mp4` : `image-${index + 1}.jpg`);
      anchor.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(mediaUrl, "_blank", "noopener,noreferrer");
    }
  };

  const thumbSrc = (item: GalleryMediaItem) => {
    if (item.thumbnailUrl) return item.thumbnailUrl;
    if ((item.type ?? "image") === "video") return item.url;
    return getThumbnailImageUrl(item.url, 120);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex bg-zinc-950 text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Xem phương tiện"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium sm:text-base">{title}</p>
            {(current.senderName || current.sentAt) && (
              <p className="truncate text-xs text-white/60">
                {[
                  current.senderName,
                  current.sentAt ? formatDatetime(current.sentAt) : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </header>

        <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-3 sm:px-10">
          {hasMany && (
            <button
              type="button"
              onClick={() => goTo(index - 1)}
              className="absolute left-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white/90 transition hover:bg-black/60 sm:left-4"
              aria-label="Trước"
            >
              <ChevronLeft size={22} />
            </button>
          )}

          {isVideo ? (
            <video
              key={current.key}
              src={mediaUrl}
              controls
              autoPlay
              playsInline
              className="max-h-full max-w-full bg-black object-contain"
              poster={current.thumbnailUrl ?? undefined}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={current.key}
              src={mediaUrl}
              alt={current.fileName || title}
              className="max-h-full max-w-full select-none object-contain transition-transform duration-200"
              style={{ transform: `scale(${zoom})` }}
              draggable={false}
            />
          )}

          {hasMany && (
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              className="absolute right-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white/90 transition hover:bg-black/60 sm:right-4"
              aria-label="Sau"
            >
              <ChevronRight size={22} />
            </button>
          )}
        </div>

        <footer className="flex shrink-0 items-center justify-center gap-2 px-4 py-4 sm:gap-3">
          <button
            type="button"
            title="Tải xuống"
            onClick={() => void handleDownload()}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/85 transition hover:bg-white/10"
          >
            <Download size={18} />
          </button>
          {!isVideo && (
            <>
              <button
                type="button"
                title="Phóng to"
                disabled={zoom >= MAX_ZOOM}
                onClick={() =>
                  setZoom((value) => Math.min(MAX_ZOOM, value + ZOOM_STEP))
                }
                className="flex h-10 w-10 items-center justify-center rounded-full text-white/85 transition hover:bg-white/10 disabled:opacity-40"
              >
                <ZoomIn size={18} />
              </button>
              <button
                type="button"
                title="Thu nhỏ"
                disabled={zoom <= MIN_ZOOM}
                onClick={() =>
                  setZoom((value) => Math.max(MIN_ZOOM, value - ZOOM_STEP))
                }
                className="flex h-10 w-10 items-center justify-center rounded-full text-white/85 transition hover:bg-white/10 disabled:opacity-40"
              >
                <ZoomOut size={18} />
              </button>
            </>
          )}
          {hasMany && (
            <span className="ml-2 text-xs tabular-nums text-white/60">
              {index + 1}/{images.length}
            </span>
          )}
        </footer>
      </div>

      {hasMany && (
        <aside className="hidden w-24 shrink-0 flex-col border-l border-white/10 bg-black/40 py-3 md:flex">
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Trước"
          >
            <ChevronUp size={16} />
          </button>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2">
            {images.map((item, imageIndex) => {
              const active = imageIndex === index;
              const itemIsVideo = (item.type ?? "image") === "video";
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    setIndex(imageIndex);
                    setZoom(1);
                  }}
                  className={cn(
                    "relative block w-full overflow-hidden rounded-md border-2 transition",
                    active
                      ? "border-white"
                      : "border-transparent opacity-70 hover:opacity-100",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbSrc(item)}
                    alt=""
                    className="aspect-square w-full object-cover"
                  />
                  {itemIsVideo && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                      <Play size={14} className="fill-white text-white" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => goTo(index + 1)}
            className="mx-auto mt-2 flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Sau"
          >
            <ChevronDown size={16} />
          </button>
        </aside>
      )}
    </div>
  );
}
