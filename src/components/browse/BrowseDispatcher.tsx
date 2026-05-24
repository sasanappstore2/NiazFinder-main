'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo } from 'react';
import { BrowseRequests } from '@/components/need/BrowseRequests';
import { BrowseSpecialists } from '@/components/business/BrowseSpecialists';
import { parseFilters } from '@/lib/filters/parser';
import { routeBuilder } from '@/config/routes';
import { getCategoryBySlug } from '@/config/categories';

/**
 * Single dispatcher used by every search/browse route.
 *
 * Reads `?type=` and renders the appropriate listing component.
 * The canonical category & city from the path (resolved upstream by
 * `resolveSearchSegments`) are passed in as props.
 */
interface BrowseDispatcherProps {
  /** Category slug from the path (or undefined for /s/{loc} root). */
  categorySlug?: string;
  /** City slug from the path (or undefined for country-wide /s/iran). */
  citySlug?: string;
}

export function BrowseDispatcher(props: BrowseDispatcherProps) {
  return (
    <Suspense fallback={null}>
      <BrowseDispatcherInner {...props} />
    </Suspense>
  );
}

function BrowseDispatcherInner({ categorySlug, citySlug }: BrowseDispatcherProps) {
  const searchParams = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

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
      location: citySlug,
      parentCategory: cat?.parentSlug ?? undefined,
      category: cat?.slug,
    });
    return path.split('?')[0];
  }, [categorySlug, citySlug]);

  const sharedProps = {
    basePath,
    categorySlug,
    citySlugs,
    urlFilters: filters,
  };

  if (filters.type === 'need') return <BrowseRequests {...sharedProps} />;
  if (filters.type === 'business') return <BrowseSpecialists {...sharedProps} />;

  return <BrowseSpecialists {...sharedProps} />;
}
