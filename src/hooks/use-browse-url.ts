'use client';

import { useEffect, useState } from 'react';
import {
  getBrowseUrl,
  getBrowseUrlSSR,
  type BrowseUrlOptions,
} from '@/lib/search/browse-entry-url';

/**
 * Cookie-aware browse URL that hydrates without mismatch:
 * first paint uses country scope (same as SSR), then updates after mount.
 */
export function useBrowseUrl(opts: BrowseUrlOptions, refreshKey?: unknown): string {
  const [url, setUrl] = useState(() => getBrowseUrlSSR(opts));

  useEffect(() => {
    setUrl(getBrowseUrl(opts));
  }, [
    opts.type,
    opts.categorySlug,
    opts.parentCategorySlug,
    opts.q,
    opts.citySlug,
    refreshKey,
  ]);

  return url;
}
