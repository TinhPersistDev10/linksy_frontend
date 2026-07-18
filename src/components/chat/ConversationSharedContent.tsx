"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ExternalLink,
  FileIcon,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { messagesApi } from "@/lib/api/messages";
import type { MessageAttachment, MessageResponse } from "@/lib/types/message";
import { splitTextWithLinks } from "@/lib/utils/linkify";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type SharedTab = "media" | "files" | "links";

type SharedMediaItem = {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  type: "image" | "video";
  fileName: string;
  durationMs?: number | null;
  sentAt: string;
};

type SharedFileItem = {
  id: string;
  url: string;
  fileName: string;
  fileSize: number;
  sentAt: string;
};

type SharedLinkItem = {
  id: string;
  href: string;
  label: string;
  sentAt: string;
  senderName: string;
};

function getAttachmentUrl(attachment: MessageAttachment) {
  return attachment.cdnUrl ?? attachment.fileUrl ?? "";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(ms?: number | null) {
  if (!ms || ms <= 0) return null;
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function monthLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long" });
}

type ConversationSharedContentProps = {
  chatroomId: string;
  onBack: () => void;
};

export default function ConversationSharedContent({
  chatroomId,
  onBack,
}: ConversationSharedContentProps) {
  const [tab, setTab] = useState<SharedTab>("media");
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [pendingLink, setPendingLink] = useState<{
    href: string;
    label: string;
  } | null>(null);

  const loadShared = useCallback(async () => {
    setLoading(true);
    try {
      const collected: MessageResponse[] = [];
      let beforeMessageId: string | undefined;
      let hasMore = true;
      let guard = 0;

      while (hasMore && guard < 8) {
        const page = await messagesApi.getMessages(
          chatroomId,
          1,
          40,
          beforeMessageId,
        );
        collected.push(...page.messages);
        hasMore = page.hasMore && page.messages.length > 0;
        beforeMessageId = page.messages[0]?.messageId;
        guard += 1;
        if (!hasMore) break;
      }

      setMessages(collected);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [chatroomId]);

  useEffect(() => {
    void loadShared();
  }, [loadShared]);

  const mediaItems = useMemo(() => {
    const items: SharedMediaItem[] = [];
    for (const msg of messages) {
      for (const att of msg.attachments ?? []) {
        const type = (att.attachmentType ?? att.fileType ?? "").toLowerCase();
        const url = getAttachmentUrl(att);
        if (!url) continue;
        if (type === "image" || type === "video") {
          items.push({
            id: `${msg.messageId}-${att.attachmentId ?? att.fileName}`,
            url,
            thumbnailUrl: att.thumbnailUrl,
            type: type === "video" ? "video" : "image",
            fileName: att.fileName,
            durationMs: att.durationMs ?? att.duration,
            sentAt: msg.sentAt,
          });
        }
      }
    }
    return items;
  }, [messages]);

  const fileItems = useMemo(() => {
    const items: SharedFileItem[] = [];
    for (const msg of messages) {
      for (const att of msg.attachments ?? []) {
        const type = (att.attachmentType ?? att.fileType ?? "").toLowerCase();
        const url = getAttachmentUrl(att);
        if (!url) continue;
        if (type !== "image" && type !== "video" && type !== "audio") {
          items.push({
            id: `${msg.messageId}-${att.attachmentId ?? att.fileName}`,
            url,
            fileName: att.fileName,
            fileSize: att.fileSize ?? 0,
            sentAt: msg.sentAt,
          });
        }
      }
    }
    return items;
  }, [messages]);

  const linkItems = useMemo(() => {
    const items: SharedLinkItem[] = [];
    const seen = new Set<string>();
    for (const msg of messages) {
      if (!msg.messageText) continue;
      for (const part of splitTextWithLinks(msg.messageText)) {
        if (part.type !== "link") continue;
        if (seen.has(part.href)) continue;
        seen.add(part.href);
        items.push({
          id: `${msg.messageId}-${part.href}`,
          href: part.href,
          label: part.value,
          sentAt: msg.sentAt,
          senderName: msg.senderFullname || msg.senderUsername,
        });
      }
    }
    return items;
  }, [messages]);

  const mediaGroups = useMemo(() => {
    const map = new Map<string, SharedMediaItem[]>();
    for (const item of mediaItems) {
      const key = monthLabel(item.sentAt);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [mediaItems]);

  const tabs: { id: SharedTab; label: string }[] = [
    { id: "media", label: "Media" },
    { id: "files", label: "Files" },
    { id: "links", label: "Links" },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex shrink-0 items-center gap-2 border-b px-3 py-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full p-1.5 text-foreground hover:bg-muted"
          aria-label="Quay lại"
        >
          <ArrowLeft size={18} />
        </button>
        <h3 className="text-sm font-semibold">Media, files and links</h3>
      </div>

      <div className="flex shrink-0 border-b">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "flex-1 py-2.5 text-sm font-medium transition-colors",
              tab === item.id
                ? "border-b-2 border-sky-500 text-sky-600"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <Loader2 className="animate-spin" size={20} />
          </div>
        ) : tab === "media" ? (
          mediaItems.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Chưa có ảnh hoặc video
            </p>
          ) : (
            <div className="space-y-4 py-3">
              {mediaGroups.map(([month, items]) => (
                <section key={month}>
                  <h4 className="mb-2 px-3 text-sm font-semibold">{month}</h4>
                  <div className="grid grid-cols-3 gap-0.5">
                    {items.map((item) => (
                      <a
                        key={item.id}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative aspect-square overflow-hidden bg-muted"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.thumbnailUrl || item.url}
                          alt={item.fileName}
                          className="h-full w-full object-cover"
                        />
                        {item.type === "video" && (
                          <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 text-[10px] text-white">
                            {formatDuration(item.durationMs) ?? "Video"}
                          </span>
                        )}
                      </a>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )
        ) : tab === "files" ? (
          fileItems.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Chưa có tệp đính kèm
            </p>
          ) : (
            <ul className="divide-y">
              {fileItems.map((item) => (
                <li key={item.id}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-3 hover:bg-muted/60"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <FileIcon size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {item.fileName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatBytes(item.fileSize)}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )
        ) : linkItems.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Chưa có đường dẫn nào
          </p>
        ) : (
          <ul className="divide-y">
            {linkItems.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() =>
                    setPendingLink({ href: item.href, label: item.label })
                  }
                  className="flex w-full items-start gap-3 px-3 py-3 text-left hover:bg-muted/60"
                >
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                    <ExternalLink size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-sky-700">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {item.senderName}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog
        open={Boolean(pendingLink)}
        onOpenChange={(open) => {
          if (!open) setPendingLink(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
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
            <p className="break-all text-sm">{pendingLink?.href}</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPendingLink(null)}>
              Hủy
            </Button>
            <Button
              className="gap-1.5"
              onClick={() => {
                if (!pendingLink) return;
                window.open(pendingLink.href, "_blank", "noopener,noreferrer");
                setPendingLink(null);
              }}
            >
              <ExternalLink className="size-4" />
              Mở liên kết
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
