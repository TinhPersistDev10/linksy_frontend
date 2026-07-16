// src/components/chat/window/MessageInput.tsx
import { Paperclip, Send, Smile, X } from "lucide-react";
import type { MessageResponse } from "@/lib/types/message";
import { cn } from "@/lib/utils/cn";
import Button from "../ui/Button";
import { Textarea } from "../ui/textarea";
import { useRef } from "react";

interface MessageInputProps {
  value: string;
  sending: boolean;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  replyTo?: MessageResponse | null;
  editingMessage?: MessageResponse | null;
  onCancelMode?: () => void;

  selectedFiles?: File[];
  onFilesSelected?: (files: File[]) => void;
  onRemoveFile?: (index: number) => void;
  attachmentsDisabled?: boolean;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function MessageInput({
  value,
  sending,
  onChange,
  onKeyDown,
  onSend,
  replyTo,
  editingMessage,
  onCancelMode,
  selectedFiles = [],
  onFilesSelected,
  onRemoveFile,
  attachmentsDisabled = false,
}: MessageInputProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canSend = value.trim().length > 0 || selectedFiles.length > 0;
  const showUnderDevelopment = () => {
    window.alert("Chuc nang hien dang phat trien");
  };

  return (
    <div className="shrink-0 border-t bg-background px-2 py-2 sm:px-4 sm:py-3">
      {(replyTo || editingMessage) && (
        <div className="mb-2 flex items-center justify-between gap-3 rounded-md border bg-muted/50 px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs font-medium">
              {editingMessage
                ? "Chỉnh sửa tin nhắn"
                : `Trả lời ${replyTo?.senderFullname ?? "tin nhắn"}`}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {editingMessage?.messageText ?? replyTo?.messageText}
            </p>
          </div>

          <button
            type="button"
            onClick={onCancelMode}
            title="Hủy"
            aria-label="Hủy thao tác"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {selectedFiles.length > 0 && (
        <div className="mb-2 flex max-h-24 flex-wrap gap-2 overflow-y-auto">
          {selectedFiles.map((file, index) => (
            <div
              key={`${file.name}-${file.size}-${index}`}
              className="flex max-w-full items-center gap-2 rounded-md border bg-muted/50 px-2 py-1 text-xs sm:max-w-64"
            >
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <span className="shrink-0 text-muted-foreground">
                {formatFileSize(file.size)}
              </span>
              <button
                type="button"
                onClick={() => onRemoveFile?.(index)}
                title="Xoa tep"
                aria-label="Xoa tep"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-1.5 rounded-2xl border bg-muted/50 px-2 py-2 sm:items-center sm:gap-2 sm:px-3">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          disabled={attachmentsDisabled}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            onFilesSelected?.(files);
            e.currentTarget.value = "";
          }}
        />
        <Button
          type="button"
          onClick={() => {
            if (!attachmentsDisabled) fileInputRef.current?.click();
          }}
          disabled={attachmentsDisabled}
          variant="ghost"
          size="icon"
          className="mb-0.5 h-8 w-8 shrink-0 p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <Paperclip size={18} />
        </Button>

        <Textarea
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder={editingMessage ? "Chỉnh sửa tin nhắn..." : "Nhắn tin..."}
          rows={1}
          className={cn(
            "min-h-0 min-w-0 flex-1 resize-none border-0 bg-transparent py-0.5 text-sm shadow-none",
            "focus-visible:ring-0 focus-visible:ring-offset-0",
            "max-h-32 placeholder:text-muted-foreground",
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          )}
        />

        <Button
          type="button"
          onClick={showUnderDevelopment}
          variant="ghost"
          size="icon"
          className="mb-0.5 hidden h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground sm:inline-flex"
        >
          <Smile size={18} />
        </Button>

        <Button
          onClick={onSend}
          disabled={!canSend || sending}
          size="icon"
          className={cn(
            "mb-0.5 h-7 w-7 shrink-0 rounded-xl transition-all",
            canSend
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "bg-transparent text-muted-foreground hover:bg-transparent",
          )}
        >
          <Send size={16} />
        </Button>
      </div>

      <p className="mt-1.5 hidden text-center text-[10px] text-muted-foreground sm:block">
        Enter để gửi · Shift+Enter xuống dòng
      </p>
    </div>
  );
}
