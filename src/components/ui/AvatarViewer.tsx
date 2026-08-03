"use client";

import { useEffect, useState } from "react";
import { X, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { buildAvatarUrl } from "@/lib/utils/chatFormatters";
import { getFullQualityAvatarUrl } from "@/lib/utils/cloudinary";
import { getApiOrigin } from "@/lib/utils/apiUrl";

const BASE_URL = getApiOrigin();
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

type AvatarViewerProps = {
  open: boolean;
  src?: string | null;
  name: string;
  onClose: () => void;
};

export default function AvatarViewer({
  open,
  src,
  name,
  onClose,
}: AvatarViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(
    null,
  );
  const resolvedSrc = buildAvatarUrl(src ?? undefined, BASE_URL);
  // Request a larger Cloudinary derivative so fullscreen isn't a scaled 200–400px bitmap.
  const avatarSrc = resolvedSrc
    ? resolvedSrc.startsWith("data:") || resolvedSrc.startsWith("blob:")
      ? resolvedSrc
      : getFullQualityAvatarUrl(
          resolvedSrc,
          zoom >= 2 ? 1600 : zoom > 1 ? 1280 : 1024,
        )
    : undefined;
  const initials =
    name
      ?.split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  useEffect(() => {
    if (!open) {
      setZoom(1);
      setNaturalSize(null);
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "+" || event.key === "=") {
        setZoom((value) => Math.min(MAX_ZOOM, value + ZOOM_STEP));
      }
      if (event.key === "-") {
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
  }, [open, onClose]);

  if (!open) return null;

  // Avoid upscaling tiny bitmaps past ~1.5x of their native size (looks soft).
  const maxDisplayPx = naturalSize
    ? Math.min(720, Math.round(Math.max(naturalSize.w, naturalSize.h) * 1.5))
    : 720;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/95"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Ảnh đại diện của ${name}`}
    >
      <header className="flex shrink-0 items-center justify-between px-4 py-3 text-white">
        <div className="w-9" />
        <h2 className="truncate text-center text-sm font-medium sm:text-base">
          {name}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white"
          aria-label="Đóng"
        >
          <X size={20} />
        </button>
      </header>

      <div
        className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-4"
        onClick={(event) => event.stopPropagation()}
      >
        {avatarSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={avatarSrc}
            src={avatarSrc}
            alt={name}
            className="select-none object-contain transition-transform duration-200"
            style={{
              transform: `scale(${zoom})`,
              maxHeight: `min(85vh, ${maxDisplayPx}px)`,
              maxWidth: `min(92vw, ${maxDisplayPx}px)`,
            }}
            draggable={false}
            onLoad={(event) => {
              const img = event.currentTarget;
              setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
            }}
          />
        ) : (
          <div className="flex h-48 w-48 items-center justify-center rounded-full bg-sky-600 text-4xl font-bold text-white sm:h-64 sm:w-64 sm:text-5xl">
            {initials}
          </div>
        )}
      </div>

      <footer
        className="flex shrink-0 items-center justify-center gap-3 px-4 py-5"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          title="Phóng to"
          disabled={zoom >= MAX_ZOOM || !avatarSrc}
          onClick={() =>
            setZoom((value) => Math.min(MAX_ZOOM, value + ZOOM_STEP))
          }
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full text-white/90 transition",
            "hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40",
          )}
        >
          <ZoomIn size={20} />
        </button>
        <button
          type="button"
          title="Thu nhỏ"
          disabled={zoom <= MIN_ZOOM || !avatarSrc}
          onClick={() =>
            setZoom((value) => Math.max(MIN_ZOOM, value - ZOOM_STEP))
          }
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full text-white/90 transition",
            "hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40",
          )}
        >
          <ZoomOut size={20} />
        </button>
      </footer>
    </div>
  );
}
