'use client';

import React, {
  useRef,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';

interface InfiniteScrollListProps {
  /** Currently loaded items */
  children: ReactNode;
  /** Whether more items are available */
  hasMore: boolean;
  /** Whether currently loading */
  isLoading: boolean;
  /** Error state */
  error?: string | null;
  /** Callback to load more items */
  onLoadMore: () => void;
  /** Loading indicator to show at bottom */
  loadingIndicator?: ReactNode;
  /** Error component */
  errorComponent?: ReactNode;
  /** Debounce time for scroll handler (ms) */
  debounceMs?: number;
  /** Intersection observer threshold */
  threshold?: number;
  /** Additional class for the container */
  className?: string;
}

/**
 * Infinite scroll with streaming support.
 * Uses IntersectionObserver for efficient scroll detection.
 */
export function InfiniteScrollList({
  children,
  hasMore,
  isLoading,
  error,
  onLoadMore,
  loadingIndicator,
  errorComponent,
  debounceMs = 200,
  threshold = 0.1,
  className,
}: InfiniteScrollListProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTriggerTime = useRef<number>(0);
  const [isVisible, setIsVisible] = useState(false);

  // Set up IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
        });
      },
      {
        threshold,
        rootMargin: '200px',
      }
    );

    observerRef.current.observe(sentinelRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [threshold]);

  // Debounced load more handler
  const handleLoadMore = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const now = Date.now();
      // Prevent rapid successive calls (minimum 500ms between triggers)
      if (now - lastTriggerTime.current > 500) {
        lastTriggerTime.current = now;
        onLoadMore();
      }
    }, debounceMs);
  }, [onLoadMore, debounceMs]);

  // Trigger load when sentinel becomes visible
  useEffect(() => {
    if (isVisible && hasMore && !isLoading && !error) {
      handleLoadMore();
    }
  }, [isVisible, hasMore, isLoading, error, handleLoadMore]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className={className}>
      {/* Content */}
      {children}

      {/* Sentinel element for IntersectionObserver */}
      {(hasMore || isLoading) && (
        <div ref={sentinelRef} className="h-1 w-full" />
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          {loadingIndicator ?? <DefaultLoadingIndicator />}
        </div>
      )}

      {/* Error recovery */}
      {error && !isLoading && (
        <div className="flex items-center justify-center py-6">
          {errorComponent ?? (
            <DefaultErrorComponent
              onRetry={() => {
                lastTriggerTime.current = 0;
                onLoadMore();
              }}
            />
          )}
        </div>
      )}

      {/* End of list indicator */}
      {!hasMore && !isLoading && !error && (
        <div className="flex items-center justify-center py-8">
          <div className="h-px w-32 bg-border" />
        </div>
      )}
    </div>
  );
}

/** Default loading spinner */
function DefaultLoadingIndicator() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <div className="size-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      <span>در حال بارگذاری...</span>
    </div>
  );
}

/** Default error component with retry button */
function DefaultErrorComponent({
  onRetry,
}: {
  onRetry: () => void;
}) {
  return (
    <div className="text-center space-y-2">
      <p className="text-sm text-destructive">خطا در بارگذاری داده‌ها</p>
      <button
        onClick={onRetry}
        className="text-sm text-primary hover:underline px-3 py-1 rounded-md hover:bg-primary/5 transition-colors"
      >
        تلاش مجدد
      </button>
    </div>
  );
}
