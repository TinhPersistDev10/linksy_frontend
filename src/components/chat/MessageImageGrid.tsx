"use client";

import { cn } from "@/lib/utils/cn";
import type { MessageAttachment } from "@/lib/types/message";

type ImageItem = {
  key: string;
  url: string;
  fileName: string;
};

type MessageImageGridProps = {
  images: ImageItem[];
  isOwn?: boolean;
  className?: string;
};

function getAttachmentUrl(attachment: MessageAttachment) {
  return attachment.cdnUrl ?? attachment.fileUrl ?? "";
}

export function collectImageAttachments(
  attachments: MessageAttachment[] | null | undefined,
): ImageItem[] {
  if (!attachments?.length) return [];
  const items: ImageItem[] = [];
  for (const attachment of attachments) {
    const url = getAttachmentUrl(attachment);
    if (!url) continue;
    const type = (
      attachment.attachmentType ??
      attachment.fileType ??
      (attachment.mimeType?.startsWith("image/") ? "image" : "")
    ).toLowerCase();
    if (type !== "image") continue;
    items.push({
      key: attachment.attachmentId ?? url,
      url,
      fileName: attachment.fileName,
    });
  }
  return items;
}

function ImageTile({
  item,
  className,
  overlay,
}: {
  item: ImageItem;
  className?: string;
  overlay?: string;
}) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      title={`Mở ${item.fileName}`}
      aria-label={`Mở ảnh ${item.fileName}`}
      className={cn(
        "relative block overflow-hidden bg-muted/80 outline-none ring-offset-1 focus-visible:ring-2 focus-visible:ring-sky-400",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.url}
        alt={item.fileName}
        className="h-full w-full object-cover transition-transform duration-200 hover:scale-[1.02]"
        loading="lazy"
      />
      {overlay && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-xl font-semibold text-white">
          {overlay}
        </span>
      )}
    </a>
  );
}

/**
 * Messenger-style collage for 1–N images.
 */
export default function MessageImageGrid({
  images,
  isOwn = false,
  className,
}: MessageImageGridProps) {
  if (images.length === 0) return null;

  const count = images.length;
  const shell = cn(
    "overflow-hidden",
    isOwn ? "rounded-2xl rounded-br-md" : "rounded-2xl rounded-bl-md",
    className,
  );

  if (count === 1) {
    return (
      <div className={cn(shell, "max-w-[280px] sm:max-w-[320px]")}>
        <a
          href={images[0].url}
          target="_blank"
          rel="noreferrer"
          title={`Mở ${images[0].fileName}`}
          aria-label={`Mở ảnh ${images[0].fileName}`}
          className="block outline-none ring-offset-1 focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[0].url}
            alt={images[0].fileName}
            className="max-h-[360px] w-full object-cover"
            loading="lazy"
          />
        </a>
      </div>
    );
  }

  if (count === 2) {
    return (
      <div
        className={cn(
          shell,
          "grid w-[min(100%,280px)] grid-cols-2 gap-0.5 sm:w-[300px]",
        )}
      >
        {images.map((item) => (
          <ImageTile
            key={item.key}
            item={item}
            className="aspect-square min-h-0"
          />
        ))}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div
        className={cn(
          shell,
          "grid h-[260px] w-[min(100%,280px)] grid-cols-2 grid-rows-2 gap-0.5 sm:w-[300px]",
        )}
      >
        <ImageTile
          item={images[0]}
          className="row-span-2 min-h-0"
        />
        <ImageTile item={images[1]} className="min-h-0" />
        <ImageTile item={images[2]} className="min-h-0" />
      </div>
    );
  }

  if (count === 4) {
    return (
      <div
        className={cn(
          shell,
          "grid w-[min(100%,280px)] grid-cols-2 gap-0.5 sm:w-[300px]",
        )}
      >
        {images.map((item) => (
          <ImageTile
            key={item.key}
            item={item}
            className="aspect-square min-h-0"
          />
        ))}
      </div>
    );
  }

  // 5+: show first 4 in 2x2 with +N on the last cell
  const visible = images.slice(0, 4);
  const extra = count - 4;

  return (
    <div
      className={cn(
        shell,
        "grid w-[min(100%,280px)] grid-cols-2 gap-0.5 sm:w-[300px]",
      )}
    >
      {visible.map((item, index) => (
        <ImageTile
          key={item.key}
          item={item}
          className="aspect-square min-h-0"
          overlay={index === 3 && extra > 0 ? `+${extra}` : undefined}
        />
      ))}
    </div>
  );
}
