'use client';

import { useEffect, useRef } from 'react';
import { CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const AUTO_DOWNLOAD_KEY_PREFIX = 'nf-chat-img-dl:';

function filenameFromUrl(url: string): string {
  try {
    const base = url.split('/').pop() || 'image';
    return base.includes('.') ? base : `${base}.jpg`;
  } catch {
    return 'chat-image.jpg';
  }
}

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
  const didAutoDownload = useRef(false);

  useEffect(() => {
    if (isOwn || didAutoDownload.current) return;
    const key = AUTO_DOWNLOAD_KEY_PREFIX + url;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(key)) return;

    didAutoDownload.current = true;

    const run = async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = filenameFromUrl(url);
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);
        sessionStorage.setItem(key, '1');
      } catch {
        // Browser may block programmatic download
      }
    };

    void run();
  }, [url, isOwn]);

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
            <CheckCheck
              className={cn('size-3.5 shrink-0', isRead ? 'text-emerald-300' : 'text-white/50')}
              aria-hidden
            />
          )}
        </span>
      </div>
    </button>
  );
}
