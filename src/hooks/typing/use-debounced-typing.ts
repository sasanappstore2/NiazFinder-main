import { useDebouncedCallback } from '@/hooks/use-debounce';

/** Debounced typing callback (default 400ms per spec). */
export function useDebouncedTyping<T extends (...args: never[]) => void>(
  callback: T,
  delay = 400
): T {
  return useDebouncedCallback(callback, delay);
}
