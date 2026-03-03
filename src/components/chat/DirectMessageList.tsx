'use client';

import { useState, useEffect } from 'react';
import { chatroomsApi } from '@/lib/api/chatrooms';
import type { Chatroom } from '@/lib/types/chatroom';
import { useAuth } from '@/lib/hooks/useAuth';
import { cn } from '@/lib/utils';
import { MessageCircle } from 'lucide-react';

interface DirectMessageListProps {
  onSelectChat: (chatroom: Chatroom) => void;
  selectedChatroomId?: string;
  refreshTrigger?: number;
}

function Avatar({ src, name, size = 8 }: { src?: string; name: string; size?: number }) {
  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5253';
  const avatarSrc = src
    ? src.startsWith('http') ? src : `${BASE_URL}${src}`
    : undefined;

  return (
    <div className={cn(
      'rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center overflow-hidden shrink-0',
      `w-${size} h-${size}`
    )}>
      {avatarSrc ? (
        <img src={avatarSrc} alt={name} className="w-full h-full object-cover"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      ) : (
        <span className="text-xs font-semibold text-white">{initials}</span>
      )}
    </div>
  );
}

function formatTime(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'Hôm qua';
  if (days < 7) return date.toLocaleDateString('vi-VN', { weekday: 'short' });
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

export default function DirectMessageList({
  onSelectChat,
  selectedChatroomId,
  refreshTrigger,
}: DirectMessageListProps) {
  const { user } = useAuth();
  const [chatrooms, setChatrooms] = useState<Chatroom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChatrooms();
  }, [refreshTrigger]);

  const loadChatrooms = async () => {
    try {
      const data = await chatroomsApi.getChatrooms();
      // ✅ Dùng roomType thay vì type
      const direct = data.filter(c => c.roomType === 'direct');
      setChatrooms(direct);
    } catch (e) {
      console.error('Error loading chatrooms:', e);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Lấy thông tin người còn lại trong direct chat
  const getOtherMember = (chatroom: Chatroom) => {
    return chatroom.members?.find(m => m.userId !== user?.userId);
  };

  if (loading) {
    return (
      <div className="space-y-2 px-1">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-2 p-2 rounded-lg animate-pulse">
            <div className="w-8 h-8 rounded-full bg-muted" />
            <div className="flex-1 space-y-1">
              <div className="h-3 bg-muted rounded w-2/3" />
              <div className="h-2 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (chatrooms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-4 gap-2 text-center px-2">
        <MessageCircle size={20} className="text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground">Chưa có tin nhắn nào</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {chatrooms.map(chatroom => {
        const other = getOtherMember(chatroom);
        const isSelected = chatroom.chatroomId === selectedChatroomId;

        // ✅ Dùng roomName thay vì name
        const displayName = other?.fullname || chatroom.roomName || 'Unknown';

        // ✅ Dùng messageText thay vì content, sentAt thay vì createdAt
        const lastMsg = chatroom.lastMessage;
        const lastMsgText = lastMsg?.isDeleted
          ? 'Tin nhắn đã bị xóa'
          : lastMsg?.messageText;

        return (
          <button
            key={chatroom.chatroomId}
            onClick={() => onSelectChat(chatroom)}
            className={cn(
              'w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-left transition-colors',
              isSelected
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'hover:bg-sidebar-accent/60'
            )}
          >
            <Avatar src={other?.avatar} name={displayName} size={8} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className={cn(
                  'text-sm truncate',
                  chatroom.unreadCount > 0 ? 'font-semibold' : 'font-medium'
                )}>
                  {displayName}
                </span>
                {/* ✅ Dùng lastActivityAt thay vì lastMessageAt */}
                {chatroom.lastActivityAt && (
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {formatTime(chatroom.lastActivityAt)}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs text-muted-foreground truncate">
                  {lastMsg
                    ? lastMsg.senderId === user?.userId
                      ? `Bạn: ${lastMsgText}`
                      : lastMsgText
                    : 'Bắt đầu cuộc trò chuyện'}
                </span>
                {chatroom.unreadCount > 0 && (
                  <span className="shrink-0 min-w-4 h-4 px-1 bg-blue-500 text-white text-[10px] font-medium rounded-full flex items-center justify-center">
                    {chatroom.unreadCount > 99 ? '99+' : chatroom.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}