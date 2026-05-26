'use client';

import { useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { browseListingTypeFromPath } from '@/lib/search/browse-path';
import type { BrowseListingType } from '@/lib/search/browse-entry-url';

export function useBrowseListingType(): BrowseListingType {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return useMemo(
    () => browseListingTypeFromPath(pathname, searchParams),
    [pathname, searchParams]
  );
}
