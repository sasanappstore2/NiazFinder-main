import { cache } from 'react';
import { db } from '@/lib/db';
import type { RegionalFiling } from '@prisma/client';
import { regionalFilingToPropertyListing } from '@/lib/filing/adapters/prisma-to-listing';
import {
  inferPosterKindFromSourceMeta,
  parseSourceMetaJsonForPoster,
} from '@/lib/filing/adapters/workspace-entries';
import { normalizeListingItem } from '@/components/workspace/lib/normalize-workspace-data';
import type { WorkspaceFileItem } from '@/components/workspace/types';
import {
  DEFAULT_FILING_BROWSE_FILTERS,
  type FilingBrowseFilters,
} from '@/lib/filing/browse/apply-filters';
import { queryFilingsForBrowse } from '@/lib/filing/browse/query-filings';
import {
  getCachedFilingDetail,
  setCachedFilingDetail,
} from '@/lib/filing/cache/filing-cache';
import { buildFilingDetailSections, type FilingDetailSections } from '@/lib/filing/presentation/detail-sections';
import { regionalFilingToViewModel, type FilingViewModel } from '@/lib/filing/presentation/view-model';
import { publicFilingSourceProvider } from '@/lib/filing/presentation/public-brand';

export async function loadRegionalFilingRowById(id: string): Promise<RegionalFiling | null> {
  return db.regionalFiling.findFirst({
    where: { id, status: { in: ['active', 'pending_review'] } },
  });
}

export async function loadFilingById(id: string): Promise<FilingViewModel | null> {
  const row = await loadRegionalFilingRowById(id);
  if (!row) return null;
  return regionalFilingToViewModel(row);
}

export const loadFilingDetailById = cache(
  async (
    id: string
  ): Promise<{ filing: FilingViewModel; sections: FilingDetailSections } | null> => {
    const cached = await getCachedFilingDetail(id);
    if (cached) return cached;

    const row = await loadRegionalFilingRowById(id);
    if (!row) return null;
    const filing = regionalFilingToViewModel(row);
    const sections = buildFilingDetailSections(filing);
    const payload = { filing, sections };
    await setCachedFilingDetail(id, payload);
    return payload;
  }
);

export async function loadActiveFilingsForBrowse(opts?: {
  limit?: number;
  city?: string | null;
  cityId?: string | null;
  filters?: FilingBrowseFilters;
  page?: number;
  includeViewModels?: boolean;
}): Promise<{ items: WorkspaceFileItem[]; viewModels: FilingViewModel[]; total: number }> {
  const result = await queryFilingsForBrowse(opts?.filters ?? DEFAULT_FILING_BROWSE_FILTERS, {
    city: opts?.city,
    cityId: opts?.cityId,
    cityName: opts?.city ?? undefined,
    page: opts?.page ?? 1,
    limit: opts?.limit ?? 48,
  });

  const viewModels =
    opts?.includeViewModels && result.items.length
      ? (
          await db.regionalFiling.findMany({
            where: { id: { in: result.items.map((item) => item.id) } },
          })
        ).map((row) => regionalFilingToViewModel(row))
      : [];

  return { items: result.items, viewModels, total: result.total };
}

/** @deprecated Prefer queryFilingsForBrowse — kept for legacy callers. */
export async function loadActiveFilingsLegacy(opts?: {
  limit?: number;
  city?: string | null;
}): Promise<{ items: WorkspaceFileItem[]; total: number }> {
  const limit = opts?.limit ?? 200;
  const where = {
    status: 'active' as const,
    ...(opts?.city ? { city: opts.city } : {}),
  };

  const [rows, total] = await Promise.all([
    db.regionalFiling.findMany({
      where,
      orderBy: [{ postedAt: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    }),
    db.regionalFiling.count({ where }),
  ]);

  const items = rows.map((row) => {
    const listing = regionalFilingToPropertyListing(row);
    const posterKind = inferPosterKindFromSourceMeta(
      parseSourceMetaJsonForPoster(row.sourceMetaJson)
    );
    return normalizeListingItem(listing, {
      isOwn: false,
      sourceKind: 'import',
      posterKind,
      sourceProvider: publicFilingSourceProvider(row.sourceSite),
      createdAt: listing.postedAt ?? listing.createdAt ?? null,
      regionalDetail: true,
    });
  });

  return { items, total };
}
