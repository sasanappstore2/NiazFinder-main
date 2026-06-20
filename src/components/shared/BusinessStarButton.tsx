'use client';

import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import { getClientAuthJsonHeaders } from '@/lib/auth/client-auth';
import { formatCountFa } from '@/lib/format/digits';

const MSG_STAR_ERROR = '\u062e\u0637\u0627 \u062f\u0631 \u0633\u062a\u0627\u0631\u0647\u200c\u062f\u0627\u062f\u0646';
const MSG_STARRED = '\u0633\u062a\u0627\u0631\u0647 \u062f\u0627\u062f\u0647 \u0634\u062f';
const MSG_UNSTARRED = '\u0633\u062a\u0627\u0631\u0647 \u0628\u0631\u062f\u0627\u0634\u062a\u0647 \u0634\u062f';
const LABEL_UNSTAR = '\u0628\u0631\u062f\u0627\u0634\u062a\u0646 \u0633\u062a\u0627\u0631\u0647';
const LABEL_STAR = '\u0633\u062a\u0627\u0631\u0647 \u062f\u0627\u062f\u0646 \u0628\u0647 \u06a9\u0633\u0628\u200c\u0648\u06a9\u0627\u0631';
const BTN_STARRED = '\u0633\u062a\u0627\u0631\u0647\u200c\u062f\u0627\u0631';
const BTN_STAR = '\u0633\u062a\u0627\u0631\u0647';

interface BusinessStarButtonProps {
  /** Business owner user id (same as `Business.id`). */
  businessUserId: string;
  initialCount?: number;
  className?: string;
  /** Smaller control for browse cards. */
  size?: 'default' | 'sm' | 'toolbar';
  /** Show count only (e.g. browse cards) ? no toggle. */
  readOnly?: boolean;
}

export function BusinessStarButton({
  businessUserId,
  initialCount = 0,
  className,
  size = 'default',
  readOnly = false,
}: BusinessStarButtonProps) {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);
  const bookmarkedSpecialists = useAppStore((s) => s.bookmarkedSpecialists);
  const applyBookmarkToggle = useAppStore((s) => s.applyBookmarkToggle);

  const starredFromStore = bookmarkedSpecialists.includes(businessUserId);
  const [starCount, setStarCount] = useState(initialCount);
  const [isStarred, setIsStarred] = useState(starredFromStore);
  const [pending, setPending] = useState(false);
  const compact = size === 'sm';
  const toolbar = size === 'toolbar';

  useEffect(() => {
    setIsStarred(starredFromStore);
  }, [starredFromStore]);

  useEffect(() => {
    if (!businessUserId) return;
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(`/api/business/${businessUserId}/stars`, {
          headers: getClientAuthJsonHeaders(),
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { starCount?: number; isStarred?: boolean };
        if (cancelled) return;
        if (typeof data.starCount === 'number') setStarCount(data.starCount);
        if (!readOnly && typeof data.isStarred === 'boolean') setIsStarred(data.isStarred);
      } catch {
        // keep initial / store state
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [businessUserId, readOnly]);

  const toggleStar = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!businessUserId) return;

      if (!isAuthenticated) {
        setAuthModalOpen(true);
        return;
      }

      setPending(true);
      const wasStarred = isStarred;

      try {
        const res = await fetch('/api/bookmarks', {
          method: 'POST',
          headers: getClientAuthJsonHeaders(),
          body: JSON.stringify({ type: 'specialist', id: businessUserId }),
        });
        const data = (await res.json()) as {
          isBookmarked?: boolean;
          starCount?: number;
          message?: string;
          error?: string;
        };

        if (!res.ok) {
          throw new Error(data.error ?? MSG_STAR_ERROR);
        }

        const nextStarred = Boolean(data.isBookmarked);
        setIsStarred(nextStarred);
        if (typeof data.starCount === 'number') {
          setStarCount(data.starCount);
        } else {
          setStarCount((c) => Math.max(0, c + (nextStarred ? 1 : -1)));
        }
        applyBookmarkToggle('specialist', businessUserId, nextStarred);
        toast.success(data.message ?? (nextStarred ? MSG_STARRED : MSG_UNSTARRED));
      } catch (err) {
        setIsStarred(wasStarred);
        toast.error(err instanceof Error ? err.message : MSG_STAR_ERROR);
      } finally {
        setPending(false);
      }
    },
    [businessUserId, isAuthenticated, isStarred, setAuthModalOpen, applyBookmarkToggle]
  );

  if (readOnly) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1 rounded-md border border-border bg-muted/30 font-semibold tabular-nums text-muted-foreground shadow-sm',
          compact ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-sm',
          className
        )}
        aria-label={`${starCount} \u0633\u062a\u0627\u0631\u0647`}
      >
        <Star className={cn('shrink-0 text-amber-500', compact ? 'size-3.5' : 'size-4')} aria-hidden />
        <span>{formatCountFa(starCount)}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex overflow-hidden rounded-md border border-border bg-background shadow-sm',
        compact ? 'text-xs' : 'text-sm',
        toolbar && 'h-11 min-h-11 w-full',
        className
      )}
    >
      <button
        type="button"
        onClick={(e) => void toggleStar(e)}
        disabled={pending}
        className={cn(
          'inline-flex items-center font-medium transition-colors hover:bg-muted/80 disabled:opacity-60',
          toolbar
            ? 'h-11 min-h-11 flex-1 justify-center gap-1.5 px-3'
            : compact
              ? 'gap-1 px-2 py-1'
              : 'gap-1.5 px-3 py-1.5',
          isStarred
            ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
            : 'text-foreground'
        )}
        aria-label={isStarred ? LABEL_UNSTAR : LABEL_STAR}
        aria-pressed={isStarred}
      >
        <Star
          className={cn(
            'shrink-0',
            compact ? 'size-3.5' : 'size-4',
            isStarred && 'fill-amber-400 text-amber-500'
          )}
        />
        {(!compact || toolbar) && <span>{isStarred ? BTN_STARRED : BTN_STAR}</span>}
      </button>
      <span
        className={cn(
          'inline-flex items-center justify-center border-s border-border bg-muted/30 font-semibold tabular-nums text-foreground',
          toolbar
            ? 'min-w-[2.75rem] px-2.5'
            : compact
              ? 'min-w-[1.75rem] px-1.5 py-1'
              : 'min-w-[2.5rem] px-2.5 py-1.5'
        )}
        aria-hidden
      >
        {formatCountFa(starCount)}
      </span>
    </div>
  );
}
