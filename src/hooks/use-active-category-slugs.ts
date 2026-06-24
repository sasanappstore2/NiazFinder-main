'use client';

import { useEffect, useMemo, useState } from 'react';

let cachedSlugs: Set<string> | null = null;
let cachePromise: Promise<Set<string>> | null = null;
const DEFAULT_SLUGS = new Set(['real-estate']);

async function fetchActiveSlugs(force = false): Promise<Set<string>> {
  if (!force && cachedSlugs) return cachedSlugs;
  if (!force && cachePromise) return cachePromise;
  cachePromise = fetch('/api/categories/active-slugs')
    .then((r) => r.json())
    .then((data: { slugs?: string[] }) => {
      const set = new Set(data.slugs ?? [...DEFAULT_SLUGS]);
      cachedSlugs = set;
      return set;
    })
    .catch(() => new Set(DEFAULT_SLUGS))
    .finally(() => {
      cachePromise = null;
    });
  return cachePromise;
}

/** Clear module cache so next fetch hits the API (e.g. after admin status change). */
export function invalidateActiveCategorySlugsCache(): void {
  cachedSlugs = null;
  cachePromise = null;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('active-category-slugs-invalidate'));
  }
}

export function useActiveCategorySlugs() {
  const [slugs, setSlugs] = useState<Set<string>>(cachedSlugs ?? DEFAULT_SLUGS);

  useEffect(() => {
    void fetchActiveSlugs().then(setSlugs);

    const onInvalidate = () => {
      void fetchActiveSlugs(true).then(setSlugs);
    };
    window.addEventListener('active-category-slugs-invalidate', onInvalidate);
    return () => window.removeEventListener('active-category-slugs-invalidate', onInvalidate);
  }, []);

  return useMemo(() => slugs, [slugs]);
}
