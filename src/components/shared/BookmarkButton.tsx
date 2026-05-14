'use client';

import { useState, useCallback } from 'react';
import { Heart, Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

interface BookmarkButtonProps {
  itemId: string;
  itemType?: 'request' | 'specialist';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
}

const SIZE_MAP = {
  sm: { icon: 'size-4', ring: 'ring-[1.5px]', padding: 'p-1.5' },
  md: { icon: 'size-5', ring: 'ring-2', padding: 'p-2' },
  lg: { icon: 'size-6', ring: 'ring-2', padding: 'p-2.5' },
};

export function BookmarkButton({
  itemId,
  itemType = 'request',
  size = 'md',
  className,
  showLabel = false,
}: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(false);
  const [animating, setAnimating] = useState(false);
  const sizeConfig = SIZE_MAP[size];

  const toggleBookmark = useCallback(() => {
    setBookmarked((prev) => !prev);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 600);
  }, []);

  return (
    <button
      type="button"
      onClick={toggleBookmark}
      className={cn(
        'relative inline-flex items-center justify-center rounded-full transition-all duration-300',
        sizeConfig.padding,
        sizeConfig.ring,
        bookmarked
          ? 'bg-rose-50 text-rose-500 ring-rose-200/60 dark:bg-rose-950/30 dark:text-rose-400 dark:ring-rose-800/40'
          : 'bg-muted/50 text-muted-foreground/50 ring-transparent hover:bg-muted hover:text-muted-foreground hover:ring-border/50',
        animating && 'scale-125',
        className
      )}
      aria-label={bookmarked ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
      aria-pressed={bookmarked}
    >
      {/* Heart icon */}
      <Heart
        className={cn(
          sizeConfig.icon,
          'transition-all duration-300',
          bookmarked && 'fill-current drop-shadow-[0_1px_3px_rgba(244,63,94,0.3)]',
          animating && 'animate-[heartBeat_0.6s_ease-in-out]'
        )}
      />

      {/* Ripple effect on bookmark */}
      {animating && (
        <span className="absolute inset-0 animate-ping rounded-full bg-rose-400/20" />
      )}

      {/* Label */}
      {showLabel && (
        <span className="ms-1.5 text-xs font-medium">
          {bookmarked ? 'ذخیره شد' : 'ذخیره'}
        </span>
      )}
    </button>
  );
}
