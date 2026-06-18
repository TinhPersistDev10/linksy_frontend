// src/components/chat/window/MessageInput.tsx
import { Send, Paperclip, Smile } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Textarea } from "../ui/textarea";
import Button from "../ui/Button";
interface MessageInputProps {
  value: string;
  sending: boolean;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
}

export default function MessageInput({
  value,
  sending,
  onChange,
  onKeyDown,
  onSend,
}: MessageInputProps) {
  return (
    <div className="shrink-0 border-t bg-background px-4 py-3">
      <div className="flex items-center gap-2 bg-muted/50 rounded-2xl border px-3 py-2">
        <Button
          variant="ghost"
          size="icon"
          className="p-1 text-muted-foreground hover:text-foreground transition-colors mb-0.5"
        >
          <Paperclip size={18} />
        </Button>

         <Textarea
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder="Nhắn tin..."
          rows={1}
          className={cn(
            "flex-1 min-h-0 bg-transparent text-sm resize-none border-0 shadow-none",
            "focus-visible:ring-0 focus-visible:ring-offset-0",
            "max-h-32 py-0.5 placeholder:text-muted-foreground",
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          )}
        />

        {/* Emoji */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground mb-0.5"
        >
          <Smile size={18} />
        </Button>

        {/* Gửi */}
        <Button
          onClick={onSend}
          disabled={!value.trim() || sending}
          size="icon"
          className={cn(
            "h-7 w-7 shrink-0 rounded-xl mb-0.5 transition-all",
            value.trim()
              ? "bg-blue-500 hover:bg-blue-600 text-white"
              : "bg-transparent text-muted-foreground hover:bg-transparent",
          )}
        >
          <Send size={16} />
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-1.5">
        Enter để gửi · Shift+Enter xuống dòng
      </p>
    </div>
  );
}
