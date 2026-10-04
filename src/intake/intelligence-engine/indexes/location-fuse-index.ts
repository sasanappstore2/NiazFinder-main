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
  /** Normalized sub-neighborhood names (زیرمحله) that must resolve to this record. */
  areas?: string[];
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
/** area key → neighborhood records managing that sub-neighborhood. */
let cachedAreaLookup: Map<string, LocationIndexRecord[]> | null = null;
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
      // Deterministic ordering at every level: Postgres row order without ORDER BY is not a
      // guaranteed contract (Replay Determinism Audit §2 — an always-correct fix, not a
      // replay-mode switch). Slug order for real entities; id order for aliases (stable for a
      // given catalog instance; cross-instance content identity is LOCATION_CATALOG_VERSION's
      // job — see location-catalog-version.ts — not ordering's).
      const cities = await db.intakeCity.findMany({
      where: { isActive: true },
      orderBy: { slug: 'asc' },
      include: {
        province: true,
        neighborhoods: {
          where: { isActive: true },
          orderBy: [{ slug: 'asc' }, { id: 'asc' }],
          include: { aliases: { orderBy: { id: 'asc' } } },
        },
        aliases: { orderBy: { id: 'asc' } },
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
            areas: (hood.areas ?? [])
              .map((a) => normalizeLookupKey(a))
              .filter((a) => a.length >= 2),
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
  // Full coverage: the manifest lists every catalog city (tehran-city sits far past the
  // alphabetical halfway point, so any cap here silently drops the biggest city).
  const cityIds = Object.keys(manifest.counts ?? {}).filter((id) => (manifest.counts?.[id] ?? 0) > 0);
  const BATCH = 24;
  for (let i = 0; i < cityIds.length; i += BATCH) {
    const batch = cityIds.slice(i, i + BATCH);
    const catalogs = await Promise.all(
      batch.map(async (cityId) => {
        try {
          return { cityId, cat: await loadCityCatalogFile(cityId) };
        } catch {
          return { cityId, cat: null };
        }
      })
    );
    for (const { cityId, cat } of catalogs) {
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
          areas: (n.areas ?? [])
            .map((a) => normalizeLookupKey(a))
            .filter((a) => a.length >= 2),
        });
      }
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
  cachedAreaLookup = null;
}

function getAreaLookup(records: LocationIndexRecord[]): Map<string, LocationIndexRecord[]> {
  if (cachedAreaLookup) return cachedAreaLookup;
  const lookup = new Map<string, LocationIndexRecord[]>();
  for (const r of records) {
    if (r.type !== 'neighborhood' || !r.areas?.length) continue;
    for (const area of r.areas) {
      const list = lookup.get(area) ?? [];
      if (!list.includes(r)) list.push(r);
      lookup.set(area, list);
    }
  }
  cachedAreaLookup = lookup;
  return lookup;
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

  // Sub-neighborhood (زیرمحله) tier: the fragment may name a small area managed under a
  // parent neighborhood (e.g. «موحد دانش» → آجودانیه), optionally alongside the parent
  // itself («سباری نیاوران»). Match area names against the query's word n-grams; when
  // several parents share an area name, keep the one whose parent name the text mentions,
  // otherwise surface all candidates and let the resolver refuse a single winner
  // (RFC-0004 ambiguity rule).
  if (q.length >= 3) {
    const areaLookup = getAreaLookup(records);
    const tokens = q.split(/\s+/).filter(Boolean);
    const phrases = new Set<string>();
    for (let w = Math.min(3, tokens.length); w >= 1; w -= 1) {
      for (let i = 0; i + w <= tokens.length; i += 1) {
        const phrase = tokens.slice(i, i + w).join(' ');
        if (phrase.length >= 3) phrases.add(phrase);
      }
    }
    const matched = new Map<LocationIndexRecord, number>();
    for (const phrase of phrases) {
      const recs = areaLookup.get(phrase);
      if (!recs) continue;
      const width = phrase.split(' ').length;
      for (const r of recs) {
        const prev = matched.get(r);
        if (prev === undefined || width > prev) matched.set(r, width);
      }
    }
    let areaRecords = Array.from(matched.keys());
    if (opts?.citySlug) {
      areaRecords = areaRecords.filter((r) => r.citySlug === opts.citySlug);
    }
    if (areaRecords.length > 1) {
      const withParent = areaRecords.filter((r) => {
        const parent = normalizeLookupKey(r.name);
        return parent.length >= 3 && q.includes(parent);
      });
      if (withParent.length >= 1) areaRecords = withParent;
    }
    if (areaRecords.length) {
      const areaHits = areaRecords
        .sort((a, b) => (matched.get(b) ?? 0) - (matched.get(a) ?? 0))
        .slice(0, opts?.limit ?? 5)
        .map<LocationFuseMatch>((r) => ({
          record: r,
          tier: 'alias',
          score: 0,
          confidence: areaRecords.length === 1 ? 0.92 : 0.9,
          evidence: `area-exact:${r.name}`,
        }));
      return areaHits;
    }
  }

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
