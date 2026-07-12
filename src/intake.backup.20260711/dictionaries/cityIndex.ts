import type { CityIndexEntry } from '@/intake/types';
import { getIranCities, getIranProvinces } from '@/lib/location-system';
import { locationCityIdToSlug } from '@/lib/search/city-slugs';
import { normalizeLookupKey } from '@/intake/normalizer/normalizePersian';

export interface CityIndexBuild {
  cities: Map<string, CityIndexEntry>;
  cityLookup: Map<string, string>;
}

export function buildCityIndex(): CityIndexBuild {
  const cities = new Map<string, CityIndexEntry>();
  const cityLookup = new Map<string, string>();

  const provinceByCityId = new Map<string, string>();
  for (const province of getIranProvinces()) {
    for (const city of province.cities) {
      provinceByCityId.set(city.id, province.name);
    }
  }

  for (const city of getIranCities()) {
    const slug = locationCityIdToSlug(city.id);
    const entry: CityIndexEntry = {
      id: city.id,
      slug,
      name: city.name,
      provinceName: provinceByCityId.get(city.id) ?? '',
    };
    cities.set(city.id, entry);

    const nameKey = normalizeLookupKey(city.name);
    if (nameKey) cityLookup.set(nameKey, city.id);

    const slugKey = normalizeLookupKey(slug);
    if (slugKey && slugKey !== nameKey) cityLookup.set(slugKey, city.id);

    if (city.nameEn) {
      const enKey = normalizeLookupKey(city.nameEn);
      if (enKey) cityLookup.set(enKey, city.id);
    }
  }

  return { cities, cityLookup };
}
