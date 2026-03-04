"use client";
import { Users, RefreshCw } from "lucide-react";
interface FriendsEmptyStateProps {
  type: "empty" | "no-result" | "error";
  searchQuery?: string;
  errorMessage?: string;
  onRetry?: () => void;
}
export default function FriendsEmptyState({ type, searchQuery, errorMessage, onRetry }: FriendsEmptyStateProps) {
  if (type === "error") return (
    <div className="flex flex-col items-center justify-center py-10 gap-3 text-center px-4">
      <p className="text-sm text-red-500">{errorMessage}</p>
      {onRetry && <button onClick={onRetry} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"><RefreshCw size={12} /> Thử lại</button>}
    </div>
  );
  if (type === "no-result") return (
    <div className="flex flex-col items-center justify-center py-10 gap-2 text-center px-4">
      <p className="text-xs text-muted-foreground">Không tìm thấy &quot;{searchQuery}&quot;</p>
    </div>
  );
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-center px-4">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center"><Users size={22} className="text-muted-foreground/50" /></div>
      <div>
        <p className="text-sm font-medium">Chưa có bạn bè nào</p>
        <p className="text-xs text-muted-foreground mt-1">Dùng nút ✏️ phía trên để tìm và kết bạn</p>
      </div>
    </div>
  );
}