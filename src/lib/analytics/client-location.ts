'use client';

import { cookieManager } from '@/lib/cookie-manager';
import { locationCityIdToSlug } from '@/lib/search/city-slugs';
import { provinceIdToSlug } from '@/lib/search/province-slugs';

export function getAnalyticsLocationContext(): {
  userLocation?: { province?: string; city?: string; citySlug?: string };
  selectedCitySlug?: string;
} {
  if (typeof window === 'undefined') return {};

  const prefs = cookieManager.getPreferences();
  const loc = prefs.location;
  const firstCity = loc.selectedCities[0];
  const citySlug = firstCity ? locationCityIdToSlug(firstCity.id) : undefined;
  const provinceSlug = loc.selectedProvinceIds?.[0]
    ? provinceIdToSlug(loc.selectedProvinceIds[0])
    : undefined;

  return {
    selectedCitySlug: citySlug,
    userLocation: {
      province: provinceSlug,
      city: firstCity?.name,
      citySlug,
    },
  };
}
