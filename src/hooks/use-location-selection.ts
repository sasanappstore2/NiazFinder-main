'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { City } from '@/lib/location-system';
import { cookieManager } from '@/lib/cookie-manager';
import {
  buildUrlFromLocationScope,
  persistScopeToCookie,
  scopeFromCookie,
  scopeFromUrl,
  scopeIsActive,
  scopeLabel,
  selectionToScope,
  scopeToCookieSelection,
  type LocationSelection,
} from '@/lib/search/location-scope';
import { COUNTRY_SLUG } from '@/config/locations';
import { routeBuilder } from '@/config/routes';
import { isBusinessProfilePath } from '@/lib/search/browse-path';
import { useAutoLocationCity } from '@/hooks/use-auto-location-city';
import { locationCityIdToSlug } from '@/lib/search/city-slugs';
import { useManagedLocations } from '@/lib/use-managed-locations';

function shouldRedirectAfterAutoDetect(pathname: string, preservePathOnHome: boolean): boolean {
  if (preservePathOnHome && pathname === '/') return false;
  if (pathname === '/') return true;
  if (
    pathname === `/n/${COUNTRY_SLUG}` ||
    pathname === '/n/iran' ||
    pathname === `/s/${COUNTRY_SLUG}` ||
    pathname === '/s/iran'
  ) {
    return true;
  }
  return false;
}

export interface UseLocationSelectionOptions {
  /** On `/`, only save city to cookie — do not navigate to /s/{city} */
  preservePathOnHome?: boolean;
}

export function useLocationSelection(options: UseLocationSelectionOptions = {}) {
  const { preservePathOnHome = false } = options;
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { provinces } = useManagedLocations();

  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedCities, setSelectedCities] = React.useState<City[]>([]);
  const [selectedProvinceIds, setSelectedProvinceIds] = React.useState<string[]>([]);
  const [isInitialized, setIsInitialized] = React.useState(false);

  const skipGeoAuto =
    scopeIsActive(scopeFromUrl(pathname, searchParams)) || cookieManager.hasSavedLocation();

  const applySelection = React.useCallback(
    (selection: LocationSelection, opts?: { silent?: boolean; fromGeo?: boolean }) => {
      const scope = selectionToScope(selection);
      setSelectedCities(selection.cities);
      setSelectedProvinceIds(selection.provinceIds);
      persistScopeToCookie(scope);

      const stayOnHome = preservePathOnHome && pathname === '/';
      const onProfilePage = isBusinessProfilePath(pathname);
      if (!stayOnHome && !onProfilePage) {
        const url = buildUrlFromLocationScope(pathname, searchParams, scope);
        const navigate =
          pathname.startsWith('/n/') ||
          pathname.startsWith('/b/') ||
          pathname.startsWith('/s/')
            ? router.replace
            : router.push;
        navigate(url);
      }

      if (!opts?.silent && (selection.cities.length > 0 || selection.provinceIds.length > 0)) {
        toast({
          title: opts?.fromGeo ? 'شهر شما' : 'انتخاب مکان',
          description: scopeLabel(scope),
        });
      } else if (!opts?.silent && selection.cities.length === 0 && selection.provinceIds.length === 0) {
        toast({
          title: 'انتخاب مکان',
          description: 'تمام ایران',
        });
      }
    },
    [pathname, searchParams, router, toast, preservePathOnHome]
  );

  const handleSelectionChange = React.useCallback(
    (selection: LocationSelection) => {
      applySelection(selection);
    },
    [applySelection]
  );

  const handleGeoDetected = React.useCallback(
    (city: City) => {
      if (shouldRedirectAfterAutoDetect(pathname, preservePathOnHome)) {
        const slug = locationCityIdToSlug(city.id);
        const selection = { cities: [city], provinceIds: [] };
        setSelectedCities([city]);
        setSelectedProvinceIds([]);
        persistScopeToCookie(selectionToScope(selection));
        cookieManager.markGeoDetected(slug);
        router.push(routeBuilder.search({ market: 'need', location: slug }));
        toast({
          title: 'شهر شما',
          description: `${city.name} انتخاب شد`,
        });
        return;
      }
      const slug = locationCityIdToSlug(city.id);
      cookieManager.markGeoDetected(slug);
      applySelection({ cities: [city], provinceIds: [] }, { fromGeo: true });
    },
    [applySelection, pathname, router, toast, preservePathOnHome]
  );

  const geo = useAutoLocationCity({
    skipAuto: skipGeoAuto || !isInitialized,
    onDetected: handleGeoDetected,
  });

  React.useEffect(() => {
    const urlScope = scopeFromUrl(pathname, searchParams);
    if (scopeIsActive(urlScope)) {
      const sel = scopeToCookieSelection(urlScope);
      setSelectedCities(sel.cities);
      setSelectedProvinceIds(sel.provinceIds);
      persistScopeToCookie(urlScope);
    } else {
      const cookieScope = scopeFromCookie();
      const sel = scopeToCookieSelection(cookieScope);
      setSelectedCities(sel.cities);
      setSelectedProvinceIds(sel.provinceIds);
    }
    setIsInitialized(true);
  }, [pathname, searchParams]);

  const getLocationDisplayText = () => {
    return scopeLabel(
      selectionToScope({ cities: selectedCities, provinceIds: selectedProvinceIds })
    );
  };

  return {
    isOpen,
    setIsOpen,
    selectedCities,
    selectedProvinceIds,
    provinces,
    isInitialized,
    getLocationDisplayText,
    handleSelectionChange,
    geo,
  };
}
