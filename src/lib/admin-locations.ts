import { promises as fs } from 'fs';
import path from 'path';
import { countries as defaultCountries } from '@/lib/location-system';

export type {
  ManagedNeighborhood,
  ManagedCity,
  ManagedProvince,
  ManagedCountry,
  ManagedLocationData,
} from '@/lib/locations/managed-types';
import type { ManagedLocationData } from '@/lib/locations/managed-types';

const locationFilePath = path.join(process.cwd(), 'src', 'data', 'admin-locations.json');

export function makeLocationId(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\u0600-\u06FFa-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return normalized || `loc-${Date.now()}`;
}

function uniqueId(base: string, existingIds: Set<string>): string {
  let candidate = base;
  let counter = 2;

  while (existingIds.has(candidate)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }

  return candidate;
}

function collectIds(data: ManagedLocationData): Set<string> {
  const ids = new Set<string>();
  for (const country of data.countries) {
    ids.add(country.id);
    for (const province of country.provinces) {
      ids.add(province.id);
      for (const city of province.cities) {
        ids.add(city.id);
        for (const neighborhood of city.neighborhoods) {
          ids.add(neighborhood.id);
        }
      }
    }
  }
  return ids;
}

export function makeUniqueLocationId(value: string, data: ManagedLocationData): string {
  return uniqueId(makeLocationId(value), collectIds(data));
}

export function createDefaultManagedLocations(): ManagedLocationData {
  return {
    countries: defaultCountries.map((country) => ({
      id: country.id,
      name: country.name,
      nameEn: country.nameEn,
      isActive: true,
      provinces: country.provinces.map((province, provinceIndex) => ({
        id: province.id,
        name: province.name,
        nameEn: province.nameEn,
        isActive: true,
        order: provinceIndex + 1,
        cities: province.cities.map((city, cityIndex) => ({
          ...city,
          isActive: true,
          order: cityIndex + 1,
          neighborhoods: [],
        })),
      })),
    })),
    updatedAt: new Date().toISOString(),
  };
}

let locationDataCache: ManagedLocationData | null = null;
let locationDataCacheAt = 0;
const LOCATION_CACHE_TTL_MS = 60_000;

export async function readManagedLocationData(): Promise<ManagedLocationData> {
  const now = Date.now();
  if (locationDataCache && now - locationDataCacheAt < LOCATION_CACHE_TTL_MS) {
    return locationDataCache;
  }

  try {
    const raw = await fs.readFile(locationFilePath, 'utf8');
    locationDataCache = JSON.parse(raw) as ManagedLocationData;
    locationDataCacheAt = now;
    return locationDataCache;
  } catch {
    const fallback = createDefaultManagedLocations();
    locationDataCache = fallback;
    locationDataCacheAt = now;
    return fallback;
  }
}

export async function writeManagedLocationData(data: ManagedLocationData): Promise<ManagedLocationData> {
  const nextData = {
    ...data,
    updatedAt: new Date().toISOString(),
  };

  await fs.mkdir(path.dirname(locationFilePath), { recursive: true });
  await fs.writeFile(locationFilePath, JSON.stringify(nextData, null, 2), 'utf8');
  locationDataCache = nextData;
  locationDataCacheAt = Date.now();
  return nextData;
}

export async function getLocationStats(data: ManagedLocationData) {
  const provinces = data.countries.flatMap((country) => country.provinces);
  const cities = provinces.flatMap((province) => province.cities);

  let catalogNeighborhoods = 0;
  let catalogActive = 0;
  try {
    const { readManifest } = await import('@/lib/neighborhoods/catalog');
    const manifest = await readManifest();
    catalogNeighborhoods = manifest.totalNeighborhoods;
    catalogActive = manifest.totalNeighborhoods;
  } catch {
    const embedded = cities.flatMap((city) => city.neighborhoods);
    catalogNeighborhoods = embedded.length;
    catalogActive = embedded.filter((n) => n.isActive).length;
  }

  return {
    countries: data.countries.length,
    provinces: provinces.length,
    activeProvinces: provinces.filter((province) => province.isActive).length,
    cities: cities.length,
    activeCities: cities.filter((city) => city.isActive).length,
    neighborhoods: catalogNeighborhoods,
    activeNeighborhoods: catalogActive,
  };
}

function dedupeCitiesById<T extends { id: string }>(cities: T[]): T[] {
  const seen = new Set<string>();
  return cities.filter((city) => {
    if (seen.has(city.id)) return false;
    seen.add(city.id);
    return true;
  });
}

export function getPublicLocationData(
  data: ManagedLocationData,
  neighborhoodCounts: Record<string, number> = {}
): ManagedLocationData {
  return {
    ...data,
    countries: data.countries
      .filter((country) => country.isActive)
      .map((country) => ({
        ...country,
        provinces: country.provinces
          .filter((province) => province.isActive)
          .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'fa'))
          .map((province) => ({
            ...province,
            cities: dedupeCitiesById(
              province.cities
                .filter((city) => city.isActive)
                .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'fa'))
            ).map((city) => {
              const count = neighborhoodCounts[city.id] ?? 0;
              return {
                ...city,
                neighborhoods: [],
                hasNeighborhoods: count > 0,
                neighborhoodCount: count > 0 ? count : undefined,
              };
            }),
          })),
      })),
  };
}

/** Attach catalog neighborhoods for super-admin views. */
export async function enrichWithCatalogNeighborhoods(
  data: ManagedLocationData
): Promise<ManagedLocationData> {
  const { loadCityNeighborhoods } = await import('@/lib/neighborhoods/catalog');
  const next = JSON.parse(JSON.stringify(data)) as ManagedLocationData;

  const cityRefs: { city: (typeof next.countries)[0]['provinces'][0]['cities'][0] }[] = [];
  for (const country of next.countries) {
    for (const province of country.provinces) {
      for (const city of province.cities) {
        cityRefs.push({ city });
      }
    }
  }

  const CONCURRENCY = 8;
  for (let i = 0; i < cityRefs.length; i += CONCURRENCY) {
    const batch = cityRefs.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async ({ city }) => {
        const fromCatalog = await loadCityNeighborhoods(city.id);
        if (fromCatalog.length > 0) {
          city.neighborhoods = fromCatalog;
          city.hasNeighborhoods = true;
          city.neighborhoodCount = fromCatalog.length;
        }
      })
    );
  }

  return next;
}
