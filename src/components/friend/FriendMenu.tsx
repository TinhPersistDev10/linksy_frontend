'use client';

import { useState } from 'react';
import { MoreHorizontal, MessageCircle, UserMinus } from 'lucide-react';
import type { Friend } from '@/lib/types/chatroom';

interface FriendMenuProps {
  friend: Friend;
  onMessage: () => void;
  onRemove: () => void;
}

export default function FriendMenu({ friend, onMessage, onRemove }: FriendMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent opacity-0 group-hover:opacity-100 transition-all"
      >
        <MoreHorizontal size={14} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 z-20 w-44 bg-popover border rounded-xl shadow-lg overflow-hidden py-1">
            <button
              onClick={() => { setOpen(false); onMessage(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
            >
              <MessageCircle size={14} className="text-blue-500" />
              Nhắn tin
            </button>
            <div className="h-px bg-border mx-2 my-1" />
            <button
              onClick={() => { setOpen(false); onRemove(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-red-50 hover:text-red-600 transition-colors text-left text-muted-foreground"
            >
              <UserMinus size={14} />
              Hủy kết bạn
            </button>
          </div>
        </>
      )}
    </div>
  );
}