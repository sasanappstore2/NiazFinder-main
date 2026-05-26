'use client';

import { useMemo } from 'react';
import {
  scopeCityPersianNames,
  scopeIsActive,
  scopeProvinceSlugs,
} from '@/lib/search/location-scope';
import { useLocationScope } from '@/hooks/use-location-scope';

/** Query params for `/api/requests` and `/api/specialists` from active location scope. */
export function useLocationScopeApiParams(): Record<string, string> {
  const scope = useLocationScope();

  return useMemo(() => {
    if (!scopeIsActive(scope)) return {};
    const params: Record<string, string> = {};
    const cities = scopeCityPersianNames(scope);
    const provinces = scopeProvinceSlugs(scope);
    if (cities.length) params.cities = cities.join(',');
    if (provinces.length) params.provinces = provinces.join(',');
    return params;
  }, [scope]);
}
