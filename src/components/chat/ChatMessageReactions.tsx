'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { Message, MessageReactionItem } from '@/lib/types';
import {
  aggregateReactionCounts,
  CHAT_REACTION_EMOJIS,
  REACTION_DISLIKE,
  REACTION_LIKE,
  REACTION_LOVE,
} from '@/lib/chat/reactions';
import { toPersianDigits } from '@/lib/format/digits';

interface ChatMessageReactionsProps {
  reactions: MessageReactionItem[];
  currentUserId?: string;
  onReact: (emoji: string) => void;
  className?: string;
  pillClassName?: string;
}

export function ChatMessageReactions({
  reactions,
  currentUserId,
  onReact,
  className,
  pillClassName,
}: ChatMessageReactionsProps) {
  const counts = useMemo(() => aggregateReactionCounts(reactions), [reactions]);
  if (counts.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {counts.map(({ emoji, count }) => {
        const mine = reactions.some(
          (r) => r.userId === currentUserId && r.emoji === emoji
        );
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onReact(emoji)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
              'border backdrop-blur-sm transition-colors',
              pillClassName,
              mine
                ? 'border-primary/35 bg-primary/20 text-primary'
                : 'border-border/50 bg-card/90 text-muted-foreground hover:bg-muted'
            )}
          >
            <span>{emoji}</span>
            <span>{toPersianDigits(String(count))}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ChatReactionPicker({
  onPick,
  className,
}: {
  onPick: (emoji: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {CHAT_REACTION_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onPick(emoji)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-xl hover:bg-muted/80"
          aria-label={
            emoji === REACTION_LIKE
              ? 'لایک'
              : emoji === REACTION_DISLIKE
                ? 'دیسلایک'
                : 'لاو'
          }
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
