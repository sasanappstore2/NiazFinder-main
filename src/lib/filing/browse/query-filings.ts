import type { Prisma } from '@prisma/client';
import type { RegionalFiling } from '@prisma/client';
import { db } from '@/lib/db';
import { regionalFilingToPropertyListing } from '@/lib/filing/adapters/prisma-to-listing';
import {
  inferPosterKindFromSourceMeta,
  parseSourceMetaJsonForPoster,
} from '@/lib/filing/adapters/workspace-entries';
import { normalizeListingItem } from '@/components/workspace/lib/normalize-workspace-data';
import type { WorkspaceFileItem } from '@/components/workspace/types';
import {
  DEFAULT_FILING_BROWSE_FILTERS,
  filterFilingBrowseItems,
  type FilingBrowseFilters,
} from '@/lib/filing/browse/apply-filters';
import {
  getCachedFilingBrowse,
  setCachedFilingBrowse,
  type FilingBrowseCachePayload,
} from '@/lib/filing/cache/filing-cache';
import type { ManagedNeighborhood } from '@/lib/neighborhoods/types';
import { toAsciiDigits } from '@/lib/format/digits';
import { lookupManagedNeighborhoodBySlug } from '@/lib/neighborhoods/match-managed-neighborhood';
import { publicFilingSourceProvider } from '@/lib/filing/presentation/public-brand';

const QUERY_MAX_ROWS = Number(process.env.FILING_BROWSE_QUERY_MAX ?? 5000);

export type FilingBrowseQueryOpts = {
  city?: string | null;
  cityId?: string | null;
  cityName?: string | null;
  page?: number;
  limit?: number;
  neighborhoods?: ManagedNeighborhood[];
};

function amenityWhere(selected: string[]): Prisma.RegionalFilingWhereInput {
  const clause: Prisma.RegionalFilingWhereInput = {};
  for (const key of selected) {
    switch (key) {
      case 'parking':
        clause.hasParking = true;
        break;
      case 'storage':
        clause.hasStorage = true;
        break;
      case 'elevator':
        clause.hasElevator = true;
        break;
      case 'securityDoor':
        clause.hasSecurityDoor = true;
        break;
      case 'exchangeable':
        clause.exchangeable = true;
        break;
      case 'terrace':
        clause.hasTerrace = true;
        break;
      case 'builtInWardrobe':
        clause.hasBuiltInWardrobe = true;
        break;
      default:
        break;
    }
  }
  return clause;
}

export function buildFilingBrowseWhere(
  filters: FilingBrowseFilters,
  opts?: Pick<FilingBrowseQueryOpts, 'city' | 'cityId' | 'neighborhoods'>
): Prisma.RegionalFilingWhereInput {
  const where: Prisma.RegionalFilingWhereInput = {
    status: 'active',
  };

  if (opts?.city) {
    where.city = opts.city;
  } else if (opts?.cityId) {
    where.cityId = opts.cityId;
  }

  if (filters.dealType !== 'all') {
    where.dealType = filters.dealType;
  }

  if (filters.propertyKind !== 'all') {
    where.propertyKind = filters.propertyKind;
  }

  if (filters.rooms) {
    if (filters.rooms === '5+') {
      where.rooms = { gte: 5 };
    } else {
      where.rooms = Number(filters.rooms);
    }
  }

  if (filters.buildingAgeMax) {
    const max = Number(toAsciiDigits(filters.buildingAgeMax));
    if (Number.isFinite(max)) {
      where.buildingAge = { lte: max };
    }
  }

  if (filters.fileCode.trim()) {
    where.fileCode = { contains: toAsciiDigits(filters.fileCode.trim()), mode: 'insensitive' };
  }

  if (filters.insertedDate) {
    const dayStart = new Date(`${filters.insertedDate}T00:00:00.000Z`);
    const dayEnd = new Date(`${filters.insertedDate}T23:59:59.999Z`);
    where.postedAt = { gte: dayStart, lte: dayEnd };
  }

  if (filters.amenities.length) {
    Object.assign(where, amenityWhere(filters.amenities));
  }

  const neighborhoodClauses: Prisma.RegionalFilingWhereInput[] = [];
  if (filters.neighborhoods.length && opts?.neighborhoods?.length) {
    const selected = filters.neighborhoods
      .map((slug) => lookupManagedNeighborhoodBySlug(opts.neighborhoods!, slug))
      .filter((n): n is ManagedNeighborhood => n != null);

    if (selected.length) {
      neighborhoodClauses.push({
        neighborhoodId: { in: selected.map((n) => n.id) },
      });
      for (const hood of selected) {
        neighborhoodClauses.push({
          location: { contains: hood.name, mode: 'insensitive' },
        });
        for (const area of hood.areas ?? []) {
          if (area.trim()) {
            neighborhoodClauses.push({
              location: { contains: area.trim(), mode: 'insensitive' },
            });
          }
        }
      }
    } else {
      neighborhoodClauses.push({ id: { in: [] } });
    }
  }

  const q = filters.q.trim();
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { location: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { fileCode: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (neighborhoodClauses.length) {
    where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), { OR: neighborhoodClauses }];
  }

  return where;
}

function rowToWorkspaceItem(row: RegionalFiling): WorkspaceFileItem {
  const listing = regionalFilingToPropertyListing(row);
  const posterKind = inferPosterKindFromSourceMeta(parseSourceMetaJsonForPoster(row.sourceMetaJson));
  return normalizeListingItem(listing, {
    isOwn: false,
    sourceKind: 'import',
    posterKind,
    sourceProvider: publicFilingSourceProvider(row.sourceSite),
    createdAt: listing.postedAt ?? listing.createdAt ?? null,
    regionalDetail: true,
  });
}

export async function queryFilingsForBrowse(
  filters: FilingBrowseFilters = DEFAULT_FILING_BROWSE_FILTERS,
  opts: FilingBrowseQueryOpts = {}
): Promise<FilingBrowseCachePayload> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 48));
  const cityKey = opts.cityId ?? opts.city ?? 'all';

  const cached = await getCachedFilingBrowse(cityKey, filters, page, limit);
  if (cached) return cached;

  const where = buildFilingBrowseWhere(filters, opts);
  const rows = await db.regionalFiling.findMany({
    where,
    orderBy: [{ postedAt: 'desc' }, { createdAt: 'desc' }],
    take: QUERY_MAX_ROWS,
  });

  const items = rows.map(rowToWorkspaceItem);
  const filtered = filterFilingBrowseItems(items, filters, {
    neighborhoods: opts.neighborhoods ?? [],
    cityName: opts.cityName ?? undefined,
  });

  const payload: FilingBrowseCachePayload = {
    items: filtered.slice((page - 1) * limit, page * limit),
    total: filtered.length,
    page,
    limit,
  };

  await setCachedFilingBrowse(cityKey, filters, page, limit, payload);
  return payload;
}

export async function countActiveFilingsForCity(city?: string | null): Promise<number> {
  return db.regionalFiling.count({
    where: {
      status: 'active',
      ...(city ? { city } : {}),
    },
  });
}
