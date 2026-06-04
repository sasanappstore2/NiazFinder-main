'use client';

import { useState, useCallback } from 'react';
import type { MouseEvent } from 'react';
import { Bookmark } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { getClientAuthJsonHeaders } from '@/lib/auth/client-auth';

interface BookmarkButtonProps {
  itemId?: string;
  itemType?: 'request' | 'specialist';
  /** @deprecated Use itemId */
  id?: string;
  /** @deprecated Use itemType */
  type?: 'request' | 'specialist';
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
  itemId: itemIdProp,
  itemType: itemTypeProp = 'request',
  id,
  type,
  size = 'md',
  className,
  showLabel = false,
}: BookmarkButtonProps) {
  const itemId = itemIdProp ?? id ?? '';
  const itemType = itemTypeProp ?? type ?? 'request';
  const sizeConfig = SIZE_MAP[size];

  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);
  const bookmarkedRequests = useAppStore((s) => s.bookmarkedRequests);
  const bookmarkedSpecialists = useAppStore((s) => s.bookmarkedSpecialists);
  const applyBookmarkToggle = useAppStore((s) => s.applyBookmarkToggle);

  const bookmarked =
    itemType === 'request'
      ? bookmarkedRequests.includes(itemId)
      : bookmarkedSpecialists.includes(itemId);

  const [animating, setAnimating] = useState(false);
  const [pending, setPending] = useState(false);

  const toggleBookmark = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (!itemId) return;

      if (!isAuthenticated) {
        setAuthModalOpen(true);
        return;
      }

      setPending(true);
      setAnimating(true);
      setTimeout(() => setAnimating(false), 600);

      try {
        const res = await fetch('/api/bookmarks', {
          method: 'POST',
          headers: getClientAuthJsonHeaders(),
          body: JSON.stringify({ type: itemType, id: itemId }),
        });
        const data = (await res.json()) as {
          isBookmarked?: boolean;
          message?: string;
          error?: string;
        };

        if (!res.ok) {
          throw new Error(data.error ?? 'خطا در ذخیره علاقه‌مندی');
        }

        applyBookmarkToggle(itemType, itemId, Boolean(data.isBookmarked));
        toast.success(data.message ?? (data.isBookmarked ? 'ذخیره شد' : 'حذف شد'));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'خطا در ذخیره علاقه‌مندی');
      } finally {
        setPending(false);
      }
    },
    [itemId, itemType, isAuthenticated, setAuthModalOpen, applyBookmarkToggle]
  );

  return (
    <button
      type="button"
      onClick={(e) => void toggleBookmark(e)}
      disabled={pending}
      className={cn(
        'relative inline-flex items-center justify-center rounded-full transition-all duration-300',
        sizeConfig.padding,
        sizeConfig.ring,
        bookmarked
          ? 'bg-rose-50 text-rose-600 ring-rose-300/70 shadow-sm dark:bg-rose-950/40 dark:text-rose-400 dark:ring-rose-700/50'
          : 'bg-background text-foreground/80 ring-border/60 shadow-sm hover:bg-accent hover:text-foreground hover:ring-border dark:bg-card dark:text-foreground/85 dark:ring-border/70 dark:hover:bg-accent/80',
        animating && 'scale-125',
        pending && 'opacity-70',
        className
      )}
      aria-label={bookmarked ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
      aria-pressed={bookmarked}
    >
      <Bookmark
        className={cn(
          sizeConfig.icon,
          'transition-all duration-300',
          bookmarked && 'fill-current drop-shadow-[0_1px_3px_rgba(244,63,94,0.3)]',
          animating && 'animate-[heartBeat_0.6s_ease-in-out]'
        )}
      />

      {animating && (
        <span className="absolute inset-0 animate-ping rounded-full bg-rose-400/20" />
      )}

      {showLabel && (
        <span className="ms-1.5 text-xs font-medium">
          {bookmarked ? 'ذخیره شد' : 'ذخیره'}
        </span>
      )}
    </button>
  );
}
