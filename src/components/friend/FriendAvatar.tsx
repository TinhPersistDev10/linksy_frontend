'use client';

import { cn } from '@/lib/utils/cn';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5253';

interface FriendAvatarProps {
  src?: string;
  name: string;
  size?: number;
  isOnline?: boolean;
}

export default function FriendAvatar({ src, name, size = 9, isOnline }: FriendAvatarProps) {
  const initials = name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  const avatarSrc = src ? (src.startsWith('http') ? src : `${BASE_URL}${src}`) : undefined;

  return (
    <div className="relative shrink-0">
      <div className={cn(
        'rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center overflow-hidden',
        `w-${size} h-${size}`
      )}>
        {avatarSrc
          ? <img src={avatarSrc} alt={name} className="w-full h-full object-cover"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          : <span className="text-xs font-semibold text-white">{initials}</span>
        }
      </div>
      {isOnline !== undefined && (
        <span className={cn(
          'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background',
          isOnline ? 'bg-green-500' : 'bg-gray-300'
        )} />
      )}
    </div>
  );
}