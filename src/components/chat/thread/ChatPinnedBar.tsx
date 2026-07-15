'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pin, X } from 'lucide-react';
import type { Message } from '@/lib/types';
import { chatMessageListPreview } from '@/lib/chat/contact-share';
import { toPersianDigits } from '@/lib/format/digits';
import { cn } from '@/lib/utils';

export function ChatPinnedBar({
  messages,
  onScrollToMessage,
  onUnpin,
  className,
}: {
  messages: Message[];
  onScrollToMessage: (messageId: string) => void;
  /** Unpin the currently shown pin (optional; falls back to first). */
  onUnpin?: (messageId: string) => void;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const count = messages.length;

  useEffect(() => {
    if (count === 0) {
      setIndex(0);
      return;
    }
    setIndex((i) => ((i % count) + count) % count);
  }, [count]);

  const cycle = useCallback(() => {
    if (count === 0) return;
    setIndex((prev) => {
      const safe = ((prev % count) + count) % count;
      const target = messages[safe];
      if (target) onScrollToMessage(target.id);
      return (safe + 1) % count;
    });
  }, [count, messages, onScrollToMessage]);

  if (count === 0) return null;

  const safeIndex = ((index % count) + count) % count;
  const current = messages[safeIndex]!;
  const preview = chatMessageListPreview(current.content, current.type);

  return (
    <div
      className={cn(
        'flex h-[52px] shrink-0 items-center gap-2 border-b border-border/60 bg-background/95 px-3 text-sm backdrop-blur-sm',
        className
      )}
      dir="rtl"
    >
      <button
        type="button"
        onClick={cycle}
        className="flex min-w-0 flex-1 items-center gap-2 text-right transition hover:opacity-80"
        aria-label={
          count > 1
            ? `پیام سنجاق‌شده ${safeIndex + 1} از ${count} — برای بعدی لمس کنید`
            : 'رفتن به پیام سنجاق‌شده'
        }
      >
        <Pin
          className="size-4 shrink-0 rotate-45 text-emerald-600 dark:text-emerald-400"
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            پیام‌های سنجاق‌شده ({toPersianDigits(String(count))} تا)
          </p>
          <p className="truncate text-xs text-muted-foreground">{preview}</p>
        </div>
      </button>
      {onUnpin ? (
        <button
          type="button"
          onClick={() => onUnpin(current.id)}
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          aria-label="برداشتن سنجاق"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
