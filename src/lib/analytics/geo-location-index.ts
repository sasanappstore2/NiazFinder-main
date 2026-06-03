import locationData from '@/data/admin-locations.json';
import type { ManagedLocationData } from '@/lib/locations/managed-types';

type LocationIndex = {
  provinceById: Map<string, { id: string; name: string; nameEn: string }>;
  provinceByName: Map<string, string>;
  cityById: Map<string, { id: string; name: string; provinceId: string }>;
  cityByName: Map<string, string>;
};

function normKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ').replace(/‌/g, '');
}

function buildIndex(data: ManagedLocationData): LocationIndex {
  const provinceById = new Map<string, { id: string; name: string; nameEn: string }>();
  const provinceByName = new Map<string, string>();
  const cityById = new Map<string, { id: string; name: string; provinceId: string }>();
  const cityByName = new Map<string, string>();

  for (const country of data.countries) {
    for (const province of country.provinces) {
      provinceById.set(province.id, { id: province.id, name: province.name, nameEn: province.nameEn });
      provinceByName.set(normKey(province.name), province.id);
      provinceByName.set(normKey(province.nameEn), province.id);
      provinceByName.set(normKey(province.id), province.id);

      for (const city of province.cities) {
        cityById.set(city.id, { id: city.id, name: city.name, provinceId: province.id });
        cityByName.set(normKey(city.name), city.id);
        cityByName.set(normKey(city.nameEn ?? ''), city.id);
        cityByName.set(normKey(city.id), city.id);
      }
    }
  }

  return { provinceById, provinceByName, cityById, cityByName };
}

let cached: LocationIndex | null = null;

export function getLocationIndex(): LocationIndex {
  if (!cached) {
    cached = buildIndex(locationData as ManagedLocationData);
  }
  return cached;
}

export function normalizeProvinceSlug(input: string | null | undefined): string | null {
  if (!input) return null;
  const idx = getLocationIndex();
  const key = normKey(input);
  if (idx.provinceById.has(input)) return input;
  return idx.provinceByName.get(key) ?? null;
}

export function normalizeCitySlug(input: string | null | undefined): string | null {
  if (!input) return null;
  const idx = getLocationIndex();
  if (idx.cityById.has(input)) return input;
  const key = normKey(input);
  return idx.cityByName.get(key) ?? null;
}

export function provinceLabel(slug: string | null | undefined): string {
  if (!slug) return '(not set)';
  return getLocationIndex().provinceById.get(slug)?.name ?? slug;
}

export function cityLabel(slug: string | null | undefined): string {
  if (!slug) return '(not set)';
  return getLocationIndex().cityById.get(slug)?.name ?? slug;
}

export function cityProvinceId(citySlug: string): string | null {
  return getLocationIndex().cityById.get(citySlug)?.provinceId ?? null;
}
