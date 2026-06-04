'use client';

import { Pin, X } from 'lucide-react';
import type { Message } from '@/lib/types';
import { chatMessageListPreview } from '@/lib/chat/contact-share';
import { cn } from '@/lib/utils';

export function ChatPinnedBar({
  message,
  onScrollToMessage,
  onUnpin,
  className,
}: {
  message: Message;
  onScrollToMessage: (messageId: string) => void;
  onUnpin: () => void;
  className?: string;
}) {
  const preview = chatMessageListPreview(message.content, message.type);

  return (
    <div
      className={cn(
        'flex items-center gap-2 border-b border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm',
        className
      )}
      dir="rtl"
    >
      <button
        type="button"
        onClick={() => onScrollToMessage(message.id)}
        className="flex min-w-0 flex-1 items-center gap-2 text-right transition hover:opacity-80"
        aria-label="رفتن به پیام سنجاق‌شده"
      >
        <Pin className="size-4 shrink-0 rotate-45 text-emerald-600 dark:text-emerald-400" aria-hidden />
        <span className="truncate text-muted-foreground">{preview}</span>
      </button>
      <button
        type="button"
        onClick={onUnpin}
        className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
        aria-label="برداشتن سنجاق"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
