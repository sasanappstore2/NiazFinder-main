import { useEffect, useRef, useCallback } from 'react';

const SCROLL_SAVE_DELAY = 300;
const SCROLL_STORAGE_PREFIX = 'nf-scroll-pos';

/**
 * Saves and restores scroll position per view using sessionStorage.
 *
 * @param key - Unique key for the view (e.g. 'social-feed', 'messages', 'profile-123')
 *
 * @example
 * useScrollRestoration('social-feed');
 */
export function useScrollRestoration(key: string): void {
  const hasRestored = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore scroll position on mount or key change
  const restore = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = sessionStorage.getItem(`${SCROLL_STORAGE_PREFIX}:${key}`);
      if (stored) {
        const position = JSON.parse(stored) as number;
        if (typeof position === 'number' && position > 0) {
          window.scrollTo({ top: position, behavior: 'instant' as ScrollBehavior });
        }
      }
    } catch {
      // ignore storage errors
    }
  }, [key]);

  useEffect(() => {
    if (hasRestored.current) return;
    hasRestored.current = true;

    // Small delay to ensure DOM is ready
    const restoreTimer = setTimeout(restore, 50);

    return () => {
      clearTimeout(restoreTimer);
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [key, restore]);

  // Save scroll position on scroll (debounced)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleScroll = () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        try {
          sessionStorage.setItem(
            `${SCROLL_STORAGE_PREFIX}:${key}`,
            JSON.stringify(window.scrollY)
          );
        } catch {
          // ignore storage errors
        }
      }, SCROLL_SAVE_DELAY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [key]);
}
