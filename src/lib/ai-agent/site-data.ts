import { db } from '@/lib/db';
import { getPublicLocationData, readManagedLocationData } from '@/lib/admin-locations';
import { loadCityNeighborhoods, readManifest } from '@/lib/neighborhoods/catalog';
import { locationCityIdToSlug } from '@/lib/search/city-slugs';

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\u200c/g, '')
    .replace(/\s+/g, ' ');
}

function textMatches(query: string, ...parts: Array<string | null | undefined>): boolean {
  if (!query) return true;
  const q = normalizeSearchText(query);
  return parts.some((part) => {
    if (!part) return false;
    const normalized = normalizeSearchText(part);
    return normalized.includes(q) || q.includes(normalized);
  });
}

export async function searchSiteCategories(args: Record<string, unknown>) {
  const query = typeof args.query === 'string' ? args.query.trim() : '';
  const limit = clampInt(args.limit, 1, 40, 20);

  const rows = await db.category.findMany({
    where: { isActive: true },
    orderBy: [{ parentId: 'asc' }, { order: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
      parentId: true,
      parent: { select: { id: true, name: true, slug: true, parentId: true, parent: { select: { id: true, name: true, slug: true } } } },
    },
  });

  const mapped = rows.map((c) => {
    const pathParts = [c.parent?.parent?.name, c.parent?.name, c.name].filter(Boolean);
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      icon: c.icon,
      parentId: c.parentId,
      parentSlug: c.parent?.slug ?? null,
      path: pathParts.join(' > '),
      level: c.parent?.parent ? 3 : c.parent ? 2 : 1,
    };
  });

  const filtered = query
    ? mapped.filter((c) =>
        textMatches(query, c.name, c.slug, c.path, c.parentSlug ?? undefined),
      )
    : mapped.filter((c) => c.level <= 2);

  return filtered.slice(0, limit);
}

export async function searchSiteCities(args: Record<string, unknown>) {
  const query = typeof args.query === 'string' ? args.query.trim() : '';
  const province = typeof args.province === 'string' ? args.province.trim() : '';
  const limit = clampInt(args.limit, 1, 40, 20);

  const [raw, manifest] = await Promise.all([readManagedLocationData(), readManifest()]);
  const publicData = getPublicLocationData(raw, manifest.counts);

  const results: Array<{
    id: string;
    name: string;
    slug: string;
    province: string;
    provinceId: string;
    hasNeighborhoods: boolean;
    neighborhoodCount?: number;
  }> = [];

  for (const country of publicData.countries) {
    for (const prov of country.provinces) {
      if (province && !textMatches(province, prov.name, prov.id, prov.nameEn)) continue;
      for (const city of prov.cities) {
        if (
          query &&
          !textMatches(query, city.name, city.id, city.nameEn, locationCityIdToSlug(city.id))
        ) {
          continue;
        }
        results.push({
          id: city.id,
          name: city.name,
          slug: locationCityIdToSlug(city.id),
          province: prov.name,
          provinceId: prov.id,
          hasNeighborhoods: Boolean(city.hasNeighborhoods),
          neighborhoodCount: city.neighborhoodCount,
        });
      }
    }
  }

  results.sort((a, b) => a.name.localeCompare(b.name, 'fa'));
  return results.slice(0, limit);
}

async function resolveCityId(args: Record<string, unknown>): Promise<string | null> {
  if (typeof args.cityId === 'string' && args.cityId.trim()) {
    return args.cityId.trim();
  }

  const cityQuery =
    (typeof args.cityName === 'string' && args.cityName.trim()) ||
    (typeof args.city === 'string' && args.city.trim()) ||
    (typeof args.query === 'string' && args.query.trim() && !args.neighborhoodQuery
      ? args.query.trim()
      : '');

  if (!cityQuery) return null;

  const matches = await searchSiteCities({ query: cityQuery, limit: 5 });
  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0].id;

  const exact = matches.find(
    (m) =>
      normalizeSearchText(m.name) === normalizeSearchText(cityQuery) ||
      normalizeSearchText(m.slug) === normalizeSearchText(cityQuery) ||
      normalizeSearchText(m.id) === normalizeSearchText(cityQuery),
  );
  return exact?.id ?? matches[0].id;
}

export async function searchSiteNeighborhoods(args: Record<string, unknown>) {
  const neighborhoodQuery =
    (typeof args.neighborhoodQuery === 'string' && args.neighborhoodQuery.trim()) ||
    (typeof args.query === 'string' && args.query.trim()) ||
    '';
  const limit = clampInt(args.limit, 1, 50, 25);

  const cityId = await resolveCityId(args);
  if (!cityId) {
    return {
      error: 'شهر مشخص نشده یا یافت نشد. cityId یا cityName را بفرست.',
      neighborhoods: [] as unknown[],
    };
  }

  const rows = await loadCityNeighborhoods(cityId);
  const filtered = rows
    .filter((n) => n.isActive !== false)
    .filter((n) =>
      neighborhoodQuery
        ? textMatches(neighborhoodQuery, n.name, n.nameEn, n.id, ...(n.areas ?? []))
        : true,
    )
    .slice(0, limit)
    .map((n) => ({
      id: n.id,
      name: n.name,
      nameEn: n.nameEn,
      cityId,
      areas: n.areas ?? [],
    }));

  return {
    cityId,
    count: filtered.length,
    neighborhoods: filtered,
  };
}

export async function searchActiveNeedsWithLocation(args: Record<string, unknown>) {
  const category = typeof args.category === 'string' ? args.category.trim() : '';
  const location = typeof args.location === 'string' ? args.location.trim() : '';
  const neighborhood =
    (typeof args.neighborhood === 'string' && args.neighborhood.trim()) ||
    (typeof args.neighborhoodSlug === 'string' && args.neighborhoodSlug.trim()) ||
    '';
  const limit = clampInt(args.limit, 1, 20, 10);

  const where: Record<string, unknown> = {
    status: { in: ['OPEN', 'IN_PROGRESS'] },
    moderationStatus: 'APPROVED',
    needAccessStatus: 'PUBLIC',
  };

  const locationFilters: Record<string, unknown>[] = [];
  if (location) {
    locationFilters.push(
      { city: { contains: location, mode: 'insensitive' } },
      { province: { contains: location, mode: 'insensitive' } },
    );
  }
  if (neighborhood) {
    locationFilters.push({ address: { contains: neighborhood, mode: 'insensitive' } });
    locationFilters.push({ description: { contains: neighborhood, mode: 'insensitive' } });
  }
  if (locationFilters.length === 1) {
    Object.assign(where, locationFilters[0]);
  } else if (locationFilters.length > 1) {
    where.OR = locationFilters;
  }

  if (category) {
    where.category = {
      OR: [
        { slug: { contains: category, mode: 'insensitive' } },
        { name: { contains: category, mode: 'insensitive' } },
      ],
    };
  }

  const rows = await db.serviceRequest.findMany({
    where: where as any,
    take: limit,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      city: true,
      province: true,
      address: true,
      budgetMin: true,
      budgetMax: true,
      createdAt: true,
      category: { select: { name: true, slug: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    city: r.city,
    province: r.province,
    address: r.address,
    categoryName: r.category.name,
    categorySlug: r.category.slug,
    budgetMin: r.budgetMin != null ? Number(r.budgetMin) : null,
    budgetMax: r.budgetMax != null ? Number(r.budgetMax) : null,
    createdAt: r.createdAt.toISOString(),
  }));
}
