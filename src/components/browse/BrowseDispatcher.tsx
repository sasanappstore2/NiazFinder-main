'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useMemo } from 'react';
import { useSyncBrowseCityUrl } from '@/hooks/use-sync-browse-city-url';
import { BrowseRequests } from '@/components/need/BrowseRequests';
import { BrowseSpecialists } from '@/components/business/BrowseSpecialists';
import { parseFilters } from '@/lib/filters/parser';
import { routeBuilder } from '@/config/routes';
import { getCategoryBySlug } from '@/config/categories';
import {
  type BrowseMarket,
  getBrowseMarketFromPathname,
  listingTypeFromMarket,
  marketFromListingType,
} from '@/config/market-routes';

/**
 * Single dispatcher used by every search/browse route.
 *
 * Reads `?type=` and renders the appropriate listing component.
 * The canonical category & city from the path (resolved upstream by
 * `resolveSearchSegments`) are passed in as props.
 */
interface BrowseDispatcherProps {
  /** Explicit market when path prefix is ambiguous (legacy /s/). */
  market?: BrowseMarket;
  /** Category slug from the path (or undefined for browse root). */
  categorySlug?: string;
  /** City slug from the path (or undefined for country-wide /n|b/iran). */
  citySlug?: string;
}

export function BrowseDispatcher(props: BrowseDispatcherProps) {
  return (
    <Suspense fallback={null}>
      <BrowseDispatcherInner {...props} />
    </Suspense>
  );
}

function BrowseDispatcherInner({ market: marketProp, categorySlug, citySlug }: BrowseDispatcherProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useSyncBrowseCityUrl(citySlug);
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const market = useMemo((): BrowseMarket => {
    if (marketProp) return marketProp;
    const fromPath = getBrowseMarketFromPathname(pathname);
    if (fromPath) return fromPath;
    return marketFromListingType(filters.type);
  }, [marketProp, pathname, filters.type]);

  const citySlugs = useMemo(() => {
    const slugs = [...filters.cities];
    if (citySlug && !slugs.includes(citySlug)) {
      slugs.unshift(citySlug);
    }
    return slugs;
  }, [filters.cities, citySlug]);

  const basePath = useMemo(() => {
    const cat = categorySlug ? getCategoryBySlug(categorySlug) : null;
    const path = routeBuilder.search({
      market,
      location: citySlug,
      parentCategory: cat?.parentSlug ?? undefined,
      category: cat?.slug,
    });
    return path.split('?')[0];
  }, [categorySlug, citySlug, market]);

  const sharedProps = {
    basePath,
    categorySlug,
    citySlugs,
    urlFilters: filters,
  };

  const listingType = listingTypeFromMarket(market);
  if (listingType === 'business') return <BrowseSpecialists {...sharedProps} />;
  return <BrowseRequests {...sharedProps} />;
}
