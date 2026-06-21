// src/components/chat/window/MessageInput.tsx
import { Paperclip, Send, Smile, X } from "lucide-react";
import type { MessageResponse } from "@/lib/types/message";
import { cn } from "@/lib/utils/cn";
import Button from "../ui/Button";
import { Textarea } from "../ui/textarea";

interface MessageInputProps {
  value: string;
  sending: boolean;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  replyTo?: MessageResponse | null;
  editingMessage?: MessageResponse | null;
  onCancelMode?: () => void;
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
}: MessageInputProps) {
  const showUnderDevelopment = () => {
    window.alert("Chức năng hiện đang phát triển");
  };

  return (
    <div className="shrink-0 border-t bg-background px-4 py-3">
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

      <div className="flex items-center gap-2 rounded-2xl border bg-muted/50 px-3 py-2">
        <Button
          type="button"
          onClick={showUnderDevelopment}
          variant="ghost"
          size="icon"
          className="mb-0.5 p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <Paperclip size={18} />
        </Button>

        <Textarea
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder={
            editingMessage ? "Chỉnh sửa tin nhắn..." : "Nhắn tin..."
          }
          rows={1}
          className={cn(
            "min-h-0 flex-1 resize-none border-0 bg-transparent py-0.5 text-sm shadow-none",
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
          className="mb-0.5 h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
        >
          <Smile size={18} />
        </Button>

        <Button
          onClick={onSend}
          disabled={!value.trim() || sending}
          size="icon"
          className={cn(
            "mb-0.5 h-7 w-7 shrink-0 rounded-xl transition-all",
            value.trim()
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "bg-transparent text-muted-foreground hover:bg-transparent",
          )}
        >
          <Send size={16} />
        </Button>
      </div>

      <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
        Enter để gửi · Shift+Enter xuống dòng
      </p>
    </div>
  );
}
