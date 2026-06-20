'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

type DeferMapOptions = {
  /** Fraction of element visible before map init (0?1). */
  threshold?: number;
};

/**
 * Defer WebGL map initialization until the container is sufficiently visible.
 */
export function useDeferMapUntilVisible<T extends HTMLElement>(
  options: DeferMapOptions = {}
): { ref: RefObject<T | null>; mapReady: boolean } {
  const threshold = options.threshold ?? 0.5;
  const ref = useRef<T | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (mapReady) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setMapReady(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
          setMapReady(true);
          observer.disconnect();
        }
      },
      { threshold: [threshold] }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [mapReady, threshold]);

  return { ref, mapReady };
}
