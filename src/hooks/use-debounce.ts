import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Debounces a value by the specified delay.
 *
 * @example
 * const debouncedSearch = useDebounce(searchQuery, 400);
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Returns a memoized debounced version of a callback.
 * The callback reference stays stable across renders.
 *
 * @example
 * const debouncedSearch = useDebouncedCallback(
 *   (query: string) => console.log('Searching:', query),
 *   400
 * );
 */
export function useDebouncedCallback<T extends (...args: never[]) => void>(
  callback: T,
  delay: number = 300
): T {
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep callback ref up to date without triggering re-renders
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const debouncedFn = useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  ) as T;

  return debouncedFn;
}
