import { promises as fs } from 'fs';
import path from 'path';
import { readManagedLocationData } from '../../src/lib/admin-locations';
import { locationCityIdToSlug } from '../../src/lib/search/city-slugs';

export const NEIGHBORHOODS_ROOT = path.join(process.cwd(), 'src', 'data', 'neighborhoods');
export const CACHE_DIR = path.join(NEIGHBORHOODS_ROOT, '.cache');
export const REPORTS_DIR = path.join(process.cwd(), 'reports');
export const DIVAR_CITIES_URL = 'https://api.divar.ir/v1/places/cities';
export const DIVAR_DISTRICTS_URL = (cityId: number) =>
  `https://api.divar.ir/v1/places/cities/${cityId}/districts`;

const ID_OVERRIDES: Record<string, string> = {
  'tehran-city': 'tehran',
  'isfahan-city': 'isfahan',
  'shiraz-city': 'shiraz',
  'mashhad-city': 'mashhad',
  'tabriz-city': 'tabriz',
  'ahvaz-city': 'ahvaz',
  'qom-city': 'qom',
  'kerman-city': 'kerman',
  'rasht-city': 'rasht',
  'yazd-city': 'yazd',
};

export interface DivarCity {
  id: number;
  name: string;
  slug: string;
  level?: string;
}

export interface DivarDistrict {
  id: number;
  name: string;
  slug?: string;
  tags?: { title: string; type: string }[];
  centroid?: { latitude: number; longitude: number };
  default_location?: { latitude: number; longitude: number };
  bbox?: number[];
  polygon_encoded?: string;
  multi_polygon_encoded?: string[];
}

export interface AdminCityRef {
  id: string;
  name: string;
  provinceId: string;
  provinceName: string;
}

export function normalizePersianName(value: string): string {
  return value
    .replace(/\u200c/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function adminSlugForCityId(adminCityId: string): string {
  return ID_OVERRIDES[adminCityId] ?? locationCityIdToSlug(adminCityId);
}

export async function loadAdminCities(): Promise<AdminCityRef[]> {
  const data = await readManagedLocationData();
  const cities: AdminCityRef[] = [];
  for (const country of data.countries) {
    for (const province of country.provinces) {
      for (const city of province.cities) {
        cities.push({
          id: city.id,
          name: city.name,
          provinceId: province.id,
          provinceName: province.name,
        });
      }
    }
  }
  return cities;
}

export async function loadManualMap(): Promise<Record<string, string>> {
  const file = path.join(NEIGHBORHOODS_ROOT, 'divar-city-map.manual.json');
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export async function fetchDivarCities(): Promise<DivarCity[]> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const cachePath = path.join(CACHE_DIR, 'divar-cities.json');

  try {
    const cached = await fs.readFile(cachePath, 'utf8');
    const parsed = JSON.parse(cached) as { cities: DivarCity[] };
    if (parsed.cities?.length) return parsed.cities;
  } catch {
    /* fetch fresh */
  }

  const res = await fetch(DIVAR_CITIES_URL);
  if (!res.ok) throw new Error(`Divar cities HTTP ${res.status}`);
  const json = (await res.json()) as { cities: DivarCity[] };
  await fs.writeFile(cachePath, JSON.stringify(json, null, 2), 'utf8');
  return json.cities;
}

export function buildDivarIndexes(divarCities: DivarCity[]) {
  const bySlug = new Map<string, DivarCity>();
  const byName = new Map<string, DivarCity>();
  for (const city of divarCities) {
    bySlug.set(city.slug.toLowerCase(), city);
    byName.set(normalizePersianName(city.name), city);
  }
  return { bySlug, byName };
}

export function resolveDivarCity(
  adminCity: AdminCityRef,
  indexes: ReturnType<typeof buildDivarIndexes>,
  manual: Record<string, string>
): { city: DivarCity; method: string } | null {
  const manualSlug = manual[adminCity.id];
  if (manualSlug) {
    const hit = indexes.bySlug.get(manualSlug.toLowerCase());
    if (hit) return { city: hit, method: 'manual' };
  }

  const slug = adminSlugForCityId(adminCity.id);
  const bySlug = indexes.bySlug.get(slug.toLowerCase());
  if (bySlug) return { city: bySlug, method: 'slug' };

  const byName = indexes.byName.get(normalizePersianName(adminCity.name));
  if (byName) return { city: byName, method: 'name' };

  return null;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseArgs(argv: string[]): {
  city?: string;
  refreshCities?: boolean;
  force?: boolean;
} {
  let city: string | undefined;
  let refreshCities = false;
  let force = false;
  for (const arg of argv) {
    if (arg === '--refresh-cities') refreshCities = true;
    if (arg === '--force') force = true;
    if (arg.startsWith('--city=')) city = arg.slice('--city='.length);
  }
  return { city, refreshCities, force };
}
