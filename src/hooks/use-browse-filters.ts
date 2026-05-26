'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  parseFilters,
  patchAttributes,
  serializeFilters,
  type BrowseFilters,
  type ListingType,
} from '@/lib/filters/parser';
import { getFiltersForCategory } from '@/config/category-filters/registry';
import {
  browseListingTypeFromPath,
  getCategoryLabelFromPath,
  getFilterRootFromPath,
  parseBrowsePath,
  pathWithoutCategory,
} from '@/lib/search/browse-path';
import { routeBuilder } from '@/config/routes';
import {
  resolveLocationScope,
  scopeIsActive,
  scopeToBrowseFilters,
} from '@/lib/search/location-scope';
import { COUNTRY_SLUG } from '@/config/locations';
import {
  browseFiltersEqual,
  countBrowseFilters,
  sanitizeFiltersForListingType,
} from '@/lib/filters/sanitize-browse-filters';

export function useBrowseFilters() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const pathContext = useMemo(() => parseBrowsePath(pathname), [pathname]);

  const listingType: ListingType = useMemo(
    () => browseListingTypeFromPath(pathname, searchParams),
    [pathname, searchParams]
  );

  const filters = useMemo(
    () => parseFilters(searchParams),
    [searchParams]
  );

  const categoryFilters = useMemo(
    () => getFiltersForCategory(pathContext.categorySlug ?? null, listingType),
    [pathContext.categorySlug, listingType]
  );

  const sanitizedFilters = useMemo(
    () => sanitizeFiltersForListingType(filters, categoryFilters),
    [filters, categoryFilters]
  );

  useEffect(() => {
    if (browseFiltersEqual(filters, sanitizedFilters)) return;
    const qs = serializeFilters(sanitizedFilters).toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [filters, sanitizedFilters, pathname, router]);

  const filterRoot = useMemo(() => getFilterRootFromPath(pathname), [pathname]);
  const categoryLabel = useMemo(() => getCategoryLabelFromPath(pathname), [pathname]);
  const queryFilterCount = useMemo(
    () => countBrowseFilters(sanitizedFilters, categoryFilters),
    [sanitizedFilters, categoryFilters]
  );

  const replaceFilters = useCallback(
    (patch: Partial<BrowseFilters>) => {
      const next: BrowseFilters = sanitizeFiltersForListingType(
        { ...sanitizedFilters, ...patch },
        categoryFilters
      );
      const qs = serializeFilters(next).toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      router.replace(url, { scroll: false });
    },
    [sanitizedFilters, categoryFilters, pathname, router]
  );

  const replaceAttributes = useCallback(
    (patch: Record<string, string | null | undefined>) => {
      replaceFilters(patchAttributes(sanitizedFilters, patch));
    },
    [sanitizedFilters, replaceFilters]
  );

  const clearQueryFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  const clearCategoryFromPath = useCallback(() => {
    const base = pathWithoutCategory(pathname);
    const qs = serializeFilters(sanitizedFilters).toString();
    router.replace(qs ? `${base}?${qs}` : base, { scroll: false });
  }, [sanitizedFilters, pathname, router]);

  const navigateWithCategory = useCallback(
    (categorySlug: string, parentCategorySlug?: string) => {
      const scope = resolveLocationScope(pathname, searchParams);
      const loc =
        scope.mode === 'city'
          ? scope.citySlug
          : pathContext.pathLocation === COUNTRY_SLUG
            ? COUNTRY_SLUG
            : pathContext.pathLocation;
      const mergedFilters = scopeIsActive(scope)
        ? { ...sanitizedFilters, ...scopeToBrowseFilters(scope) }
        : sanitizedFilters;
      const market = listingType === 'business' ? 'business' : 'need';
      const url = routeBuilder.search({
        market,
        location: loc,
        category: categorySlug,
        parentCategory: parentCategorySlug,
        filters: mergedFilters,
      });
      router.push(url);
    },
    [
      sanitizedFilters,
      listingType,
      pathContext.pathLocation,
      pathname,
      router,
      searchParams,
    ]
  );

  return {
    pathname,
    filters: sanitizedFilters,
    listingType,
    filterRoot,
    categoryLabel,
    categorySlug: pathContext.categorySlug,
    parentCategorySlug: pathContext.parentCategorySlug,
    citySlug: pathContext.citySlug,
    queryFilterCount,
    categoryFilters,
    replaceFilters,
    replaceAttributes,
    clearQueryFilters,
    clearCategoryFromPath,
    navigateWithCategory,
  };
}
