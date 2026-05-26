'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { City } from '@/lib/location-system';
import { cookieManager } from '@/lib/cookie-manager';
import {
  buildUrlFromCitySelection,
  citiesFromUrl,
} from '@/lib/search/apply-location';
import { COUNTRY_SLUG } from '@/config/locations';
import { useAutoLocationCity } from '@/hooks/use-auto-location-city';
import { locationCityIdToSlug } from '@/lib/search/city-slugs';

function shouldRedirectAfterAutoDetect(pathname: string, preservePathOnHome: boolean): boolean {
  if (preservePathOnHome && pathname === '/') return false;
  if (pathname === '/') return true;
  if (pathname === `/s/${COUNTRY_SLUG}` || pathname === '/s/iran') return true;
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

  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedCities, setSelectedCities] = React.useState<City[]>([]);
  const [isInitialized, setIsInitialized] = React.useState(false);

  const urlCities = React.useMemo(
    () => citiesFromUrl(pathname, searchParams),
    [pathname, searchParams]
  );

  const skipGeoAuto =
    urlCities.length > 0 || cookieManager.hasSavedLocation();

  const applySelection = React.useCallback(
    (cities: City[], opts?: { silent?: boolean; fromGeo?: boolean }) => {
      setSelectedCities(cities);
      cookieManager.updateLocation(cities);

      const stayOnHome = preservePathOnHome && pathname === '/';
      if (!stayOnHome) {
        const url = buildUrlFromCitySelection(pathname, searchParams, cities);
        router.push(url);
      }

      if (!opts?.silent && cities.length > 0) {
        toast({
          title: opts?.fromGeo ? 'شهر شما' : 'انتخاب مکان',
          description:
            cities.length === 1
              ? `${cities[0].name} انتخاب شد`
              : `${cities.length} شهر انتخاب شد`,
        });
      }
    },
    [pathname, searchParams, router, toast, preservePathOnHome]
  );

  const handleSelectionChange = React.useCallback(
    (cities: City[]) => {
      applySelection(cities);
    },
    [applySelection]
  );

  const handleGeoDetected = React.useCallback(
    (city: City) => {
      if (shouldRedirectAfterAutoDetect(pathname, preservePathOnHome)) {
        const slug = locationCityIdToSlug(city.id);
        setSelectedCities([city]);
        cookieManager.updateLocation([city]);
        cookieManager.markGeoDetected(slug);
        router.push(`/s/${slug}`);
        toast({
          title: 'شهر شما',
          description: `${city.name} انتخاب شد`,
        });
        return;
      }
      const slug = locationCityIdToSlug(city.id);
      cookieManager.markGeoDetected(slug);
      applySelection([city], { fromGeo: true });
    },
    [applySelection, pathname, router, toast, preservePathOnHome]
  );

  const geo = useAutoLocationCity({
    skipAuto: skipGeoAuto || !isInitialized,
    onDetected: handleGeoDetected,
  });

  React.useEffect(() => {
    if (urlCities.length > 0) {
      setSelectedCities(urlCities);
      cookieManager.updateLocation(urlCities);
    } else {
      const prefs = cookieManager.getPreferences();
      if (prefs.location.selectedCities.length > 0) {
        setSelectedCities(prefs.location.selectedCities);
      }
    }
    setIsInitialized(true);
  }, [urlCities]);

  const getLocationDisplayText = () => {
    if (selectedCities.length === 0) return 'تمام ایران';
    if (selectedCities.length === 1) return selectedCities[0].name;
    return `${selectedCities.length} شهر`;
  };

  return {
    isOpen,
    setIsOpen,
    selectedCities,
    isInitialized,
    getLocationDisplayText,
    handleSelectionChange,
    geo,
  };
}
