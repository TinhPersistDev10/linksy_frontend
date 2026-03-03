'use client';

import { useState, useEffect } from 'react';
import { Search, X, MessageCircle } from 'lucide-react';
import { friendsApi } from '@/lib/api/friends';
import { chatroomsApi } from '@/lib/api/chatrooms';
import type { Friend, Chatroom } from '@/lib/types/chatroom';
import { cn } from '@/lib/utils';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5253';

interface CreateNewChatProps {
  open: boolean;
  onClose: () => void;
  onChatCreated: (chatroom: Chatroom) => void;
}

function Avatar({ src, name, size = 10 }: { src?: string; name: string; size?: number }) {
  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const avatarSrc = src ? (src.startsWith('http') ? src : `${BASE_URL}${src}`) : undefined;
  return (
    <div className={cn(
      'rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shrink-0 overflow-hidden',
      `w-${size} h-${size}`
    )}>
      {avatarSrc ? (
        <img src={avatarSrc} alt={name} className="w-full h-full object-cover"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      ) : (
        <span className={cn('font-semibold text-white', size <= 8 ? 'text-xs' : 'text-sm')}>{initials}</span>
      )}
    </div>
  );
}

export default function CreateNewChat({ open, onClose, onChatCreated }: CreateNewChatProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [filtered, setFiltered] = useState<Friend[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setError('');
    loadFriends();
  }, [open]);

  useEffect(() => {
    const q = query.toLowerCase().trim();
    setFiltered(q ? friends.filter(f =>
      f.fullname.toLowerCase().includes(q) || f.username.toLowerCase().includes(q)
    ) : friends);
  }, [query, friends]);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const data = await friendsApi.getFriends();
      setFriends(data);
      setFiltered(data);
    } catch {
      setError('Không thể tải danh sách bạn bè');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFriend = async (friend: Friend) => {
    setCreatingId(friend.userId);
    setError('');
    try {
      const chatroom = await chatroomsApi.createDirect(friend.userId);
      onChatCreated(chatroom);
      onClose();
    } catch {
      setError('Không thể tạo cuộc trò chuyện');
    } finally {
      setCreatingId(null);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
        w-full max-w-md bg-background border rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <MessageCircle size={16} className="text-blue-500" />
            </div>
            <h2 className="font-semibold text-base">Tin nhắn mới</h2>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-4 pb-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Tìm bạn bè..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 h-10 rounded-lg border bg-muted/30 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all"
              autoFocus
            />
          </div>
        </div>

        {error && (
          <div className="mx-4 mb-2 p-2.5 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg">
            {error}
          </div>
        )}

        {/* List */}
        <div className="p-4 pt-2 min-h-[200px] max-h-[400px] overflow-y-auto space-y-1">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              {query ? 'Không tìm thấy bạn bè nào' : 'Chưa có bạn bè nào'}
            </div>
          ) : filtered.map(friend => (
            <button
              key={friend.userId}
              onClick={() => handleSelectFriend(friend)}
              disabled={!!creatingId}
              className="w-full flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-accent/30 transition-colors disabled:opacity-50 text-left"
            >
              <Avatar src={friend.avatar} name={friend.fullname} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{friend.fullname}</p>
                <p className="text-xs text-muted-foreground truncate">@{friend.username}</p>
              </div>
              {creatingId === friend.userId && (
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}