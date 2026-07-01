import type { Prisma, RegionalFilingScraper } from '@prisma/client';
import { db } from '@/lib/db';
import { resolveCategorySlugFromKind } from '@/lib/filing/adapters/prisma-to-listing';
import {
  missingFieldsOnFiling,
  type FilingCoverageRow,
} from '@/lib/filing/ingest/category-coverage';
import {
  isFilingDealType,
  isFilingPropertyKind,
} from '@/lib/filing/schema/attribute-schema';
import type { WorkspacePropertyKind } from '@/lib/business/ecosystem/types';
import { resolveNeighborhoodSlug } from '@/lib/need-intake/neighborhood-catalog.server';
import { invalidateFilingCaches } from '@/lib/filing/cache/invalidate';

export function filingWithinDaysWhere(days: number): Prisma.RegionalFilingWhereInput {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return {
    OR: [{ postedAt: { gte: since } }, { scrapedAt: { gte: since } }, { createdAt: { gte: since } }],
  };
}

const COVERAGE_SELECT = {
  id: true,
  dealType: true,
  propertyKind: true,
  fileCode: true,
  postedAt: true,
  dataCompleteness: true,
  enrichedAt: true,
  sourceMetaJson: true,
  title: true,
  description: true,
  price: true,
  deposit: true,
  monthlyRent: true,
  pricePerMeter: true,
  area: true,
  rooms: true,
  floor: true,
  totalFloors: true,
  unitsCount: true,
  buildingAge: true,
  documentType: true,
  cabinet: true,
  flooring: true,
  wallCover: true,
  facade: true,
  orientation: true,
  heating: true,
  cooling: true,
  exchangeable: true,
  hasParking: true,
  hasStorage: true,
  hasElevator: true,
  hasSecurityDoor: true,
  hasTerrace: true,
  hasBuiltInWardrobe: true,
  detailUrl: true,
  image: true,
  imagesJson: true,
  city: true,
  neighborhood: true,
  location: true,
  categorySlug: true,
  neighborhoodId: true,
  cityId: true,
} satisfies Prisma.RegionalFilingSelect;

export async function countFilingsNeedingEnrich(
  scraperId: string,
  opts?: { withinDays?: number; minCompleteness?: number; phase?: 'first' | 'reenrich' }
): Promise<number> {
  const minCompleteness = opts?.minCompleteness ?? 75;
  const phase = opts?.phase ?? 'first';
  const incompleteOr =
    phase === 'reenrich'
      ? [
          { enrichedAt: { not: null } },
          {
            OR: [
              { dataCompleteness: { lt: minCompleteness } },
              { description: null },
            ],
          },
        ]
      : [{ enrichedAt: null }];

  return db.regionalFiling.count({
    where: {
      scraperId,
      status: { in: ['active', 'pending_review'] },
      AND: [
        ...(opts?.withinDays ? [filingWithinDaysWhere(opts.withinDays)] : []),
        { OR: incompleteOr },
      ],
    },
  });
}

export async function countFilingsWithMissingRequiredFields(
  scraperId: string,
  withinDays: number,
  sampleLimit = 500
): Promise<number> {
  const rows = await db.regionalFiling.findMany({
    where: {
      scraperId,
      status: { in: ['active', 'pending_review'] },
      ...filingWithinDaysWhere(withinDays),
    },
    select: COVERAGE_SELECT,
    take: sampleLimit,
  });

  return rows.filter((row) => missingFieldsOnFiling(row as FilingCoverageRow).length > 0).length;
}

export async function reconcileFilingMetadataForScraper(
  scraper: RegionalFilingScraper,
  opts?: { withinDays?: number; limit?: number }
): Promise<{ updated: number }> {
  const rows = await db.regionalFiling.findMany({
    where: {
      scraperId: scraper.id,
      status: { in: ['active', 'pending_review'] },
      AND: [
        ...(opts?.withinDays ? [filingWithinDaysWhere(opts.withinDays)] : []),
        {
          OR: [{ categorySlug: null }, { neighborhoodId: null }],
        },
      ],
    },
    select: {
      id: true,
      dealType: true,
      propertyKind: true,
      city: true,
      neighborhood: true,
      categorySlug: true,
      neighborhoodId: true,
      cityId: true,
    },
    take: opts?.limit ?? 500,
    orderBy: { updatedAt: 'asc' },
  });

  let updated = 0;
  for (const row of rows) {
    const patch: Prisma.RegionalFilingUpdateInput = {};
    const kind = isFilingPropertyKind(row.propertyKind) ? row.propertyKind : null;
    const deal = isFilingDealType(row.dealType) ? row.dealType : null;

    if (!row.categorySlug && kind) {
      const slug = resolveCategorySlugFromKind(kind as WorkspacePropertyKind, deal);
      if (slug) patch.categorySlug = slug;
    }

    if (!row.neighborhoodId && row.neighborhood?.trim()) {
      const resolved = resolveNeighborhoodSlug(row.city, row.neighborhood);
      if (resolved) {
        patch.neighborhood = resolved.name;
        patch.neighborhoodId = resolved.slug;
      }
    }

    if (!row.cityId && scraper.defaultCityId) {
      patch.cityId = scraper.defaultCityId;
    }

    if (Object.keys(patch).length === 0) continue;

    await db.regionalFiling.update({ where: { id: row.id }, data: patch });
    updated += 1;
  }

  if (updated > 0) {
    await invalidateFilingCaches({
      cityId: scraper.defaultCityId,
      cityName: scraper.defaultCity,
    });
  }

  return { updated };
}
