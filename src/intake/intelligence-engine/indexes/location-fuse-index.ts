import Fuse from 'fuse.js';
import { db } from '@/lib/db';
import { readManifest, loadCityCatalogFile } from '@/lib/neighborhoods/catalog';
import { normalizeLookupKey } from '@/intake/normalizer/normalizePersian';

export type LocationMatchTier = 'exact' | 'alias' | 'fuzzy';

export interface LocationIndexRecord {
  id: string;
  type: 'city' | 'neighborhood';
  slug: string;
  name: string;
  citySlug?: string;
  cityName?: string;
  provinceSlug?: string;
  lat?: number | null;
  lng?: number | null;
  searchText: string;
}

export interface LocationFuseMatch {
  record: LocationIndexRecord;
  tier: LocationMatchTier;
  score: number;
  confidence: number;
  evidence: string;
}

let cachedRecords: LocationIndexRecord[] | null = null;
let cachedFuse: Fuse<LocationIndexRecord> | null = null;
/** After first Prisma failure (or env skip), use JSON catalog only ? no repeated DB noise. */
let prismaLocationCatalogDisabled =
  process.env.NEED_INTAKE_LOC_SKIP_PRISMA === 'true' ||
  process.env.NEED_INTAKE_LOC_USE_PRISMA === 'false';

export function isPrismaLocationCatalogEnabled(): boolean {
  return !prismaLocationCatalogDisabled;
}

export function disablePrismaLocationCatalog(): void {
  prismaLocationCatalogDisabled = true;
}

function tierConfidence(tier: LocationMatchTier, fuseScore: number): number {
  if (tier === 'exact') return 1;
  if (tier === 'alias') return 0.95;
  return Math.max(0.55, 1 - fuseScore);
}

export async function loadLocationIndexRecords(): Promise<LocationIndexRecord[]> {
  if (cachedRecords) return cachedRecords;

  const records: LocationIndexRecord[] = [];

  if (!prismaLocationCatalogDisabled) {
    try {
      const cities = await db.intakeCity.findMany({
      where: { isActive: true },
      include: {
        province: true,
        neighborhoods: { where: { isActive: true }, include: { aliases: true } },
        aliases: true,
      },
    });

    if (cities.length > 0) {
      for (const city of cities) {
        records.push({
          id: city.id,
          type: 'city',
          slug: city.slug,
          name: city.name,
          citySlug: city.slug,
          cityName: city.name,
          provinceSlug: city.province.slug,
          lat: city.lat,
          lng: city.lng,
          searchText: normalizeLookupKey([city.name, city.slug, city.nameEn ?? ''].join(' ')),
        });
        for (const alias of city.aliases) {
          records.push({
            id: `${city.id}:alias:${alias.id}`,
            type: 'city',
            slug: city.slug,
            name: city.name,
            citySlug: city.slug,
            cityName: city.name,
            provinceSlug: city.province.slug,
            searchText: normalizeLookupKey(alias.alias),
          });
        }
        for (const hood of city.neighborhoods) {
          const base = [hood.name, hood.slug, ...(hood.areas ?? [])].join(' ');
          records.push({
            id: hood.id,
            type: 'neighborhood',
            slug: hood.slug,
            name: hood.name,
            citySlug: city.slug,
            cityName: city.name,
            provinceSlug: city.province.slug,
            lat: hood.lat,
            lng: hood.lng,
            searchText: normalizeLookupKey(base),
          });
          for (const alias of hood.aliases) {
            records.push({
              id: `${hood.id}:alias:${alias.id}`,
              type: 'neighborhood',
              slug: hood.slug,
              name: hood.name,
              citySlug: city.slug,
              cityName: city.name,
              provinceSlug: city.province.slug,
              lat: hood.lat,
              lng: hood.lng,
              searchText: normalizeLookupKey(alias.alias),
            });
          }
        }
      }
      cachedRecords = records;
      return records;
    }
    } catch {
      prismaLocationCatalogDisabled = true;
      /* Prisma empty or unavailable ? fallback JSON */
    }
  }

  const manifest = await readManifest();
  const cityIds = Object.keys(manifest.counts ?? {}).slice(0, 500);
  for (const cityId of cityIds) {
    try {
      const cat = await loadCityCatalogFile(cityId);
      if (!cat) continue;
      const cityName = cat.cityName ?? cityId;
      records.push({
        id: cityId,
        type: 'city',
        slug: cityId,
        name: cityName,
        citySlug: cityId,
        cityName,
        searchText: normalizeLookupKey(cityName),
      });
      for (const n of cat.neighborhoods ?? []) {
        records.push({
          id: `${cityId}:${n.id}`,
          type: 'neighborhood',
          slug: n.id,
          name: n.name,
          citySlug: cityId,
          cityName,
          lat: n.centroid?.lat,
          lng: n.centroid?.lng,
          searchText: normalizeLookupKey([n.name, ...(n.areas ?? [])].join(' ')),
        });
      }
    } catch {
      /* skip */
    }
  }

  cachedRecords = records;
  return records;
}

export async function getLocationFuseIndex(): Promise<Fuse<LocationIndexRecord>> {
  if (cachedFuse) return cachedFuse;
  const records = await loadLocationIndexRecords();
  cachedFuse = new Fuse(records, {
    keys: ['searchText', 'name', 'slug'],
    threshold: 0.32,
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });
  return cachedFuse;
}

export function clearLocationIndexCache(): void {
  cachedRecords = null;
  cachedFuse = null;
}

export async function searchLocationIndex(
  query: string,
  opts?: { citySlug?: string | null; limit?: number }
): Promise<LocationFuseMatch[]> {
  const q = normalizeLookupKey(query);
  if (!q || q.length < 2) return [];

  const records = await loadLocationIndexRecords();
  const exact: LocationFuseMatch[] = [];
  for (const r of records) {
    if (opts?.citySlug && r.type === 'neighborhood' && r.citySlug !== opts.citySlug) continue;
    if (r.searchText === q || normalizeLookupKey(r.name) === q) {
      exact.push({
        record: r,
        tier: 'exact',
        score: 0,
        confidence: 1,
        evidence: `exact:${r.name}`,
      });
    }
  }
  if (exact.length) return exact.slice(0, opts?.limit ?? 5);

  const fuse = await getLocationFuseIndex();
  const hits = fuse.search(q, { limit: (opts?.limit ?? 8) * 2 });
  const out: LocationFuseMatch[] = [];
  for (const hit of hits) {
    const r = hit.item;
    if (opts?.citySlug && r.type === 'neighborhood' && r.citySlug !== opts.citySlug) continue;
    const fuseScore = hit.score ?? 1;
    const tier: LocationMatchTier = fuseScore < 0.05 ? 'alias' : 'fuzzy';
    out.push({
      record: r,
      tier,
      score: fuseScore,
      confidence: tierConfidence(tier, fuseScore),
      evidence: `${tier}:${r.name}`,
    });
    if (out.length >= (opts?.limit ?? 8)) break;
  }
  return out;
}
