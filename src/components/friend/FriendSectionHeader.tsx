'use client';

import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface FriendSectionHeaderProps {
  label: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
}

export default function FriendSectionHeader({ label, count, expanded, onToggle }: FriendSectionHeaderProps) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-1.5 px-1 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wider"
    >
      <ChevronDown size={12} className={cn('transition-transform', !expanded && '-rotate-90')} />
      {label}
      <span className="ml-auto font-normal normal-case tracking-normal">{count}</span>
    </button>
  );
}