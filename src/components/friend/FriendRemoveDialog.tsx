'use client';

import { Loader2 } from 'lucide-react';
import type { Friend } from '@/lib/types/chatroom';
import FriendAvatar from './FriendAvatar';

interface FriendRemoveDialogProps {
  friend: Friend;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function FriendRemoveDialog({ friend, loading, onConfirm, onCancel }: FriendRemoveDialogProps) {
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 bg-background border rounded-2xl shadow-2xl p-5 space-y-4">
        <div className="flex flex-col items-center text-center gap-3">
          <FriendAvatar src={friend.avatar} name={friend.fullname} size={14} />
          <div>
            <p className="font-semibold">{friend.fullname}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Bạn có chắc muốn hủy kết bạn với{' '}
              <span className="font-medium text-foreground">{friend.fullname}</span>?
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 h-9 rounded-lg border text-sm font-medium hover:bg-accent transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 h-9 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {loading && <Loader2 size={12} className="animate-spin" />}
            Hủy kết bạn
          </button>
        </div>
      </div>
    </>
  );
}