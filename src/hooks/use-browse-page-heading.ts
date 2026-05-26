'use client';

import { useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { buildBrowsePageTitlesFromPath } from '@/lib/browse/page-heading';
import { SITE_NAME } from '@/lib/seo';
import type { BrowseListingType } from '@/lib/search/browse-entry-url';

export function useBrowsePageHeading(listingType: BrowseListingType) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useMemo(
    () => buildBrowsePageTitlesFromPath(pathname, searchParams, SITE_NAME, listingType),
    [pathname, searchParams, listingType]
  );
}
