// src/components/chat/window/TypingIndicator.tsx
import ChatAvatar from "./ChatAvatar";

interface TypingIndicatorProps {
  avatarSrc?: string;
  username: string;
}

const DOT_DELAYS = ["0ms", "150ms", "300ms"];

export default function TypingIndicator({ avatarSrc, username }: TypingIndicatorProps) {
  return (
    <div className="flex items-end gap-2 mt-3">
      <div className="w-7 h-7 shrink-0">
        <ChatAvatar src={avatarSrc} name={username} size={7} />
      </div>
      <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          {DOT_DELAYS.map((delay) => (
            <span
              key={delay}
              className="w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce"
              style={{ animationDelay: delay }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}