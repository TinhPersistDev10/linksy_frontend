"use client";
export default function FriendsSkeleton() {
  return (
    <div className="space-y-1 px-1 py-2">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex items-center gap-2.5 px-2 py-2 animate-pulse">
          <div className="w-9 h-9 rounded-full bg-muted shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-muted rounded w-3/5" />
            <div className="h-2.5 bg-muted rounded w-2/5" />
          </div>
        </div>
      ))}
    </div>
  );
}