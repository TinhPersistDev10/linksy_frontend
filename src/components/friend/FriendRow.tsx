
'use client';

import { useState } from 'react';
import { MessageCircle, Loader2 } from 'lucide-react';
import type { Friend } from '@/lib/types/chatroom';
import FriendAvatar from './FriendAvatar';
import FriendMenu from './FriendMenu';

interface FriendRowProps {
  friend: Friend;
  onMessage: (friend: Friend) => void;
  onRemove: (friend: Friend) => void;
  isStartingChat?: boolean;
}

export default function FriendRow({ friend, onMessage, onRemove, isStartingChat }: FriendRowProps) {
  const isOnline = ((friend as unknown) as Record<string, unknown>).isOnline === true;

  return (
    <div className="group flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-sidebar-accent/60 transition-colors">
      <FriendAvatar src={friend.avatar} name={friend.fullname} size={9} isOnline={isOnline} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate leading-tight">{friend.fullname}</p>
        <p className="text-xs text-muted-foreground truncate">@{friend.username}</p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {/* Quick message button */}
        <button
          onClick={() => onMessage(friend)}
          disabled={isStartingChat}
          title="Nhắn tin"
          className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-blue-100 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
        >
          {isStartingChat
            ? <Loader2 size={13} className="animate-spin" />
            : <MessageCircle size={13} />
          }
        </button>

        {/* Dropdown menu */}
        <FriendMenu
          friend={friend}
          onMessage={() => onMessage(friend)}
          onRemove={() => onRemove(friend)}
        />
      </div>
    </div>
  );
}