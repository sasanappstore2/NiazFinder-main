'use client';

import { useCallback, useMemo, useState } from 'react';
import { useBrowseFilters } from '@/hooks/use-browse-filters';
import { useCityNeighborhoods } from '@/hooks/use-city-neighborhoods';
import { cookieManager } from '@/lib/cookie-manager';
import { cityFromSlug, locationCityIdToSlug } from '@/lib/search/city-slugs';
import { COUNTRY_SLUG, isCitySlug } from '@/config/locations';
import { parseBrowsePath } from '@/lib/search/browse-path';

/** Active city id when exactly one city is in scope (path or query). */
export function useActiveBrowseCityId(): string | null {
  const { pathname, filters, citySlug } = useBrowseFilters();

  return useMemo(() => {
    if (filters.cities.length === 1) {
      const c = cityFromSlug(filters.cities[0]);
      return c?.id ?? filters.cities[0];
    }
    const ctx = parseBrowsePath(pathname);
    if (ctx.citySlug && ctx.pathLocation !== COUNTRY_SLUG && isCitySlug(ctx.pathLocation)) {
      const c = cityFromSlug(ctx.pathLocation);
      return c?.id ?? ctx.pathLocation;
    }
    if (citySlug) {
      const c = cityFromSlug(citySlug);
      return c?.id ?? citySlug;
    }
    return null;
  }, [pathname, filters.cities, citySlug]);
}

export function useNeighborhoodSelection() {
  const { filters, replaceFilters } = useBrowseFilters();
  const cityId = useActiveBrowseCityId();
  const { neighborhoods, hasNeighborhoods, isLoading } = useCityNeighborhoods(cityId);
  const [open, setOpen] = useState(false);

  const selectedSlugs = filters.neighborhoods;
  const selected = useMemo(
    () => neighborhoods.filter((n) => selectedSlugs.includes(n.id)),
    [neighborhoods, selectedSlugs]
  );

  const showNeighborhoodFilter = Boolean(cityId && hasNeighborhoods);
  const citySlug = cityId ? locationCityIdToSlug(cityId) : null;

  const applySelection = useCallback(
    (slugs: string[]) => {
      replaceFilters({ neighborhoods: slugs });
      if (citySlug) {
        const primary = neighborhoods.find((n) => n.id === slugs[0])?.name ?? null;
        cookieManager.updateNeighborhoodSelection(citySlug, slugs, primary);
      }
      setOpen(false);
    },
    [replaceFilters, citySlug, neighborhoods]
  );

  const clearNeighborhoods = useCallback(() => {
    replaceFilters({ neighborhoods: [] });
    if (citySlug) cookieManager.updateNeighborhoodSelection(citySlug, [], null);
  }, [replaceFilters, citySlug]);

  const pillLabel =
    selected.length === 0
      ? 'انتخاب محله'
      : selected.length === 1
        ? selected[0].name
        : `${selected.length} محله`;

  return {
    open,
    setOpen,
    cityId,
    citySlug,
    neighborhoods,
    selectedSlugs,
    selected,
    showNeighborhoodFilter,
    isLoading,
    pillLabel,
    applySelection,
    clearNeighborhoods,
  };
}
