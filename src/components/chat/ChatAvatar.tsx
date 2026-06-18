// src/components/chat/window/ChatAvatar.tsx
import { cn } from "@/lib/utils/cn";
import { buildAvatarUrl } from "@/lib/utils/chatFormatters";
import { getApiOrigin } from "@/lib/utils/apiUrl";

const BASE_URL = getApiOrigin();

interface ChatAvatarProps {
  src?: string;
  name: string;
  size?: number;
}

export default function ChatAvatar({ src, name, size = 9 }: ChatAvatarProps) {
  const initials =
    name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
  const avatarSrc = buildAvatarUrl(src, BASE_URL);

  return (
    <div
      className={cn(
        "rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center overflow-hidden shrink-0",
        `w-${size} h-${size}`,
      )}
    >
      {avatarSrc ? (
        <img
          src={avatarSrc}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
        />
      ) : (
        <span className="text-xs font-semibold text-white">{initials}</span>
      )}
    </div>
  );
}
