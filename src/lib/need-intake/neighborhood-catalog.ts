import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { ALL_LOCATION_CITIES } from '@/lib/search/city-slugs';
import type { CatalogNeighborhood } from '@/lib/neighborhoods/catalog-types';

export interface NeighborhoodCatalogEntry {
  slug: string;
  name: string;
  city: string;
  areas?: string[];
}

const CATALOG_DIR = path.join(process.cwd(), 'src', 'data', 'neighborhoods', 'catalog');
const catalogCache = new Map<string, NeighborhoodCatalogEntry[]>();

function resolveCityId(city: string): string | null {
  const trimmed = city.trim();
  const byName = ALL_LOCATION_CITIES.find((c) => c.name === trimmed);
  if (byName) return byName.id;
  if (existsSync(path.join(CATALOG_DIR, `${trimmed}.json`))) return trimmed;
  return null;
}

function toEntries(cityLabel: string, rows: CatalogNeighborhood[]): NeighborhoodCatalogEntry[] {
  return rows.map((n) => ({
    slug: n.id,
    name: n.name,
    city: cityLabel,
    areas: n.areas,
  }));
}

function loadCatalogForCityId(cityId: string, cityLabel: string): NeighborhoodCatalogEntry[] {
  const cacheKey = `${cityId}:${cityLabel}`;
  const cached = catalogCache.get(cacheKey);
  if (cached) return cached;

  const filePath = path.join(CATALOG_DIR, `${cityId}.json`);
  if (!existsSync(filePath)) {
    catalogCache.set(cacheKey, []);
    return [];
  }

  try {
    const raw = readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw) as {
      cityName?: string;
      neighborhoods: CatalogNeighborhood[];
    };
    const label = data.cityName ?? cityLabel;
    const entries = toEntries(label, data.neighborhoods ?? []);
    catalogCache.set(cacheKey, entries);
    return entries;
  } catch {
    catalogCache.set(cacheKey, []);
    return [];
  }
}

export function getNeighborhoodCatalogForCity(city: string): NeighborhoodCatalogEntry[] {
  const cityId = resolveCityId(city);
  if (!cityId) return [];
  const cityMeta = ALL_LOCATION_CITIES.find((c) => c.id === cityId);
  return loadCatalogForCityId(cityId, cityMeta?.name ?? city);
}

export function formatNeighborhoodCatalogForPrompt(city: string, limit = 40): string {
  const items = getNeighborhoodCatalogForCity(city).slice(0, limit);
  if (!items.length) return '';
  return items
    .map((n) => {
      const areas = n.areas?.length ? ` (${n.areas.slice(0, 4).join('، ')})` : '';
      return `${n.slug}: ${n.name}${areas}`;
    })
    .join('\n');
}

/** Match neighborhood name or sub-area mentioned in free text. */
export function findNeighborhoodInText(
  city: string,
  text: string
): { slug: string; name: string; matchedArea?: string } | null {
  const norm = text.trim();
  if (!norm) return null;
  const catalog = getNeighborhoodCatalogForCity(city);
  for (const n of catalog) {
    if (norm.includes(n.name)) {
      return { slug: n.slug, name: n.name };
    }
    for (const a of n.areas ?? []) {
      if (norm.includes(a)) {
        return { slug: n.slug, name: n.name, matchedArea: a };
      }
    }
  }
  return null;
}

export function resolveNeighborhoodSlug(
  city: string,
  areaName: string
): { slug: string; name: string } | null {
  const norm = areaName.trim();
  if (!norm) return null;
  const catalog = getNeighborhoodCatalogForCity(city);
  const exact = catalog.find((n) => n.name === norm || n.slug === norm);
  if (exact) return { slug: exact.slug, name: exact.name };
  const partial = catalog.find(
    (n) =>
      n.name.includes(norm) ||
      norm.includes(n.name) ||
      n.areas?.some((a) => a.includes(norm) || norm.includes(a))
  );
  if (partial) return { slug: partial.slug, name: partial.name };
  return null;
}
