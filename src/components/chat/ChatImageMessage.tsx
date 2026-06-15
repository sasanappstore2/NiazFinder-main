'use client';

import { cn } from '@/lib/utils';
import { ChatReadReceiptIcon } from '@/components/chat/bubble/ChatReadReceiptIcon';

interface ChatImageMessageProps {
  url: string;
  isOwn: boolean;
  timeLabel: string;
  isRead?: boolean;
  onOpen?: () => void;
}

export function ChatImageMessage({
  url,
  isOwn,
  timeLabel,
  isRead,
  onOpen,
}: ChatImageMessageProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative block w-[min(72vw,260px)] min-w-[200px] cursor-zoom-in overflow-hidden rounded-xl ring-1 ring-black/10 transition-opacity hover:opacity-95 dark:ring-white/10"
      aria-label="بزرگ‌نمایی تصویر"
    >
      <img
        src={url}
        alt=""
        className="block max-h-[min(52vh,360px)] w-full object-contain bg-black/5 dark:bg-black/20"
        loading="lazy"
        decoding="async"
        draggable={false}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end bg-gradient-to-t from-black/55 via-black/25 to-transparent px-2 pb-1.5 pt-6"
        dir="ltr"
      >
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white/95 shadow-sm',
            isOwn && 'bg-black/20'
          )}
        >
          {timeLabel}
          {isOwn && (
            <ChatReadReceiptIcon
              isRead={isRead}
              className={cn(
                'size-3.5 shrink-0',
                isRead ? 'text-emerald-300' : 'text-white/50'
              )}
            />
          )}
        </span>
      </div>
    </button>
  );
}
